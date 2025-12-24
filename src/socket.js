import { io } from 'socket.io-client';

// Detect the correct socket URL
// In Discord, we're proxied so we use the current origin
// In development, use localhost
const getSocketUrl = () => {
    // Check if we're in a browser
    if (typeof window === 'undefined') {
        return 'http://127.0.0.1:3001';
    }

    // Check for explicit env variable first
    if (import.meta.env.VITE_SOCKET_URL) {
        return import.meta.env.VITE_SOCKET_URL;
    }

    // In production/Discord, use the page origin
    // This works because socket.io on the same server
    return window.location.origin;
};

const SOCKET_URL = getSocketUrl();

console.log('[Socket] URL:', SOCKET_URL);
console.log('[Socket] Current origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A');

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    // Use both transports for better compatibility
    transports: ['polling', 'websocket'],
    // Increase timeout for slower connections
    timeout: 20000,
    // Force new connection each time
    forceNew: true
});

// Debug listeners
socket.on('connect', () => {
    console.log('[Socket] ✅ Connected! ID:', socket.id);
});

socket.on('connect_error', (err) => {
    console.error('[Socket] ❌ Connection error:', err.message, err);
});

socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
});

socket.io.on('error', (err) => {
    console.error('[Socket] Transport error:', err);
});
