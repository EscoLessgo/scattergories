import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { socket } from '../socket';
import { authenticateDiscord, discord } from '../discord';
import { FaPlay, FaGamepad, FaUsers, FaGlobe } from 'react-icons/fa';
import { safeStorage } from '../utils/storage';

const Home = () => {
    const navigate = useNavigate();
    const [nickname, setNickname] = useState(safeStorage.getItem('nickname') || '');
    const [roomCode, setRoomCode] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        // Ensure socket is disconnected on home to avoid ghost sessions
        if (socket.connected) {
            socket.disconnect();
        }

        // Attempt Discord Authentication
        const performDiscordAuth = async () => {
            if (discord) {
                try {
                    const auth = await authenticateDiscord();
                    if (auth && auth.user) {
                        const user = auth.user;
                        // Set nickname from Discord profile
                        setNickname(user.global_name || user.username);

                        // Store avatar for Room to use (Room.jsx expects it in socket or logic)
                        // For now, we'll store in localStorage or just rely on Random Old Person fallback if we don't pass it.
                        // But we want to use the Discord Avatar if possible!
                        const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
                        safeStorage.setItem('discord_avatar', avatarUrl);
                    }
                } catch (e) {
                    console.error("Discord Auth Failed", e);
                }
            }
        };
        performDiscordAuth();
    }, []);

    const handleJoin = (e) => {
        e.preventDefault();
        if (!nickname.trim()) return alert("Please enter a nickname!");

        setIsConnecting(true);
        safeStorage.setItem('nickname', nickname);

        socket.auth = { nickname };
        socket.connect();

        // If room code provided, join that. Else join random/new.
        // We'll navigate to the room page, and let the Room component handle the actual socket 'join_room' event 
        // passing the nickname via state or just having the socket connected.
        // Actually, best practice: Connect here, wait for connect, then nav.

        socket.once('connect', () => {
            // We can navigate immediately, Room.jsx will handle the 'join_room' emit using the socket
            // Pass nickname in navigation state
            const target = roomCode ? `/room/${roomCode}` : `/room/${Math.random().toString(36).substring(2, 7)}`;
            navigate(target, { state: { nickname } });
        });

        socket.on('connect_error', (err) => {
            console.error('Connection failed:', err);
            alert('Connection failed: ' + err.message);
            setIsConnecting(false);
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px] opacity-20 animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px] opacity-20 animate-float" style={{ animationDelay: '-2s' }} />
            </div>

            <div className="z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-left space-y-6"
                >
                    <h1 className="text-6xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                        SCATTER<br />GORIES
                    </h1>
                    <p className="text-xl text-gray-300 font-light max-w-md leading-relaxed">
                        The ultimate fast-paced category word game. Race against time, outsmart your friends, and dominate the leaderboard.
                    </p>

                    <div className="flex gap-6 text-sm font-semibold text-gray-400">
                        <div className="flex items-center gap-2">
                            <FaGlobe className="text-indigo-400" /> Browser Based
                        </div>
                        <div className="flex items-center gap-2">
                            <FaUsers className="text-pink-400" /> Multiplayer
                        </div>
                    </div>
                </motion.div>

                {/* Login/Play Card */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div className="glass-panel p-8 md:p-10 w-full max-w-md mx-auto relative">
                        {/* Decorative glow */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur opacity-20 -z-10"></div>

                        <h2 className="text-2xl font-bold mb-6 text-center">Enter the Game</h2>

                        <form onSubmit={handleJoin} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-bold">Nickname</label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="e.g. WordMaster99"
                                    className="glass-input"
                                    maxLength={12}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2 font-bold">Room Code (Optional)</label>
                                <input
                                    type="text"
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value)}
                                    placeholder="Leave empty to create new"
                                    className="glass-input opacity-75"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isConnecting}
                                className="glass-button w-full flex items-center justify-center gap-3 mt-6 text-lg"
                            >
                                {isConnecting ? (
                                    <span className="animate-pulse">Connecting...</span>
                                ) : (
                                    <>
                                        <FaPlay /> Play Now
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-gray-700/50 text-center">
                            <button className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto">
                                <FaGamepad /> How to Play
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 left-0 w-full text-center text-xs text-gray-600">
                &copy; 2024 Velarix Entertainment. All rights reserved.
            </div>
        </div>
    );
};

export default Home;
