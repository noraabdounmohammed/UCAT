import { useEffect, useMemo, useRef, useState } from 'react';
import type { Atom, FsrsRatingValue, ConfidenceValue } from '@/atom/types';
import type { AtomRepository } from '@/atom/repository';
import type { UserStateRepository } from '@/atom/userStateRepository';
import { createFsrsScheduler } from '@/fsrs/scheduler';
import { fromUserAtomState, toUserAtomState } from '@/fsrs/mapper';
import { isSessionDone, pickNextAtomId, type SessionState } from '@/fsrs/session';

export interface FsrsSessionDeps {
  userId: string;
  /** Override for testability; default: () => new Date() */
  now?: () => Date;
  /** Default 5-7. The 3-min session cap. */
  maxAtoms?: number;
  atomRepo: AtomRepository;
  userStateRepo: UserStateRepository;
}

export interface RateInput {
  rating: FsrsRatingValue;
  confidence: ConfidenceValue;
  responseMs: number;
}

export interface SessionSummaryData {
  totalAtoms: number;
  ratings: FsrsRatingValue[];
  startedAt: Date;
  finishedAt: Date;
}

type Status = 'loading' | 'in_progress' | 'summary' | 'empty' | 'error';

export interface UseFsrsSessionResult {
  status: Status;
  currentAtom: Atom | null;
  progress: { done: number; total: number };
  summary: SessionSummaryData | null;
  rateAtom: (input: RateInput) => Promise<void>;
  errorMessage: string | null;
}

export function useFsrsSession(deps: FsrsSessionDeps): UseFsrsSessionResult {
  const now = deps.now ?? (() => new Date());
  const maxAtoms = deps.maxAtoms ?? 5;
  const scheduler = useMemo(() => createFsrsScheduler(), []);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>({
    atomIds: [],
    ratedAtomIds: [],
    maxAtoms,
  });
  const atomCacheRef = useRef<Map<string, Atom>>(new Map());
  const stateCacheRef = useRef<Map<string, ReturnType<typeof fromUserAtomState>>>(new Map());
  const ratingsRef = useRef<FsrsRatingValue[]>([]);
  const startedAtRef = useRef<Date>(now());

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dueRows = await deps.userStateRepo.listDueForUser(deps.userId, now(), maxAtoms);
        if (cancelled) return;
        if (dueRows.length === 0) {
          setStatus('empty');
          return;
        }
        // Hydrate atom + state caches
        const atomIds = dueRows.map(r => r.atomId);
        const atoms = await Promise.all(atomIds.map(id => deps.atomRepo.getById(id)));
        if (cancelled) return;
        for (const a of atoms) if (a) atomCacheRef.current.set(a.id, a);
        for (const r of dueRows) {
          const loaded = fromUserAtomState(r);
          // Pristine rows (never reviewed) carry placeholder zeros that violate
          // ts-fsrs's memory-state invariant. Seed them with proper initial state.
          const isPristine = r.reps === 0 && r.lastReviewAt === null;
          stateCacheRef.current.set(
            r.atomId,
            isPristine ? scheduler.initialState(now()) : loaded,
          );
        }
        setSessionState({ atomIds, ratedAtomIds: [], maxAtoms });
        startedAtRef.current = now();
        setStatus('in_progress');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message ?? 'Failed to load session');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.userId]);

  const currentAtomId = pickNextAtomId(sessionState);
  const currentAtom = currentAtomId ? atomCacheRef.current.get(currentAtomId) ?? null : null;

  const rateAtom = async ({ rating, confidence, responseMs }: RateInput) => {
    if (!currentAtomId) return;
    const prevState = stateCacheRef.current.get(currentAtomId);
    if (!prevState) return;

    const { newState } = scheduler.applyReview(prevState, rating, now());
    stateCacheRef.current.set(currentAtomId, newState);

    await deps.userStateRepo.upsertState(toUserAtomState(deps.userId, currentAtomId, newState));
    await deps.userStateRepo.insertReviewEvent({
      userId: deps.userId,
      atomId: currentAtomId,
      variantId: null,
      rating,
      confidence,
      responseMs,
    });

    ratingsRef.current.push(rating);
    const nextRated = [...sessionState.ratedAtomIds, currentAtomId];
    const nextState: SessionState = { ...sessionState, ratedAtomIds: nextRated };
    setSessionState(nextState);

    if (isSessionDone(nextState)) {
      setStatus('summary');
    }
  };

  const summary: SessionSummaryData | null = status === 'summary'
    ? {
        totalAtoms: sessionState.ratedAtomIds.length,
        ratings: [...ratingsRef.current],
        startedAt: startedAtRef.current,
        finishedAt: now(),
      }
    : null;

  return {
    status,
    currentAtom,
    progress: { done: sessionState.ratedAtomIds.length, total: sessionState.atomIds.length },
    summary,
    rateAtom,
    errorMessage,
  };
}
