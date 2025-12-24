import { io } from 'socket.io-client';

// In production, ALWAYS use the current page origin
// The socket server runs on the same domain
const getSocketUrl = () => {
    if (typeof window === 'undefined') {
        return 'http://127.0.0.1:3001';
    }

    const origin = window.location.origin;

    // If we're on localhost, allow env override for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:3001';
    }

    // In production (Discord/Railway), ALWAYS use origin
    // This ensures we connect to the same domain the app is served from
    return origin;
};

const SOCKET_URL = getSocketUrl();

console.log('[Socket] URL:', SOCKET_URL);

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['polling', 'websocket'],
    timeout: 20000,
    forceNew: true
});

socket.on('connect', () => {
    console.log('[Socket] ✅ Connected! ID:', socket.id);
});

socket.on('connect_error', (err) => {
    console.error('[Socket] ❌ Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
});
