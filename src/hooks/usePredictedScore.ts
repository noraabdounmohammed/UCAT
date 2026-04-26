import { useCallback, useEffect, useState } from 'react';
import type { Exam } from '@/atom/types';
import type { AtomRepository } from '@/atom/repository';
import type { UserStateRepository } from '@/atom/userStateRepository';
import { fromUserAtomState } from '@/fsrs/mapper';
import { computePredictedScore } from '@/fsrs/retention';

export interface UsePredictedScoreDeps {
  userId: string;
  exam: Exam;
  now?: () => Date;
  atomRepo: AtomRepository;
  userStateRepo: UserStateRepository;
  /**
   * When true, the `totalAtoms` denominator widens to include unreviewed
   * AI drafts (i.e. the same pool as the study queue when the user opts
   * in). When false (default), only `status='approved'` atoms count —
   * matching the previous behaviour. Without this, "5 / 5 questions" was
   * misleading because the bank actually has 501 questions accessible
   * via the toggle.
   */
  includeUnreviewed?: boolean;
}

type Status = 'loading' | 'ready' | 'error';

export interface UsePredictedScoreResult {
  status: Status;
  predictedScore: number;   // 0..1
  coverageRatio: number;    // 0..1
  atomCount: number;
  totalAtoms: number;
  errorMessage: string | null;
  /**
   * Re-runs the load against the repos so callers can refresh after a
   * rating event (which mutates `userStateRepo`). Safe to call without
   * await; failures surface via `status === 'error'`.
   */
  refresh: () => Promise<void>;
}

export function usePredictedScore(deps: UsePredictedScoreDeps): UsePredictedScoreResult {
  const now = deps.now ?? (() => new Date());
  const [status, setStatus] = useState<Status>('loading');
  const [predictedScore, setPredictedScore] = useState(0);
  const [coverageRatio, setCoverageRatio] = useState(0);
  const [atomCount, setAtomCount] = useState(0);
  const [totalAtoms, setTotalAtoms] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (cancelledRef?: { cancelled: boolean }) => {
    try {
      const [total, states] = await Promise.all([
        deps.atomRepo.countAvailableForExam(deps.exam, {
          includeUnreviewedAiDrafts: !!deps.includeUnreviewed,
        }),
        deps.userStateRepo.listAllForUser(deps.userId),
      ]);
      if (cancelledRef?.cancelled) return;
      const cardStates = states.map(fromUserAtomState);
      const { retentionMean, atomCount } = computePredictedScore(cardStates, now());
      setPredictedScore(retentionMean);
      setAtomCount(atomCount);
      setTotalAtoms(total);
      setCoverageRatio(total > 0 ? atomCount / total : 0);
      setErrorMessage(null);
      setStatus('ready');
    } catch (err: any) {
      if (!cancelledRef?.cancelled) {
        setErrorMessage(err?.message ?? 'Failed to load predicted score');
        setStatus('error');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.userId, deps.exam, deps.includeUnreviewed]);

  const refresh = useCallback(() => load(), [load]);

  useEffect(() => {
    const ref = { cancelled: false };
    load(ref);
    return () => { ref.cancelled = true; };
  }, [load]);

  return {
    status,
    predictedScore,
    coverageRatio,
    atomCount,
    totalAtoms,
    errorMessage,
    refresh,
  };
}
