import { useCallback, useEffect, useState } from 'react';
import type { NpsRepository } from '@/atom/npsRepository';
import { track } from '@/instrumentation/events';

const NPS_SESSION_COUNT_KEY = 'nps_session_count';
const NPS_SHOWN_AT_KEY = 'nps_shown_at';
const NPS_THRESHOLD = 5;

function safeGet(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export interface UseNpsTriggerDeps {
  userId: string | null;
  repo: NpsRepository;
  /** Override for tests. */
  now?: () => Date;
}

export interface UseNpsTriggerResult {
  /** True iff the prompt should currently be displayed. */
  shouldShow: boolean;
  submit: (payload: { score: number; comment: string }) => Promise<void>;
  dismiss: () => void;
}

/**
 * Reads the localStorage session counter set by useFsrsSession on completion.
 * Shows the prompt once the user has finished `NPS_THRESHOLD` sessions, and
 * never shows it again after submit/dismiss (per-device).
 */
export function useNpsTrigger(deps: UseNpsTriggerDeps): UseNpsTriggerResult {
  const now = deps.now ?? (() => new Date());
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const alreadyShown = safeGet(NPS_SHOWN_AT_KEY);
    if (alreadyShown) return;
    const count = parseInt(safeGet(NPS_SESSION_COUNT_KEY) ?? '0', 10);
    if (count >= NPS_THRESHOLD) setShouldShow(true);
  // re-check whenever userId changes (login boundary) so a returning user gets evaluated.
  }, [deps.userId]);

  const submit = useCallback(
    async ({ score, comment }: { score: number; comment: string }) => {
      // Persist before tracking — if the insert fails, the prompt remains shown.
      await deps.repo.submitNps(
        deps.userId ?? '',
        score,
        comment.trim().length > 0 ? comment.trim() : null,
        'after-5-sessions',
      );
      safeSet(NPS_SHOWN_AT_KEY, now().toISOString());
      track('nps_submitted', { score, hasComment: comment.trim().length > 0 });
      setShouldShow(false);
    },
    [deps.repo, deps.userId, now],
  );

  const dismiss = useCallback(() => {
    safeSet(NPS_SHOWN_AT_KEY, now().toISOString());
    setShouldShow(false);
  }, [now]);

  return { shouldShow, submit, dismiss };
}
