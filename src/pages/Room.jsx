import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LuSettings, LuClock, LuUsers, LuCheck, LuX, LuRotateCcw, LuSend } from 'react-icons/lu';
import { FaCrown, FaStop } from 'react-icons/fa';
import { socket } from '../socket';
import { discord, authenticateDiscord } from '../discord';
import { safeStorage } from '../utils/storage';

const getRandomAvatar = (seed) => {
    // Use DiceBear 'avataaars' or 'miniavs' for fun cartoon avatars
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
};

export default function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [roomData, setRoomData] = useState(null);
    const [gameState, setGameState] = useState('LOBBY');
    const [letter, setLetter] = useState('?');
    const [timeLeft, setTimeLeft] = useState(90);
    const [answers, setAnswers] = useState({});

    // Discord State
    const [isDiscordEnvironment, setIsDiscordEnvironment] = useState(false);

    useEffect(() => {
        // Discord SDK Init
        const initDiscord = async () => {
            if (discord) {
                try {
                    await discord.ready();
                    setIsDiscordEnvironment(true);
                    // Could auto-auth here if needed
                    console.log("Discord SDK Ready");
                } catch (e) {
                    console.error("Discord SDK Init Fail", e);
                }
            }
        };
        initDiscord();
    }, []);

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
        // If nickname was set in previous socket session, it might persist, but if navigating directly or refresh:
        const storedNickname = location.state?.nickname || safeStorage.getItem('nickname');

        if (!storedNickname) {
            navigate('/');
            return;
        }

        // We use the nickname to generate a specific "Old Person" avatar here, OR use Discord avatar
        // Ideally this would be set on the server or passed during join
        const discordAvatar = safeStorage.getItem('discord_avatar');
        const avatarUrl = discordAvatar || getRandomAvatar(storedNickname + roomId);

        if (!socket.connected) {
            socket.auth = { nickname: storedNickname };
            socket.on('connect_error', (err) => {
                console.error("Socket Connect Error", err);
                navigate('/');
            });
            socket.connect();
        }

        // Update the join_room emit to include our new "old person" avatar
        socket.emit('join_room', {
            roomId,
            user: {
                name: storedNickname,
                avatar: avatarUrl
            }
        });

        function onRoomUpdate(updatedRoom) {
            if (!updatedRoom) return;
            setRoomData(updatedRoom);
            setGameState(updatedRoom.state);
            if (updatedRoom.currentLetter !== '?') {
                setLetter(updatedRoom.currentLetter);
            }
            if (updatedRoom.state === 'VOTING' && gameState === 'PLAYING') {
                socket.emit('submit_answers', { roomId, answers });
            }
        }

        function onGameStarted({ letter }) {
            setLetter(letter);
            setAnswers({}); // Reset
            setTimeLeft(90);
        }

        socket.on('room_update', onRoomUpdate);
        socket.on('game_started', onGameStarted);

        return () => {
            socket.off('room_update', onRoomUpdate);
            socket.off('game_started', onGameStarted);
        };
    }, [roomId, navigate, location.state, answers, gameState]);

    const startGame = () => {
        socket.emit('start_game', { roomId });
    };

    const handleStop = (finalAnswers) => {
        const currentAnswers = finalAnswers || answers;
        socket.emit('stop_round', { roomId, answers: currentAnswers });
    };

    const players = roomData?.players || [];
    const categories = roomData?.categories || [];
    const currentLetter = roomData?.currentLetter || '?';
    const isHost = roomData?.hostId === socket.id;

    if (!roomData) return (
        <div className="h-screen flex items-center justify-center bg-[#1a1a1a] text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-[#1a1a1a] text-white font-['Outfit']">
            {/* Header / Navbar */}
            <header className="h-16 bg-[#252525] border-b border-[#333] flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold bg-yellow-400 text-black px-3 py-1 rounded-md tracking-tight uppercase">
                        SCATTERGORIES
                    </h1>
                </div>

                {/* Center Timer (Visible during game) */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                    {gameState === 'PLAYING' && (
                        <div className={`text-2xl font-black tabular-nums ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                            {timeLeft}s
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Room Code</span>
                        <span className="text-sm font-mono text-gray-300 bg-[#333] px-2 rounded cursor-pointer select-all">{roomId}</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Sidebar (Players) - Always visible on Desktop */}
                <aside className="w-64 bg-[#202020] border-r border-[#333] hidden md:flex flex-col z-10 transition-all duration-300">
                    <div className="p-4 border-b border-[#333]">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <LuUsers /> Players ({players.length})
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {players.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#2a2a2a] hover:bg-[#333] transition-colors border border-transparent hover:border-gray-700">
                                <img src={p.avatar || getRandomAvatar(p.name)} alt="avatar" className="w-10 h-10 rounded-full object-cover player-avatar shadow-sm" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate flex items-center gap-2 text-gray-200">
                                        {p.name}
                                        {p.isHost && <FaCrown className="text-yellow-500 text-[10px]" />}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono">{p.score} pts</div>
                                </div>
                                {p.id === socket.id && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Center Stage */}
                <main className="flex-1 overflow-hidden relative bg-[#1a1a1a] flex flex-col">
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
                                onNext={() => startGame()}
                                roomId={roomId}
                            />
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

// --- Sub Components ---

function LobbyView({ onStart, isHost, players }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center p-8 text-center"
        >
            <div className="mb-12">
                <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Waiting for players...</h2>
                <p className="text-gray-400 max-w-md mx-auto">
                    Share the room code or invite friends to start the match.
                </p>
            </div>

            <div className="flex flex-wrap justify-center gap-8 max-w-5xl mb-16">
                {players.map((p) => (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        key={p.id}
                        className="flex flex-col items-center gap-3 w-28"
                    >
                        <div className="w-24 h-24 rounded-full border-4 border-[#333] overflow-hidden shadow-2xl bg-[#252525] relative group">
                            <img src={p.avatar || getRandomAvatar(p.name)} alt={p.name} className="w-full h-full object-cover player-avatar" />
                            {p.isHost && <div className="absolute top-0 right-0 bg-yellow-400 text-black p-1 rounded-full text-xs box-content border-2 border-[#252525]"><FaCrown /></div>}
                        </div>
                        <span className="text-sm font-bold text-gray-300 truncate w-full px-2 py-1 bg-[#252525] rounded-md">{p.name}</span>
                    </motion.div>
                ))}
            </div>

            {isHost ? (
                <button
                    onClick={onStart}
                    className="liquid-btn group"
                >
                    <span>START GAME</span>
                    <LuSend className="ml-3 group-hover:translate-x-1 transition-transform inline mb-1" />
                </button>
            ) : (
                <div className="flex items-center gap-3 px-8 py-4 bg-[#252525] rounded-full text-gray-400 border border-[#333]">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                    Waiting for host...
                </div>
            )}
        </motion.div>
    );
}

function SpinningView({ letter }) {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-[#1a1a1a]">
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 360, 720]
                }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="text-gray-500 text-2xl font-bold uppercase tracking-widest mb-8"
            >
                Rolling...
            </motion.div>
            <motion.h1
                key={letter}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 drop-shadow-2xl"
            >
                {letter}
            </motion.h1>
        </div>
    );
}

function PlayingView({ letter, categories, onStop, answers, setAnswers }) {
    const handleChange = (cat, val) => {
        setAnswers(prev => ({ ...prev, [cat]: val }));
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4 bg-[#252525] px-6 py-3 rounded-2xl border border-[#333]">
                    <span className="text-gray-400 font-bold uppercase text-sm">Letter</span>
                    <span className="text-4xl font-black text-yellow-400 border-l border-[#444] pl-4">{letter}</span>
                </div>

                <button
                    onClick={() => onStop()}
                    className="liquid-btn"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                    <span className="text-red-500">STOP!</span>
                    <FaStop className="ml-3 text-red-500 inline mb-1" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto flex-1 pb-10 pr-2">
                {categories.map((cat, i) => (
                    <motion.div
                        key={cat}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-[#252525] p-5 rounded-3xl border border-[#333] hover:border-gray-600 transition-colors flex flex-col h-32 justify-center shadow-lg group"
                    >
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 group-hover:text-yellow-400 transition-colors">{cat}</label>
                        <input
                            type="text"
                            value={answers[cat] || ''}
                            onChange={(e) => handleChange(cat, e.target.value)}
                            className="bg-transparent text-2xl font-bold text-white placeholder-gray-700 outline-none w-full"
                            placeholder="..."
                            autoComplete="off"
                        />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function VotingView({ roomData, players, categories, isHost, onNext, roomId }) {
    const roundData = roomData?.roundData || {};
    const [votes, setVotes] = useState({});
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // Initialize votes - default all answers to valid
    useEffect(() => {
        const initialVotes = {};
        categories.forEach(cat => {
            initialVotes[cat] = {};
            players.forEach(p => {
                const answer = roundData[p.id]?.[cat];
                // Default to valid if there's an answer
                initialVotes[cat][p.id] = !!(answer && answer.trim());
            });
        });
        setVotes(initialVotes);
    }, [categories, players, roundData]);

    const toggleVote = (category, playerId) => {
        setVotes(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [playerId]: !prev[category]?.[playerId]
            }
        }));
    };

    const handleSubmitVotes = () => {
        socket.emit('submit_votes', { roomId, votes });
        setHasSubmitted(true);
    };

    const handleEndVoting = () => {
        // Host can force-submit their votes and end voting
        if (!hasSubmitted) {
            socket.emit('submit_votes', { roomId, votes });
        }
        socket.emit('end_voting', { roomId });
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold">Review Answers</h2>
                    <p className="text-gray-500 text-sm">Click ✓ for valid, ✗ for invalid. {hasSubmitted ? '✅ Votes submitted!' : 'Submit your votes below.'}</p>
                </div>
                <div className="flex gap-3">
                    {!hasSubmitted && (
                        <button onClick={handleSubmitVotes} className="liquid-btn">
                            <span>Submit Votes</span> <LuCheck className="ml-2 inline" />
                        </button>
                    )}
                    {isHost && (
                        <button onClick={handleEndVoting} className="liquid-btn" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                            <span className="text-green-500">Finish Voting</span> <LuRotateCcw className="ml-2 inline text-green-500" />
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                {categories.map(cat => (
                    <div key={cat} className="space-y-3">
                        <h3 className="text-lg font-bold text-black bg-yellow-400 px-4 py-2 rounded-lg inline-block shadow-lg shadow-yellow-400/20">{cat}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {players.map(p => {
                                const answer = roundData[p.id]?.[cat];
                                const isEmpty = !answer || answer.trim() === '';
                                const isValid = votes[cat]?.[p.id] ?? true;
                                return (
                                    <div key={p.id} className={`p-4 rounded-xl border flex items-center justify-between ${isEmpty ? 'bg-red-900/10 border-red-900/20' : isValid ? 'bg-[#252525] border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[10px] text-gray-500 mb-1 font-bold uppercase flex items-center gap-1">
                                                <img src={p.avatar} className="w-4 h-4 rounded-full" alt="" /> {p.name}
                                            </div>
                                            <div className={`font-bold ${isEmpty ? 'text-red-500 text-sm' : 'text-white'}`}>
                                                {isEmpty ? '(No Answer)' : answer}
                                            </div>
                                        </div>
                                        {!isEmpty && !hasSubmitted && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => toggleVote(cat, p.id)}
                                                    className={`p-2 rounded-full transition-all ${isValid ? 'bg-green-500 text-white' : 'text-green-500 hover:bg-green-500/10'}`}
                                                >
                                                    <LuCheck />
                                                </button>
                                                <button
                                                    onClick={() => toggleVote(cat, p.id)}
                                                    className={`p-2 rounded-full transition-all ${!isValid ? 'bg-red-500 text-white' : 'text-red-500 hover:bg-red-500/10'}`}
                                                >
                                                    <LuX />
                                                </button>
                                            </div>
                                        )}
                                        {!isEmpty && hasSubmitted && (
                                            <div className={`text-2xl ${isValid ? 'text-green-500' : 'text-red-500'}`}>
                                                {isValid ? '✓' : '✗'}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
