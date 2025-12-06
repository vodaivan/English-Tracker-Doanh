
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, RefreshCw, Gem, Clock, Heart, HeartCrack } from 'lucide-react';
import { LogsMap } from '../types';
import { getAvailableVocabulary } from '../utils';

interface FallingGameProps {
    logs: LogsMap;
    dateStr: string;
    onEarnGems: (amount: number) => void;
    onBack: () => void;
}

interface GameWord {
    full: string;
    meaning: string; // Add meaning
    display: string; // "st_d_"
    missingIndices: number[];
    missingLetters: string[]; // ['u', 'y']
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
const GAME_DURATION = 60; // Global timer seconds
const MAX_MISTAKES = 3;

const FallingGame: React.FC<FallingGameProps> = ({ logs, dateStr, onEarnGems, onBack }) => {
    const [status, setStatus] = useState<'idle' | 'playing' | 'finished'>('idle');
    const [timer, setTimer] = useState(GAME_DURATION);
    const [score, setScore] = useState(0);
    const [options, setOptions] = useState<string[]>([]);
    const [currentWord, setCurrentWord] = useState<GameWord | null>(null);
    const [userFill, setUserFill] = useState<(string | null)[]>([]); 
    const [mistakes, setMistakes] = useState(0);
    const [msg, setMsg] = useState<string | null>(null);

    const wordPool = useRef<{word: string, meaning: string}[]>([]);

    const startGame = () => {
        setScore(0);
        setTimer(GAME_DURATION);
        setStatus('playing');
        wordPool.current = getAvailableVocabulary(logs, dateStr, 30).sort(() => 0.5 - Math.random());
        nextWord();
    };

    const nextWord = () => {
        if (wordPool.current.length === 0) {
            wordPool.current = getAvailableVocabulary(logs, dateStr, 30).sort(() => 0.5 - Math.random());
        }
        
        const rawItem = wordPool.current.pop()!;
        const rawWord = rawItem.word;
        
        // Mask 2 letters
        const indices: number[] = [];
        const availableIndices = Array.from({length: rawWord.length}, (_, i) => i);
        
        while(indices.length < 2 && availableIndices.length > 0) {
            const rIndex = Math.floor(Math.random() * availableIndices.length);
            const val = availableIndices[rIndex];
            indices.push(val);
            availableIndices.splice(rIndex, 1);
        }
        indices.sort((a,b) => a - b);

        const missing = indices.map(i => rawWord[i]);
        let display = "";
        for (let i = 0; i < rawWord.length; i++) {
            if (indices.includes(i)) display += "_";
            else display += rawWord[i];
        }

        setCurrentWord({
            full: rawWord,
            meaning: rawItem.meaning,
            display,
            missingIndices: indices,
            missingLetters: missing
        });
        setUserFill([null, null]);
        setMistakes(0); 
        
        // Generate Options
        const opts = [...missing];
        while(opts.length < 8) {
            const r = LETTERS[Math.floor(Math.random() * LETTERS.length)];
            opts.push(r);
        }
        setOptions(opts.sort(() => 0.5 - Math.random()));
    };

    // Global Timer
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

    const handleWordFail = () => {
        setTimer(t => Math.max(0, t - 3)); 
        flashMsg("Skipped!", "text-red-400");
        nextWord();
    };

    const flashMsg = (text: string, color: string) => {
        setMsg(text);
        setTimeout(() => setMsg(null), 1000);
    };

    const handleOptionClick = (char: string) => {
        if (!currentWord || status !== 'playing') return;

        const slotIdx = userFill[0] === null ? 0 : 1;
        const targetChar = currentWord.missingLetters[slotIdx];
        
        if (char === targetChar) {
            const newFill = [...userFill];
            newFill[slotIdx] = char;
            setUserFill(newFill);

            if (newFill[0] !== null && newFill[1] !== null) {
                setScore(s => s + 1);
                setTimer(t => t + 2); 
                flashMsg("Good!", "text-green-500");
                setTimeout(() => nextWord(), 200); 
            }
        } else {
            const newMistakes = mistakes + 1;
            setMistakes(newMistakes);
            setTimer(t => Math.max(0, t - 1));
            
            if (newMistakes >= MAX_MISTAKES) {
                setTimeout(() => handleWordFail(), 300);
            }
        }
    };

    const endGame = () => {
        setStatus('finished');
        if (score > 0) {
            onEarnGems(score);
        }
    };

    const getRenderedWord = () => {
        if (!currentWord) return "";
        let res = "";
        let fillIdx = 0;
        for (let i = 0; i < currentWord.full.length; i++) {
            if (currentWord.missingIndices.includes(i)) {
                const val = userFill[fillIdx] ? userFill[fillIdx] : "_";
                res += val;
                fillIdx++;
            } else {
                res += currentWord.full[i];
            }
            res += " "; 
        }
        return res;
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
                <div className="font-bold text-xl flex items-center gap-2 text-cyan-400">
                    Game 2 <span className="text-slate-500 text-sm font-normal">Missing Letters</span>
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

            {/* Main Area */}
            <div className="flex-1 relative bg-slate-900 flex flex-col items-center justify-center p-4">
                {status === 'playing' && currentWord && (
                    <div className="flex flex-col items-center gap-6 w-full max-w-md animate-in fade-in zoom-in duration-300">
                        
                        {/* Word Block */}
                        <div className="bg-slate-800 px-8 py-6 rounded-2xl border-2 border-slate-700 w-full text-center relative overflow-hidden">
                            <div className="text-5xl font-mono font-bold tracking-widest text-white drop-shadow-md mb-4">
                                {getRenderedWord()}
                            </div>
                            {/* Meaning Display below word */}
                            <div className="text-xl text-cyan-300 font-medium border-t border-slate-600 pt-3">
                                {currentWord.meaning}
                            </div>
                        </div>

                        {/* Lives */}
                        <div className="flex gap-2">
                            {[...Array(MAX_MISTAKES)].map((_, i) => (
                                <div key={i} className="transition-all duration-300">
                                    {i < (MAX_MISTAKES - mistakes) ? (
                                        <Heart size={24} className="text-red-500 fill-red-500" />
                                    ) : (
                                        <HeartCrack size={24} className="text-slate-700" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {msg && (
                            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold animate-bounce z-20 whitespace-nowrap">
                                <span className={msg.includes("Good") ? "text-green-400" : "text-red-400"}>{msg}</span>
                            </div>
                        )}
                        
                        <div className="absolute top-4 right-4 font-mono text-slate-500 flex items-center gap-2">
                             <Clock size={16}/> {timer}s
                        </div>
                    </div>
                )}

                {status === 'idle' && (
                    <div className="flex flex-col items-center justify-center text-center max-w-sm">
                        <Gem size={64} className="text-blue-500 mb-6 animate-pulse" />
                        <h2 className="text-3xl font-bold mb-2">Missing Letters</h2>
                        <p className="text-slate-400 mb-8">Fill in the missing letters. 3 mistakes and the word changes!</p>
                        <button onClick={startGame} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition shadow-lg shadow-blue-900/20 active:scale-95">
                            <Play fill="currentColor" /> Start Game
                        </button>
                    </div>
                )}

                {status === 'finished' && (
                    <div className="flex flex-col items-center justify-center text-center bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm">
                        <div className="text-yellow-400 mb-2 font-bold uppercase tracking-widest text-sm">Time's Up!</div>
                        <div className="text-6xl font-bold text-white mb-6">+{score} <span className="text-2xl text-blue-400">Gems</span></div>
                        <div className="flex gap-4">
                            <button onClick={onBack} className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition">Exit</button>
                            <button onClick={startGame} className="px-6 py-2 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-500 transition flex items-center gap-2 shadow-lg shadow-blue-900/20">
                                <RefreshCw size={18} /> Play Again
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="h-auto bg-slate-800 border-t border-slate-700 p-4 z-20 pb-8 sm:pb-4">
                {status === 'playing' ? (
                    <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
                        {options.map((char, i) => (
                            <button 
                                key={i}
                                onClick={() => handleOptionClick(char)}
                                className="h-14 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-2xl font-bold rounded-lg shadow-md border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all"
                            >
                                {char}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="h-14 flex items-center justify-center text-slate-600 italic text-sm">
                        Game not active
                    </div>
                )}
            </div>
        </div>
    );
};

export default FallingGame;
