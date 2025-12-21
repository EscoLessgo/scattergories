import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';


const app = express();
app.use(cors());

// Serve static files from the React app (if built)
// We assume 'dist' is at the project root relative to server running
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

// Middleware to allow iframing (Critical for Discord)
app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy'); // Let Discord control CSP
    next();
});

// Diagnostic/Health Check
app.get('/health', (req, res) => res.send('OK'));

app.use(express.static(distPath));

// Catch-all handler for any request that doesn't match the above
// Using 'use' to match POST/GET/etc ensuring we never fallback to default 404
app.use('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');

    // Debug logging
    console.log(`[REQUEST] ${req.method} ${req.originalUrl} -> Serving ${indexPath}`);

    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error(`[ERROR] File not found or send failed: ${indexPath}`, err);
            // Only send error response if we haven't already replied
            if (!res.headersSent) {
                res.status(500).send(`
                    <h1>Server Error</h1>
                    <p>Could not find or serve <code>dist/index.html</code></p>
                    <p>Current Directory: ${__dirname}</p>
                    <p>Target Path: ${indexPath}</p>
                    <p>Error Detail: ${err.message}</p>
                `);
            }
        }
    });
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', ({ roomId, user, avatar }) => {
        // If no room ID provided, create one or join existing if purely for "Play" (random matching logic omitted for simplicity, defaulting to specific room join/create)
        // Actually, let's follow the request flow: users can "Play" (random) or "Create".
        // For now, Play -> joins a 'public' room or creates it if full/none.

        let targetRoomId = roomId;

        if (!targetRoomId) {
            // Simple matchmaking: find first open public room
            for (const [id, room] of rooms.entries()) {
                if (room.isPublic && room.players.length < room.maxPlayers && room.state === 'LOBBY') {
                    targetRoomId = id;
                    break;
                }
            }
            // If still no room, create a new public one
            if (!targetRoomId) {
                targetRoomId = generateRoomId();
                rooms.set(targetRoomId, {
                    id: targetRoomId,
                    players: [],
                    state: 'LOBBY', // LOBBY, SPINNING, PLAYING, VOTING, RESULTS
                    isPublic: true,
                    maxPlayers: 10,
                    hostId: socket.id,
                    currentLetter: '?',
                    categories: ['Name', 'Animal', 'Color', 'Country', 'Food', 'Movie', 'Brand', 'Object'],
                    roundData: {}
                });
            }
        }

        // Handle explicit room creation (if room doesn't exist yet but ID was forced, e.g. from URL)
        if (!rooms.has(targetRoomId)) {
            rooms.set(targetRoomId, {
                id: targetRoomId,
                players: [],
                state: 'LOBBY',
                isPublic: true,
                maxPlayers: 10,
                hostId: socket.id,
                currentLetter: '?',
                categories: ['Name', 'Animal', 'Color', 'Country', 'Food', 'Movie', 'Brand', 'Object'],
                roundData: {}
            });
        }

        const room = rooms.get(targetRoomId);

        // Check if player already exists
        const existingPlayerIndex = room.players.findIndex(p => p.id === socket.id);

        if (existingPlayerIndex !== -1) {
            // Update existing player
            room.players[existingPlayerIndex].name = user.name || room.players[existingPlayerIndex].name;
            room.players[existingPlayerIndex].avatar = user.avatar || room.players[existingPlayerIndex].avatar;
        } else {
            // Add new player
            const newPlayer = {
                id: socket.id,
                name: user.name || `Guest`,
                avatar: user.avatar || 0,
                score: 0,
                ready: false,
                isHost: room.players.length === 0, // First player is host
                status: 'idle'
            };
            room.players.push(newPlayer);
            socket.join(targetRoomId);
        }

        // Notify user of success
        socket.emit('joined_room', { roomId: targetRoomId, playerId: socket.id });

        // Broadcast update to room
        io.to(targetRoomId).emit('room_update', room);
    });

    socket.on('get_state', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room) {
            socket.emit('room_update', room);
        }
    });

    socket.on('start_game', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        if (room.hostId !== socket.id) return; // Only host can start

        room.state = 'SPINNING';
        room.roundData = {}; // Clear previous round answers
        io.to(roomId).emit('room_update', room);

        // Simulate spin delay on server or just trigger client animation
        // Ideally, server decides the letter immediately but tells clients to "spin"
        const validLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const letter = validLetters.charAt(Math.floor(Math.random() * validLetters.length));
        room.currentLetter = letter;

        // Give clients time to animate (e.g., 3 seconds)
        setTimeout(() => {
            room.state = 'PLAYING';
            // Reset player readiness/status for the round
            io.to(roomId).emit('game_started', { letter });
            io.to(roomId).emit('room_update', room);
        }, 3500);
    });

    socket.on('stop_round', ({ roomId, answers }) => {
        const room = rooms.get(roomId);
        if (!room || room.state !== 'PLAYING') return;

        room.state = 'VOTING';
        room.stopperId = socket.id;

        // Initialize roundData if not exists
        if (!room.roundData) room.roundData = {};
        if (answers) {
            room.roundData[socket.id] = answers;
        }

        io.to(roomId).emit('stop_called', {
            stopperId: socket.id,
            stopperName: room.players.find(p => p.id === socket.id)?.name
        });
        io.to(roomId).emit('room_update', room);
    });

    socket.on('submit_answers', ({ roomId, answers }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        if (!room.roundData) room.roundData = {};
        room.roundData[socket.id] = answers;

        // Check if all players have submitted (optional, or just wait for voting phase)
        io.to(roomId).emit('room_update', room);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        rooms.forEach((room, roomId) => {
            const index = room.players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                const wasHost = room.players[index].isHost;
                room.players.splice(index, 1);

                if (room.players.length === 0) {
                    rooms.delete(roomId);
                } else {
                    if (wasHost) {
                        room.players[0].isHost = true; // Assign new host
                    }
                    io.to(roomId).emit('room_update', room);
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
