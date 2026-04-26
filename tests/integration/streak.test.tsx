import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStreak } from '@/hooks/useStreak';

const NOW = new Date('2026-04-25T10:00:00Z');

describe('useStreak integration with realistic review_events shape', () => {
  it('computes 5 from 4 consecutive days returned in DESC order (4 reviews + 1 grace day)', async () => {
    // Default graceDaysPerWeek=1 forgives the one missing day (Apr 21) before
    // the oldest review (Apr 22), extending the streak by one.
    const repo = {
      listReviewEventDates: vi.fn(async () => [
        new Date('2026-04-25T08:00:00Z'),
        new Date('2026-04-25T07:30:00Z'),  // dup day
        new Date('2026-04-24T20:00:00Z'),
        new Date('2026-04-23T18:00:00Z'),
        new Date('2026-04-22T12:00:00Z'),
      ]),
    };
    const { result } = renderHook(() => useStreak({ userId: 'u1', repo: repo as any, now: () => NOW }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.streakDays).toBe(5);
  });

  it('handles a 2-day mid-history gap: grace covers one but not both', async () => {
    // Apr 25 → Apr 24 (run), then gap Apr 22-23 (2 missing days), then Apr 20-21.
    // Walk: Apr 25 (1), Apr 24 (2), Apr 23 missing → grace (3), Apr 22 missing → break.
    // The Apr 20-21 run never gets visited because grace was already consumed.
    const repo = {
      listReviewEventDates: vi.fn(async () => [
        new Date('2026-04-25T08:00:00Z'),
        new Date('2026-04-24T08:00:00Z'),
        // gap on Apr 22-23
        new Date('2026-04-21T08:00:00Z'),
        new Date('2026-04-20T08:00:00Z'),
      ]),
    };
    const { result } = renderHook(() => useStreak({ userId: 'u1', repo: repo as any, now: () => NOW }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.streakDays).toBe(3);
  });
});
