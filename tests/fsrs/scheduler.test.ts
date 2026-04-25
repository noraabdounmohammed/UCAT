import { describe, it, expect } from 'vitest';
import { createFsrsScheduler } from '@/fsrs/scheduler';

describe('FsrsScheduler', () => {
  const NOW = new Date('2026-04-25T10:00:00Z');

  it('initialState produces a card due immediately with zero reps', () => {
    const sched = createFsrsScheduler();
    const state = sched.initialState(NOW);

    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(0);
    expect(state.lastReviewAt).toBeNull();
    // Brand new cards are due now (or in the past).
    expect(state.dueAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
  });

  it('applyReview with rating=Good advances dueAt into the future', () => {
    const sched = createFsrsScheduler();
    const initial = sched.initialState(NOW);

    const { newState, intervalDays } = sched.applyReview(initial, 3 /* good */, NOW);

    expect(newState.reps).toBe(1);
    expect(newState.lastReviewAt?.getTime()).toBe(NOW.getTime());
    expect(newState.dueAt.getTime()).toBeGreaterThan(NOW.getTime());
    expect(intervalDays).toBeGreaterThan(0);
  });

  it('applyReview with rating=Forgot increments lapses', () => {
    const sched = createFsrsScheduler();
    const initial = sched.initialState(NOW);
    const after1 = sched.applyReview(initial, 3, NOW).newState;
    const tomorrow = new Date(NOW.getTime() + 24 * 3600 * 1000);

    const after2 = sched.applyReview(after1, 1 /* forgot */, tomorrow).newState;

    expect(after2.lapses).toBe(1);
    expect(after2.reps).toBe(2);
  });

  it('isDue returns true when dueAt has passed', () => {
    const sched = createFsrsScheduler();
    const initial = sched.initialState(NOW);
    const after = sched.applyReview(initial, 3, NOW).newState;
    const farFuture = new Date(NOW.getTime() + 365 * 24 * 3600 * 1000);

    expect(sched.isDue(after, NOW)).toBe(false); // just reviewed
    expect(sched.isDue(after, farFuture)).toBe(true);
  });
});
