import { useState, useEffect } from 'react';
import { socket } from '../lib/socket';

/**
 * Tracks the global Socket.IO connection state independently of any specific room.
 * @returns {'connecting'|'connected'|'reconnecting'|'disconnected'}
 */
export function useConnectionState() {
  const [status, setStatus] = useState(() => {
    if (socket.connected) return 'connected';
    return 'connecting';
  });

  useEffect(() => {
    function onConnect() {
      setStatus('connected');
    }

    function onDisconnect(reason) {
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Explicitly disconnected
        setStatus('disconnected');
      } else {
        // Transport error, ping timeout, etc -> Will attempt reconnect
        setStatus('reconnecting');
      }
    }

    function onConnectError() {
      // Failed to connect initially or reconnect attempt failed
      setStatus(socket.active ? 'reconnecting' : 'disconnected');
    }

    // Manager events for reconnection
    socket.io.on('reconnect_attempt', () => {
      setStatus('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setStatus('disconnected');
    });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Initial check in case it changed between useState and useEffect
    if (socket.connected) {
      setStatus('connected');
    } else if (socket.active) {
      setStatus('connecting');
    } else {
      setStatus('disconnected');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt');
      socket.io.off('reconnect_failed');
    };
  }, []);

  return status;
}
