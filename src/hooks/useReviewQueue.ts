import { useEffect, useState } from 'react';
import type { Atom, Exam } from '@/atom/types';
import type { ReviewRepository, AtomPatch } from '@/atom/reviewRepository';

export interface UseReviewQueueDeps {
  exam: Exam;
  reviewerId: string;
  repo: ReviewRepository;
  /** Default 20. Soft cap for the initial load. */
  limit?: number;
}

type Status = 'loading' | 'in_progress' | 'empty' | 'error';

export interface UseReviewQueueResult {
  status: Status;
  currentAtom: Atom | null;
  progress: { done: number; total: number };
  errorMessage: string | null;
  approve(): Promise<void>;
  reject(reason: string): Promise<void>;
  updateAndApprove(patch: AtomPatch): Promise<void>;
}

export function useReviewQueue(deps: UseReviewQueueDeps): UseReviewQueueResult {
  const limit = deps.limit ?? 20;
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pending = await deps.repo.listPendingReview(deps.exam, limit);
        if (cancelled) return;
        if (pending.length === 0) {
          setStatus('empty');
          return;
        }
        setAtoms(pending);
        setStatus('in_progress');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message ?? 'Failed to load review queue');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.exam, deps.reviewerId]);

  const currentAtom = atoms[doneCount] ?? null;

  const advance = () => {
    const next = doneCount + 1;
    setDoneCount(next);
    if (next >= atoms.length) setStatus('empty');
  };

  const approve = async () => {
    if (!currentAtom) return;
    await deps.repo.approveAtom(currentAtom.id, deps.reviewerId);
    advance();
  };

  const reject = async (reason: string) => {
    if (!currentAtom) return;
    await deps.repo.rejectAtom(currentAtom.id, deps.reviewerId, reason);
    advance();
  };

  const updateAndApprove = async (patch: AtomPatch) => {
    if (!currentAtom) return;
    await deps.repo.updateAtom(currentAtom.id, patch);
    await deps.repo.approveAtom(currentAtom.id, deps.reviewerId);
    advance();
  };

  return {
    status,
    currentAtom,
    progress: { done: doneCount, total: atoms.length },
    errorMessage,
    approve,
    reject,
    updateAndApprove,
  };
}
