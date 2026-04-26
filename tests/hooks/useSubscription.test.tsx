import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * Mock the supabase client and useAuth at module-load time. The hook
 * imports them at the top of its file so we have to register the mocks
 * before the hook itself is imported below.
 */
const profilesBuilder: any = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(async () => ({ data: { is_premium: false }, error: null })),
};
const dailyBuilder: any = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(async () => ({ data: { count: 0 }, error: null })),
  upsert: vi.fn(async () => ({ data: null, error: null })),
};

const fromMock = vi.fn((table: string) => {
  if (table === 'profiles') return profilesBuilder;
  if (table === 'daily_session_counts') return dailyBuilder;
  throw new Error(`Unexpected table: ${table}`);
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

let mockUser: { id: string } | null = { id: 'user-1' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Import after mocks are set up.
import { useSubscription, FREE_DAILY_QUESTION_LIMIT } from '@/hooks/useSubscription';

function resetMocks() {
  fromMock.mockClear();
  profilesBuilder.select.mockClear();
  profilesBuilder.eq.mockClear();
  profilesBuilder.single.mockClear();
  profilesBuilder.single.mockResolvedValue({ data: { is_premium: false }, error: null });
  dailyBuilder.select.mockClear();
  dailyBuilder.eq.mockClear();
  dailyBuilder.maybeSingle.mockClear();
  dailyBuilder.maybeSingle.mockResolvedValue({ data: { count: 0 }, error: null });
  dailyBuilder.upsert.mockClear();
  dailyBuilder.upsert.mockResolvedValue({ data: null, error: null });
  mockUser = { id: 'user-1' };
}

describe('useSubscription', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('loads dailyQuestionsUsed from Supabase on mount', async () => {
    dailyBuilder.maybeSingle.mockResolvedValue({ data: { count: 7 }, error: null });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dailyQuestionsUsed).toBe(7);
    expect(fromMock).toHaveBeenCalledWith('daily_session_counts');
    expect(dailyBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('incrementDailyCount upserts to Supabase with onConflict user_id,day', async () => {
    dailyBuilder.maybeSingle.mockResolvedValue({ data: { count: 3 }, error: null });

    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.incrementDailyCount();
    });

    expect(dailyBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        count: 4, // old (3) + 1
      }),
      { onConflict: 'user_id,day' },
    );
    // The day key should be a YYYY-MM-DD string in local TZ.
    const upsertCall = dailyBuilder.upsert.mock.calls[0][0];
    expect(upsertCall.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.dailyQuestionsUsed).toBe(4);
  });

  it('isAtLimit reflects the server-side count (>= FREE_DAILY_QUESTION_LIMIT)', async () => {
    dailyBuilder.maybeSingle.mockResolvedValue({
      data: { count: FREE_DAILY_QUESTION_LIMIT },
      error: null,
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.dailyQuestionsRemaining).toBe(0);
  });

  it('premium users have Infinity remaining and are never at limit', async () => {
    profilesBuilder.single.mockResolvedValue({
      data: { is_premium: true },
      error: null,
    });
    dailyBuilder.maybeSingle.mockResolvedValue({
      data: { count: 50 },
      error: null,
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isPremium).toBe(true);
    expect(result.current.isAtLimit).toBe(false);
    expect(result.current.dailyQuestionsRemaining).toBe(Infinity);
  });
});
