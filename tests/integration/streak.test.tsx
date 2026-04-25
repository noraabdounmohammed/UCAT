import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStreak } from '@/hooks/useStreak';

const NOW = new Date('2026-04-25T10:00:00Z');

describe('useStreak integration with realistic review_events shape', () => {
  it('computes 4 from 4 consecutive days returned in DESC order', async () => {
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
    expect(result.current.streakDays).toBe(4);
  });

  it('handles a mid-history gap: streak ends at today, gap before counts as separate run', async () => {
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
    expect(result.current.streakDays).toBe(2);
  });
});
