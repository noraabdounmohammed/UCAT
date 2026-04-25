import { useEffect, useState } from 'react';
import type { UserStateRepository } from '@/atom/userStateRepository';
import { computeStreak } from '@/streak/compute';

export interface UseStreakDeps {
  userId: string;
  repo: UserStateRepository;
  /** Defaults to () => new Date(). Override for testability. */
  now?: () => Date;
  /** How far back to load review events. Default 90 days. */
  lookbackDays?: number;
}

type Status = 'loading' | 'ready' | 'error';

export interface UseStreakResult {
  status: Status;
  streakDays: number;
  errorMessage: string | null;
}

export function useStreak(deps: UseStreakDeps): UseStreakResult {
  const now = deps.now ?? (() => new Date());
  const lookbackDays = deps.lookbackDays ?? 90;
  const [status, setStatus] = useState<Status>('loading');
  const [streakDays, setStreakDays] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const since = new Date(now().getTime() - lookbackDays * 86_400_000);
        const dates = await deps.repo.listReviewEventDates(deps.userId, since);
        if (cancelled) return;
        setStreakDays(computeStreak(dates, now()));
        setStatus('ready');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message ?? 'Failed to load streak');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.userId]);

  return { status, streakDays, errorMessage };
}
