import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNpsTrigger } from '@/hooks/useNpsTrigger';

const NOW = new Date('2026-04-25T10:00:00Z');

function makeRepo(submitImpl?: (...args: any[]) => Promise<void>) {
  const submitNps = vi.fn(submitImpl ?? (async () => {}));
  return { submitNps };
}

function resetLs() {
  for (const k of ['nps_session_count', 'nps_shown_at']) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}

describe('useNpsTrigger', () => {
  beforeEach(() => {
    resetLs();
    vi.clearAllMocks();
  });
  afterEach(() => {
    resetLs();
  });

  it('does not show prompt below threshold (count < 5)', async () => {
    localStorage.setItem('nps_session_count', '4');
    const repo = makeRepo();

    const { result } = renderHook(() =>
      useNpsTrigger({ userId: 'u1', repo: repo as any, now: () => NOW }),
    );

    // give the effect a chance to run
    await waitFor(() => expect(result.current.shouldShow).toBe(false));
  });

  it('shows prompt at threshold (count >= 5) when not previously shown', async () => {
    localStorage.setItem('nps_session_count', '5');
    const repo = makeRepo();

    const { result } = renderHook(() =>
      useNpsTrigger({ userId: 'u1', repo: repo as any, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.shouldShow).toBe(true));
  });

  it('does not show prompt if nps_shown_at is set', async () => {
    localStorage.setItem('nps_session_count', '10');
    localStorage.setItem('nps_shown_at', '2026-04-20T00:00:00Z');
    const repo = makeRepo();

    const { result } = renderHook(() =>
      useNpsTrigger({ userId: 'u1', repo: repo as any, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.shouldShow).toBe(false));
  });

  it('submit persists, marks nps_shown_at, and hides the prompt', async () => {
    localStorage.setItem('nps_session_count', '5');
    const repo = makeRepo();

    const { result } = renderHook(() =>
      useNpsTrigger({ userId: 'u1', repo: repo as any, now: () => NOW }),
    );
    await waitFor(() => expect(result.current.shouldShow).toBe(true));

    await act(async () => {
      await result.current.submit({ score: 9, comment: 'great' });
    });

    expect(repo.submitNps).toHaveBeenCalledWith('u1', 9, 'great', 'after-5-sessions');
    expect(localStorage.getItem('nps_shown_at')).toBe(NOW.toISOString());
    expect(result.current.shouldShow).toBe(false);
  });

  it('submit sends null comment when textarea is blank/whitespace', async () => {
    localStorage.setItem('nps_session_count', '5');
    const repo = makeRepo();

    const { result } = renderHook(() =>
      useNpsTrigger({ userId: 'u1', repo: repo as any, now: () => NOW }),
    );
    await waitFor(() => expect(result.current.shouldShow).toBe(true));

    await act(async () => {
      await result.current.submit({ score: 7, comment: '   ' });
    });

    expect(repo.submitNps).toHaveBeenCalledWith('u1', 7, null, 'after-5-sessions');
  });

  it('dismiss marks nps_shown_at and hides without persisting', async () => {
    localStorage.setItem('nps_session_count', '5');
    const repo = makeRepo();

    const { result } = renderHook(() =>
      useNpsTrigger({ userId: 'u1', repo: repo as any, now: () => NOW }),
    );
    await waitFor(() => expect(result.current.shouldShow).toBe(true));

    act(() => result.current.dismiss());

    expect(repo.submitNps).not.toHaveBeenCalled();
    expect(localStorage.getItem('nps_shown_at')).toBe(NOW.toISOString());
    expect(result.current.shouldShow).toBe(false);
  });
});
