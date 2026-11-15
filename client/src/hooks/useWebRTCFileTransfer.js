import { useState, useEffect, useRef, useCallback } from 'react';
import { socket, SERVER_URL, memberHeaders } from '../lib/socket';
const CHUNK = 16 * 1024;
const MAX_BYTES = 250 * 1024 * 1024;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export function useWebRTCFileTransfer({ roomId, myParticipantId, participants = {}, onFileReceived }) {
  const peers = useRef(new Map());
  const channels = useRef(new Map());
  const incoming = useRef(new Map());
  const receipts = useRef(new Map());
  const urls = useRef(new Set());
  const latest = useRef({ participants, onFileReceived });
  const [transfers, setTransfers] = useState({});
  useEffect(() => { latest.current = { participants, onFileReceived }; }, [participants, onFileReceived]);
  const update = useCallback((id, state) => setTransfers(prev => ({ ...prev, [id]: { ...prev[id], id, ...state } })), []);
  const objectUrl = file => { const url = URL.createObjectURL(file); urls.current.add(url); return url; };

  const createPeer = useCallback((id, initiator) => {
    if (peers.current.has(id)) return peers.current.get(id);
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.pendingIce = [];
    pc.remoteSocketId = latest.current.participants[id]?.socketId;
    peers.current.set(id, pc);
    pc.onicecandidate = e => { if (e.candidate) socket.emit('webrtc:signal', { targetParticipantId: id, signal: { type: 'ice', candidate: e.candidate } }); };
    const setup = dc => {
      channels.current.set(id, dc);
      dc.binaryType = 'arraybuffer';
      dc.bufferedAmountLowThreshold = 64 * 1024;
      dc.onmessage = ({ data }) => {
        try {
          if (typeof data === 'string') {
            const msg = JSON.parse(data);
            if (msg.type === 'receipt') { receipts.current.get(msg.transferId)?.add(id); return; }
            if (msg.type === 'cancel') { incoming.current.delete(`${id}:${msg.transferId}`); update(msg.transferId, { status: 'CANCELLED' }); return; }
            if (msg.type === 'start') {
              const reserved = [...incoming.current.values()].reduce((sum, t) => sum + t.fileSize, 0);
              if (!/^[a-f0-9-]{36}$/.test(msg.transferId) || !Number.isSafeInteger(msg.fileSize) || msg.fileSize < 0 || msg.fileSize > MAX_BYTES || reserved + msg.fileSize > MAX_BYTES || incoming.current.size >= 8) return;
              if (typeof msg.fileName !== 'string' || msg.fileName.length > 255) return;
              incoming.current.set(`${id}:${msg.transferId}`, { ...msg, chunks: [], bytes: 0, updated: Date.now() });
              update(msg.transferId, { fileName: msg.fileName, fileSize: msg.fileSize, status: 'RECEIVING', progress: 0, senderDisplayName: latest.current.participants[id]?.displayName || 'Participant' });
            }
            if (msg.type === 'end') {
              const transfer = incoming.current.get(`${id}:${msg.transferId}`);
              if (!transfer || transfer.bytes !== transfer.fileSize) return;
              const blob = new Blob(transfer.chunks, { type: transfer.fileType || 'application/octet-stream' });
              const url = objectUrl(blob);
              incoming.current.delete(`${id}:${msg.transferId}`);
              update(msg.transferId, { url, status: 'RECEIVED', progress: 100 });
              latest.current.onFileReceived?.({ ...transfer, blob, url, senderParticipantId: id, senderDisplayName: latest.current.participants[id]?.displayName || 'Participant' });
              dc.send(JSON.stringify({ type: 'receipt', transferId: msg.transferId }));
            }
          } else if (data instanceof ArrayBuffer && data.byteLength >= 36 && data.byteLength <= CHUNK + 36) {
            const transferId = new TextDecoder().decode(new Uint8Array(data, 0, 36));
            const transfer = incoming.current.get(`${id}:${transferId}`);
            if (!transfer) return;
            const chunk = data.slice(36);
            if (transfer.bytes + chunk.byteLength > transfer.fileSize) { incoming.current.delete(`${id}:${transferId}`); return; }
            transfer.chunks.push(chunk);
            transfer.bytes += chunk.byteLength;
            transfer.updated = Date.now();
            update(transferId, { status: 'RECEIVING', progress: Math.floor(transfer.bytes / Math.max(1, transfer.fileSize) * 100) });
          }
        } catch { /* Ignore malformed peer frames. */ }
      };
    };
    pc.ondatachannel = e => setup(e.channel);
    if (initiator) {
      setup(pc.createDataChannel('files', { ordered: true }));
      pc.createOffer().then(offer => pc.setLocalDescription(offer)).then(() => {
        socket.emit('webrtc:signal', { targetParticipantId: id, signal: { type: 'offer', sdp: pc.localDescription } });
      }).catch(() => {});
    }
    return pc;
  }, [update]);

  useEffect(() => {
    const peerMap = peers.current, channelMap = channels.current, incomingMap = incoming.current, urlSet = urls.current;
    const signal = async ({ senderParticipantId: id, signal: message }) => {
      if (!latest.current.participants[id] || id === myParticipantId) return;
      const pc = createPeer(id, false);
      try {
        if (message.type === 'ice') {
          if (pc.remoteDescription) await pc.addIceCandidate(message.candidate);
          else if (pc.pendingIce.length < 100) pc.pendingIce.push(message.candidate);
        } else if (message.type === 'offer' || message.type === 'answer') {
          await pc.setRemoteDescription(message.sdp);
          for (const candidate of pc.pendingIce.splice(0)) await pc.addIceCandidate(candidate);
          if (message.type === 'offer') {
            await pc.setLocalDescription(await pc.createAnswer());
            socket.emit('webrtc:signal', { targetParticipantId: id, signal: { type: 'answer', sdp: pc.localDescription } });
          }
        }
      } catch { /* sendFile will use authenticated fallback when negotiation fails. */ }
    };
    const resetPeers = () => {
      for (const pc of peerMap.values()) pc.close();
      peerMap.clear(); channelMap.clear();
    };
    socket.on('disconnect', resetPeers);
    socket.on('webrtc:signal', signal);
    const sweep = setInterval(() => {
      for (const [key, transfer] of incoming.current) if (Date.now() - transfer.updated > 60000) {
        incoming.current.delete(key);
        update(transfer.transferId, { status: 'FAILED' });
      }
    }, 10000);
    return () => {
      socket.off('webrtc:signal', signal);
      socket.off('disconnect', resetPeers);
      clearInterval(sweep);
      for (const pc of peerMap.values()) pc.close();
      peerMap.clear(); channelMap.clear(); incomingMap.clear();
      for (const url of urlSet) URL.revokeObjectURL(url);
      urlSet.clear();
    };
  }, [createPeer, myParticipantId, update]);
  useEffect(() => {
    if (!myParticipantId) return;
    // Refresh replaces socket IDs while participant IDs remain stable.
    for (const [id, pc] of peers.current) if (!participants[id] || participants[id].status !== 'connected' || pc.remoteSocketId !== participants[id].socketId) {
      pc.close(); peers.current.delete(id); channels.current.delete(id);
    }
    for (const [id, participant] of Object.entries(participants)) {
      if (id !== myParticipantId && participant.status === 'connected' && myParticipantId < id) createPeer(id, true);
    }
  }, [participants, myParticipantId, createPeer]);

  const sendFile = useCallback(async (file, caption = '') => {
    if (file.size > MAX_BYTES) throw new Error('Maximum file size is 250 MB.');
    const transferId = crypto.randomUUID();
    const recipients = Object.values(latest.current.participants).filter(p => p.participantId !== myParticipantId && p.status === 'connected').map(p => p.participantId);
    update(transferId, { fileName: file.name, fileSize: file.size, status: 'SENDING', progress: 0, isSender: true });
    const deadline = Date.now() + 5000;
    while (recipients.length && !recipients.every(id => channels.current.get(id)?.readyState === 'open') && Date.now() < deadline) await delay(100);
    if (recipients.length && recipients.every(id => channels.current.get(id)?.readyState === 'open')) {
      const received = new Set();
      receipts.current.set(transferId, received);
      const targets = recipients.map(id => channels.current.get(id));
      try {
        for (const dc of targets) dc.send(JSON.stringify({ type: 'start', transferId, fileName: file.name, fileSize: file.size, fileType: file.type, caption }));
        const header = new TextEncoder().encode(transferId);
        for (let offset = 0; offset < file.size; offset += CHUNK) {
          const bytes = new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer());
          const frame = new Uint8Array(36 + bytes.length); frame.set(header); frame.set(bytes, 36);
          for (const dc of targets) {
            const drainDeadline = Date.now() + 15000;
            while (dc.readyState === 'open' && dc.bufferedAmount > 256 * 1024 && Date.now() < drainDeadline) await delay(20);
            if (dc.readyState !== 'open' || dc.bufferedAmount > 256 * 1024) throw new Error('Peer transfer stalled.');
            dc.send(frame);
          }
          update(transferId, { progress: Math.min(99, Math.floor((offset + bytes.length) / file.size * 100)) });
        }
        for (const dc of targets) dc.send(JSON.stringify({ type: 'end', transferId }));
        const receiptDeadline = Date.now() + 15000;
        while (received.size < recipients.length && Date.now() < receiptDeadline) await delay(100);
        if (received.size !== recipients.length) throw new Error('Missing delivery receipts.');
        const url = objectUrl(file);
        update(transferId, { status: 'SENT', progress: 100, url });
        return { transferId, url, p2p: true, delivered: recipients.length };
      } catch {
        for (const dc of targets) if (dc.readyState === 'open') dc.send(JSON.stringify({ type: 'cancel', transferId }));
      } finally { receipts.current.delete(transferId); }
    }
    // A shared fallback URL covers every member when even one direct transfer fails.
    try {
      const body = new FormData(); body.append('file', file);
      const response = await fetch(`${SERVER_URL}/api/upload`, { method: 'POST', headers: memberHeaders(roomId), body, signal: AbortSignal.timeout(120000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed.');
      update(transferId, { status: 'SENT', progress: 100, url: `${SERVER_URL}${data.file.url}` });
      return { transferId, url: `${SERVER_URL}${data.file.url}`, fileData: data.file, p2p: false };
    } catch (error) { update(transferId, { status: 'FAILED', error: error.message }); throw error; }
  }, [roomId, myParticipantId, update]);
  return { transfers, sendFile };
}
