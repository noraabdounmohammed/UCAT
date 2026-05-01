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
  /**
   * Map of atomIndex → epoch-ms timestamp when the pick was made (or last
   * re-picked). Used to derive a rough "time spent per question" stat in
   * the result screen. Gets noisier with back-navigation (a user revisiting
   * Q3 after answering Q5 would update Q3's timestamp), which is fine —
   * we surface aggregate stats not per-question forensics.
   */
  pickedAt: Record<number, number>;
  /** Set of atomIndices the user has flagged. */
  flagged: Set<number>;
  /** Wall-clock when the mock started — anchor for time-per-question math. */
  startedAt: number;
  status: MockStatus;
}

export function initialMockState({ atoms, durationSec, now }: { atoms: Atom[]; durationSec: number; now?: () => number }): MockState {
  const startedAt = (now ?? Date.now)();
  return {
    atoms,
    atomIndex: 0,
    secondsLeft: durationSec,
    picks: {},
    pickedAt: {},
    flagged: new Set(),
    startedAt,
    status: 'in_progress',
  };
}

/** Record a pick for the current question. Re-pickable. Does NOT auto-advance.
 *  Stamps the pick time so we can compute time-per-question later. */
export function pickAnswer(state: MockState, answer: MockAnswer, now?: () => number): MockState {
  if (state.status === 'review') return state;
  const t = (now ?? Date.now)();
  return {
    ...state,
    picks: { ...state.picks, [state.atomIndex]: answer },
    pickedAt: { ...state.pickedAt, [state.atomIndex]: t },
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

export interface MockScore {
  correct: number;
  total: number;
  percentage: number;
  answered: number;
  /** Average time per answered question (seconds). */
  avgTimePerQSec: number;
  /** Avg time on questions you got correct (seconds). */
  avgTimeCorrectSec: number;
  /** Avg time on questions you got wrong (seconds). */
  avgTimeWrongSec: number;
  /** Number of questions answered in <30 s — proxy for "rushed". */
  fastAnswers: number;
}

export function computeScore(state: MockState): MockScore {
  const total = state.atoms.length;
  const pickEntries = Object.entries(state.picks);
  const answered = pickEntries.length;
  const correct = pickEntries.filter(([, a]) => a.correct).length;

  // Time-per-question — derived from pickedAt timestamps. The first
  // answered question's time is measured from session start; subsequent
  // ones are measured from the previous pick's timestamp. Order is by
  // pickedAt so back-navigation re-orders correctly.
  const orderedPicks = pickEntries
    .map(([idx, ans]) => ({ idx: Number(idx), ans, t: state.pickedAt[Number(idx)] ?? state.startedAt }))
    .sort((a, b) => a.t - b.t);

  const perQ: { ms: number; correct: boolean }[] = [];
  let prev = state.startedAt;
  for (const p of orderedPicks) {
    const ms = Math.max(0, p.t - prev);
    perQ.push({ ms, correct: p.ans.correct });
    prev = p.t;
  }
  const totalMs = perQ.reduce((s, p) => s + p.ms, 0);
  const correctMsList = perQ.filter((p) => p.correct).map((p) => p.ms);
  const wrongMsList = perQ.filter((p) => !p.correct).map((p) => p.ms);
  const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length);

  return {
    correct,
    total,
    percentage: total === 0 ? 0 : (correct / total) * 100,
    answered,
    avgTimePerQSec: answered === 0 ? 0 : Math.round(totalMs / answered / 1000),
    avgTimeCorrectSec: Math.round(avg(correctMsList) / 1000),
    avgTimeWrongSec: Math.round(avg(wrongMsList) / 1000),
    fastAnswers: perQ.filter((p) => p.ms < 30_000).length,
  };
}
