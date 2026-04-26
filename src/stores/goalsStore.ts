import { create } from 'zustand';

export type GoalPreset = 'exam-4-weeks' | 'daily-30-mins' | 'fast-catchup' | 'custom';

export interface CurriculumGoals {
  accuracyTarget?: number; // 0-1 (e.g., 0.80 for 80%)
  coverageTarget?: number; // 0-1 (e.g., 0.70 for 70% of concepts attempted)
  weeklyMinutesTarget?: number; // minutes per week
  dailyReviewsTarget?: number; // reviews per day
  deadlineISO?: string; // optional target date
  preset?: GoalPreset;
  lastUpdatedISO: string;
}

export interface GoalsState {
  goals: Record<string, CurriculumGoals>; // keyed by curriculumId
  
  // Actions
  setGoals: (curriculumId: string, goals: Partial<CurriculumGoals>) => void;
  getGoals: (curriculumId: string) => CurriculumGoals | null;
  applyPreset: (curriculumId: string, preset: GoalPreset) => void;
  clearGoals: (curriculumId: string) => void;
}

// Preset configurations
const GOAL_PRESETS: Record<GoalPreset, Partial<CurriculumGoals>> = {
  'exam-4-weeks': {
    accuracyTarget: 0.80,
    coverageTarget: 0.90,
    weeklyMinutesTarget: 420, // 60 mins/day
    dailyReviewsTarget: 100,
    deadlineISO: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    preset: 'exam-4-weeks',
  },
  'daily-30-mins': {
    accuracyTarget: 0.75,
    coverageTarget: 0.70,
    weeklyMinutesTarget: 210, // 30 mins/day
    dailyReviewsTarget: 50,
    preset: 'daily-30-mins',
  },
  'fast-catchup': {
    accuracyTarget: 0.70,
    coverageTarget: 0.80,
    weeklyMinutesTarget: 600, // ~85 mins/day
    dailyReviewsTarget: 150,
    deadlineISO: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    preset: 'fast-catchup',
  },
  'custom': {
    preset: 'custom',
  },
};

const STORAGE_KEY = 'curriculum_goals';

// Load from localStorage
const loadGoals = (): Record<string, CurriculumGoals> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save to localStorage
const saveGoals = (goals: Record<string, CurriculumGoals>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('Failed to save goals:', error);
  }
};

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: loadGoals(),

  setGoals: (curriculumId: string, updates: Partial<CurriculumGoals>) => {
    set((state) => {
      const existing = state.goals[curriculumId] || { lastUpdatedISO: new Date().toISOString() };
      const updated = {
        ...existing,
        ...updates,
        lastUpdatedISO: new Date().toISOString(),
      };
      const newGoals = { ...state.goals, [curriculumId]: updated };
      saveGoals(newGoals);
      return { goals: newGoals };
    });
  },

  getGoals: (curriculumId: string) => {
    return get().goals[curriculumId] || null;
  },

  applyPreset: (curriculumId: string, preset: GoalPreset) => {
    const presetConfig = GOAL_PRESETS[preset];
    get().setGoals(curriculumId, presetConfig);
  },

  clearGoals: (curriculumId: string) => {
    set((state) => {
      const newGoals = { ...state.goals };
      delete newGoals[curriculumId];
      saveGoals(newGoals);
      return { goals: newGoals };
    });
  },
}));
