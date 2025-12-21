import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LuPlay, LuPlus, LuUsers, LuUser } from 'react-icons/lu';
import { socket } from '../socket';
import { discordSdk } from '../discord';

export default function Home() {
    const navigate = useNavigate();
    const [name, setName] = useState(localStorage.getItem('stopots_name') || '');
    const [avatar, setAvatar] = useState(parseInt(localStorage.getItem('stopots_avatar')) || 0);
    const [isDiscord, setIsDiscord] = useState(false);

    useEffect(() => {
        async function init() {
            if (location.search.includes('frame_id')) { // Basic check for Discord
                try {
                    setIsDiscord(true);
                    // In a real app we'd fully auth here
                    // For now, we just acknowledge the environment
                } catch (e) {
                    console.error("Discord SDK Error", e);
                }
            }

            socket.connect();
            function onJoined({ roomId }) {
                navigate(`/room/${roomId}`);
            }
            socket.on('joined_room', onJoined);
            return () => socket.off('joined_room', onJoined);
        }
        init();
    }, [navigate]);

    const saveProfile = () => {
        if (!name.trim()) return false;
        localStorage.setItem('stopots_name', name);
        localStorage.setItem('stopots_avatar', avatar);
        return true;
    };

    const handlePlay = () => {
        if (!saveProfile()) return alert('Please enter a name!');
        socket.emit('join_room', { roomId: null, user: { name, avatar } });
    };

    const handleCreate = () => {
        if (!saveProfile()) return alert('Please enter a name!');
        const newRoomId = Math.random().toString(36).substring(2, 7);
        socket.emit('join_room', { roomId: newRoomId, user: { name, avatar } });
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
            {/* Background Animated Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-white/5 font-bold text-6xl"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                            rotate: Math.random() * 360
                        }}
                        animate={{
                            y: [null, Math.random() * -100],
                            rotate: [null, Math.random() * 360 + 180]
                        }}
                        transition={{
                            duration: 20 + Math.random() * 20,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    >
                        {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="glass-panel w-full max-w-md p-8 relative z-10"
            >
                <div className="text-center mb-8">
                    <motion.h1
                        className="text-5xl font-black mb-2 tracking-tight"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                    >
                        <span className="text-white">LETTER</span>
                        <span className="text-[#00d2ff]">LITTER</span>
                    </motion.h1>
                    <p className="text-white/60 text-sm font-medium tracking-widest uppercase">The Categories Game</p>
                </div>

                <div className="flex flex-col items-center gap-6 mb-8">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAvatar((prev) => (prev + 1) % 5)}
                        className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-blue)] p-1 cursor-pointer shadow-lg shadow-purple-500/20"
                    >
                        <div className="w-full h-full bg-[#1a0b2e] rounded-full flex items-center justify-center overflow-hidden relative">
                            <LuUser size={40} className="text-white/80" />
                            <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold">CHANGE</div>
                        </div>
                    </motion.button>

                    <div className="w-full relative">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your nickname..."
                            className="w-full bg-[#00000030] border border-white/10 rounded-xl px-4 py-4 text-center text-white font-bold text-lg focus:border-[var(--accent-blue)] focus:bg-[#00000050] transition-all outline-none placeholder:text-white/20"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <MenuButton
                        icon={<LuPlay fill="currentColor" />}
                        text="PLAY NOW"
                        sub="Join a random room"
                        color="bg-gradient-to-r from-[#ff9e00] to-[#ff6a00]"
                        onClick={handlePlay}
                        delay={0.1}
                    />
                    <MenuButton
                        icon={<LuPlus />}
                        text="CREATE ROOM"
                        sub="Host a game for friends"
                        color="bg-gradient-to-r from-[var(--accent-1)] to-[#7b2cbf]"
                        onClick={handleCreate}
                        delay={0.2}
                    />
                    <MenuButton
                        icon={<LuUsers />}
                        text="ROOMS"
                        sub="Browse public rooms"
                        color="bg-gradient-to-r from-[#4361ee] to-[#3a0ca3]"
                        onClick={() => { }}
                        delay={0.3}
                    />
                </div>

                <div className="mt-8 flex gap-4 text-xs text-white/30 justify-center">
                    <a href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</a>
                    <span>•</span>
                    <a href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a>
                </div>
            </motion.div>
        </div>
    );
}

function MenuButton({ icon, text, sub, color, onClick, delay }) {
    return (
        <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + delay }}
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`w-full p-1 rounded-xl group relative overflow-hidden`}
        >
            <div className={`absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity ${color}`}></div>
            <div className="relative bg-[#130f1e] m-[1px] rounded-[11px] p-3 flex items-center gap-4 group-hover:bg-[#130f1e]/90 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-inner ${color}`}>
                    {icon}
                </div>
                <div className="text-left">
                    <div className="text-white font-bold leading-tight">{text}</div>
                    <div className="text-white/40 text-xs font-medium">{sub}</div>
                </div>
            </div>
        </motion.button>
    );
}
