export interface DailyLog {
  // Task 1: Vocab
  vocab1Meaning: string;
  vocab1Word: string;
  vocab1Method: string;
  vocab2Meaning: string;
  vocab2Word: string;
  vocab2Method: string;
  vocabDone: boolean;
  vocabTimestamp?: string;

  // Task 2: Speaking
  speakingTopic: string;
  speakingVocab: string;
  speakingDone: boolean;
  speakingTimestamp?: string;
  speakingDuration?: number; // Seconds

  // Task 3: Listening
  listeningTopic: string;
  listeningLink: string;
  listeningVocab: string;
  listeningDone: boolean;
  listeningTimestamp?: string;
  listeningDuration?: number; // Seconds

  // Task 4: Writing
  writingContent: string;
  writingDone: boolean;
  writingTimestamp?: string;
  writingDuration?: number; // Seconds

  // Meta
  totalMoney: number;
  studyMinutes: number;

  // Gamification (Coins & Challenges)
  dailyCoins?: number;
  
  // Challenge 1: 5 words on paper (5c)
  challenge1Done?: boolean;

  // Challenge 2: 6 boxes streak (40c for 3 days)
  challenge2Done?: boolean;
  challenge2Streak?: number; // Current streak count (1, 2, or 3)
  challenge2Words?: string[]; // The 6 words

  // Challenge 3: Speak 5 mins (10c)
  challenge3Done?: boolean;
}

export interface LogsMap {
  [dateString: string]: DailyLog;
}

export interface StudentSummary {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    lastActive: string;
    currentMonthScore: number;
    totalStudyMinutes: number;
    prevMonthMoney?: number;
    prevMonthCoins?: number;
}

export interface QuoteItem {
    text: string;
    meaning: string; // Vietnamese Meaning
}