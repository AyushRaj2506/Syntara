import { useState, useEffect, useRef, useCallback } from 'react';
import { socket, SERVER_URL } from '../lib/socket';

const CHUNK_SIZE = 16 * 1024; // 16 KB chunk for optimal WebRTC DataChannel delivery
const BUFFERED_AMOUNT_HIGH_WATERMARK = 64 * 1024; // 64 KB backpressure threshold

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/**
 * WebRTC DataChannel P2P file transfer manager with chunking, backpressure and state machine.
 *
 * @param {{
 *   roomId?: string,
 *   myParticipantId?: string,
 *   participants?: Record<string, any>,
 *   onFileReceived?: (fileData: {
 *     transferId: string,
 *     fileName: string,
 *     fileSize: number,
 *     fileType: string,
 *     blob: Blob,
 *     url: string,
 *     senderDisplayName: string,
 *     senderParticipantId: string,
 *     caption?: string,
 *   }) => void,
 * }} params
 */
export function useWebRTCFileTransfer({
  roomId,
  myParticipantId,
  participants = {},
  onFileReceived,
}) {
  // Map of peer connections: participantId -> RTCPeerConnection
  const peerConnectionsRef = useRef(new Map());
  // Map of data channels: participantId -> RTCDataChannel
  const dataChannelsRef = useRef(new Map());

  // Active in-progress transfers (both sending and receiving)
  // transferId -> { id, fileName, fileSize, fileType, progress, status, error, isSender, blob, url }
  const [transfers, setTransfers] = useState({});

  // Incoming chunks buffer: transferId -> { metadata, chunks: ArrayBuffer[], receivedBytes: number }
  const incomingTransfersRef = useRef(new Map());

  // Safe ref for onFileReceived callback
  const onFileReceivedRef = useRef(onFileReceived);
  useEffect(() => {
    onFileReceivedRef.current = onFileReceived;
  }, [onFileReceived]);

  const handleIncomingDataRef = useRef(null);

  // Initialize or teardown peer connection for a participant
  const createPeerConnection = useCallback((targetParticipantId, isInitiator = false) => {
    if (peerConnectionsRef.current.has(targetParticipantId)) {
      return peerConnectionsRef.current.get(targetParticipantId);
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current.set(targetParticipantId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:signal', {
          targetParticipantId,
          signal: { type: 'ice', candidate: event.candidate },
        });
      }
    };

    const setupDataChannel = (dc) => {
      dc.binaryType = 'arraybuffer';
      dataChannelsRef.current.set(targetParticipantId, dc);

      dc.onopen = () => {
        console.log(`[webrtc] DataChannel open with peer: ${targetParticipantId}`);
      };

      dc.onclose = () => {
        console.log(`[webrtc] DataChannel closed with peer: ${targetParticipantId}`);
        dataChannelsRef.current.delete(targetParticipantId);
      };

      dc.onmessage = (event) => {
        handleIncomingDataRef.current?.(event.data, targetParticipantId);
      };
    };

    if (isInitiator) {
      const dc = pc.createDataChannel('fileTransfer', { ordered: true });
      setupDataChannel(dc);

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('webrtc:signal', {
            targetParticipantId,
            signal: { type: 'offer', sdp: pc.localDescription },
          });
        })
        .catch((err) => console.warn('[webrtc] Create offer error:', err));
    } else {
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };
    }

    return pc;
  }, []);

  // Handle incoming data channel messages
  const handleIncomingData = (data, senderParticipantId) => {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'file-start') {
          const { transferId, fileName, fileSize, fileType, totalChunks, caption, senderDisplayName } = msg;
          incomingTransfersRef.current.set(transferId, {
            metadata: { transferId, fileName, fileSize, fileType, totalChunks, caption, senderDisplayName, senderParticipantId },
            chunks: [],
            receivedBytes: 0,
          });

          setTransfers((prev) => ({
            ...prev,
            [transferId]: {
              id: transferId,
              fileName,
              fileSize,
              fileType,
              progress: 0,
              status: 'RECEIVING',
              senderDisplayName,
              senderParticipantId,
              caption,
              isSender: false,
            },
          }));
        } else if (msg.type === 'file-cancel') {
          const { transferId } = msg;
          incomingTransfersRef.current.delete(transferId);
          setTransfers((prev) => ({
            ...prev,
            [transferId]: {
              ...prev[transferId],
              status: 'CANCELLED',
            },
          }));
        }
      } catch (err) {
        console.warn('[webrtc] Failed to parse control message:', err);
      }
      return;
    }

    // Binary chunk: Read 36-byte UUID header + 4-byte chunk index
    if (data instanceof ArrayBuffer) {
      try {
        const headerLength = 36; // transferId string length
        const decoder = new TextDecoder();
        const transferId = decoder.decode(new Uint8Array(data, 0, headerLength));
        const chunkData = data.slice(headerLength);

        const current = incomingTransfersRef.current.get(transferId);
        if (!current) return;

        current.chunks.push(chunkData);
        current.receivedBytes += chunkData.byteLength;

        const progress = Math.min(100, Math.round((current.receivedBytes / current.metadata.fileSize) * 100));

        setTransfers((prev) => {
          const existing = prev[transferId];
          if (!existing) return prev;
          return {
            ...prev,
            [transferId]: {
              ...existing,
              progress,
              status: progress >= 100 ? 'RECEIVED' : 'PROGRESS',
            },
          };
        });

        // If transfer complete
        if (current.chunks.length >= current.metadata.totalChunks || current.receivedBytes >= current.metadata.fileSize) {
          const blob = new Blob(current.chunks, { type: current.metadata.fileType || 'application/octet-stream' });
          const url = URL.createObjectURL(blob);

          setTransfers((prev) => ({
            ...prev,
            [transferId]: {
              ...prev[transferId],
              progress: 100,
              status: 'RECEIVED',
              blob,
              url,
            },
          }));

          onFileReceivedRef.current?.({
            transferId,
            fileName: current.metadata.fileName,
            fileSize: current.metadata.fileSize,
            fileType: current.metadata.fileType,
            blob,
            url,
            senderDisplayName: current.metadata.senderDisplayName,
            senderParticipantId: current.metadata.senderParticipantId,
            caption: current.metadata.caption,
          });

          incomingTransfersRef.current.delete(transferId);
        }
      } catch (err) {
        console.warn('[webrtc] Chunk processing error:', err);
      }
    }
  };
  handleIncomingDataRef.current = handleIncomingData;

  // Socket signaling listener
  useEffect(() => {
    const handleSignal = async ({ senderParticipantId, signal }) => {
      if (!signal || !senderParticipantId) return;

      let pc = peerConnectionsRef.current.get(senderParticipantId);
      if (!pc) {
        pc = createPeerConnection(senderParticipantId, false);
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            targetParticipantId: senderParticipantId,
            signal: { type: 'answer', sdp: pc.localDescription },
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'ice') {
          if (signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.warn('[webrtc] Signal handling error:', err);
      }
    };

    const handleFileAnnounce = (announce) => {
      // Remote peer started file upload or P2P announcement
      const { transferId, fileName, fileSize, fileType, caption, senderDisplayName, senderParticipantId } = announce;
      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          id: transferId,
          fileName,
          fileSize,
          fileType,
          caption,
          progress: 0,
          status: 'PREPARING',
          senderDisplayName,
          senderParticipantId,
          isSender: false,
        },
      }));
    };

    socket.on('webrtc:signal', handleSignal);
    socket.on('webrtc:file-announce', handleFileAnnounce);

    return () => {
      socket.off('webrtc:signal', handleSignal);
      socket.off('webrtc:file-announce', handleFileAnnounce);
    };
  }, [createPeerConnection]);

  // Initiate peer connections to other participants when room participants change
  useEffect(() => {
    if (!myParticipantId) return;
    const peerIds = Object.keys(participants).filter((id) => id !== myParticipantId);

    peerIds.forEach((targetId) => {
      // Deterministic initiator: lexicographically smaller participantId creates offer
      if (myParticipantId < targetId && !peerConnectionsRef.current.has(targetId)) {
        createPeerConnection(targetId, true);
      }
    });

    // Cleanup disconnected peers
    for (const [id, pc] of peerConnectionsRef.current.entries()) {
      if (!participants[id]) {
        pc.close();
        peerConnectionsRef.current.delete(id);
        dataChannelsRef.current.delete(id);
      }
    }
  }, [participants, myParticipantId, createPeerConnection]);

  /**
   * Wait up to `timeoutMs` for any data channel to open.
   * Returns the list of open channels, or empty array on timeout.
   */
  const waitForAnyChannelOpen = useCallback((timeoutMs = 5000) => {
    return new Promise((resolve) => {
      const open = Array.from(dataChannelsRef.current.values()).filter(
        (dc) => dc.readyState === 'open'
      );
      if (open.length > 0) {
        resolve(open);
        return;
      }

      // Check if any channel is in connecting state — worth waiting
      const connecting = Array.from(dataChannelsRef.current.values()).filter(
        (dc) => dc.readyState === 'connecting'
      );
      if (connecting.length === 0) {
        resolve([]);
        return;
      }

      const cleanups = [];
      const done = (channels) => {
        cleanups.forEach((fn) => fn());
        resolve(channels);
      };

      const timeout = setTimeout(() => done([]), timeoutMs);
      cleanups.push(() => clearTimeout(timeout));

      for (const dc of connecting) {
        const onOpen = () => {
          const nowOpen = Array.from(dataChannelsRef.current.values()).filter(
            (d) => d.readyState === 'open'
          );
          done(nowOpen);
        };
        dc.addEventListener('open', onOpen);
        cleanups.push(() => dc.removeEventListener('open', onOpen));
      }
    });
  }, []);

  /**
   * Send a file using WebRTC DataChannel chunking with backpressure.
   * Waits up to 5s for channel negotiation before falling back to REST upload.
   *
   * @param {File} file
   * @param {string} [caption]
   * @returns {Promise<{ transferId: string, url?: string }>}
   */
  const sendFile = useCallback(async (file, caption = '') => {
    const transferId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Initial state: PREPARING
    setTransfers((prev) => ({
      ...prev,
      [transferId]: {
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        progress: 0,
        status: 'PREPARING',
        caption,
        isSender: true,
      },
    }));

    // Announce to all room members
    socket.emit('webrtc:file-announce', {
      transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      caption,
    });

    // Wait for open channels (up to 5s for P2P negotiation to complete)
    const openChannels = await waitForAnyChannelOpen(5000);

    // If active WebRTC channels are available, stream chunks over DataChannel
    if (openChannels.length > 0) {
      setTransfers((prev) => ({
        ...prev,
        [transferId]: { ...prev[transferId], status: 'SENDING', progress: 0 },
      }));

      // Send file-start metadata message
      const startMsg = JSON.stringify({
        type: 'file-start',
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        totalChunks,
        caption,
      });

      openChannels.forEach((dc) => {
        try { dc.send(startMsg); } catch (e) { console.warn(e); }
      });

      // Stream file slices
      const encoder = new TextEncoder();
      const headerBytes = encoder.encode(transferId.padEnd(36, ' '));
      let lastProgress = -1;
      let activeChannels = openChannels.length;

      for (let i = 0; i < totalChunks; i++) {
        // If all channels closed during transfer, abort
        if (activeChannels === 0) {
          throw new Error('All peers disconnected during transfer');
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const slice = file.slice(start, end);
        const arrayBuffer = await slice.arrayBuffer();

        // Construct payload: 36 bytes transferId header + chunk bytes
        const combined = new Uint8Array(headerBytes.length + arrayBuffer.byteLength);
        combined.set(headerBytes, 0);
        combined.set(new Uint8Array(arrayBuffer), headerBytes.length);

        activeChannels = 0;

        // Check backpressure on all open data channels
        for (const dc of openChannels) {
          if (dc.readyState === 'open') {
            activeChannels++;
            if (dc.bufferedAmount > BUFFERED_AMOUNT_HIGH_WATERMARK) {
              await new Promise((resolve) => {
                const onLow = () => {
                  dc.removeEventListener('bufferedamountlow', onLow);
                  resolve();
                };
                dc.addEventListener('bufferedamountlow', onLow);
                setTimeout(resolve, 50); // safety fallback timeout
              });
            }
            try {
              dc.send(combined.buffer);
            } catch (err) {
              console.warn('[webrtc] Error sending chunk:', err);
              dc.close();
            }
          }
        }

        const progress = Math.min(100, Math.round(((i + 1) / totalChunks) * 100));
        if (progress > lastProgress || i === totalChunks - 1) {
          lastProgress = progress;
          setTransfers((prev) => {
            const current = prev[transferId];
            if (!current) return prev;
            return {
              ...prev,
              [transferId]: {
                ...current,
                progress,
                status: progress >= 100 ? 'SENT' : 'PROGRESS',
              },
            };
          });
        }
      }

      // Create local object URL for instant preview
      const localUrl = URL.createObjectURL(file);
      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          ...prev[transferId],
          progress: 100,
          status: 'SENT',
          blob: file,
          url: localUrl,
        },
      }));

      return { transferId, url: localUrl };
    }

    // Fallback: REST upload if no direct P2P data channels are open
    try {
      setTransfers((prev) => ({
        ...prev,
        [transferId]: { ...prev[transferId], status: 'SENDING', progress: 20 },
      }));

      const formData = new FormData();
      if (roomId) formData.append('roomId', roomId);
      formData.append('file', file);

      const res = await fetch(`${SERVER_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      const uploadedFile = data.file;

      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          ...prev[transferId],
          progress: 100,
          status: 'SENT',
          url: `${SERVER_URL}${uploadedFile.url}`,
        },
      }));

      return { transferId, url: `${SERVER_URL}${uploadedFile.url}`, fileData: uploadedFile };
    } catch (err) {
      setTransfers((prev) => ({
        ...prev,
        [transferId]: {
          ...prev[transferId],
          status: 'FAILED',
          error: err.message || 'Transfer failed',
        },
      }));
      throw err;
    }
  }, [roomId, waitForAnyChannelOpen]);

  return {
    transfers,
    sendFile,
  };
}
