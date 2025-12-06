import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Trophy, RotateCcw, CheckCircle } from 'lucide-react';
import { DailyLog, LogsMap } from '../types';
import { getYesterdayStr } from '../utils';

const ChallengeSection = ({ 
    log, 
    logs, 
    dateStr, 
    onUpdate 
}: { 
    log: DailyLog, 
    logs: LogsMap, 
    dateStr: string, 
    onUpdate: (updates: Partial<DailyLog>) => void 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Challenge 1 State
    const [timer1, setTimer1] = useState(120); 
    const [isTimer1Running, setIsTimer1Running] = useState(false);
    
    // Challenge 2 State
    const [chal2Inputs, setChal2Inputs] = useState<string[]>(log.challenge2Words || Array(6).fill(''));

    // Challenge 3 State
    const [timer3, setTimer3] = useState(300);
    const [isTimer3Running, setIsTimer3Running] = useState(false);

    // Timer 1 Effect
    useEffect(() => {
        let interval: number;
        if (isTimer1Running && timer1 > 0) {
            interval = window.setInterval(() => setTimer1(t => t - 1), 1000);
        } else if (timer1 === 0) {
            setIsTimer1Running(false);
        }
        return () => clearInterval(interval);
    }, [isTimer1Running, timer1]);

    // Timer 3 Effect
    useEffect(() => {
        let interval: number;
        if (isTimer3Running && timer3 > 0) {
            interval = window.setInterval(() => setTimer3(t => t - 1), 1000);
        } else if (timer3 === 0) {
            setIsTimer3Running(false);
        }
        return () => clearInterval(interval);
    }, [isTimer3Running, timer3]);

    // Helper: Reset Timer 1
    const resetTimer1 = () => {
        setIsTimer1Running(false);
        setTimer1(120);
    };

    // Helper: Reset Timer 3
    const resetTimer3 = () => {
        setIsTimer3Running(false);
        setTimer3(300);
    };

    const handleChal2Submit = () => {
        if (chal2Inputs.some(w => !w.trim())) {
            return; // Should be handled by disabled button, but safety check
        }
        
        // Check yesterday's streak
        const yesterdayStr = getYesterdayStr(dateStr);
        const yesterdayLog = logs[yesterdayStr];
        
        let newStreak = 1;
        if (yesterdayLog && yesterdayLog.challenge2Done) {
            newStreak = (yesterdayLog.challenge2Streak || 0) + 1;
        }

        let coinsAwarded = 0;
        let finalStreak = newStreak;
        
        // Reward on 3rd day
        if (newStreak >= 3) {
            coinsAwarded = 20; // Changed from 40 to 20
            finalStreak = 0; // Reset cycle
            alert("Awesome! You completed a 3-day streak. +20 Coins!");
        } else {
            alert(`Streak: ${newStreak} day(s). Keep going for 3 days to earn 20c!`);
        }

        onUpdate({
            challenge2Done: true,
            challenge2Streak: finalStreak,
            challenge2Words: chal2Inputs,
            dailyCoins: (log.dailyCoins || 0) + coinsAwarded
        });
    };

    const confirmChal1 = () => {
        onUpdate({
            challenge1Done: true,
            dailyCoins: (log.dailyCoins || 0) + 5
        });
    };

    const confirmChal3 = () => {
        onUpdate({
            challenge3Done: true,
            dailyCoins: (log.dailyCoins || 0) + 10
        });
    };

    const isChal2Ready = !chal2Inputs.some(w => !w.trim());

    return (
        <div className="mt-8 border-t border-gray-200 pt-6">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-xl shadow-lg flex items-center justify-between font-bold text-lg hover:from-red-600 hover:to-orange-600 transition transform active:scale-[0.99]"
            >
                <div className="flex items-center gap-3">
                    <Trophy className="text-yellow-300" />
                    Challenge Yourself
                </div>
                {isOpen ? <ChevronUp /> : <ChevronDown />}
            </button>

            {isOpen && (
                <div className="mt-4 space-y-6 animate-in slide-in-from-top-4">
                    
                    {/* Challenge 1 */}
                    <div className="bg-white border border-red-100 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <span className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                Write 5 words on paper
                            </h4>
                            <span className="text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded text-xs border border-yellow-200">+5c</span>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                             <div className="text-xl font-mono font-bold text-gray-700 w-20">
                                 {Math.floor(timer1 / 60)}:{(timer1 % 60).toString().padStart(2, '0')}
                             </div>
                             <div className="flex gap-2">
                                 {!log.challenge1Done ? (
                                     <>
                                        {timer1 > 0 && (
                                            <>
                                                <button 
                                                    onClick={() => setIsTimer1Running(!isTimer1Running)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition ${isTimer1Running ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-red-500 text-white hover:bg-red-600'}`}
                                                >
                                                    {isTimer1Running ? 'Pause' : 'Start Timer'}
                                                </button>
                                                <button 
                                                    onClick={resetTimer1}
                                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                    title="Reset / Cancel"
                                                >
                                                    <RotateCcw size={18} />
                                                </button>
                                            </>
                                        )}
                                        {timer1 === 0 && (
                                            <div className="flex gap-2">
                                                <button onClick={resetTimer1} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-300 transition">
                                                    Cancel
                                                </button>
                                                <button onClick={confirmChal1} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold animate-pulse shadow-md hover:bg-green-600 transition">
                                                    Confirm Done
                                                </button>
                                            </div>
                                        )}
                                     </>
                                 ) : (
                                     <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={16}/> Completed</span>
                                 )}
                             </div>
                        </div>
                    </div>

                    {/* Challenge 2 */}
                    <div className="bg-white border border-red-100 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <span className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                6-Word Streak (3 Days)
                            </h4>
                            <div className="text-right">
                                <span className="text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded text-xs border border-yellow-200 block">+20c</span>
                                <span className="text-[10px] text-gray-400">Streak: {log.challenge2Streak || 0}/3</span>
                            </div>
                        </div>
                        {!log.challenge2Done ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    {chal2Inputs.map((val, i) => (
                                        <input 
                                            key={i} 
                                            value={val}
                                            onChange={(e) => {
                                                const newInputs = [...chal2Inputs];
                                                newInputs[i] = e.target.value;
                                                setChal2Inputs(newInputs);
                                            }}
                                            className="border rounded p-2 text-sm text-center focus:ring-1 focus:ring-red-500 outline-none"
                                            placeholder={`Word ${i+1}`}
                                        />
                                    ))}
                                </div>
                                <button 
                                    onClick={handleChal2Submit} 
                                    disabled={!isChal2Ready}
                                    className={`w-full py-2 font-bold rounded-lg transition ${isChal2Ready ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                >
                                    Submit Streak
                                </button>
                            </div>
                        ) : (
                             <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100 text-green-700 font-medium">
                                 Streak Saved! Come back tomorrow.
                             </div>
                        )}
                    </div>

                     {/* Challenge 3 */}
                     <div className="bg-white border border-red-100 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <span className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                                Speak for 5 mins
                            </h4>
                            <span className="text-yellow-600 font-bold bg-yellow-50 px-2 py-1 rounded text-xs border border-yellow-200">+10c</span>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                             <div className="text-xl font-mono font-bold text-gray-700 w-20">
                                 {Math.floor(timer3 / 60)}:{(timer3 % 60).toString().padStart(2, '0')}
                             </div>
                             <div className="flex gap-2">
                                 {!log.challenge3Done ? (
                                     <>
                                        {timer3 > 0 && (
                                            <>
                                                <button 
                                                    onClick={() => setIsTimer3Running(!isTimer3Running)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm transition ${isTimer3Running ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-red-500 text-white hover:bg-red-600'}`}
                                                >
                                                    {isTimer3Running ? 'Pause' : 'Start Timer'}
                                                </button>
                                                <button 
                                                    onClick={resetTimer3}
                                                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                    title="Reset / Cancel"
                                                >
                                                    <RotateCcw size={18} />
                                                </button>
                                            </>
                                        )}
                                        {timer3 === 0 && (
                                            <div className="flex gap-2">
                                                <button onClick={resetTimer3} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-300 transition">
                                                    Cancel
                                                </button>
                                                <button onClick={confirmChal3} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold animate-pulse shadow-md hover:bg-green-600 transition">
                                                    Confirm Done
                                                </button>
                                            </div>
                                        )}
                                     </>
                                 ) : (
                                     <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={16}/> Completed</span>
                                 )}
                             </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default ChallengeSection;
