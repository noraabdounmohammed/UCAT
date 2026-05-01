import { useEffect, useRef, useState } from 'react';
import type { Atom, Exam } from '@/atom/types';
import type { AtomRepository } from '@/atom/repository';
import {
  initialMockState,
  pickAnswer,
  tickTimer,
  toggleFlag,
  jumpTo,
  nextQuestion,
  prevQuestion,
  finalize,
  isFinished,
  computeScore,
  type MockAnswer,
  type MockState,
} from '@/mock/state';
import { track } from '@/instrumentation/events';

type Status = 'loading' | 'in_progress' | 'review' | 'empty' | 'error';

export interface UseMockSessionDeps {
  atomRepo: AtomRepository;
  exam: Exam;
  atomCount: number;
  durationSec: number;
  /**
   * When true, include AI-drafted, not-yet-reviewed atoms in the mock pool.
   * Default false. Disclaimer chip is shown for any returned atom whose
   * status !== 'approved'.
   */
  includeUnreviewed?: boolean;
  /** Override for testability; default uses setInterval. */
  startTimer?: (onTick: () => void) => () => void;
}

export interface UseMockSessionResult {
  status: Status;
  currentAtom: Atom | null;
  /** All atoms in the mock, in display order. Used for the question grid. */
  atoms: Atom[];
  atomIndex: number;
  picks: Record<number, MockAnswer>;
  flagged: Set<number>;
  progress: { done: number; total: number };
  secondsLeft: number;
  score: ReturnType<typeof computeScore> | null;
  pick: (answer: MockAnswer) => void;
  goNext: () => void;
  goPrev: () => void;
  goTo: (index: number) => void;
  flag: (index?: number) => void;
  submit: () => void;
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
        // which is misleading).
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

  // Timer tick — auto-finalize on 0.
  useEffect(() => {
    if (status !== 'in_progress') return;
    const onTick = () => {
      setState((prev) => {
        if (!prev) return prev;
        const ticked = tickTimer(prev, 1);
        if (isFinished(ticked)) setStatus('review');
        return ticked;
      });
    };
    const stop = deps.startTimer
      ? deps.startTimer(onTick)
      : (() => { const id = setInterval(onTick, 1000); return () => clearInterval(id); })();
    return stop;
  }, [status, deps.startTimer]);

  const pick = (answer: MockAnswer) => {
    setState((prev) => (prev ? pickAnswer(prev, answer) : prev));
  };
  const goNext = () => setState((prev) => (prev ? nextQuestion(prev) : prev));
  const goPrev = () => setState((prev) => (prev ? prevQuestion(prev) : prev));
  const goTo = (index: number) => setState((prev) => (prev ? jumpTo(prev, index) : prev));
  const flag = (index?: number) => setState((prev) => (prev ? toggleFlag(prev, index) : prev));
  const submit = () => {
    setState((prev) => {
      if (!prev) return prev;
      const finalized = finalize(prev);
      setStatus('review');
      return finalized;
    });
  };

  const currentAtom = state ? state.atoms[state.atomIndex] : null;
  const atoms = state?.atoms ?? [];
  const atomIndex = state?.atomIndex ?? 0;
  const picks = state?.picks ?? {};
  const flagged = state?.flagged ?? new Set<number>();
  const progress = state
    ? { done: Object.keys(state.picks).length, total: state.atoms.length }
    : { done: 0, total: 0 };
  const secondsLeft = state?.secondsLeft ?? 0;
  const score = state && status === 'review' ? computeScore(state) : null;

  // Fire mock_finished once per finished transition.
  const finishedTrackedRef = useRef(false);
  useEffect(() => {
    if (status === 'review' && !finishedTrackedRef.current && score) {
      finishedTrackedRef.current = true;
      track('mock_finished', {
        correct: score.correct,
        total: score.total,
        percentage: score.percentage,
      });
    }
  }, [status, score]);

  return {
    status,
    currentAtom,
    atoms,
    atomIndex,
    picks,
    flagged,
    progress,
    secondsLeft,
    score,
    pick,
    goNext,
    goPrev,
    goTo,
    flag,
    submit,
    errorMessage,
  };
}
