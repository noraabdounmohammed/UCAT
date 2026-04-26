import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStreak } from '@/hooks/useStreak';

const NOW = new Date('2026-04-25T10:00:00Z');

function makeRepo(dates: Date[]) {
  return {
    listReviewEventDates: vi.fn(async () => dates),
  };
}

describe('useStreak', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts in loading state, then transitions to ready with streak=0 for empty history', async () => {
    const repo = makeRepo([]);
    const { result } = renderHook(() => useStreak({ userId: 'u1', repo: repo as any, now: () => NOW }));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.streakDays).toBe(0);
  });

  it('computes 4 for three consecutive days ending today (3 reviews + 1 grace day)', async () => {
    // computeStreak() defaults to graceDaysPerWeek=1 (Duolingo grace), so the
    // walk-back forgives one missing day before the oldest review.
    const dates = [
      new Date('2026-04-23T08:00:00Z'),
      new Date('2026-04-24T08:00:00Z'),
      new Date('2026-04-25T08:00:00Z'),
    ];
    const repo = makeRepo(dates);
    const { result } = renderHook(() => useStreak({ userId: 'u1', repo: repo as any, now: () => NOW }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.streakDays).toBe(4);
  });

  it('error path: status=error, streakDays=0', async () => {
    const repo = { listReviewEventDates: vi.fn(async () => { throw new Error('db down'); }) };
    const { result } = renderHook(() => useStreak({ userId: 'u1', repo: repo as any, now: () => NOW }));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.streakDays).toBe(0);
    expect(result.current.errorMessage).toBe('db down');
  });
});
