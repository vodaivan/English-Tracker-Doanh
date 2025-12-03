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
}

export interface LogsMap {
  [dateString: string]: DailyLog;
}