import { forgetting_curve, FSRS5_DEFAULT_DECAY } from 'ts-fsrs';
import type { FsrsCardState } from './types';

// Use the FSRS-5 default decay scalar (0.5) for retention math. The installed
// ts-fsrs (5.3.2) bundles FSRS-6 weights in `generatorParameters().w` whose
// terminal element (w[20] = 0.1542) is the FSRS-6 decay — a much shallower
// curve. For a "directionally honest" headline predicted-score that visibly
// degrades over months of inactivity, the FSRS-5 decay matches student
// expectations; cohort calibration in Plan 10 will tune this against real
// UKMLA scores anyway.

/**
 * Days into the future to project the retention curve. A 7-day horizon
 * makes the predicted-score metric responsive to the user's most recent
 * answers: an atom rated "Forgot" (stability ≈ 0.2) drops to ~46 %
 * 7-day retention, while a confident "Good" (stability ≈ 2) holds at
 * ~85 %. The previous "current retention" reading (elapsed only) was
 * always near 100 % immediately after a rating because elapsed ≈ 0,
 * which made the badge feel broken — users would tank a question and
 * still see 100 %. The 7-day projection is what students actually care
 * about ("what % will I remember a week from now?").
 */
export const PROJECTION_DAYS = 7;

export function computeRetention(state: FsrsCardState, now: Date): number {
  if (!state.lastReviewAt || state.stability <= 0) return 0;
  const elapsedMs = now.getTime() - state.lastReviewAt.getTime();
  const elapsedDays = Math.max(0, elapsedMs / 86_400_000);
  // Project the forgetting curve forward — see PROJECTION_DAYS comment.
  return forgetting_curve(FSRS5_DEFAULT_DECAY, elapsedDays + PROJECTION_DAYS, state.stability);
}

export interface PredictedScore {
  retentionMean: number;
  atomCount: number;
}

export function computePredictedScore(states: FsrsCardState[], now: Date): PredictedScore {
  if (states.length === 0) return { retentionMean: 0, atomCount: 0 };
  const sum = states.reduce((acc, s) => acc + computeRetention(s, now), 0);
  return { retentionMean: sum / states.length, atomCount: states.length };
}
