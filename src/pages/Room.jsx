import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { LuSettings, LuShare2, LuClock, LuUsers, LuSend, LuCheck, LuX, LuTrophy } from 'react-icons/lu';

import { socket } from '../socket';

export default function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate();
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
            handleStop(); // Auto-stop when time is up
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
            const cachedName = localStorage.getItem('stopots_name');
            if (cachedName) {
                socket.emit('join_room', { roomId, user: { name: cachedName, avatar: 0 } });
            } else {
                navigate('/');
                return;
            }
        }

        socket.emit('get_state', { roomId });

        function onRoomUpdate(updatedRoom) {
            if (!updatedRoom) return;
            setRoomData(updatedRoom);
            setGameState(updatedRoom.state);
            if (updatedRoom.currentLetter !== '?') {
                setLetter(updatedRoom.currentLetter);
            }

            // If we just moved to VOTING, and haven't sent answers yet, send them
            if (updatedRoom.state === 'VOTING' && gameState === 'PLAYING') {
                socket.emit('submit_answers', { roomId, answers });
            }
        }

        function onGameStarted({ letter }) {
            setLetter(letter);
            setAnswers({}); // Reset for new round
            setTimeLeft(60); // Reset timer
        }

        function onStopCalled({ stopperName }) {
            // No-op for now, room_update handles state
        }

        socket.on('room_update', onRoomUpdate);
        socket.on('game_started', onGameStarted);
        socket.on('stop_called', onStopCalled);

        return () => {
            socket.off('room_update', onRoomUpdate);
            socket.off('game_started', onGameStarted);
            socket.off('stop_called', onStopCalled);
        };
    }, [roomId, navigate, gameState, answers]);

    const startGame = () => {
        socket.emit('start_game', { roomId });
    };

    const handleStop = (finalAnswers) => {
        socket.emit('stop_round', { roomId, answers: finalAnswers || answers });
    };

    const players = roomData?.players || [];
    const categories = roomData?.categories || [];
    const currentLetter = roomData?.currentLetter || '?';
    const isHost = roomData?.hostId === socket.id;

    if (!roomData) return (
        <div className="h-screen flex items-center justify-center text-white font-mono animate-pulse">
            Connecting to room...
        </div>
    );

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-[radial-gradient(circle_at_center,_#241c35_0%,_#130f1e_100%)]">
            <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#130f1e]/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-blue)]">
                        LETTER LITTER
                    </h2>
                    <div className="px-3 py-1 rounded-full bg-white/5 text-xs font-mono text-white/50 border border-white/10">
                        Room: {roomId}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[var(--accent-2)]">
                        <LuClock size={18} />
                        <span className="font-mono font-bold">{gameState === 'PLAYING' ? timeLeft : '--'}</span>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <LuSettings size={20} className="text-white/60" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-64 bg-[#130f1e]/30 border-r border-white/5 p-4 flex flex-col gap-3 hidden md:flex">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Players ({players.length})</h3>
                    {players.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate">{p.name} {p.id === socket.id && '(You)'}</div>
                                <div className="text-xs text-white/40">{p.score} pts</div>
                            </div>
                            {p.ready && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>}
                            {p.isHost && <div className="ml-auto text-xs text-yellow-500">👑</div>}
                        </div>
                    ))}
                </div>

                <div className="flex-1 relative flex flex-col">
                    <AnimatePresence mode="wait">
                        {gameState === 'LOBBY' && (
                            <LobbyView key="lobby" onStart={startGame} isHost={isHost} playerCount={players.length} />
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
                                onNext={() => startGame()}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function VotingView({ roomData, players, categories, isHost, onNext }) {
    const roundData = roomData?.roundData || {};

    return (
        <motion.div
            className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black">VALIDATION</h2>
                {isHost && (
                    <button
                        onClick={onNext}
                        className="px-6 py-2 bg-[var(--accent-1)] rounded-lg font-bold"
                    >
                        NEXT ROUND
                    </button>
                )}
            </div>

            <div className="space-y-8">
                {categories.map(cat => (
                    <div key={cat} className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <span className="text-[var(--accent-1)]">#</span> {cat}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {players.map(p => {
                                const answer = roundData[p.id]?.[cat];
                                return (
                                    <div key={p.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-white/40 mb-1">{p.name}</div>
                                            <div className="text-lg font-bold text-white">{answer || <span className="text-red-500/50 italic">Empty</span>}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="w-8 h-8 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center hover:bg-green-500/40 transition-colors">
                                                <LuCheck size={18} />
                                            </button>
                                            <button className="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/40 transition-colors">
                                                <LuX size={18} />
                                            </button>
                                        </div>
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

function LobbyView({ onStart, isHost, playerCount }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 flex items-center justify-center p-8"
        >
            <div className="glass-panel p-8 max-w-2xl w-full text-center">
                <h2 className="text-3xl font-bold mb-2">Waiting for players...</h2>
                <p className="text-white/50 mb-8">{playerCount}/10 players</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2">
                        <div className="text-white/40 text-xs uppercase">Rounds</div>
                        <div className="text-xl font-bold">10</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2">
                        <div className="text-white/40 text-xs uppercase">Time</div>
                        <div className="text-xl font-bold">Fast</div>
                    </div>
                </div>

                {isHost ? (
                    <button
                        onClick={onStart}
                        className="w-full py-4 bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-blue)] rounded-xl font-bold text-lg shadow-lg hover:shadow-[0_0_30px_rgba(157,78,221,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        START GAME
                    </button>
                ) : (
                    <div className="w-full py-4 bg-white/5 rounded-xl text-white/50 font-medium animate-pulse">
                        Waiting for host to start...
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function SpinningView({ letter }) {
    return (
        <motion.div
            className="flex-1 flex items-center justify-center bg-black/80 absolute inset-0 z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="flex flex-col items-center">
                <div className="text-white/50 text-2xl font-bold mb-4 uppercase tracking-[1em]">The Letter Is</div>
                <motion.div
                    key={letter}
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-[var(--accent-2)] to-orange-600 drop-shadow-[0_0_50px_rgba(255,158,0,0.5)] leading-none"
                >
                    {letter}
                </motion.div>
            </div>
        </motion.div>
    );
}

function PlayingView({ letter, categories, onStop }) {
    const [answers, setAnswers] = useState(
        categories.reduce((acc, cat) => ({ ...acc, [cat]: '' }), {})
    );

    const handleChange = (cat, val) => {
        setAnswers(prev => ({ ...prev, [cat]: val }));
    };

    return (
        <motion.div
            className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--accent-2)] to-orange-600 flex items-center justify-center text-4xl font-black shadow-lg">
                        {letter}
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase font-bold tracking-widest">Current Letter</div>
                        <div className="text-2xl font-bold">Fill the blanks!</div>
                    </div>
                </div>
                <button
                    onClick={() => onStop(answers)}
                    className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-[0_4px_0_#991b1b] hover:shadow-[0_2px_0_#991b1b] hover:translate-y-[2px] transition-all text-xl"
                >
                    STOP!
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pb-20 custom-scrollbar pr-2">
                {categories.map((cat, i) => (
                    <motion.div
                        key={cat}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group"
                    >
                        <div className="bg-[#1e162e] border border-white/5 focus-within:border-[var(--accent-1)] focus-within:bg-[#2a1f3d] rounded-xl p-3 transition-colors duration-300">
                            <label className="text-xs font-bold text-white/30 uppercase block mb-1 ml-1 group-focus-within:text-[var(--accent-1)] transition-colors">{cat}</label>
                            <input
                                type="text"
                                value={answers[cat]}
                                onChange={(e) => handleChange(cat, e.target.value)}
                                autoFocus={i === 0}
                                className="w-full bg-transparent border-none outline-none text-lg font-bold text-white placeholder:text-white/10"
                                placeholder={`${cat} starting with ${letter}...`}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
