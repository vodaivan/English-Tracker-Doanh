
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Gamepad2, Trophy, BrainCircuit, Gem, RefreshCw } from 'lucide-react';
import { LogsMap } from '../types';
import { defaultLog, getAvailableVocabulary } from '../utils';

interface GameItem {
    id: string;
    text: string;
    type: 'word' | 'meaning';
    pairId: string;
    isMatched: boolean;
}

const MatchingGame = ({ 
    logs, 
    dateStr, 
    onEarnGems,
    onBack
}: { 
    logs: LogsMap, 
    dateStr: string, 
    onEarnGems: (amount: number) => void,
    onBack: () => void
}) => {
    const [items, setItems] = useState<GameItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [timer, setTimer] = useState(120); // Time for 12 pairs
    const [score, setScore] = useState(0);
    const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
    const [shakeId, setShakeId] = useState<string | null>(null);
    
    // Earnings for today (check cap)
    const currentLog = logs[dateStr] || defaultLog;
    const todayEarnings = currentLog.dailyGems || 0; // Just show total

    useEffect(() => {
        let interval: number;
        if (gameStatus === 'playing') {
            interval = window.setInterval(() => {
                setTimer(t => {
                    if (t <= 1) {
                        setGameStatus('lost');
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameStatus]);

    const startGame = () => {
        // 1. Fetch Vocab (4 Weeks + Default) - Request 12 Pairs
        const allVocab = getAvailableVocabulary(logs, dateStr, 24); 

        // 2. Select 12 Pairs
        const selectedPairs = allVocab.sort(() => 0.5 - Math.random()).slice(0, 12);
        
        // 3. Generate Items
        const gameItems: GameItem[] = [];
        selectedPairs.forEach((pair, idx) => {
            const pairId = `pair-${idx}`;
            gameItems.push({ id: `word-${idx}`, text: pair.word, type: 'word', pairId, isMatched: false });
            gameItems.push({ id: `meaning-${idx}`, text: pair.meaning, type: 'meaning', pairId, isMatched: false });
        });

        // 4. Shuffle Items
        setItems(gameItems.sort(() => 0.5 - Math.random()));
        setTimer(120);
        setScore(0);
        setGameStatus('playing');
        setSelectedId(null);
    };

    const handleCardClick = (id: string) => {
        if (gameStatus !== 'playing') return;
        
        const clickedItem = items.find(i => i.id === id);
        if (!clickedItem || clickedItem.isMatched) return;

        if (!selectedId) {
            // Select first card
            setSelectedId(id);
        } else {
            if (selectedId === id) {
                // Deselect if clicking same card
                setSelectedId(null);
                return;
            }

            const selectedItem = items.find(i => i.id === selectedId);
            if (!selectedItem) return;

            // Check Match
            if (clickedItem.pairId === selectedItem.pairId) {
                // MATCH!
                const newItems = items.map(i => {
                    if (i.id === id || i.id === selectedId) return { ...i, isMatched: true };
                    return i;
                });
                setItems(newItems);
                setSelectedId(null);
                setScore(s => s + 10);
                setTimer(t => t + 3); // Bonus time

                // Check Win
                if (newItems.every(i => i.isMatched)) {
                    setGameStatus('won');
                    handleWin(); 
                }
            } else {
                // MISMATCH
                setShakeId(id); 
                setTimer(t => Math.max(0, t - 2)); // Penalty
                setTimeout(() => {
                    setShakeId(null);
                    setSelectedId(null);
                }, 500);
            }
        }
    };

    const handleWin = () => {
        // Reward Logic: 5 Gems per win
        onEarnGems(5);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-900 text-white overflow-hidden relative rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700 z-10">
                <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full text-slate-300 transition">
                    <ArrowLeft />
                </button>
                <div className="font-bold text-xl flex items-center gap-2 text-cyan-400">
                    Game 1 <span className="text-slate-500 text-sm font-normal">Vocab Match</span>
                </div>
                <div className="flex items-center gap-4">
                     <div className={`font-mono font-bold ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                     </div>
                     <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-blue-900/50">
                        <Gem size={16} className="text-blue-400" />
                        <span className="font-bold text-blue-400">+{score} pts</span>
                     </div>
                </div>
            </div>

            {/* Game Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-900">
                {gameStatus === 'playing' ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pb-20">
                        {items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleCardClick(item.id)}
                                disabled={item.isMatched}
                                className={`
                                    h-24 p-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center text-center leading-tight shadow-sm border
                                    ${item.isMatched 
                                        ? 'opacity-0 pointer-events-none scale-50' 
                                        : selectedId === item.id 
                                            ? 'bg-blue-600 text-white border-blue-400 shadow-lg scale-105 z-10' 
                                            : shakeId === item.id 
                                                ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                    }
                                `}
                            >
                                {item.text}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        {gameStatus === 'idle' && (
                             <>
                                <Gamepad2 size={64} className="text-cyan-500 mb-6 animate-pulse" />
                                <h2 className="text-3xl font-bold mb-2">Vocab Match</h2>
                                <p className="text-slate-400 mb-8 max-w-sm">Match 12 pairs of words and meanings. Earn Gems!</p>
                                <button onClick={startGame} className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition shadow-lg shadow-cyan-900/20 active:scale-95">
                                    <Gamepad2 fill="currentColor" /> Start Game
                                </button>
                             </>
                        )}
                        {gameStatus === 'won' && (
                            <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm">
                                <Trophy size={48} className="mx-auto text-yellow-400 mb-4 animate-bounce" />
                                <h3 className="text-2xl font-bold text-green-400 mb-2">You Won!</h3>
                                <p className="text-slate-400 mb-6">Score: {score}</p>
                                <div className="text-xl font-bold text-blue-400 mb-6 flex items-center justify-center gap-2">
                                    +5 <Gem size={20} fill="currentColor"/>
                                </div>
                                <div className="flex gap-4 justify-center">
                                    <button onClick={onBack} className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition">Exit</button>
                                    <button onClick={startGame} className="px-6 py-2 rounded-full bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition flex items-center gap-2"><RefreshCw size={18}/> Play Again</button>
                                </div>
                            </div>
                        )}
                        {gameStatus === 'lost' && (
                            <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm">
                                <BrainCircuit size={48} className="mx-auto text-red-500 mb-4" />
                                <h3 className="text-2xl font-bold text-red-500 mb-2">Time's Up!</h3>
                                <div className="flex gap-4 justify-center mt-6">
                                    <button onClick={onBack} className="px-6 py-2 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 transition">Exit</button>
                                    <button onClick={startGame} className="px-6 py-2 rounded-full bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition flex items-center gap-2"><RefreshCw size={18}/> Try Again</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchingGame;
