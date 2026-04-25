import { useEffect, useState } from 'react';
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
}

type Status = 'loading' | 'ready' | 'error';

export interface UsePredictedScoreResult {
  status: Status;
  predictedScore: number;   // 0..1
  coverageRatio: number;    // 0..1
  atomCount: number;
  totalAtoms: number;
  errorMessage: string | null;
}

export function usePredictedScore(deps: UsePredictedScoreDeps): UsePredictedScoreResult {
  const now = deps.now ?? (() => new Date());
  const [status, setStatus] = useState<Status>('loading');
  const [predictedScore, setPredictedScore] = useState(0);
  const [coverageRatio, setCoverageRatio] = useState(0);
  const [atomCount, setAtomCount] = useState(0);
  const [totalAtoms, setTotalAtoms] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [total, states] = await Promise.all([
          deps.atomRepo.countApprovedByExam(deps.exam),
          deps.userStateRepo.listAllForUser(deps.userId),
        ]);
        if (cancelled) return;
        const cardStates = states.map(fromUserAtomState);
        const { retentionMean, atomCount } = computePredictedScore(cardStates, now());
        setPredictedScore(retentionMean);
        setAtomCount(atomCount);
        setTotalAtoms(total);
        setCoverageRatio(total > 0 ? atomCount / total : 0);
        setStatus('ready');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message ?? 'Failed to load predicted score');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.userId, deps.exam]);

  return { status, predictedScore, coverageRatio, atomCount, totalAtoms, errorMessage };
}
