import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePredictedScore } from '@/hooks/usePredictedScore';
import type { UserAtomState } from '@/atom/types';

const NOW = new Date('2026-04-25T10:00:00Z');

function makeRepos(states: UserAtomState[], totalAtoms: number) {
  return {
    atomRepo: { countApprovedByExam: vi.fn(async () => totalAtoms) } as any,
    userStateRepo: { listAllForUser: vi.fn(async () => states) } as any,
  };
}

describe('usePredictedScore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads + reports zero state when user has no atoms covered', async () => {
    const { atomRepo, userStateRepo } = makeRepos([], 200);
    const { result } = renderHook(() => usePredictedScore({
      userId: 'u1', exam: 'UKMLA', now: () => NOW, atomRepo, userStateRepo,
    }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.predictedScore).toBe(0);
    expect(result.current.atomCount).toBe(0);
    expect(result.current.totalAtoms).toBe(200);
    expect(result.current.coverageRatio).toBe(0);
  });

  it('computes mean retention when states exist', async () => {
    const states: UserAtomState[] = [
      { userId: 'u1', atomId: 'a1', stability: 10, difficulty: 5, dueAt: NOW.toISOString(), lastReviewAt: NOW.toISOString(), reps: 1, lapses: 0 },
      { userId: 'u1', atomId: 'a2', stability: 10, difficulty: 5, dueAt: NOW.toISOString(), lastReviewAt: NOW.toISOString(), reps: 1, lapses: 0 },
    ];
    const { atomRepo, userStateRepo } = makeRepos(states, 200);
    const { result } = renderHook(() => usePredictedScore({
      userId: 'u1', exam: 'UKMLA', now: () => NOW, atomRepo, userStateRepo,
    }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.atomCount).toBe(2);
    expect(result.current.totalAtoms).toBe(200);
    expect(result.current.coverageRatio).toBeCloseTo(0.01);
    expect(result.current.predictedScore).toBeGreaterThan(0.99);
  });

  it('error path: status=error with message', async () => {
    const atomRepo = { countApprovedByExam: vi.fn(async () => { throw new Error('boom'); }) } as any;
    const userStateRepo = { listAllForUser: vi.fn() } as any;
    const { result } = renderHook(() => usePredictedScore({
      userId: 'u1', exam: 'UKMLA', now: () => NOW, atomRepo, userStateRepo,
    }));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe('boom');
  });
});
