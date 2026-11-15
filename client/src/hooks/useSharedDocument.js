import { useState, useRef, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';

export function useSharedDocument(kind, initial, roomCode) {
  const key = `syntara:draft:${roomCode}:${kind}`;
  const [value, setValue] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(key)) || initial; } catch { return initial; }
  });
  const valueRef = useRef(value);
  const serverRef = useRef(initial);
  const [recovered] = useState(() => sessionStorage.getItem(key) !== null);
  const dirtyRef = useRef(recovered);
  const sendingRef = useRef(false);
  const timer = useRef(null);
  const [status, setStatus] = useState(recovered ? 'Recovered draft — review before saving' : 'Saved');
  const [conflict, setConflict] = useState(recovered ? initial : null);
  const conflictRef = useRef(conflict);
  const sendRef = useRef(null);
  const receive = useCallback((state) => {
    if ((state.revision || 0) <= (serverRef.current.revision || 0)) return;
    serverRef.current = state;
    if (dirtyRef.current) {
      conflictRef.current = state;
      setConflict(state);
      setStatus('Another edit arrived. Your draft is preserved.');
    } else {
      valueRef.current = state;
      setValue(state);
      setStatus('Saved');
    }
  }, []);
  useEffect(() => {
    socket.on(`${kind}:update`, receive);
    return () => { socket.off(`${kind}:update`, receive); clearTimeout(timer.current); };
  }, [kind, receive]);
  useEffect(() => { receive(initial); }, [initial, receive]);
  const save = useCallback(() => {
    if (!dirtyRef.current || sendingRef.current || conflictRef.current) return;
    if (!socket.connected) { setStatus('Offline — draft saved on this device'); return; }
    const snapshot = valueRef.current;
    sendingRef.current = true;
    setStatus('Syncing…');
    socket.timeout(10000).emit(`${kind}:update`, { ...snapshot, revision: serverRef.current.revision || 0 }, (err, response) => {
      sendingRef.current = false;
      if (err || response?.error) {
        if (response?.state) receive(response.state);
        else setStatus(response?.error || 'Not synced — retry when connected');
        return;
      }
      if (response.state.revision >= (serverRef.current.revision || 0)) serverRef.current = response.state;
      if (valueRef.current === snapshot && !conflictRef.current) {
        dirtyRef.current = false;
        sessionStorage.removeItem(key);
        valueRef.current = response.state;
        setValue(response.state);
        setStatus('Saved');
      } else if (!conflictRef.current) timer.current = setTimeout(() => sendRef.current?.(), 350);
    });
  }, [kind, key, receive]);
  useEffect(() => { sendRef.current = save; }, [save]);
  const change = useCallback((next) => {
    valueRef.current = next;
    dirtyRef.current = true;
    setValue(next);
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep in memory if storage is full. */ }
    setStatus(conflictRef.current ? 'Review conflicting edits before saving' : 'Unsaved changes');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => sendRef.current?.(), 350);
  }, [key]);
  const useLatest = () => {
    dirtyRef.current = false;
    conflictRef.current = null;
    setConflict(null);
    sessionStorage.removeItem(key);
    valueRef.current = serverRef.current;
    setValue(serverRef.current);
    setStatus('Saved');
  };
  const saveDraft = () => { conflictRef.current = null; setConflict(null); save(); };
  return { value, change, status, conflict, useLatest, saveDraft, retry: save };
}
