/**
 * FSRS Scheduler Utility
 * Simple implementation of FSRS-5 spaced repetition algorithm.
 * Calculates next review date based on rating and current state.
 */

export type FsrsRating = 1 | 2 | 3 | 4; // 1=Forgot, 2=Hard, 3=Good, 4=Easy

export interface FsrsState {
  stability: number;    // Memory stability (days until 90% retention)
  difficulty: number;   // Card difficulty (0-1 scale)
  dueAt: Date;          // Next review date
  reps: number;         // Total reviews
  lapses: number;       // Times forgotten
  lastReviewAt: Date | null;
}

// FSRS-5 default parameters (optimized for medical education)
const FSRS_PARAMS = {
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  requestRetention: 0.9, // Target 90% recall
  maximumInterval: 365,  // Max 1 year between reviews
};

/**
 * Create initial FSRS state for a new card
 */
export function createInitialState(): FsrsState {
  return {
    stability: 0,
    difficulty: 0.3, // Default medium difficulty
    dueAt: new Date(),
    reps: 0,
    lapses: 0,
    lastReviewAt: null,
  };
}

/**
 * Calculate next review interval based on rating
 * Simplified FSRS-5 implementation
 */
export function calculateNextReview(
  state: FsrsState,
  rating: FsrsRating,
  now: Date = new Date()
): FsrsState {
  const { stability, difficulty, reps, lapses } = state;
  
  // First review - use initial stability based on rating
  if (reps === 0) {
    const initialStability = getInitialStability(rating);
    const newDifficulty = getInitialDifficulty(rating);
    const intervalDays = Math.max(1, Math.round(initialStability));
    
    return {
      stability: initialStability,
      difficulty: newDifficulty,
      dueAt: addDays(now, intervalDays),
      reps: 1,
      lapses: rating === 1 ? 1 : 0,
      lastReviewAt: now,
    };
  }
  
  // Subsequent reviews
  let newStability: number;
  let newDifficulty: number;
  let newLapses = lapses;
  
  if (rating === 1) {
    // Forgot - reset stability, increase difficulty
    newStability = Math.max(1, stability * 0.2);
    newDifficulty = Math.min(1, difficulty + 0.1);
    newLapses = lapses + 1;
  } else if (rating === 2) {
    // Hard - small increase in stability
    newStability = stability * 1.2;
    newDifficulty = Math.min(1, difficulty + 0.05);
  } else if (rating === 3) {
    // Good - normal increase
    newStability = stability * (2.5 - difficulty);
    newDifficulty = difficulty; // No change
  } else {
    // Easy - large increase, decrease difficulty
    newStability = stability * (3.5 - difficulty);
    newDifficulty = Math.max(0, difficulty - 0.05);
  }
  
  // Cap stability at maximum interval
  newStability = Math.min(newStability, FSRS_PARAMS.maximumInterval);
  
  // Calculate interval (days until next review)
  const intervalDays = Math.max(1, Math.round(newStability));
  
  return {
    stability: newStability,
    difficulty: newDifficulty,
    dueAt: addDays(now, intervalDays),
    reps: reps + 1,
    lapses: newLapses,
    lastReviewAt: now,
  };
}

/**
 * Check if a card is due for review
 */
export function isDue(state: FsrsState, now: Date = new Date()): boolean {
  return state.dueAt.getTime() <= now.getTime();
}

/**
 * Get initial stability based on first rating
 */
function getInitialStability(rating: FsrsRating): number {
  switch (rating) {
    case 1: return 0.5;  // Forgot - review tomorrow
    case 2: return 1;    // Hard - 1 day
    case 3: return 3;    // Good - 3 days
    case 4: return 7;    // Easy - 1 week
  }
}

/**
 * Get initial difficulty based on first rating
 */
function getInitialDifficulty(rating: FsrsRating): number {
  switch (rating) {
    case 1: return 0.7;  // Forgot - hard card
    case 2: return 0.5;  // Hard - medium-hard
    case 3: return 0.3;  // Good - medium
    case 4: return 0.1;  // Easy - easy card
  }
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Convert FSRS state to mastery data format
 */
export function fsrsStateToMasteryData(state: FsrsState, lastRating: FsrsRating): {
  stability: number;
  difficulty: number;
  due_at: string;
  lapses: number;
  reps: number;
  last_rating: FsrsRating;
} {
  return {
    stability: state.stability,
    difficulty: state.difficulty,
    due_at: state.dueAt.toISOString(),
    lapses: state.lapses,
    reps: state.reps,
    last_rating: lastRating,
  };
}

/**
 * Convert mastery data to FSRS state
 */
export function masteryDataToFsrsState(masteryData: {
  stability?: number;
  difficulty?: number;
  due_at?: string;
  lapses?: number;
  reps?: number;
}): FsrsState {
  return {
    stability: masteryData.stability ?? 0,
    difficulty: masteryData.difficulty ?? 0.3,
    dueAt: masteryData.due_at ? new Date(masteryData.due_at) : new Date(),
    reps: masteryData.reps ?? 0,
    lapses: masteryData.lapses ?? 0,
    lastReviewAt: null,
  };
}
