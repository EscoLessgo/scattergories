import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LuSettings, LuClock, LuUsers, LuCheck, LuX } from 'react-icons/lu';
import { FaCrown, FaPaperPlane } from 'react-icons/fa';

import { socket } from '../socket';

export default function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [roomData, setRoomData] = useState(null);
    const [gameState, setGameState] = useState('LOBBY');
    const [letter, setLetter] = useState('?');
    const [timeLeft, setTimeLeft] = useState(60);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        let timer;
        if (gameState === 'PLAYING' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && gameState === 'PLAYING') {
            handleStop(); // Auto-stop
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    useEffect(() => {
        const nickname = location.state?.nickname || localStorage.getItem('nickname');

        if (!nickname) {
            navigate('/');
            return;
        }

        if (!socket.connected) {
            socket.auth = { nickname };
            socket.connect();
        }

        // Always attempt join (idempotent on server usually, or handles reconnects)
        socket.emit('join_room', { roomId, user: { name: nickname } });

        function onRoomUpdate(updatedRoom) {
            if (!updatedRoom) return;
            setRoomData(updatedRoom);
            setGameState(updatedRoom.state);
            if (updatedRoom.currentLetter !== '?') {
                setLetter(updatedRoom.currentLetter);
            }
            // Sync mechanics
            if (updatedRoom.state === 'VOTING' && gameState === 'PLAYING') {
                socket.emit('submit_answers', { roomId, answers });
            }
        }

        function onGameStarted({ letter }) {
            setLetter(letter);
            setAnswers({}); // Reset
            setTimeLeft(60);
        }

        socket.on('room_update', onRoomUpdate);
        socket.on('game_started', onGameStarted);

        return () => {
            socket.off('room_update', onRoomUpdate);
            socket.off('game_started', onGameStarted);
        };
    }, [roomId, navigate, location.state, answers, gameState]); // Added gameState/answers to dependency for submit trigger

    const startGame = () => {
        socket.emit('start_game', { roomId });
    };

    const handleStop = (finalAnswers) => {
        // Send current answers immediately just in case
        const currentAnswers = finalAnswers || answers;
        socket.emit('stop_round', { roomId, answers: currentAnswers });
    };

    const players = roomData?.players || [];
    const categories = roomData?.categories || [];
    const currentLetter = roomData?.currentLetter || '?';
    const isHost = roomData?.hostId === socket.id;

    if (!roomData) return (
        <div className="h-screen flex flex-col items-center justify-center text-white font-mono animate-pulse bg-[var(--bg-primary)]">
            <div className="w-16 h-16 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
            Connecting to Room...
        </div>
    );

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-primary)] text-white relative">
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent-primary)] rounded-full blur-[150px] opacity-10" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent-secondary)] rounded-full blur-[150px] opacity-10" />
            </div>

            {/* Header */}
            <header className="h-20 border-b border-[var(--glass-border)] flex items-center justify-between px-6 z-10 bg-[var(--glass-bg)] backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <h2
                        onClick={() => navigate('/')}
                        className="text-2xl font-black tracking-tighter cursor-pointer hover:opacity-80 transition-opacity bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500"
                    >
                        LETTER LEGENDS
                    </h2>
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Room Code</span>
                        <span className="font-mono font-bold text-[var(--accent-primary)] select-all">{roomId}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {gameState === 'PLAYING' && (
                        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full">
                            <LuClock className="text-red-400" />
                            <span className="font-mono font-bold text-red-400 text-lg w-8 text-center">{timeLeft}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/20 shadow-lg">
                            <span className="font-bold text-sm">You</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden z-10 relative">

                {/* Sidebar - Players */}
                <div className="w-80 border-r border-[var(--glass-border)] bg-[rgba(10,10,12,0.5)] backdrop-blur-sm flex flex-col hidden lg:flex">
                    <div className="p-6 border-b border-[var(--glass-border)]">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <LuUsers /> Players ({players.length})
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {players.map(p => (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={p.id}
                                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                            >
                                <img src={p.avatar} alt="avatar" className="w-10 h-10 rounded-full bg-gray-800" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate flex items-center gap-2">
                                        {p.name}
                                        {p.isHost && <FaCrown className="text-yellow-400 text-xs" />}
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono">{p.score} pts</div>
                                </div>
                                {p.id === socket.id && <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-primary)]"></div>}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Game Area */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    <AnimatePresence mode="wait">
                        {gameState === 'LOBBY' && (
                            <LobbyView key="lobby" onStart={startGame} isHost={isHost} players={players} />
                        )}
                        {gameState === 'SPINNING' && (
                            <SpinningView key="spinning" letter={currentLetter} />
                        )}
                        {gameState === 'PLAYING' && (
                            <PlayingView
                                key="playing"
                                letter={currentLetter}
                                categories={categories}
                                onStop={handleStop}
                                answers={answers}
                                setAnswers={setAnswers}
                            />
                        )}
                        {gameState === 'VOTING' && (
                            <VotingView
                                key="voting"
                                roomData={roomData}
                                players={players}
                                categories={categories}
                                isHost={isHost}
                                onNext={() => startGame()} // Restart/Next Round
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// --- Sub-Components ---

function LobbyView({ onStart, isHost, players }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent"
        >
            <div className="glass-panel p-12 max-w-2xl w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                <h2 className="text-4xl font-black mb-4">LOBBY</h2>
                <div className="w-24 h-1 bg-white/10 mx-auto rounded-full mb-8"></div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    {players.map((p) => (
                        <div key={p.id} className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full border-2 border-[var(--glass-border)] overflow-hidden">
                                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs font-bold truncate max-w-full">{p.name}</span>
                        </div>
                    ))}
                    {Array.from({ length: Math.max(0, 8 - players.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="flex flex-col items-center gap-2 opacity-30">
                            <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                                <LuUsers />
                            </div>
                            <span className="text-xs">Waiting...</span>
                        </div>
                    ))}
                </div>

                {isHost ? (
                    <button
                        onClick={onStart}
                        className="glass-button w-full text-xl flex items-center justify-center gap-3 group"
                    >
                        START GAME <FaPaperPlane className="group-hover:translate-x-1 transition-transform" />
                    </button>
                ) : (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-gray-400 animate-pulse">
                        Waiting for host to start the game...
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function SpinningView({ letter }) {
    return (
        <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="text-center relative">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-2xl font-bold uppercase tracking-[0.5em] text-gray-400 mb-8"
                >
                    The Letter Is
                </motion.div>
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-[80px] opacity-50"></div>
                    <motion.h1
                        key={letter}
                        initial={{ y: 50, opacity: 0, rotateX: 90 }}
                        animate={{ y: 0, opacity: 1, rotateX: 0 }}
                        className="text-[15rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-2xl relative z-10"
                    >
                        {letter}
                    </motion.h1>
                </div>
            </div>
        </motion.div>
    );
}

function PlayingView({ letter, categories, onStop, answers, setAnswers }) {
    const handleChange = (cat, val) => {
        setAnswers(prev => ({ ...prev, [cat]: val }));
    };

    return (
        <motion.div
            className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-5xl font-black shadow-2xl border border-white/20">
                        {letter}
                    </div>
                    <div>
                        <div className="text-[var(--accent-primary)] font-bold text-sm uppercase tracking-widest mb-1">Round Active</div>
                        <h2 className="text-3xl font-bold">Fill in the blanks!</h2>
                    </div>
                </div>
                <button
                    onClick={() => onStop()}
                    className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-[0_4px_20px_rgba(220,38,38,0.4)] transition-all hover:scale-105 active:scale-95"
                >
                    STOP!
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-32 pr-2">
                {categories.map((cat, i) => (
                    <motion.div
                        key={cat}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group"
                    >
                        <div className="glass-panel p-5 hover:bg-white/5 transition-colors duration-300 border-l-4 border-l-transparent hover:border-l-[var(--accent-primary)]">
                            <label className="text-xs font-bold text-gray-400 uppercase block mb-3 pl-1">{cat}</label>
                            <input
                                type="text"
                                value={answers[cat] || ''}
                                onChange={(e) => handleChange(cat, e.target.value)}
                                className="w-full bg-black/20 text-white rounded-lg px-4 py-3 text-lg font-bold border border-transparent focus:border-[var(--accent-primary)] focus:bg-black/40 focus:outline-none transition-all placeholder:text-gray-700"
                                placeholder={`...starts with ${letter}`}
                                autoComplete="off"
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

function VotingView({ roomData, players, categories, isHost, onNext }) {
    const roundData = roomData?.roundData || {};
    // Local state for votes could go here, but for now we visualize

    return (
        <motion.div
            className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h2 className="text-3xl font-black">VALIDATION</h2>
                    <p className="text-gray-400">Review answers. The host will proceed.</p>
                </div>
                {isHost ? (
                    <button
                        onClick={onNext}
                        className="glass-button"
                    >
                        NEXT ROUND &rarr;
                    </button>
                ) : (
                    <div className="text-sm font-bold text-[var(--accent-primary)] animate-pulse">
                        Host is reviewing...
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-4 pb-20">
                {categories.map(cat => (
                    <div key={cat} className="space-y-4">
                        <div className="flex items-center gap-3 sticky top-0 bg-[var(--bg-primary)]/90 backdrop-blur z-10 py-2 border-b border-white/5">
                            <span className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center font-bold text-white">#</span>
                            <h3 className="text-xl font-bold">{cat}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {players.map(p => {
                                const answer = roundData[p.id]?.[cat];
                                const isEmpty = !answer || answer.trim() === '';
                                return (
                                    <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between group transition-all ${isEmpty ? 'bg-red-500/5 border-red-500/10 opacity-60' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                        <div className="min-w-0 flex-1 mr-4">
                                            <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                                                <img src={p.avatar} className="w-4 h-4 rounded-full" /> {p.name}
                                            </div>
                                            <div className={`text-lg font-bold ${isEmpty ? 'text-red-400 italic' : 'text-white'}`}>
                                                {isEmpty ? 'No Answer' : answer}
                                            </div>
                                        </div>
                                        {!isEmpty && (
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                                                    <LuX size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
