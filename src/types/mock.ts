import { SectionType } from './dashboard';

export type TimeMode = 'standard' | 'sen' | 'sen50' | 'unlimited';

export interface MockSettings {
  type: 'full' | 'section';
  section?: SectionType;
  timeMode: TimeMode;
}

export interface MockQuestion {
  id: string;
  section: SectionType;
  content: string;
  options: string[];
  correctAnswer: number;
  timeAllowed: number; // in seconds
}

export interface MockSession {
  id: string;
  settings: MockSettings;
  startTime: string;
  endTime?: string;
  questions: MockQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, number>;
  timeRemaining: number; // in seconds
  isPaused: boolean;
}

export interface MockStats {
  totalQuestions: number;
  questionsAnswered: number;
  timeElapsed: number;
  accuracy: number;
  sectionScores: Record<SectionType, number>;
}

export const TIME_LIMITS: Record<TimeMode, number> = {
  standard: 7200, // 2 hours in seconds
  sen: 9000,      // 2.5 hours in seconds
  sen50: 10800,   // 3 hours in seconds
  unlimited: -1    // No time limit
};

export const SECTION_TIME_LIMITS: Record<SectionType, number> = {
  VR: 1800,  // 30 minutes in seconds
  DM: 1800,  // 30 minutes in seconds
  QR: 1800,  // 30 minutes in seconds
  SJ: 1800   // 30 minutes in seconds
};