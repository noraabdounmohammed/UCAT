import type { Atom } from '@/atom/types';

/**
 * Mock-exam state — modelled to match real UKMLA AKT behaviour:
 *
 *   - Free navigation between questions (prev / next / jumpTo)
 *   - Picks are revisable up until `finalize()` is called — same as real exam
 *   - Flag-for-review per question, toggleable anytime
 *   - No mid-exam feedback; reveal happens only after `finalize()` or timer
 *     expiry, when status flips to 'review'
 *
 * `submitAnswer` is renamed `pickAnswer` to reflect that it's not the final
 * submission. The final submit is `finalize`, and any unanswered question
 * scores 0 (no penalty for blank — matches AKT marking).
 */
export interface MockAnswer {
  correct: boolean;
  choiceIndex: number;
}

export type MockStatus = 'in_progress' | 'review';

export interface MockState {
  atoms: Atom[];
  atomIndex: number;
  secondsLeft: number;
  /** Map of atomIndex → user pick. Re-pickable until finalize(). */
  picks: Record<number, MockAnswer>;
  /** Set of atomIndices the user has flagged. */
  flagged: Set<number>;
  status: MockStatus;
}

export function initialMockState({ atoms, durationSec }: { atoms: Atom[]; durationSec: number }): MockState {
  return {
    atoms,
    atomIndex: 0,
    secondsLeft: durationSec,
    picks: {},
    flagged: new Set(),
    status: 'in_progress',
  };
}

/** Record a pick for the current question. Re-pickable. Does NOT auto-advance. */
export function pickAnswer(state: MockState, answer: MockAnswer): MockState {
  if (state.status === 'review') return state;
  return {
    ...state,
    picks: { ...state.picks, [state.atomIndex]: answer },
  };
}

export function jumpTo(state: MockState, index: number): MockState {
  if (state.status === 'review') {
    // Allow free navigation in review mode too.
  }
  const clamped = Math.max(0, Math.min(state.atoms.length - 1, index));
  return { ...state, atomIndex: clamped };
}

export function nextQuestion(state: MockState): MockState {
  return jumpTo(state, state.atomIndex + 1);
}

export function prevQuestion(state: MockState): MockState {
  return jumpTo(state, state.atomIndex - 1);
}

export function toggleFlag(state: MockState, index?: number): MockState {
  const target = index ?? state.atomIndex;
  const next = new Set(state.flagged);
  if (next.has(target)) next.delete(target);
  else next.add(target);
  return { ...state, flagged: next };
}

export function tickTimer(state: MockState, deltaSec: number): MockState {
  if (state.status === 'review') return state;
  const secondsLeft = Math.max(0, state.secondsLeft - deltaSec);
  // Auto-finalize when the clock hits 0.
  if (secondsLeft === 0 && state.status === 'in_progress') {
    return { ...state, secondsLeft: 0, status: 'review' };
  }
  return { ...state, secondsLeft };
}

/** Lock all picks, flip to review mode. Called by a final submit button or
 *  by the timer hitting zero. */
export function finalize(state: MockState): MockState {
  if (state.status === 'review') return state;
  return { ...state, status: 'review' };
}

/** True if the exam is over (review mode). Older callers used `isFinished`
 *  which we keep as a thin alias. */
export function isFinished(state: MockState): boolean {
  return state.status === 'review';
}

export function computeScore(state: MockState): { correct: number; total: number; percentage: number; answered: number } {
  const total = state.atoms.length;
  const pickEntries = Object.entries(state.picks);
  const answered = pickEntries.length;
  const correct = pickEntries.filter(([, a]) => a.correct).length;
  return { correct, total, percentage: total === 0 ? 0 : (correct / total) * 100, answered };
}
