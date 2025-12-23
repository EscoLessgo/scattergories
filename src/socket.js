import { io } from 'socket.io-client';

// Use environment variable or default to local server
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:3001';

export const socket = io(SOCKET_URL, {
    autoConnect: false
});
