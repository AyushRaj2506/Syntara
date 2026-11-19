import { useSyncExternalStore } from 'react';
import { socket } from '../lib/socket';

let status = 'disconnected';
const listeners = new Set();
function publish(next) {
  status = next;
  for (const listener of listeners) listener();
}
socket.on('connect', () => publish('connected'));
socket.on('disconnect', () => publish(socket.active ? 'reconnecting' : 'disconnected'));
socket.on('connect_error', () => publish(socket.active ? 'reconnecting' : 'disconnected'));
socket.io.on('reconnect_attempt', () => publish('reconnecting'));
socket.io.on('reconnect_failed', () => publish('disconnected'));
socket.io.on('open', () => publish('connecting'));

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  if (socket.connected) return 'connected';
  if (socket.active && status === 'disconnected') return 'connecting';
  return status;
}

export function useConnectionState() {
  return useSyncExternalStore(subscribe, snapshot);
}
