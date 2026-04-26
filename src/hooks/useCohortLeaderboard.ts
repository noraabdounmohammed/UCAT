import { useCallback, useEffect, useState } from 'react';
import type { CohortRepository, CohortLeaderboardRow } from '@/atom/cohortRepository';

export type CohortLeaderboardStatus = 'loading' | 'no-cohort' | 'ready' | 'error';

export interface UseCohortLeaderboardDeps {
  repo: CohortRepository;
  userId: string;
  /** Optional override; defaults to 10 (top-N for v1). */
  limit?: number;
}

export interface UseCohortLeaderboardResult {
  status: CohortLeaderboardStatus;
  cohort: string | null;
  rows: CohortLeaderboardRow[];
  errorMessage: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads (a) the auth user's cohort and (b) the top-N leaderboard rows for that
 * cohort. Surfaces a `no-cohort` status so the page can render `<CohortSelectModal />`.
 */
export function useCohortLeaderboard(deps: UseCohortLeaderboardDeps): UseCohortLeaderboardResult {
  const limit = deps.limit ?? 10;
  const [status, setStatus] = useState<CohortLeaderboardStatus>('loading');
  const [cohort, setCohort] = useState<string | null>(null);
  const [rows, setRows] = useState<CohortLeaderboardRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setErrorMessage(null);
      const c = await deps.repo.getMyCohort();
      setCohort(c);
      if (!c) {
        setRows([]);
        setStatus('no-cohort');
        return;
      }
      const rs = await deps.repo.listCohortLeaderboard(c, limit);
      setRows(rs);
      setStatus('ready');
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Failed to load leaderboard');
      setStatus('error');
    }
  }, [deps.repo, limit]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await refresh(); })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.userId]);

  return { status, cohort, rows, errorMessage, refresh };
}
