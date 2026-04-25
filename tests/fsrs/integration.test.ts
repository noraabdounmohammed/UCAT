import { describe, it, expect } from 'vitest';
import { createFsrsScheduler } from '@/fsrs/scheduler';
import type { UserAtomState } from '@/atom/types';
import type { FsrsCardState } from '@/fsrs/types';
import { fromUserAtomState, toUserAtomState } from '@/fsrs/mapper';

describe('FSRS state round-trip', () => {
  const NOW = new Date('2026-04-25T10:00:00Z');

  it('a freshly-initialised state survives DB-row mapping unchanged', () => {
    const sched = createFsrsScheduler();
    const initial = sched.initialState(NOW);

    const dbRow: UserAtomState = toUserAtomState('user-1', 'atom-1', initial);
    const restored: FsrsCardState = fromUserAtomState(dbRow);

    expect(restored.stability).toBe(initial.stability);
    expect(restored.difficulty).toBe(initial.difficulty);
    expect(restored.reps).toBe(initial.reps);
    expect(restored.lapses).toBe(initial.lapses);
    expect(restored.dueAt.toISOString()).toBe(initial.dueAt.toISOString());
  });

  it('applyReview, persist, restore, applyReview again gives same trajectory', () => {
    const sched = createFsrsScheduler();
    const tomorrow = new Date(NOW.getTime() + 86400_000);

    const s0 = sched.initialState(NOW);
    const s1 = sched.applyReview(s0, 3, NOW).newState;

    const persisted = toUserAtomState('user-1', 'atom-1', s1);
    const restored = fromUserAtomState(persisted);
    const s2 = sched.applyReview(restored, 3, tomorrow).newState;

    expect(s2.reps).toBe(2);
    expect(s2.lastReviewAt?.toISOString()).toBe(tomorrow.toISOString());
  });
});
