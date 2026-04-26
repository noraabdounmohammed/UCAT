import type { FsrsRatingValue } from '@/atom/types';

/**
 * Per-(user, atom) memory state. Mirrors `user_atom_state` in Postgres.
 */
export interface FsrsCardState {
  stability: number;       // memory stability in days
  difficulty: number;      // 1..10 internal scale
  dueAt: Date;
  lastReviewAt: Date | null;
  reps: number;
  lapses: number;
}

/**
 * Result of scheduling a single review. The repo persists this back.
 */
export interface FsrsReviewResult {
  newState: FsrsCardState;
  intervalDays: number;
}

export interface FsrsScheduler {
  /**
   * Initial state for a never-seen-before atom.
   */
  initialState(now?: Date): FsrsCardState;

  /**
   * Apply a user's rating (1=forgot..4=easy) to an existing state and produce
   * the next due date + updated stability/difficulty.
   */
  applyReview(
    state: FsrsCardState,
    rating: FsrsRatingValue,
    now?: Date,
  ): FsrsReviewResult;

  /**
   * Returns true if the card is due at the given moment.
   */
  isDue(state: FsrsCardState, now?: Date): boolean;
}
