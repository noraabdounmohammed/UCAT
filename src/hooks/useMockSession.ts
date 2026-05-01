import { useEffect, useRef, useState } from 'react';
import type { Atom, Exam } from '@/atom/types';
import type { AtomRepository } from '@/atom/repository';
import {
  initialMockState,
  submitAnswer,
  tickTimer,
  isFinished,
  computeScore,
  type MockAnswer,
  type MockState,
} from '@/mock/state';
import { track } from '@/instrumentation/events';

type Status = 'loading' | 'in_progress' | 'finished' | 'empty' | 'error';

export interface UseMockSessionDeps {
  atomRepo: AtomRepository;
  exam: Exam;
  atomCount: number;
  durationSec: number;
  /**
   * When true, include AI-drafted, not-yet-reviewed atoms in the mock pool.
   * Default false. The MockQuestion component shows a per-atom disclaimer
   * for any returned atom whose status !== 'approved'.
   */
  includeUnreviewed?: boolean;
  /** Override for testability; default uses setInterval. */
  startTimer?: (onTick: () => void) => () => void;
}

export interface UseMockSessionResult {
  status: Status;
  currentAtom: Atom | null;
  progress: { done: number; total: number };
  secondsLeft: number;
  score: ReturnType<typeof computeScore> | null;
  submit: (answer: MockAnswer) => void;
  errorMessage: string | null;
}

export function useMockSession(deps: UseMockSessionDeps): UseMockSessionResult {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [state, setState] = useState<MockState | null>(null);
  const stateRef = useRef<MockState | null>(null);
  stateRef.current = state;

  // Initial load — re-runs whenever exam, atomCount, durationSec, or
  // includeUnreviewed change so the mock pool reflects the latest opt-in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await deps.atomRepo.listAvailableForExam(deps.exam, {
          includeUnreviewedAiDrafts: !!deps.includeUnreviewed,
        });
        if (cancelled) return;
        // Real UKMLA AKT is SBA-only. Filter out calc / EMQ / cloze atoms
        // (their renderers don't fit MockQuestion's pure-MCQ flow) and
        // case-bound atoms (they'd be shown without their vignette context,
        // which is misleading). Atoms without an explicit question_kind
        // default to 'sba' DB-side so they pass through.
        const sbaOnly = all.filter((a) => {
          const kind = a.questionKind ?? 'sba';
          if (kind !== 'sba') return false;
          if (a.caseId) return false;
          return true;
        });
        if (sbaOnly.length === 0) {
          setStatus('empty');
          return;
        }
        // Random sample atomCount atoms
        const shuffled = [...sbaOnly].sort(() => Math.random() - 0.5);
        const sampled = shuffled.slice(0, deps.atomCount);
        const fresh = initialMockState({ atoms: sampled, durationSec: deps.durationSec });
        setState(fresh);
        setStatus('in_progress');
        track('mock_started', { exam: deps.exam, atomCount: sampled.length, durationSec: deps.durationSec });
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message ?? 'Failed to load mock');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.exam, deps.atomCount, deps.durationSec, deps.includeUnreviewed]);

  // Timer tick
  useEffect(() => {
    if (status !== 'in_progress') return;
    const onTick = () => {
      setState(prev => {
        if (!prev) return prev;
        const ticked = tickTimer(prev, 1);
        if (isFinished(ticked)) setStatus('finished');
        return ticked;
      });
    };
    const stop = deps.startTimer
      ? deps.startTimer(onTick)
      : (() => { const id = setInterval(onTick, 1000); return () => clearInterval(id); })();
    return stop;
  }, [status, deps.startTimer]);

  const submit = (answer: MockAnswer) => {
    setState(prev => {
      if (!prev) return prev;
      const next = submitAnswer(prev, answer);
      if (isFinished(next)) setStatus('finished');
      return next;
    });
  };

  const currentAtom = state && !isFinished(state) ? state.atoms[state.atomIndex] : null;
  const progress = state ? { done: state.atomIndex, total: state.atoms.length } : { done: 0, total: 0 };
  const secondsLeft = state?.secondsLeft ?? 0;
  const score = state && status === 'finished' ? computeScore(state) : null;

  // Fire mock_finished once per finished transition.
  const finishedTrackedRef = useRef(false);
  useEffect(() => {
    if (status === 'finished' && !finishedTrackedRef.current && score) {
      finishedTrackedRef.current = true;
      track('mock_finished', {
        correct: score.correct,
        total: score.total,
        percentage: score.percentage,
      });
    }
  }, [status, score]);

  return { status, currentAtom, progress, secondsLeft, score, submit, errorMessage };
}
