import { io } from 'socket.io-client';

// In production/Discord, connect to the same origin
// In development, use the configured URL or localhost
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3001');

console.log('[Socket] Connecting to:', SOCKET_URL);

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'] // Prefer websocket but allow polling fallback
});

// Debug listeners
socket.on('connect', () => {
    console.log('[Socket] Connected! ID:', socket.id);
});

socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
});
