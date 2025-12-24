import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';


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

// DEBUG: Endpoint to list files in dist (Helpful for 'File Not Found' debugging)
app.get('/debug-dist', (req, res) => {
    try {
        const rootFiles = fs.readdirSync(distPath);
        let assetsFiles = [];
        try {
            assetsFiles = fs.readdirSync(path.join(distPath, 'assets'));
        } catch (e) { assetsFiles = [`No assets dir: ${e.message}`]; }

        res.json({
            distPath,
            rootFiles,
            assetsFiles
        });
    } catch (e) {
        res.status(500).json({ error: e.message, distPath });
    }
});

// Serve static files with efficient caching
// Assets (JS/CSS) have hashes in filenames, so they can be cached "forever"
app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '1y',
    immutable: true
}));

// Serve other static files (like favicon, public dir content) normally
app.use(express.static(distPath));

// Catch-all handler for any request that doesn't match the above
// Serve index.html with NO CACHE to ensure users always get the latest build references
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error(`[ERROR] Sendfile failed for ${indexPath}`, err);
            if (!res.headersSent) {
                res.status(500).send("Server Error: Could not find client build.");
            }
        }
    });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Game State Storage (Memory)
const rooms = new Map();

// Helper to generate room ID
const generateRoomId = () => Math.random().toString(36).substring(2, 7);

// Calculate scores based on votes
// votes structure: { playerId: { category: { answererPlayerId: boolean (valid or not) } } }
const calculateScores = (room) => {
    const roundScores = {};
    const categories = room.categories || [];

    // Initialize round scores
    room.players.forEach(p => {
        roundScores[p.id] = 0;
    });

    // For each category, check votes
    categories.forEach(category => {
        // Count votes per player's answer for this category
        const answerVotes = {}; // { playerId: { valid: count, invalid: count } }

        room.players.forEach(player => {
            answerVotes[player.id] = { valid: 0, invalid: 0 };
        });

        // Tally votes
        Object.entries(room.votes || {}).forEach(([voterId, voterVotes]) => {
            const categoryVotes = voterVotes[category] || {};
            Object.entries(categoryVotes).forEach(([answererPlayerId, isValid]) => {
                if (answerVotes[answererPlayerId]) {
                    if (isValid) {
                        answerVotes[answererPlayerId].valid++;
                    } else {
                        answerVotes[answererPlayerId].invalid++;
                    }
                }
            });
        });

        // Award points - majority vote wins
        Object.entries(answerVotes).forEach(([playerId, votes]) => {
            // If more valid votes than invalid, award points
            if (votes.valid > votes.invalid) {
                // Check if answer is unique
                const playerAnswer = room.roundData[playerId]?.[category]?.toLowerCase().trim() || '';
                if (!playerAnswer) return;

                // Count how many players have the same answer
                let sameAnswerCount = 0;
                Object.entries(room.roundData || {}).forEach(([otherId, otherAnswers]) => {
                    const otherAnswer = otherAnswers[category]?.toLowerCase().trim() || '';
                    if (otherAnswer === playerAnswer) {
                        sameAnswerCount++;
                    }
                });

                // Unique answer = 10 points, shared answer = 5 points
                const points = sameAnswerCount === 1 ? 10 : 5;
                roundScores[playerId] += points;
            }
        });
    });

    // Apply round scores to players
    room.players.forEach(player => {
        player.score += roundScores[player.id] || 0;
    });

    room.lastRoundScores = roundScores;
    console.log('[Scoring] Round scores:', roundScores);
};

app.use(express.json());

import 'dotenv/config';

// Discord Auth removed for standalone web app
app.post('/api/validate-session', (req, res) => {
    // Simple session validation mock if needed
    res.send({ valid: true });
});

app.post('/api/token', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).send({ error: 'No code provided' });

        const params = new URLSearchParams({
            client_id: process.env.VITE_DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.VITE_DISCORD_REDIRECT_URI || 'http://localhost:5173', // Must match one in Developer Portal exactly
        });

        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Discord Token Error:', data);
            return res.status(response.status).send(data);
        }

        res.send({ access_token: data.access_token });
    } catch (e) {
        console.error('Token Exchange Failed:', e);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

// Catch-all handler for any request that doesn't match the above
// Using 'use' to match POST/GET/etc ensuring we never fallback to default 404
// Request Logger
app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
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
            socket.join(targetRoomId); // Ensure socket is joined
        } else {
            // Add new player
            const newPlayer = {
                id: socket.id,
                name: user.name || `Guest ${Math.floor(Math.random() * 1000)}`,
                avatar: user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + socket.id,
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

    socket.on('get_rooms', () => {
        const publicRooms = Array.from(rooms.values())
            .filter(r => r.isPublic && r.state === 'LOBBY')
            .map(r => ({
                id: r.id,
                players: r.players.length,
                maxPlayers: r.maxPlayers,
                host: r.players.find(p => p.isHost)?.name || 'Unknown'
            }));
        socket.emit('rooms_list', publicRooms);
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

    // Handle vote submissions
    socket.on('submit_votes', ({ roomId, votes }) => {
        const room = rooms.get(roomId);
        if (!room || room.state !== 'VOTING') return;

        // Store votes
        if (!room.votes) room.votes = {};
        room.votes[socket.id] = votes;

        // Check if all players have voted
        const playersWhoAnswered = Object.keys(room.roundData || {});
        const playersWhoVoted = Object.keys(room.votes);

        console.log(`[Votes] ${playersWhoVoted.length}/${room.players.length} players voted`);

        // If all players have voted, calculate scores
        if (playersWhoVoted.length >= room.players.length) {
            calculateScores(room);
            room.state = 'RESULTS';
            io.to(roomId).emit('round_results', {
                scores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
                roundScores: room.lastRoundScores
            });
            io.to(roomId).emit('room_update', room);
        } else {
            io.to(roomId).emit('room_update', room);
        }
    });

    // Force end voting (host only)
    socket.on('end_voting', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room || room.state !== 'VOTING') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player?.isHost) return;

        calculateScores(room);
        room.state = 'RESULTS';
        io.to(roomId).emit('round_results', {
            scores: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
            roundScores: room.lastRoundScores
        });
        io.to(roomId).emit('room_update', room);
    });

    // Return to lobby
    socket.on('return_to_lobby', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player?.isHost) return;

        room.state = 'LOBBY';
        room.roundData = {};
        room.votes = {};
        room.currentLetter = '?';
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
