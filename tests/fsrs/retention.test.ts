import { describe, it, expect } from 'vitest';
import { computeRetention, computePredictedScore } from '@/fsrs/retention';
import type { FsrsCardState } from '@/fsrs/types';

const NOW = new Date('2026-04-25T10:00:00Z');

function makeState(stability: number, lastReview: Date | null, reps = 1, lapses = 0): FsrsCardState {
  return { stability, difficulty: 5, dueAt: NOW, lastReviewAt: lastReview, reps, lapses };
}

describe('computeRetention', () => {
  it('returns 1 for an atom reviewed today (zero elapsed days)', () => {
    const state = makeState(10, NOW);
    const r = computeRetention(state, NOW);
    expect(r).toBeGreaterThan(0.99);
    expect(r).toBeLessThanOrEqual(1);
  });

  it('decays toward zero as elapsed days grow large', () => {
    const oneYearAgo = new Date(NOW.getTime() - 365 * 86_400_000);
    const state = makeState(5, oneYearAgo); // small stability + long elapsed → low retention
    const r = computeRetention(state, NOW);
    expect(r).toBeLessThan(0.3);
  });

  it('returns 0 for an unreviewed atom (lastReviewAt null)', () => {
    const state = makeState(0, null, 0, 0);
    expect(computeRetention(state, NOW)).toBe(0);
  });

  it('high stability holds retention longer than low stability for the same elapsed days', () => {
    const oneWeekAgo = new Date(NOW.getTime() - 7 * 86_400_000);
    const high = computeRetention(makeState(60, oneWeekAgo), NOW);
    const low = computeRetention(makeState(2, oneWeekAgo), NOW);
    expect(high).toBeGreaterThan(low);
  });
});

describe('computePredictedScore', () => {
  it('returns retentionMean=0 and atomCount=0 for empty states', () => {
    const result = computePredictedScore([], NOW);
    expect(result).toEqual({ retentionMean: 0, atomCount: 0 });
  });

  it('returns the mean retention across all states', () => {
    const states = [
      makeState(10, NOW),                                                // ~1.0
      makeState(10, new Date(NOW.getTime() - 365 * 86_400_000)),          // ~very low
    ];
    const result = computePredictedScore(states, NOW);
    expect(result.atomCount).toBe(2);
    expect(result.retentionMean).toBeGreaterThan(0);
    expect(result.retentionMean).toBeLessThan(1);
  });
});
