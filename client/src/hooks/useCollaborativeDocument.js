import { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { socket } from '../lib/socket';
const EMPTY_UPDATE = Y.mergeUpdates([]);
const encode = bytes => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
const decode = value => Uint8Array.from(atob(value), byte => byte.charCodeAt(0));

export function useCollaborativeDocument(kind, roomCode) {
  const key = `syntara:collaboration:${roomCode}:${kind}`;
  const [doc] = useState(() => {
    const document = new Y.Doc();
    try { const saved = sessionStorage.getItem(key); if (saved) Y.applyUpdate(document, decode(saved)); } catch { /* Ignore invalid local cache. */ }
    return document;
  });
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Connecting…');
  useEffect(() => {
    let timer, serverVector, stopped = false, sending = false, dirty = true;
    const persist = () => { try { sessionStorage.setItem(key, encode(Y.encodeStateAsUpdate(doc))); } catch { /* Document stays in memory. */ } };
    const sync = () => {
      clearTimeout(timer);
      timer = undefined;
      if (stopped || sending) return;
      if (!socket.connected) { setStatus('Offline — edits saved on this device'); return; }
      // On a fresh mount, learn the server vector before uploading cached history.
      const needsVector = !serverVector;
      const update = needsVector ? EMPTY_UPDATE : Y.encodeStateAsUpdate(doc, serverVector);
      sending = true; dirty = needsVector;
      setStatus('Syncing…');
      socket.timeout(10000).emit('document:sync', { kind, update: encode(update), stateVector: encode(Y.encodeStateVector(doc)) }, (err, response) => {
        sending = false;
        if (stopped) return;
        if (err || response?.error) {
          dirty = true;
          setStatus(response?.error || 'Connection lost — retrying…');
          if (err || response?.error === 'Join the room to sync.') timer = setTimeout(sync, 2000);
          return;
        }
        try { Y.applyUpdate(doc, decode(response.update), 'remote'); serverVector = decode(response.stateVector); }
        catch { setStatus('Unable to sync document'); return; }
        persist(); setReady(true);
        if (dirty) timer = setTimeout(sync, 50);
        else setStatus('Saved');
      });
    };
    const onUpdate = (_update, origin) => {
      persist();
      if (origin === 'remote') return;
      dirty = true; setStatus(socket.connected ? 'Syncing…' : 'Offline — edits saved on this device');
      if (!sending && !timer) timer = setTimeout(sync, 50);
    };
    const onRemote = payload => {
      if (payload.kind !== kind) return;
      try { Y.applyUpdate(doc, decode(payload.update), 'remote'); } catch { sync(); }
    };
    const onDisconnect = () => setStatus('Offline — edits saved on this device');
    doc.on('update', onUpdate);
    socket.on('document:update', onRemote);
    socket.on('connect', sync);
    socket.on('disconnect', onDisconnect);
    sync();
    return () => {
      stopped = true; clearTimeout(timer); persist();
      doc.off('update', onUpdate); socket.off('document:update', onRemote);
      socket.off('connect', sync); socket.off('disconnect', onDisconnect);
    };
  }, [doc, kind, key]);
  return { doc, ready, status };
}
