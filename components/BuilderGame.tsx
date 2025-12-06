
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, Gem, Clock, SkipForward, Delete } from 'lucide-react';
import { LogsMap } from '../types';
import { getAvailableVocabulary } from '../utils';

interface BuilderGameProps {
    logs: LogsMap;
    dateStr: string;
    onEarnGems: (amount: number) => void;
    onBack: () => void;
}

interface GameRound {
    word: string;
    meaning: string;
    letters: string[]; // Correct letters in order
    shuffled: { id: string, char: string, status: 'available' | 'used' }[]; 
}

const GAME_DURATION = 60; // 60 seconds global timer

const BuilderGame: React.FC<BuilderGameProps> = ({ logs, dateStr, onEarnGems, onBack }) => {
    const [status, setStatus] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [timer, setTimer] = useState(GAME_DURATION);
    const [score, setScore] = useState(0);
    const [round, setRound] = useState<GameRound | null>(null);
    const [userSlots, setUserSlots] = useState<(string | null)[]>([]); 
    const [msg, setMsg] = useState<string | null>(null);

    const wordPool = useRef<{ word: string, meaning: string }[]>([]);

    const startGame = () => {
        setScore(0);
        setTimer(GAME_DURATION);
        setStatus('playing');
        wordPool.current = getAvailableVocabulary(logs, dateStr, 30).sort(() => 0.5 - Math.random());
        nextRound();
    };

    const nextRound = () => {
        if (wordPool.current.length === 0) {
            wordPool.current = getAvailableVocabulary(logs, dateStr, 30).sort(() => 0.5 - Math.random());
        }
        const item = wordPool.current.pop()!;
        
        const letters = item.word.split('');
        const shuffled = letters.map((char, i) => ({ 
            id: `${char}-${i}-${Math.random()}`, 
            char, 
            status: 'available' as const 
        }));
        
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        setRound({
            word: item.word,
            meaning: item.meaning,
            letters,
            shuffled
        });
        setUserSlots(Array(item.word.length).fill(null));
    };

    useEffect(() => {
        let interval: number;
        if (status === 'playing') {
            interval = window.setInterval(() => {
                setTimer(t => {
                    if (t <= 1) {
                        endGame();
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status]);

    const handleLetterClick = (id: string, char: string) => {
        if (status !== 'playing' || !round) return;

        const emptyIdx = userSlots.findIndex(s => s === null);
        if (emptyIdx === -1) return; 

        const newSlots = [...userSlots];
        newSlots[emptyIdx] = char;
        setUserSlots(newSlots);

        const newShuffled = round.shuffled.map(tile => 
            tile.id === id ? { ...tile, status: 'used' as const } : tile
        );
        setRound({ ...round, shuffled: newShuffled });

        if (emptyIdx === userSlots.length - 1) {
            checkAnswer(newSlots, newShuffled, round);
        }
    };

    const handleClearLast = () => {
        if (!round) return;
        const slots = [...userSlots];
        let lastIdx = -1;
        for (let i = slots.length - 1; i >= 0; i--) {
            if (slots[i] !== null) {
                lastIdx = i;
                break;
            }
        }
        
        if (lastIdx === -1) return;

        const removedChar = slots[lastIdx];
        slots[lastIdx] = null;
        setUserSlots(slots);

        const newShuffled = [...round.shuffled];
        const tileIdx = newShuffled.findIndex(t => t.char === removedChar && t.status === 'used');
        if (tileIdx !== -1) {
            newShuffled[tileIdx] = { ...newShuffled[tileIdx], status: 'available' };
            setRound({ ...round, shuffled: newShuffled });
        }
    };

    const checkAnswer = (currentSlots: (string | null)[], currentShuffled: any[], currentRound: GameRound) => {
        const guess = currentSlots.join('');
        if (guess === currentRound.word) {
            setScore(s => s + 1);
            setTimer(t => t + 3); 
            flashMsg("Correct!", "text-green-500");
            setTimeout(() => nextRound(), 300);
        } else {
            if (guess.length === currentRound.word.length) {
                setTimer(t => Math.max(0, t - 2)); 
                flashMsg("Wrong!", "text-red-500");
            }
        }
    };

    const handleSkip = () => {
        setTimer(t => Math.max(0, t - 5)); 
        flashMsg("Skipped", "text-orange-500");
        nextRound();
    };

    const endGame = () => {
        setStatus('finished');
        if (score > 0) onEarnGems(score);
    };

    const flashMsg = (text: string, color: string) => {
        setMsg(text);
        setTimeout(() => setMsg(null), 1000);
    };

    const timerColor = timer > 30 ? 'bg-green-500' : timer > 10 ? 'bg-yellow-500' : 'bg-red-500';
    const timerPercent = (timer / GAME_DURATION) * 100;

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-900 text-white overflow-hidden relative rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700 z-10">
                <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full text-slate-300 transition">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-xl flex items-center gap-2 text-indigo-400">
                    Game 3 <span className="text-slate-500 text-sm font-normal">Word Builder</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-blue-900/50">
                    <Gem size={16} className="text-blue-400" />
                    <span className="font-bold text-blue-400">+{score}</span>
                </div>
            </div>

            {/* Timer Bar */}
            <div className="h-1.5 w-full bg-slate-800">
                <div 
                    className={`h-full transition-all duration-300 ease-linear ${timerColor}`} 
                    style={{ width: `${timerPercent}%` }}
                ></div>
            </div>

            {/* Game Area */}
            <div className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
                {status === 'playing' && round && (
                    <div className="w-full max-w-lg space-y-8 mt-4 animate-in fade-in slide-in-from-bottom-4">
                        
                        {/* Meaning */}
                        <div className="text-center space-y-2">
                            <span className="text-slate-400 text-sm uppercase tracking-widest font-bold">Meaning</span>
                            <div className="text-2xl font-medium text-white bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                {round.meaning}
                            </div>
                        </div>

                        {/* Slots */}
                        <div className="flex flex-wrap justify-center gap-2">
                            {userSlots.map((char, i) => (
                                <div 
                                    key={i} 
                                    className={`w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center text-2xl font-bold rounded-lg border-b-4 transition-all
                                        ${char 
                                            ? 'bg-indigo-600 border-indigo-800 text-white' 
                                            : 'bg-slate-800 border-slate-700 text-slate-600'
                                        }
                                    `}
                                >
                                    {char}
                                </div>
                            ))}
                        </div>

                        {/* Feedback */}
                        <div className="h-8 text-center">
                            {msg && <span className={`text-xl font-bold animate-bounce ${msg.includes('Correct') ? 'text-green-400' : 'text-red-400'}`}>{msg}</span>}
                        </div>
                    </div>
                )}

                {status === 'idle' && (
                    <div className="flex flex-col items-center justify-center text-center max-w-sm mt-20">
                        <Gem size={64} className="text-indigo-500 mb-6 animate-pulse" />
                        <h2 className="text-3xl font-bold mb-2">Word Builder</h2>
                        <p className="text-slate-400 mb-8">Construct the English word from the given Vietnamese meaning. Earn Gems!</p>
                        <button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition shadow-lg shadow-indigo-900/20 active:scale-95">
                            <Clock fill="currentColor" /> Start Game
                        </button>
                    </div>
                )}

                {status === 'finished' && (
                    <div className="flex flex-col items-center justify-center text-center bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm mt-10">
                        <div className="text-yellow-400 mb-2 font-bold uppercase tracking-widest text-sm">Time's Up!</div>
                        <div className="text-6xl font-bold text-white mb-6">+{score} <span className="text-2xl text-blue-400">Gems</span></div>
                        <div className="flex gap-4">
                            <button onClick={onBack} className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition">
                                Exit
                            </button>
                            <button onClick={startGame} className="px-6 py-2 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition flex items-center gap-2 shadow-lg shadow-indigo-900/20">
                                <RefreshCw size={18} /> Play Again
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls & Letters */}
            {status === 'playing' && round && (
                <div className="bg-slate-800 border-t border-slate-700 p-4 z-20 pb-8 sm:pb-4">
                    <div className="max-w-2xl mx-auto space-y-4">
                        {/* Letter Tiles */}
                        <div className="flex flex-wrap justify-center gap-2">
                            {round.shuffled.map((tile) => (
                                <button
                                    key={tile.id}
                                    onClick={() => handleLetterClick(tile.id, tile.char)}
                                    disabled={tile.status === 'used'}
                                    className={`w-10 h-12 sm:w-12 sm:h-14 rounded-lg font-bold text-xl shadow-sm border-b-4 transition-all
                                        ${tile.status === 'used' 
                                            ? 'bg-slate-700 border-slate-800 text-slate-600 opacity-50 scale-95' 
                                            : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-white active:scale-95 active:border-b-0 active:translate-y-1'
                                        }
                                    `}
                                >
                                    {tile.char}
                                </button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center px-4 pt-2 border-t border-slate-700">
                            <button 
                                onClick={handleClearLast}
                                className="flex items-center gap-2 text-slate-400 hover:text-white transition px-4 py-2 rounded-lg hover:bg-slate-700"
                            >
                                <Delete size={20} /> Backspace
                            </button>
                            <button 
                                onClick={handleSkip}
                                className="flex items-center gap-2 text-slate-400 hover:text-orange-400 transition px-4 py-2 rounded-lg hover:bg-slate-700"
                            >
                                <SkipForward size={20} /> Skip (-5s)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuilderGame;
