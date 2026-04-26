import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCohortLeaderboard } from '@/hooks/useCohortLeaderboard';
import type { CohortRepository } from '@/atom/cohortRepository';

function makeRepo(overrides: Partial<CohortRepository> = {}): CohortRepository {
  return {
    getMyCohort: vi.fn().mockResolvedValue('Imperial College London'),
    setMyCohort: vi.fn().mockResolvedValue(undefined),
    listCohortLeaderboard: vi.fn().mockResolvedValue([
      { userId: 'u1', displayName: 'Nora', reviewsThisWeek: 42 },
      { userId: 'u2', displayName: 'Anonymous', reviewsThisWeek: 30 },
    ]),
    ...overrides,
  };
}

describe('useCohortLeaderboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts in loading then transitions to ready with rows when cohort is set', async () => {
    const repo = makeRepo();
    const { result } = renderHook(() => useCohortLeaderboard({ repo, userId: 'u1' }));

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.cohort).toBe('Imperial College London');
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[0].displayName).toBe('Nora');
    expect(repo.listCohortLeaderboard).toHaveBeenCalledWith('Imperial College London', 10);
  });

  it('transitions to no-cohort when getMyCohort returns null', async () => {
    const repo = makeRepo({ getMyCohort: vi.fn().mockResolvedValue(null) });
    const { result } = renderHook(() => useCohortLeaderboard({ repo, userId: 'u1' }));

    await waitFor(() => expect(result.current.status).toBe('no-cohort'));
    expect(result.current.cohort).toBeNull();
    // Leaderboard not fetched without a cohort.
    expect(repo.listCohortLeaderboard).not.toHaveBeenCalled();
  });

  it('transitions to error with errorMessage when listCohortLeaderboard throws', async () => {
    const repo = makeRepo({
      listCohortLeaderboard: vi.fn().mockRejectedValue(new Error('view denied')),
    });
    const { result } = renderHook(() => useCohortLeaderboard({ repo, userId: 'u1' }));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toMatch(/view denied/i);
  });

  it('refresh re-runs the load chain and replaces rows', async () => {
    const list = vi.fn()
      .mockResolvedValueOnce([{ userId: 'u1', displayName: 'Nora', reviewsThisWeek: 1 }])
      .mockResolvedValueOnce([
        { userId: 'u1', displayName: 'Nora', reviewsThisWeek: 2 },
        { userId: 'u2', displayName: 'Anon', reviewsThisWeek: 1 },
      ]);
    const repo = makeRepo({ listCohortLeaderboard: list });

    const { result } = renderHook(() => useCohortLeaderboard({ repo, userId: 'u1' }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.rows).toHaveLength(1);

    await act(async () => { await result.current.refresh(); });
    expect(result.current.rows).toHaveLength(2);
    expect(list).toHaveBeenCalledTimes(2);
  });
});
