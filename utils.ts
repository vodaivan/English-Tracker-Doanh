
import { DailyLog, LogsMap } from './types';

export const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; 
};

// Custom Date Logic: Day ends at 02:00 AM the next day
export const getLogicalDate = (): Date => {
  const now = new Date();
  if (now.getHours() < 2) {
    now.setHours(now.getHours() - 24);
  }
  return now;
};

export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getYesterdayStr = (dateStr: string): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return formatDate(d);
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatMiniDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
};

export const countWords = (str: string): number => {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(w => w.length > 0).length;
};

export const defaultLog: DailyLog = {
  vocab1Meaning: '', vocab1Word: '', vocab1Method: '',
  vocab2Meaning: '', vocab2Word: '', vocab2Method: '',
  vocabDone: false,
  speakingTopic: '', speakingVocab: '', speakingDone: false, speakingDuration: 0,
  listeningTopic: '', listeningLink: '', listeningVocab: '', listeningDone: false, listeningDuration: 0,
  writingContent: '', writingDone: false, writingDuration: 0,
  totalMoney: 0,
  studyMinutes: 0,
  dailyCoins: 0,
  dailyGems: 0,
  game1Earnings: 0,
  game3Earnings: 0,
  challenge1Done: false,
  challenge2Done: false,
  challenge2Streak: 0,
  challenge2Words: Array(6).fill(''),
  challenge3Done: false
};

// --- Vocabulary Helpers ---

export const DEFAULT_VOCAB_LIST = [
    { word: "FAMILY", meaning: "Gia đình" },
    { word: "FRIEND", meaning: "Bạn bè" },
    { word: "SCHOOL", meaning: "Trường học" },
    { word: "TEACHER", meaning: "Giáo viên" },
    { word: "STUDENT", meaning: "Học sinh" },
    { word: "DOCTOR", meaning: "Bác sĩ" },
    { word: "HOUSE", meaning: "Ngôi nhà" },
    { word: "GARDEN", meaning: "Khu vườn" },
    { word: "WATER", meaning: "Nước" },
    { word: "MONEY", meaning: "Tiền" },
    { word: "HAPPY", meaning: "Hạnh phúc" },
    { word: "SMILE", meaning: "Nụ cười" },
    { word: "FUTURE", meaning: "Tương lai" },
    { word: "DREAM", meaning: "Giấc mơ" },
    { word: "TRAVEL", meaning: "Du lịch" },
    { word: "MUSIC", meaning: "Âm nhạc" },
    { word: "MOVIE", meaning: "Phim ảnh" },
    { word: "BOOK", meaning: "Sách" },
    { word: "COMPUTER", meaning: "Máy tính" },
    { word: "PHONE", meaning: "Điện thoại" },
    { word: "INTERNET", meaning: "Mạng internet" },
    { word: "COFFEE", meaning: "Cà phê" },
    { word: "BREAKFAST", meaning: "Bữa sáng" },
    { word: "DINNER", meaning: "Bữa tối" },
    { word: "SUMMER", meaning: "Mùa hè" },
    { word: "WINTER", meaning: "Mùa đông" },
    { word: "NATURE", meaning: "Thiên nhiên" },
    { word: "ANIMAL", meaning: "Động vật" },
    { word: "SUCCESS", meaning: "Thành công" },
    { word: "EFFORT", meaning: "Nỗ lực" },
    { word: "CHALLENGE", meaning: "Thử thách" },
    { word: "GOAL", meaning: "Mục tiêu" },
    { word: "HABIT", meaning: "Thói quen" },
    { word: "HEALTH", meaning: "Sức khỏe" },
    { word: "EXERCISE", meaning: "Thể dục" }
];

export const getAvailableVocabulary = (logs: LogsMap, dateStr: string, minWords: number = 30) => {
    const userWords: { word: string, meaning: string }[] = [];
    const today = new Date(dateStr);
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - 28); // 4 Weeks Window
    const cutoffStr = formatDate(cutoffDate);

    // 1. Collect User Words from Logs
    Object.entries(logs).forEach(([dateKey, log]) => {
        if (dateKey >= cutoffStr && log.vocabDone) {
            if (log.vocab1Word && log.vocab1Word.length >= 3) {
                userWords.push({ word: log.vocab1Word.trim().toUpperCase(), meaning: log.vocab1Meaning });
            }
            if (log.vocab2Word && log.vocab2Word.length >= 3) {
                userWords.push({ word: log.vocab2Word.trim().toUpperCase(), meaning: log.vocab2Meaning });
            }
        }
    });

    // 2. Remove Duplicates
    const uniqueUserWords = userWords.filter((v, i, a) => a.findIndex(t => t.word === v.word) === i);

    // 3. Fill with Default if needed
    if (uniqueUserWords.length < minWords) {
        // Shuffle default list
        const shuffledDefaults = [...DEFAULT_VOCAB_LIST].sort(() => 0.5 - Math.random());
        // Add only ones not already in user list
        for (const def of shuffledDefaults) {
            if (!uniqueUserWords.find(u => u.word === def.word)) {
                uniqueUserWords.push(def);
            }
            if (uniqueUserWords.length >= minWords) break;
        }
    }

    return uniqueUserWords;
};
