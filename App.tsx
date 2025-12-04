import React, { useState, useEffect, useMemo, useRef } from 'react';
// @ts-ignore
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
// @ts-ignore
import { getFirestore, collection, doc, setDoc, onSnapshot, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { 
  ChevronLeft, ChevronRight, CheckCircle, BookOpen, Mic, Headphones, PenTool, 
  Calendar as CalendarIcon, Info, ChevronDown, ChevronUp, Link as LinkIcon, Star,
  Clock, Play, Pause, RotateCcw, Gift, ExternalLink, Youtube,
  Bike, Car, TrainFront, Plane, Rocket, Gem, Footprints, Zap, Bus, LogIn, LogOut, User as UserIcon,
  Timer, Square, RefreshCw, Shield, X, Plus, Trash2, Quote, Coins, Trophy, Archive, Medal, Ban, Banknote
} from 'lucide-react';
import { DailyLog, LogsMap, StudentSummary, QuoteItem } from './types';

// --- CONSTANTS ---
const ADMIN_EMAIL = 'vodaivan00@gmail.com';

// --- Firebase Configuration & Safety Checks ---
const getFirebaseConfig = () => {
  try {
    // 1. Priority: Check for Vite/Vercel Environment Variables
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
      return {
        // @ts-ignore
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        // @ts-ignore
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        // @ts-ignore
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        // @ts-ignore
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        // @ts-ignore
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        // @ts-ignore
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };
    }

    // 2. Fallback: AI Studio Global Variable
    // @ts-ignore
    if (typeof __firebase_config !== 'undefined') {
      // @ts-ignore
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.error("Error determining firebase config", e);
  }
  
  return null;
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase only if we have a valid-looking config to avoid immediate crash
let app;
let auth;
let db;

if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
} else {
  console.warn('Firebase config missing. Data will not be saved to cloud.');
}

// @ts-ignore
const appId = (typeof __app_id !== 'undefined') ? __app_id : 'default-app-id';

// --- Helper Functions ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; 
};

// Custom Date Logic: Day ends at 02:00 AM the next day
const getLogicalDate = (): Date => {
  const now = new Date();
  // If current hour is 0 (12 AM) or 1 (1 AM), subtract 24 hours to consider it "yesterday"
  if (now.getHours() < 2) {
    now.setHours(now.getHours() - 24);
  }
  return now;
};

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getYesterdayStr = (dateStr: string): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return formatDate(d);
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatMiniDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
};

const countWords = (str: string): number => {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(w => w.length > 0).length;
};

const defaultLog: DailyLog = {
  vocab1Meaning: '', vocab1Word: '', vocab1Method: '',
  vocab2Meaning: '', vocab2Word: '', vocab2Method: '',
  vocabDone: false,
  speakingTopic: '', speakingVocab: '', speakingDone: false, speakingDuration: 0,
  listeningTopic: '', listeningLink: '', listeningVocab: '', listeningDone: false, listeningDuration: 0,
  writingContent: '', writingDone: false, writingDuration: 0,
  totalMoney: 0,
  studyMinutes: 0,
  dailyCoins: 0,
  challenge1Done: false,
  challenge2Done: false,
  challenge2Streak: 0,
  challenge2Words: Array(6).fill(''),
  challenge3Done: false
};

// --- Link Button Component ---
const ResourceLink = ({ href, label, colorClass = "bg-gray-100 text-gray-700 hover:bg-gray-200", icon = <ExternalLink size={12}/> }: { href: string, label: string, colorClass?: string, icon?: React.ReactNode }) => (
    <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${colorClass}`}
    >
        {icon}
        {label}
    </a>
);

// --- Confetti Component ---
const Confetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 2,
        life: 100
      });
    }

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let active = false;
      particles.forEach(p => {
        if (p.life > 0) {
          active = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.2; // Gravity
          p.life -= 1;
          p.size *= 0.96;
          
          ctx.globalAlpha = p.life / 100;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (active) requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
};

// --- Daily Quote Component ---
const DailyQuote = () => {
    const [quote, setQuote] = useState<QuoteItem | null>(null);
    const [theme, setTheme] = useState("from-violet-500 to-fuchsia-500");

    useEffect(() => {
        const updateQuoteAndTheme = (quotes: QuoteItem[]) => {
            const now = new Date();
            const hour = now.getHours();
            
            // Calculate Day of Year for rotation
            // Logic: If hour < 7, it belongs to the "previous night" slot, so we use (dayOfYear - 1)
            let dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
            
            let slotIndex = 3; // Default to Night Slot (23h-7h)
            let bgClass = "from-violet-600 to-indigo-600"; // Night Purple

            if (hour >= 7 && hour < 13) {
                slotIndex = 0; // Morning
                bgClass = "from-sky-400 to-blue-500"; // Sky Blue
            } else if (hour >= 13 && hour < 19) {
                slotIndex = 1; // Afternoon
                bgClass = "from-emerald-400 to-teal-500"; // Energetic Green
            } else if (hour >= 19 && hour < 23) {
                slotIndex = 2; // Evening
                bgClass = "from-orange-400 to-rose-500"; // Sunset Orange/Pink
            } else {
                // Late Night (23h - 7h)
                slotIndex = 3;
                bgClass = "from-violet-600 to-indigo-600";
                // If it's early morning (0h-7h), we want to keep the quote from the previous night (23h)
                if (hour < 7) {
                    dayOfYear -= 1; 
                }
            }

            if (quotes && quotes.length > 0) {
                // Rotate quotes based on day and slot
                // Use absolute value for dayOfYear to handle potentially negative value if year just started
                const effectiveDay = Math.abs(dayOfYear);
                const quoteIndex = (effectiveDay * 4 + slotIndex) % quotes.length;
                setQuote(quotes[quoteIndex]);
            }
            setTheme(bgClass);
        };

        const fallbacks = [
            { text: "The expert in anything was once a beginner.", meaning: "Chuyên gia trong bất cứ lĩnh vực nào cũng từng là người mới bắt đầu." },
            { text: "Consistency is what transforms average into excellence.", meaning: "Sự kiên trì là thứ biến điều bình thường thành xuất sắc." },
            { text: "Don't watch the clock; do what it does. Keep going.", meaning: "Đừng nhìn đồng hồ; hãy làm những gì nó làm. Tiếp tục đi." },
            { text: "Your future is created by what you do today, not tomorrow.", meaning: "Tương lai của bạn được tạo ra bởi những gì bạn làm hôm nay, không phải ngày mai." },
             { text: "Believe you can and you're halfway there.", meaning: "Tin rằng bạn có thể làm được nghĩa là bạn đã đi được một nửa chặng đường." }
        ];

        if (!db) {
            updateQuoteAndTheme(fallbacks);
            return;
        }
        
        const unsub = onSnapshot(doc(db, 'artifacts', appId, 'global_settings', 'quotes'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const quotes = data.items as QuoteItem[];
                updateQuoteAndTheme((quotes && quotes.length > 0) ? quotes : fallbacks);
            } else {
                 updateQuoteAndTheme(fallbacks);
            }
        });
        return () => unsub();
    }, []);

    if (!quote) return null;

    return (
        <section className="relative overflow-hidden rounded-xl shadow-lg border-0 my-6 transition-all duration-1000">
            <div className={`absolute inset-0 bg-gradient-to-r ${theme} opacity-90 transition-all duration-1000`}></div>
            <div className="relative p-8 text-center text-white flex flex-col items-center">
                <Quote size={32} className="mb-4 text-white/40" />
                <p className="text-xl md:text-2xl font-serif italic font-medium leading-relaxed max-w-2xl mb-2">
                    "{quote.text}"
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-white/90 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm">
                    {quote.meaning}
                </div>
            </div>
        </section>
    );
}

// --- Challenge Section Component ---
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

// --- Personal Archive Modal ---
const PersonalArchiveModal = ({ logs, currentDate, onClose }: { logs: LogsMap, currentDate: Date, onClose: () => void }) => {
    // Calculate Last Month Stats
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();
    const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'long' });
    const prevDaysInMonth = getDaysInMonth(prevYear, prevMonth);
    
    let prevK = 0;
    let prevC = 0;
    
    for (let d = 1; d <= prevDaysInMonth; d++) {
        const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (logs[dateStr]) {
            prevK += (logs[dateStr].totalMoney || 0);
            prevC += (logs[dateStr].dailyCoins || 0);
        }
    }

    // Calculate Current Month Vocab
    const curYear = currentDate.getFullYear();
    const curMonth = currentDate.getMonth();
    const curDays = getDaysInMonth(curYear, curMonth);
    const vocabList: { word: string, meaning: string, date: string }[] = [];

    for (let d = 1; d <= curDays; d++) {
         const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
         const log = logs[dateStr];
         if (log && log.vocabDone) {
             if (log.vocab1Word) vocabList.push({ word: log.vocab1Word, meaning: log.vocab1Meaning, date: dateStr });
             if (log.vocab2Word) vocabList.push({ word: log.vocab2Word, meaning: log.vocab2Meaning, date: dateStr });
         }
    }

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                 <div className="p-4 border-b flex justify-between items-center bg-indigo-50 rounded-t-xl">
                     <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                         <Archive size={20} /> Personal Archive
                     </h3>
                     <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-red-500" /></button>
                 </div>
                 <div className="p-6 overflow-y-auto space-y-6">
                     {/* Previous Month Stats */}
                     <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-4 rounded-xl border border-gray-300">
                         <h4 className="font-bold text-gray-600 mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
                             <CalendarIcon size={14}/> {prevMonthName} {prevYear} Summary
                         </h4>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                                 <div className="text-xs text-gray-500">Knowledge</div>
                                 <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                                     {prevK} <Banknote size={20} strokeWidth={3} />
                                 </div>
                             </div>
                             <div className="bg-white p-3 rounded-lg shadow-sm text-center">
                                 <div className="text-xs text-gray-500">Coins</div>
                                 <div className="text-2xl font-bold text-yellow-500 flex items-center justify-center gap-1">
                                     {prevC} <Coins size={20} fill="currentColor" className="text-yellow-500" />
                                 </div>
                             </div>
                         </div>
                     </div>

                     {/* Current Month Vocab */}
                     <div>
                         <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                             <BookOpen size={18} /> Vocabulary Collected ({vocabList.length})
                         </h4>
                         <div className="border rounded-lg overflow-hidden bg-gray-50 max-h-60 overflow-y-auto">
                             {vocabList.length === 0 ? (
                                 <p className="p-4 text-center text-gray-400 text-sm">No words collected this month yet.</p>
                             ) : (
                                 <table className="w-full text-sm text-left">
                                     <thead className="bg-gray-100 text-gray-500 font-medium">
                                         <tr>
                                             <th className="p-2 pl-3">Word</th>
                                             <th className="p-2">Meaning</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-gray-200">
                                         {vocabList.map((v, i) => (
                                             <tr key={i} className="bg-white">
                                                 <td className="p-2 pl-3 font-medium text-indigo-700">{v.word}</td>
                                                 <td className="p-2 text-gray-600">{v.meaning}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             )}
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    );
};

// --- Admin Dashboard Component ---
const AdminDashboard = ({ onClose }: { onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'students' | 'quotes'>('students');
    const [students, setStudents] = useState<StudentSummary[]>([]);
    const [quotes, setQuotes] = useState<QuoteItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Load Students
    useEffect(() => {
        if (!db || activeTab !== 'students') return;
        setLoading(true);
        const q = collection(db, 'artifacts', appId, 'student_summaries');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: StudentSummary[] = [];
            snapshot.forEach(doc => list.push(doc.data() as StudentSummary));
            list.sort((a, b) => (a.lastActive < b.lastActive ? 1 : -1));
            setStudents(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [activeTab]);

    // Load Quotes
    useEffect(() => {
        if (!db || activeTab !== 'quotes') return;
        setLoading(true);
        const unsub = onSnapshot(doc(db, 'artifacts', appId, 'global_settings', 'quotes'), (docSnap) => {
            if (docSnap.exists()) {
                setQuotes(docSnap.data().items || []);
            } else {
                setQuotes([]);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [activeTab]);

    const handleSaveQuotes = async () => {
        if (!db) return;
        try {
            // Filter out empty quotes
            const validQuotes = quotes.filter(q => q.text.trim().length > 0);
            await setDoc(doc(db, 'artifacts', appId, 'global_settings', 'quotes'), {
                items: validQuotes
            });
            alert("Quotes saved successfully!");
        } catch (e) {
            console.error("Error saving quotes", e);
            alert("Error saving quotes.");
        }
    };

    const addQuoteRow = () => {
        setQuotes([...quotes, { text: '', meaning: '' }]);
    };

    const removeQuoteRow = (index: number) => {
        const newQuotes = [...quotes];
        newQuotes.splice(index, 1);
        setQuotes(newQuotes);
    };

    const updateQuote = (index: number, field: 'text' | 'meaning', value: string) => {
        const newQuotes = [...quotes];
        newQuotes[index] = { ...newQuotes[index], [field]: value };
        setQuotes(newQuotes);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full pr-10">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-900 shrink-0">
                            <Shield size={24} className="text-indigo-600" />
                            Admin Dashboard
                        </h2>
                        <div className="flex bg-gray-200 rounded-lg p-1 shrink-0 self-start">
                            <button 
                                onClick={() => setActiveTab('students')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'students' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Student Progress
                            </button>
                            <button 
                                onClick={() => setActiveTab('quotes')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'quotes' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Quotes
                            </button>
                        </div>
                    </div>
                    {/* Close button absolutely positioned for mobile */}
                    <button 
                        onClick={onClose} 
                        className="absolute top-2 right-2 sm:static p-2 bg-white sm:bg-transparent shadow sm:shadow-none hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-full transition z-10"
                        title="Close Dashboard"
                    >
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-auto p-4 bg-gray-50/50">
                    {activeTab === 'students' ? (
                        // --- STUDENTS TAB ---
                        loading ? (
                            <div className="flex justify-center items-center h-full text-gray-400">Loading data...</div>
                        ) : students.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10">No students found yet.</div>
                        ) : (
                            <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden w-full">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm min-w-[800px]">
                                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                            <tr>
                                                <th className="p-3">Student</th>
                                                <th className="p-3">This Month Score</th>
                                                <th className="p-3">Last Month (k)</th>
                                                <th className="p-3">Last Month (c)</th>
                                                <th className="p-3">Total Study Time</th>
                                                <th className="p-3 text-right">Last Active</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {students.map((s) => (
                                                <tr key={s.uid} className="hover:bg-gray-50 transition">
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            {s.photoURL ? (
                                                                <img src={s.photoURL} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                                    {s.displayName?.[0] || 'U'}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-gray-900">{s.displayName || 'Anonymous'}</div>
                                                                <div className="text-xs text-gray-400">{s.email || 'No email'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-bold text-green-600 flex items-center gap-1">
                                                            {s.currentMonthScore || 0} <Banknote size={14} strokeWidth={3} />
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-medium text-gray-600">
                                                            {s.prevMonthMoney || 0}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="font-medium text-yellow-600">
                                                            {s.prevMonthCoins || 0}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-mono">
                                                        {formatDuration(s.totalStudyMinutes * 60 || 0)}
                                                    </td>
                                                    <td className="p-3 text-right text-gray-500 text-xs">
                                                        {new Date(s.lastActive).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        // --- QUOTES TAB ---
                        <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-700">Manage Daily Quotes</h3>
                                <button 
                                    onClick={handleSaveQuotes}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm transition"
                                >
                                    Save Changes
                                </button>
                            </div>
                            
                            <div className="border rounded-lg overflow-hidden mb-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[600px]">
                                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                            <tr>
                                                <th className="p-3 text-left w-[45%]">Quote (English)</th>
                                                <th className="p-3 text-left w-[45%]">Meaning (Vietnamese)</th>
                                                <th className="p-3 w-[10%]"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {quotes.map((quote, idx) => (
                                                <tr key={idx} className="group hover:bg-gray-50">
                                                    <td className="p-2 align-top">
                                                        <textarea 
                                                            className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                                            rows={2}
                                                            value={quote.text}
                                                            onChange={(e) => updateQuote(idx, 'text', e.target.value)}
                                                            placeholder="Enter quote in English..."
                                                        />
                                                    </td>
                                                    <td className="p-2 align-top">
                                                         <textarea 
                                                            className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                                            rows={2}
                                                            value={quote.meaning}
                                                            onChange={(e) => updateQuote(idx, 'meaning', e.target.value)}
                                                            placeholder="Nhập nghĩa tiếng Việt..."
                                                        />
                                                    </td>
                                                    <td className="p-2 align-top text-center">
                                                        <button 
                                                            onClick={() => removeQuoteRow(idx)}
                                                            className="p-2 text-gray-400 hover:text-red-500 transition"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <button 
                                onClick={addQuoteRow}
                                className="flex items-center gap-2 text-indigo-600 font-medium hover:bg-indigo-50 px-4 py-2 rounded-lg transition"
                            >
                                <Plus size={18} /> Add New Quote
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  
  // Initialize date with logical date (considering 2AM cutoff)
  const [currentDate, setCurrentDate] = useState(getLogicalDate());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatDate(getLogicalDate()));
  
  // Initialize logs from localStorage for immediate display
  const [logs, setLogs] = useState<LogsMap>(() => {
      try {
          const saved = localStorage.getItem('daily_logs');
          return saved ? JSON.parse(saved) : {};
      } catch {
          return {};
      }
  });
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [congratsMsg, setCongratsMsg] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  // General Stopwatch State
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Specific Task Timer State
  const [activeTask, setActiveTask] = useState<'speaking' | 'listening' | 'writing' | null>(null);
  const [taskTimer, setTaskTimer] = useState(0);

  // Manual refresh trigger for vocab review
  const [refreshVocabReview, setRefreshVocabReview] = useState(0);

  // User Profile State (Persisted)
  const [profession, setProfession] = useState(() => {
    try {
      return localStorage.getItem('user_profession') || '';
    } catch {
      return '';
    }
  });
  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem('user_name') || '';
    } catch {
      return '';
    }
  });

  const [showChoiceMsg, setShowChoiceMsg] = useState(false);

  // --- Effects ---
  
  // Save user profile whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('user_profession', profession);
      localStorage.setItem('user_name', userName);
    } catch (e) {
      // Ignore storage errors
    }
  }, [profession, userName]);

  // General Timer
  useEffect(() => {
    let intervalId: number;
    if (timerRunning) {
      intervalId = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [timerRunning]);

  // Specific Task Timer
  useEffect(() => {
    let intervalId: number;
    if (activeTask) {
        intervalId = window.setInterval(() => {
            setTaskTimer(prev => prev + 1);
        }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [activeTask]);

  // Auto-complete task after 15 minutes (900 seconds)
  useEffect(() => {
    if (activeTask && taskTimer >= 900) {
       toggleTaskTimer(activeTask);
    }
  }, [taskTimer, activeTask]);

  // Auth
  useEffect(() => {
    if (!auth) return;

    const initAuth = async () => {
      try {
        // Set persistence to LOCAL to remember login across refresh/close
        await setPersistence(auth, browserLocalPersistence);

        // @ts-ignore
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // @ts-ignore
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (e) {
        console.error("Auth initialization error:", e);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
            setUser(u);
        } else {
            // Automatically sign in anonymously if no user
            signInAnonymously(auth).catch(err => console.error("Anon auth failed", err));
        }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Database Sync (Merge with local)
  useEffect(() => {
    if (!user || !db) return;
    
    // Only fetch cloud data for logged-in users or if user explicitly wants sync
    // For now, we fetch for everyone to keep "cloud backup" working
    const q = collection(db, 'artifacts', appId, 'users', user.uid, 'daily_logs');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudLogs: LogsMap = {};
      snapshot.forEach((doc) => {
        cloudLogs[doc.id] = doc.data() as DailyLog;
      });
      
      // Merge: Cloud data wins if exists, otherwise keep local (for offline support)
      setLogs(prev => {
          const merged = { ...prev, ...cloudLogs };
          // Also save this merged state to localStorage
          try {
             localStorage.setItem('daily_logs', JSON.stringify(merged));
          } catch (e) {}
          return merged;
      });
    });
    return () => unsubscribe();
  }, [user]);

  const activeLog = logs[selectedDateStr] || defaultLog;

  // --- Readiness Checks ---
  const isVocabReady = useMemo(() => {
    const { vocab1Meaning, vocab1Word, vocab1Method, vocab2Meaning, vocab2Word, vocab2Method } = activeLog;
    return (
      vocab1Meaning?.trim() && vocab1Word?.trim() && countWords(vocab1Method) >= 2 &&
      vocab2Meaning?.trim() && vocab2Word?.trim() && countWords(vocab2Method) >= 2
    );
  }, [activeLog]);

  const isSpeakingReady = useMemo(() => {
    const { speakingTopic, speakingVocab } = activeLog;
    return speakingTopic?.trim() && speakingVocab?.trim();
  }, [activeLog]);

  const isListeningReady = useMemo(() => {
    const { listeningTopic, listeningVocab } = activeLog;
    return listeningTopic?.trim() && listeningVocab?.trim();
  }, [activeLog]);

  const isWritingReady = useMemo(() => {
    return countWords(activeLog.writingContent) >= 30;
  }, [activeLog]);


  // --- Actions ---
  const handleGoogleLogin = async () => {
      if (!auth) {
        alert("Lỗi: Firebase chưa được khởi tạo. Vui lòng kiểm tra biến môi trường trên Vercel.");
        return;
      }
      const provider = new GoogleAuthProvider();
      try {
          await signInWithPopup(auth, provider);
      } catch (error: any) {
          console.error("Google login failed", error);
          if (error.code === 'auth/unauthorized-domain') {
              const currentDomain = window.location.hostname;
              alert(`LỖI TÊN MIỀN (Domain Error):\n\nTên miền "${currentDomain}" chưa được cho phép trên Firebase.\n\nCÁCH SỬA:\n1. Vào Firebase Console (console.firebase.google.com)\n2. Chọn Authentication -> Settings -> Authorized domains\n3. Bấm "Add domain" và nhập: ${currentDomain}`);
          } else if (error.code === 'auth/popup-closed-by-user') {
              // User closed popup, do nothing
          } else {
              alert(`Đăng nhập thất bại: ${error.message}`);
          }
      }
  };

  const handleLogout = async () => {
      if (!auth) return;
      try {
          await signOut(auth);
          // Reload page to clear local state and reset to anonymous clean slate
          window.location.reload();
      } catch (error) {
          console.error("Logout failed", error);
      }
  }

  const handleUpdateLog = async (field: Partial<DailyLog> | keyof DailyLog, value?: any) => {
    // Use logical date (2AM cutoff) for comparing today
    const todayStr = formatDate(getLogicalDate());
    
    if (selectedDateStr < todayStr) {
      alert("This day has passed. You cannot edit past records.");
      return;
    }

    // --- Validation (Only if specific fields are being updated) ---
    if (typeof field === 'string') {
        if (field === 'vocabDone' && value === true && !isVocabReady) {
            alert("Please fill in all fields. Memorization/Examples must be at least 2 words.");
            return;
        }
        if (field === 'speakingDone' && value === true && !isSpeakingReady) {
            alert("Please enter both the topic and the vocabulary learned.");
            return;
        }
        if (field === 'listeningDone' && value === true && !isListeningReady) {
            alert("Please enter the topic and the vocabulary learned.");
            return;
        }
        if (field === 'writingDone' && value === true && !isWritingReady) {
           alert(`You need at least 30 words. Current: ${countWords(activeLog.writingContent)} words.`);
           return;
        }
    }

    // --- Data Prep ---
    const currentLog = logs[selectedDateStr] || { ...defaultLog };
    let updates = typeof field === 'string' ? { [field]: value } : field;
    
    // Add timestamps
    const nowTime = formatTime(new Date());
    if (updates['vocabDone'] === true) updates['vocabTimestamp'] = nowTime;
    if (updates['speakingDone'] === true) updates['speakingTimestamp'] = nowTime;
    if (updates['listeningDone'] === true) updates['listeningTimestamp'] = nowTime;
    if (updates['writingDone'] === true) updates['writingTimestamp'] = nowTime;

    const updatedLog = { ...currentLog, ...updates };

    // Calculate Money (re-eval all tasks)
    let money = 0;
    if (updatedLog.vocabDone) money += 10;
    if (updatedLog.speakingDone) money += 10;
    if (updatedLog.listeningDone) money += 10;
    if (updatedLog.writingDone) money += 10;

    updatedLog.totalMoney = money;

    // Celebration check
    if (updatedLog.totalMoney > (currentLog.totalMoney || 0)) {
      triggerCelebration(money);
    }
    // Check if coins increased
    if ((updatedLog.dailyCoins || 0) > (currentLog.dailyCoins || 0)) {
        triggerCelebration(0); // Confetti for coins
    }

    // 1. Update React State
    const newLogs = { ...logs, [selectedDateStr]: updatedLog };
    setLogs(newLogs);

    // 2. Save to LocalStorage (Instant Backup)
    try {
        localStorage.setItem('daily_logs', JSON.stringify(newLogs));
    } catch (e) {
        console.warn("Local storage full or disabled", e);
    }

    // 3. Save to Firebase (Cloud Backup)
    if (user && db) {
        try {
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'daily_logs', selectedDateStr), updatedLog);

            // 4. Update Student Summary for Admin Dashboard
            let monthScore = 0;
            let totalMins = 0;
            const currentMonthPrefix = todayStr.substring(0, 7); // "YYYY-MM"
            
            // Logic for Previous Month Calculation
            const d = new Date(todayStr);
            d.setMonth(d.getMonth() - 1);
            const prevMonthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            let prevMonthMoney = 0;
            let prevMonthCoins = 0;

            Object.entries(newLogs).forEach(([date, log]) => {
                if (date.startsWith(currentMonthPrefix)) {
                    monthScore += (log.totalMoney || 0);
                }
                if (date.startsWith(prevMonthPrefix)) {
                    prevMonthMoney += (log.totalMoney || 0);
                    prevMonthCoins += (log.dailyCoins || 0);
                }
                if (log.studyMinutes) totalMins += log.studyMinutes;
            });

            const summaryData: StudentSummary = {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || 'Anonymous User',
                photoURL: user.photoURL || '',
                lastActive: new Date().toISOString(),
                currentMonthScore: monthScore,
                totalStudyMinutes: totalMins,
                prevMonthMoney,
                prevMonthCoins
            };
            
            await setDoc(doc(db, 'artifacts', appId, 'student_summaries', user.uid), summaryData);

        } catch (e) {
            console.error("Error saving log/summary to cloud:", e);
        }
    }
  };

  const toggleTaskTimer = (task: 'speaking' | 'listening' | 'writing') => {
      if (activeTask === task) {
          // Completing the task
          const field = `${task}Duration` as keyof DailyLog;
          const currentDuration = activeLog[field] as number || 0;
          const newDuration = currentDuration + taskTimer;
          handleUpdateLog(field, newDuration);
          setActiveTask(null);
          setTaskTimer(0);
      } else {
          if (activeTask) {
              alert("Please complete the currently running task first.");
              return;
          }
          setActiveTask(task);
          setTaskTimer(0);
      }
  };

  const resetTaskTimer = () => {
    setTaskTimer(0);
  };

  const triggerCelebration = (currentMoney: number) => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    if (currentMoney === 40) {
      const msgs = [
        "Thank you for doing this for your own growth!",
        "Thank you for taking this step for yourself!",
        "Thank you for choosing to invest in yourself!"
      ];
      setCongratsMsg(msgs[Math.floor(Math.random() * msgs.length)]);
      setTimeout(() => setCongratsMsg(null), 5000);
    }
  };

  // --- Date/Calendar Logic ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month); 
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const isDayLocked = (dateStr: string) => {
    return dateStr < formatDate(getLogicalDate());
  };

  const calendarWeeks = useMemo(() => {
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
        currentWeek.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push(null);
        }
        weeks.push(currentWeek);
    }
    return weeks;
  }, [year, month, daysInMonth, firstDayIndex]);

  const monthlyVocabByWeek = useMemo(() => {
    const weeks: { start: number; end: number; words: { day: number; word: string; meaning: string }[] }[] = [
        { start: 1, end: 7, words: [] },
        { start: 8, end: 14, words: [] },
        { start: 15, end: 21, words: [] },
        { start: 22, end: daysInMonth, words: [] },
    ];
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const log = logs[dateStr];
        if (log && log.vocabDone) {
            const weekIndex = weeks.findIndex(w => day >= w.start && day <= w.end);
            if (weekIndex !== -1) {
                if (log.vocab1Word?.trim()) weeks[weekIndex].words.push({ day, word: log.vocab1Word, meaning: log.vocab1Meaning });
                if (log.vocab2Word?.trim()) weeks[weekIndex].words.push({ day, word: log.vocab2Word, meaning: log.vocab2Meaning });
            }
        }
    }
    return weeks;
  }, [logs, year, month, daysInMonth, refreshVocabReview]);

  const handleRefreshVocab = () => {
      try {
          const saved = localStorage.getItem('daily_logs');
          if (saved) {
              setLogs(prev => ({...prev, ...JSON.parse(saved)}));
          }
      } catch (e) { console.error("Manual sync failed", e); }
      setRefreshVocabReview(prev => prev + 1);
  };

  const { totalEarned, currentScore, maxScore, totalCoins } = useMemo(() => {
    let total = 0;
    let score = 0;
    let coins = 0;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    days.forEach(day => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const log = logs[dateStr];
        if (log) {
             if (log.totalMoney) {
                 total += log.totalMoney;
                 score += (log.totalMoney / 10);
             }
             if (log.dailyCoins) {
                 coins += log.dailyCoins;
             }
        }
    });
    
    return {
        totalEarned: total,
        currentScore: score,
        maxScore: daysInMonth * 4,
        totalCoins: coins
    };
  }, [logs, year, month, daysInMonth]);

  const isLocked = isDayLocked(selectedDateStr);
  const currentWordCount = countWords(activeLog.writingContent);

  const handleChoiceClick = () => {
    setShowChoiceMsg(true);
    triggerCelebration(0); 
    setTimeout(() => setShowChoiceMsg(false), 5000);
  };

  // --- Slider Logic ---
  const currentMinutes = activeLog.studyMinutes || 0;
  const sliderMax = 90;
  
  const getSliderColor = (val: number) => {
    if (val < 10) return '#facc15';
    if (val < 30) return '#22c55e';
    if (val < 60) return '#3b82f6';
    return '#9333ea';
  };
  
  const sliderColor = getSliderColor(currentMinutes);
  const sliderPercentage = Math.min((currentMinutes / sliderMax) * 100, 100);

  const sliderMilestones = [
      { val: 10, icon: Footprints, color: 'text-yellow-500' },
      { val: 20, icon: Zap, color: 'text-lime-500' },
      { val: 30, icon: Bike, color: 'text-green-500' },
      { val: 40, icon: Car, color: 'text-teal-500' },
      { val: 50, icon: Bus, color: 'text-cyan-500' },
      { val: 60, icon: TrainFront, color: 'text-sky-500' },
      { val: 70, icon: Plane, color: 'text-blue-500' },
      { val: 80, icon: Rocket, color: 'text-indigo-500' },
      { val: 90, icon: Gem, color: 'text-purple-500' }
  ];

  // --- Timer Controls UI Helper ---
  const TaskTimerControls = ({ task, label, colorClass }: { task: 'speaking' | 'listening' | 'writing', label: string, colorClass: string }) => {
      const isActive = activeTask === task;
      return (
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
             <div className="flex items-center gap-3">
                 <div className="flex flex-col">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Timer</span>
                     <span className={`font-mono font-bold text-lg ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                         {isActive ? formatDuration(taskTimer) : formatDuration(0)}
                     </span>
                 </div>
                 {isActive && (
                     <div className="flex items-center gap-1.5 animate-pulse">
                         <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                         <span className="text-xs text-red-500 font-bold">Recording...</span>
                     </div>
                 )}
             </div>
             <div className="flex items-center gap-2">
                 {isActive && (
                     <button
                         onClick={resetTaskTimer}
                         className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                         title="Reset Timer"
                     >
                         <RotateCcw size={20} />
                     </button>
                 )}
                 <button
                     disabled={isLocked || (activeTask && !isActive)}
                     onClick={() => toggleTaskTimer(task)}
                     className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-sm 
                         ${isActive 
                             ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                             : `${colorClass} text-white hover:opacity-90`
                         }
                         ${(activeTask && !isActive) ? 'opacity-50 cursor-not-allowed' : ''}
                     `}
                 >
                     {isActive ? <><Square size={16} fill="currentColor" /> Complete</> : <><Play size={16} fill="currentColor" /> Start Practice</>}
                 </button>
             </div>
          </div>
      );
  };

  // --- APP SCREEN ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      <style>{`
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 24px;
            width: 24px;
            border-radius: 50%;
            background: ${sliderColor};
            cursor: pointer;
            margin-top: -8px; 
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            border: 3px solid white;
            transition: background 0.2s;
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 10px;
            cursor: pointer;
            background: #e5e7eb;
            border-radius: 9999px;
            background-image: linear-gradient(to right, #facc15 0%, #22c55e 33%, #3b82f6 66%, #9333ea 100%);
            background-size: ${sliderPercentage}% 100%;
            background-repeat: no-repeat;
        }
      `}</style>

      {showConfetti && <Confetti />}
      
      {(congratsMsg || showChoiceMsg) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl transform scale-105">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">
                {showChoiceMsg ? "Well done!" : "Congratulations!"}
            </h2>
            <p className="text-gray-700 text-lg font-medium whitespace-pre-line">
                {showChoiceMsg 
                    ? "Your future self will thank you.\n\nLàm tốt lắm! Bạn của tương lai sẽ cảm ơn bạn." 
                    : congratsMsg}
            </p>
          </div>
        </div>
      )}

      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
      
      {showArchive && (
          <PersonalArchiveModal 
            logs={logs} 
            currentDate={currentDate} 
            onClose={() => setShowArchive(false)} 
          />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg"><BookOpen size={20} /></div>
            <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-bold text-gray-900">English Journey</h1>
                <span className="text-xs text-gray-400 font-medium">v.25.01</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
             {/* Auth Section */}
             {user && !user.isAnonymous ? (
                 <div className="flex items-center gap-2 pr-2 border-r border-gray-200">
                     {user.email === ADMIN_EMAIL && (
                        <button onClick={() => setShowAdmin(true)} className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition" title="Admin Dashboard">
                            <Shield size={18} />
                        </button>
                     )}
                     
                     {user.photoURL ? (
                         <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-gray-200" />
                     ) : (
                         <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                             <UserIcon size={16} />
                         </div>
                     )}
                     <button onClick={handleLogout} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition" title="Logout">
                         <LogOut size={18} />
                     </button>
                 </div>
             ) : (
                 <button onClick={handleGoogleLogin} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-medium hover:bg-gray-50 transition text-gray-700">
                     <LogIn size={14} />
                     Login to Sync
                 </button>
             )}

            <div className="flex flex-col items-end px-3 py-1 bg-green-50 rounded-lg border border-green-100 min-w-[100px]">
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Month Total</span>
                <span className="font-bold text-green-700 flex items-center gap-0.5">
                    {totalEarned} <Banknote size={12} strokeWidth={3} />
                </span>
            </div>
            
            <div className="flex flex-col items-end px-3 py-1 bg-yellow-50 rounded-lg border border-yellow-100 min-w-[80px]">
                <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Coins</span>
                <span className="font-bold text-yellow-600 flex items-center gap-1">
                    {totalCoins} <Coins size={12} fill="currentColor"/>
                </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        
        {/* Monthly Score Progress Bar */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
             <div className="flex justify-between items-end mb-2">
                 <div className="flex items-center gap-2">
                     <h2 className="text-gray-700 font-bold text-lg">Monthly Score</h2>
                     <button onClick={() => setShowArchive(true)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded-full" title="Personal Archive">
                         <Archive size={18} />
                     </button>
                 </div>
                 <div className="text-xl font-bold flex items-center gap-1">
                    <span className="text-teal-600 flex items-center">
                        {currentScore}
                    </span>
                    <span className="text-gray-400 text-sm">/{maxScore}</span>
                 </div>
             </div>
             <div className="w-full bg-gray-100 rounded-full h-3">
                 <div 
                    className="bg-teal-500 h-3 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${maxScore > 0 ? (currentScore / maxScore) * 100 : 0}%` }}
                 ></div>
             </div>
        </section>

        {/* Calendar Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-semibold text-lg flex items-center gap-2 text-gray-700">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              {monthNames[month]} {year}
            </h2>
            <div className="flex gap-1">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-200 rounded-full transition"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-200 rounded-full transition"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-8 text-center text-xs font-bold text-gray-400 py-3 border-b border-gray-100 bg-gray-50">
            <div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div><div className="text-red-400">SUN</div>
            <div className="text-yellow-600">REWARD</div>
          </div>
          <div className="bg-gray-200 gap-[1px] border-b border-gray-100 flex flex-col gap-[1px]">
            {calendarWeeks.map((week, weekIndex) => {
                let isWeekComplete = true;
                let hasRealDays = false;
                week.forEach(day => {
                    if (day) {
                        hasRealDays = true;
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        if (logs[dateStr]?.totalMoney !== 40) isWeekComplete = false;
                    }
                });
                if (!hasRealDays) isWeekComplete = false;

                return (
                    <div key={weekIndex} className="grid grid-cols-8 gap-[1px]">
                        {week.map((day, dayIndex) => {
                            if (!day) return <div key={`empty-${dayIndex}`} className="bg-white min-h-[90px]"></div>;
                            const dateObj = new Date(year, month, day);
                            const dateStr = formatDate(dateObj);
                            const isSelected = selectedDateStr === dateStr;
                            const isToday = formatDate(getLogicalDate()) === dateStr;
                            const earned = logs[dateStr]?.totalMoney || 0;
                            const studyMins = logs[dateStr]?.studyMinutes || 0;
                            let colorClass = 'bg-white hover:bg-gray-50';
                            if (earned === 10) colorClass = 'bg-yellow-50 hover:bg-yellow-100';
                            if (earned === 20) colorClass = 'bg-yellow-100 hover:bg-yellow-200';
                            if (earned === 30) colorClass = 'bg-orange-100 hover:bg-orange-200';
                            if (earned === 40) colorClass = 'bg-green-100 hover:bg-green-200';

                            return (
                                <div 
                                    key={day}
                                    onClick={() => setSelectedDateStr(dateStr)}
                                    className={`relative min-h-[90px] p-2 cursor-pointer transition-all duration-200 flex flex-col justify-between group ${colorClass} ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600'}`}>
                                            {day}
                                        </span>
                                    </div>
                                    <div className="self-end flex flex-col items-end gap-0.5">
                                        {studyMins > 0 && <span className="text-[10px] bg-white/50 px-1 rounded text-gray-600 font-medium">{studyMins}m</span>}
                                        {earned > 0 && <span className={`text-xs font-bold flex items-center ${earned === 40 ? 'text-green-700' : 'text-gray-600'}`}>
                                            {earned} <Banknote size={10} strokeWidth={3}/>
                                        </span>}
                                        {earned === 40 && <CheckCircle className="w-3 h-3 text-green-600" />}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="bg-gray-50 min-h-[90px] flex items-center justify-center border-l border-gray-100">
                            <div className={`p-3 rounded-full transition-all duration-500 ${isWeekComplete ? 'bg-yellow-100 text-yellow-600 shadow-md ring-4 ring-yellow-50 scale-110' : 'bg-gray-100 text-gray-300 grayscale'}`}>
                                <Gift size={24} fill={isWeekComplete ? "currentColor" : "none"} />
                            </div>
                        </div>
                    </div>
                );
            })}
          </div>
        </section>

        {/* Stopwatch Section */}
        <section className="bg-indigo-900 text-white rounded-xl shadow-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="bg-indigo-800 p-3 rounded-full animate-pulse">
                    <Clock size={28} className="text-indigo-200" />
                </div>
                <div>
                    <p className="text-indigo-200 text-sm font-medium mb-1">Small steps every day create big changes over time:</p>
                    <div className="text-4xl font-mono font-bold tracking-wider tabular-nums">
                        {formatDuration(elapsedTime)}
                    </div>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setTimerRunning(!timerRunning)} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all ${timerRunning ? 'bg-indigo-700 text-indigo-100 hover:bg-indigo-600' : 'bg-green-500 text-white hover:bg-green-600 shadow-lg hover:shadow-green-500/30'}`}>
                    {timerRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
                </button>
                <button onClick={() => { setTimerRunning(false); setElapsedTime(0); }} className="p-2 rounded-full bg-indigo-800 text-indigo-300 hover:bg-indigo-700 transition" title="Reset">
                    <RotateCcw size={18} />
                </button>
            </div>
        </section>

        {/* Detail Section */}
        <section className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden transition-all duration-500">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-2xl">Daily Mission</h3>
              <p className="text-blue-100 text-sm flex items-center gap-2 mt-1 opacity-90">
                  <CalendarIcon size={14} /> {selectedDateStr}
                  {isLocked && <span className="bg-red-500/20 px-2 py-0.5 rounded text-xs border border-white/20">Locked</span>}
              </p>
            </div>
            <div className="text-right bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/10">
              <div className="text-3xl font-bold flex items-center gap-1 justify-end">
                  {activeLog.totalMoney} <Banknote size={24} strokeWidth={3} />
              </div>
              <div className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">Earned Today</div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            
            {/* Task 1 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-blue-800 font-bold text-lg border-b border-blue-100 pb-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><BookOpen size={20} /></div>
                <span>Task 1: Vocabulary</span>
                <span className="ml-auto text-xs font-normal bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100 flex items-center gap-0.5">
                    10 <Banknote size={12} strokeWidth={3} /> Reward
                </span>
              </div>
              <div className="bg-blue-50/50 rounded-lg border border-blue-100 overflow-hidden">
                <button onClick={() => setExpandedSection(expandedSection === 1 ? null : 1)} className="w-full px-4 py-2 flex items-center justify-between text-sm text-blue-600 font-medium hover:bg-blue-50 transition">
                   <span className="flex items-center gap-2"><Info size={16}/> How to complete?</span>
                   {expandedSection === 1 ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {expandedSection === 1 && (
                    <div className="px-4 pb-3 space-y-3 animate-in slide-in-from-top-2">
                        <div className="text-sm text-gray-600 leading-relaxed">
                            Fill in Meaning, Vocabulary, and Memorization Method.
                            <br/>
                            <span className="font-semibold text-blue-700">Example:</span> Xe đạp - bike - Tôi <span className="italic">ride my bike</span> đến trường.
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-blue-100">
                             <ResourceLink href="https://4englishapp.com/#/reading" label="4English" />
                             <ResourceLink href="https://thestoryshack.com/flash-fiction/" label="Stories" />
                             <ResourceLink href="https://www.vocabulary.com/lists/52473" label="Vocab List" />
                        </div>
                    </div>
                )}
              </div>
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-1"><input disabled={isLocked} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Meaning (VN)" value={activeLog.vocab1Meaning} onChange={(e) => handleUpdateLog('vocab1Meaning', e.target.value)} /></div>
                    <div className="md:col-span-1"><input disabled={isLocked} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-blue-700" placeholder="Vocabulary" value={activeLog.vocab1Word} onChange={(e) => handleUpdateLog('vocab1Word', e.target.value)} /></div>
                    <div className="md:col-span-2"><input disabled={isLocked} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Memorization / Example (min 2 words)" value={activeLog.vocab1Method} onChange={(e) => handleUpdateLog('vocab1Method', e.target.value)} /></div>
                  </div>
              </div>
               <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-1"><input disabled={isLocked} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Meaning (VN)" value={activeLog.vocab2Meaning} onChange={(e) => handleUpdateLog('vocab2Meaning', e.target.value)} /></div>
                    <div className="md:col-span-1"><input disabled={isLocked} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-blue-700" placeholder="Vocabulary" value={activeLog.vocab2Word} onChange={(e) => handleUpdateLog('vocab2Word', e.target.value)} /></div>
                    <div className="md:col-span-2"><input disabled={isLocked} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Memorization / Example (min 2 words)" value={activeLog.vocab2Method} onChange={(e) => handleUpdateLog('vocab2Method', e.target.value)} /></div>
                  </div>
              </div>
              <div className="flex justify-end">
                <button disabled={isLocked || (!isVocabReady && !activeLog.vocabDone)} onClick={() => handleUpdateLog('vocabDone', !activeLog.vocabDone)} className={`px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all min-w-[160px] shadow-sm ${activeLog.vocabDone ? 'bg-green-500 text-white hover:bg-green-600 ring-2 ring-green-300 ring-offset-1' : isVocabReady ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  {activeLog.vocabDone ? <><CheckCircle size={18}/> Done</> : 'Mark Done'}
                </button>
              </div>
              {activeLog.vocabTimestamp && <div className="text-right text-xs text-gray-400">Completed at: {activeLog.vocabTimestamp}</div>}
            </div>

            {/* Task 2 */}
            <div className="space-y-4">
               <div className="flex items-center gap-3 text-purple-800 font-bold text-lg border-b border-purple-100 pb-2">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Mic size={20} /></div>
                <span>Task 2: Speaking (2 mins)</span>
                <span className="ml-auto text-xs font-normal bg-purple-50 text-purple-600 px-2 py-1 rounded-full border border-purple-100 flex items-center gap-0.5">
                    10 <Banknote size={12} strokeWidth={3} /> Reward
                </span>
              </div>
              <div className="bg-purple-50/50 rounded-lg border border-purple-100 overflow-hidden">
                <button onClick={() => setExpandedSection(expandedSection === 2 ? null : 2)} className="w-full px-4 py-2 flex items-center justify-between text-sm text-purple-600 font-medium hover:bg-purple-50 transition">
                   <span className="flex items-center gap-2"><Info size={16}/> Need a topic?</span>
                   {expandedSection === 2 ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {expandedSection === 2 && (
                    <div className="px-4 pb-3 space-y-3">
                        <div className="text-sm text-gray-600 leading-relaxed">Stuck? Use the tools below to find topics or practice reading.</div>
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-purple-100">
                             <ResourceLink href="https://readalong.google.com/" label="Google Read Along" colorClass="bg-purple-100 text-purple-700 hover:bg-purple-200" />
                             <ResourceLink href="https://www.conversationstarters.com/generator.php" label="Topic Generator" colorClass="bg-purple-100 text-purple-700 hover:bg-purple-200" />
                             <ResourceLink href="https://esldiscussions.com/" label="ESL Discussions" colorClass="bg-purple-100 text-purple-700 hover:bg-purple-200" />
                             <ResourceLink href="https://reedsy.com/creative-writing-prompts/" label="Reedsy Prompts" colorClass="bg-purple-100 text-purple-700 hover:bg-purple-200" />
                        </div>
                    </div>
                )}
              </div>
              <TaskTimerControls task="speaking" label="Start Speaking" colorClass="bg-purple-500" />
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                    <input disabled={isLocked} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Topic (e.g. My Hobbies)" value={activeLog.speakingTopic} onChange={(e) => handleUpdateLog('speakingTopic', e.target.value)} />
                    <input disabled={isLocked} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Vocab learned from this topic (Required)" value={activeLog.speakingVocab} onChange={(e) => handleUpdateLog('speakingVocab', e.target.value)} />
                </div>
                <div className="flex items-end">
                    <button disabled={isLocked || (!isSpeakingReady && !activeLog.speakingDone)} onClick={() => handleUpdateLog('speakingDone', !activeLog.speakingDone)} className={`h-[50px] px-6 rounded-lg font-bold flex items-center justify-center gap-2 transition-all min-w-[160px] shadow-sm ${activeLog.speakingDone ? 'bg-green-500 text-white hover:bg-green-600 ring-2 ring-green-300 ring-offset-1' : isSpeakingReady ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                    {activeLog.speakingDone ? <><CheckCircle size={18}/> Done</> : 'Mark Done'}
                    </button>
                </div>
              </div>
              {activeLog.speakingTimestamp && <div className="text-right text-xs text-gray-400">Completed at: {activeLog.speakingTimestamp}</div>}
            </div>

            {/* Task 3 */}
             <div className="space-y-4">
               <div className="flex items-center gap-3 text-orange-800 font-bold text-lg border-b border-orange-100 pb-2">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Headphones size={20} /></div>
                <span>Task 3: Listening (10 mins)</span>
                <span className="ml-auto text-xs font-normal bg-orange-50 text-orange-600 px-2 py-1 rounded-full border border-orange-100 flex items-center gap-0.5">
                    10 <Banknote size={12} strokeWidth={3} /> Reward
                </span>
              </div>
              <div className="bg-orange-50/50 rounded-lg border border-orange-100 overflow-hidden">
                <button onClick={() => setExpandedSection(expandedSection === 3 ? null : 3)} className="w-full px-4 py-2 flex items-center justify-between text-sm text-orange-600 font-medium hover:bg-orange-50 transition">
                   <span className="flex items-center gap-2"><Info size={16}/> Suggestions</span>
                   {expandedSection === 3 ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {expandedSection === 3 && (
                    <div className="px-4 pb-3 space-y-3">
                        <div className="text-sm text-gray-600 leading-relaxed">Choose a level below. Listen and paste the YouTube link to complete.</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-orange-100">
                             <div className="space-y-1">
                                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Pronunciation</span>
                                <div className="flex flex-wrap gap-1">
                                    <ResourceLink href="https://www.youtube.com/@Pronunciationwithemma/videos" label="Emma" colorClass="bg-orange-100 text-orange-800" icon={<Youtube size={12}/>} />
                                    <ResourceLink href="https://www.youtube.com/@rachelsenglish/videos" label="Rachel" colorClass="bg-orange-100 text-orange-800" icon={<Youtube size={12}/>} />
                                </div>
                             </div>
                             <div className="space-y-1">
                                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Basic & Conversation</span>
                                <div className="flex flex-wrap gap-1">
                                    <ResourceLink href="https://listenaminute.com/" label="Listen A Minute" colorClass="bg-orange-100 text-orange-800" />
                                    <ResourceLink href="https://www.youtube.com/@EnglishEasyPractice/videos" label="Easy Practice" colorClass="bg-orange-100 text-orange-800" icon={<Youtube size={12}/>} />
                                </div>
                             </div>
                             <div className="space-y-1 sm:col-span-2">
                                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Advanced (Business/News)</span>
                                <div className="flex flex-wrap gap-1">
                                    <ResourceLink href="https://www.youtube.com/@BusinessInsider/videos" label="Business Insider" colorClass="bg-orange-100 text-orange-800" icon={<Youtube size={12}/>} />
                                    <ResourceLink href="https://www.youtube.com/@CNBCMakeIt/videos" label="CNBC Make It" colorClass="bg-orange-100 text-orange-800" icon={<Youtube size={12}/>} />
                                </div>
                             </div>
                        </div>
                    </div>
                )}
              </div>
              <TaskTimerControls task="listening" label="Start Listening" colorClass="bg-orange-500" />
              <div className="grid grid-cols-1 gap-3">
                  <input disabled={isLocked} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Topic (e.g. News on Space)" value={activeLog.listeningTopic} onChange={(e) => handleUpdateLog('listeningTopic', e.target.value)} />
                  <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <LinkIcon className="absolute left-3 top-3.5 text-gray-400" size={16} />
                            <input disabled={isLocked} className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Paste YouTube Link Here (Optional)" value={activeLog.listeningLink} onChange={(e) => handleUpdateLog('listeningLink', e.target.value)} />
                        </div>
                        {activeLog.listeningLink && (
                            <button onClick={() => window.open(activeLog.listeningLink, '_blank')} className="px-3 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition flex items-center justify-center" title="Open Link">
                                <ExternalLink size={20} />
                            </button>
                        )}
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <input disabled={isLocked} className="flex-1 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Vocab learned from listening (Required)" value={activeLog.listeningVocab} onChange={(e) => handleUpdateLog('listeningVocab', e.target.value)} />
                    <button disabled={isLocked || (!isListeningReady && !activeLog.listeningDone)} onClick={() => handleUpdateLog('listeningDone', !activeLog.listeningDone)} className={`px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all min-w-[160px] shadow-sm ${activeLog.listeningDone ? 'bg-green-500 text-white hover:bg-green-600 ring-2 ring-green-300 ring-offset-1' : isListeningReady ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                    {activeLog.listeningDone ? <><CheckCircle size={18}/> Done</> : 'Mark Done'}
                    </button>
                  </div>
              </div>
              {activeLog.listeningTimestamp && <div className="text-right text-xs text-gray-400">Completed at: {activeLog.listeningTimestamp}</div>}
            </div>

            {/* Task 4 */}
             <div className="space-y-4">
               <div className="flex items-center gap-3 text-pink-800 font-bold text-lg border-b border-pink-100 pb-2">
                <div className="p-2 bg-pink-100 rounded-lg text-pink-600"><PenTool size={20} /></div>
                <span>Task 4: Writing / Grammar</span>
                <span className="ml-auto text-xs font-normal bg-pink-50 text-pink-600 px-2 py-1 rounded-full border border-pink-100 flex items-center gap-0.5">
                    10 <Banknote size={12} strokeWidth={3} /> Reward
                </span>
              </div>
               <div className="bg-pink-50/50 rounded-lg border border-pink-100 overflow-hidden">
                <button onClick={() => setExpandedSection(expandedSection === 4 ? null : 4)} className="w-full px-4 py-2 flex items-center justify-between text-sm text-pink-600 font-medium hover:bg-pink-50 transition">
                   <span className="flex items-center gap-2"><Info size={16}/> Resources & Prompts</span>
                   {expandedSection === 4 ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {expandedSection === 4 && (
                    <div className="px-4 pb-3 space-y-3">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                             <div className="space-y-1">
                                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Grammar</span>
                                <div className="flex flex-wrap gap-1">
                                    <ResourceLink href="https://www.youtube.com/@POCEnglish/videos" label="POC English" colorClass="bg-pink-100 text-pink-700 hover:bg-pink-200" icon={<Youtube size={12}/>} />
                                    <ResourceLink href="https://www.youtube.com/@StudyEnglishwithUs/streams" label="Study With Us" colorClass="bg-pink-100 text-pink-700 hover:bg-pink-200" icon={<Youtube size={12}/>} />
                                </div>
                             </div>
                             <div className="space-y-1">
                                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Writing Ideas</span>
                                <div className="flex flex-wrap gap-1">
                                    <ResourceLink href="https://www.textfixer.com/tools/random-word-generator.php" label="Random Word Gen" colorClass="bg-pink-100 text-pink-700 hover:bg-pink-200" />
                                </div>
                             </div>
                             <div className="space-y-1 sm:col-span-2">
                                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Read & Summarize</span>
                                <div className="flex flex-wrap gap-1">
                                    <ResourceLink href="https://breakingnewsenglish.com/" label="Breaking News" colorClass="bg-pink-100 text-pink-700 hover:bg-pink-200" />
                                    <ResourceLink href="https://learnenglish.britishcouncil.org/skills/reading" label="British Council" colorClass="bg-pink-100 text-pink-700 hover:bg-pink-200" />
                                    <ResourceLink href="https://www.eslfast.com/" label="ESL Fast" colorClass="bg-pink-100 text-pink-700 hover:bg-pink-200" />
                                    <ResourceLink href="https://www.newsinlevels.com/" label="News In Levels" colorClass="bg-pink-100 text-pink-700 hover:bg-pink-200" />
                                </div>
                             </div>
                        </div>
                    </div>
                )}
              </div>
              <TaskTimerControls task="writing" label="Start Writing" colorClass="bg-pink-500" />
              <div className="flex flex-col gap-2">
                <div className="relative">
                    <textarea disabled={isLocked} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 outline-none min-h-[100px]" placeholder="Write at least 30 words here..." value={activeLog.writingContent} onChange={(e) => handleUpdateLog('writingContent', e.target.value)} />
                    <div className={`absolute bottom-3 right-3 text-xs font-bold ${currentWordCount >= 30 ? 'text-green-600' : 'text-gray-400'}`}>{currentWordCount}/30 words</div>
                </div>
                <div className="self-end">
                    <button disabled={isLocked || (!isWritingReady && !activeLog.writingDone)} onClick={() => handleUpdateLog('writingDone', !activeLog.writingDone)} className={`px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all min-w-[160px] shadow-sm ${activeLog.writingDone ? 'bg-green-500 text-white hover:bg-green-600 ring-2 ring-green-300 ring-offset-1' : isWritingReady ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                    {activeLog.writingDone ? <><CheckCircle size={18}/> Done</> : 'Mark Done'}
                    </button>
                </div>
              </div>
              {activeLog.writingTimestamp && <div className="text-right text-xs text-gray-400">Completed at: {activeLog.writingTimestamp}</div>}
            </div>

            {/* Challenges */}
            <ChallengeSection 
                log={activeLog} 
                logs={logs}
                dateStr={selectedDateStr}
                onUpdate={(updates) => handleUpdateLog(updates)}
            />

          </div>
        </section>

         {/* Weekly Reward Info & Slider */}
         <section className="bg-white rounded-xl shadow-lg border border-yellow-200 overflow-hidden">
             <div className="bg-gray-50 p-6 border-b border-gray-100">
                <h4 className="text-gray-700 font-bold mb-1 text-center">Every minute you commit counts—be aware of it.</h4>
                <p className="text-gray-500 text-sm mb-6 text-center italic">Hãy ghi nhận những nỗ lực bạn đã thực hiện ngày hôm nay!</p>
                <div className="px-2 pt-4 pb-2">
                    <div className="relative mb-6">
                        <input type="range" min="0" max="90" step="5" disabled={isLocked} value={activeLog.studyMinutes || 0} onChange={(e) => handleUpdateLog('studyMinutes', parseInt(e.target.value))} className="w-full h-3 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex justify-between items-end relative px-1">
                        {sliderMilestones.map((m) => {
                            const isActive = (activeLog.studyMinutes || 0) >= m.val;
                            return (
                                <div key={m.val} className={`flex flex-col items-center gap-1 transition-all duration-500 ${isActive ? m.color : 'text-gray-300 grayscale'}`}>
                                    <m.icon size={20} fill={isActive ? "currentColor" : "none"} />
                                    <span className="text-[10px] font-bold">{m.val}m</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="text-center mt-5 font-bold text-2xl transition-colors duration-300" style={{ color: sliderColor }}>
                        {activeLog.studyMinutes || 0} minutes
                    </div>
                </div>
             </div>
             <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 text-center">
                <h4 className="text-yellow-800 font-bold mb-2 flex items-center justify-center gap-2">
                    <Banknote className="w-5 h-5" /> Bonus Rewards
                </h4>
                <div className="text-sm text-yellow-700 flex flex-col gap-2 items-center">
                    <p>Complete all tasks (Mon-Sun) to earn <strong>+40k</strong>/week.</p>
                    <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1 rounded-full border border-yellow-200">
                        <Star size={14} className="text-yellow-600" fill="currentColor"/>
                        <span>Perfect Month (All 4 tasks everyday): <strong>+200k</strong></span>
                    </div>
                </div>
             </div>
         </section>

         {/* Practice Summary */}
         <section className="bg-white rounded-xl shadow-lg border border-teal-100 overflow-hidden">
             <div className="bg-teal-50 p-4 border-b border-teal-100">
                 <h3 className="font-bold text-teal-900 flex items-center gap-2">
                     <Timer size={20} />
                     Practice Summary
                 </h3>
             </div>
             <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center"><span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Speaking</span><div className="text-lg font-bold text-purple-600">{formatMiniDuration(activeLog.speakingDuration || 0)}</div></div>
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center"><span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Listening</span><div className="text-lg font-bold text-orange-600">{formatMiniDuration(activeLog.listeningDuration || 0)}</div></div>
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center"><span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Writing</span><div className="text-lg font-bold text-pink-600">{formatMiniDuration(activeLog.writingDuration || 0)}</div></div>
                 <div className="bg-teal-100 p-3 rounded-lg border border-teal-200 text-center"><span className="text-xs text-teal-800 uppercase font-bold tracking-wider">Total Time</span><div className="text-lg font-bold text-teal-900">{formatMiniDuration((activeLog.speakingDuration || 0) + (activeLog.listeningDuration || 0) + (activeLog.writingDuration || 0))}</div></div>
             </div>
         </section>

         {/* Monthly Vocab Review */}
         <section className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden">
             <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
                 <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                     <BookOpen size={20} />
                     Monthly Vocabulary Review
                 </h3>
                 <button onClick={handleRefreshVocab} className="text-xs bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full hover:bg-sky-200 transition font-medium flex items-center gap-1 shadow-sm">
                    <RefreshCw size={12} /> Update List
                 </button>
             </div>
             <div className="p-4 space-y-2">
                 {monthlyVocabByWeek.map((week, idx) => (
                     <details key={idx} className="group border border-indigo-100 rounded-lg bg-white open:bg-indigo-50/30 transition-colors">
                         <summary className="flex items-center justify-between p-3 font-medium cursor-pointer list-none text-indigo-800 hover:bg-indigo-50 rounded-lg">
                             <span>Week {idx + 1} (Days {week.start}-{week.end})</span>
                             <span className="flex items-center gap-2 text-sm text-indigo-400">
                                 {week.words.length} words <ChevronDown className="group-open:rotate-180 transition-transform" size={16}/>
                             </span>
                         </summary>
                         <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                             {week.words.length === 0 ? <p className="text-sm text-gray-400 italic col-span-full text-center py-2">No words recorded yet.</p> : week.words.map((item, i) => (
                                 <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-indigo-100 text-sm shadow-sm">
                                     <div><span className="font-bold text-indigo-700">{item.word}</span>{item.meaning && <span className="text-gray-500 block text-xs">{item.meaning}</span>}</div>
                                     <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">Day {item.day}</span>
                                 </div>
                             ))}
                         </div>
                     </details>
                 ))}
             </div>
         </section>

         {/* Daily Motivation Quote */}
         <DailyQuote />
         
         {/* Footer Commitment */}
         <section className="bg-gray-800 text-gray-200 rounded-xl p-8 text-center space-y-6">
            <div className="space-y-4">
                <p className="text-xl font-medium flex flex-wrap justify-center items-center gap-2">
                    <span>I am</span>
                    <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="[ Your Name ]" className="bg-transparent border-b border-gray-500 text-center text-white focus:outline-none focus:border-white transition-colors w-40 placeholder-gray-500" />
                    <span>. I am a</span>
                    <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="[ expert / ... ]" className="bg-transparent border-b border-gray-500 text-center text-white focus:outline-none focus:border-white transition-colors w-32 placeholder-gray-500" />. 
                    <span>I dedicate this time for my own happiness!</span>
                </p>
                <p className="text-gray-500 text-sm">
                    Tôi là <span className="mx-1 border-b border-gray-600 px-2 inline-block min-w-[50px] text-gray-400">{userName || "..."}</span>, 
                    tôi là một chuyên gia <span className="mx-1 border-b border-gray-600 px-2 inline-block min-w-[50px] text-gray-400">{profession || "..."}</span>, 
                    tôi dành thời gian này vì hạnh phúc của chính mình!
                </p>
            </div>
            <button onClick={handleChoiceClick} className="bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-transform active:scale-95 shadow-lg">This is My Choice</button>
         </section>

      </main>
    </div>
  );
}