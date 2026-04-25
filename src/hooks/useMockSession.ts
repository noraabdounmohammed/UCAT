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

type Status = 'loading' | 'in_progress' | 'finished' | 'empty' | 'error';

export interface UseMockSessionDeps {
  atomRepo: AtomRepository;
  exam: Exam;
  atomCount: number;
  durationSec: number;
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

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await deps.atomRepo.listApprovedByExam(deps.exam);
        if (cancelled) return;
        if (all.length === 0) {
          setStatus('empty');
          return;
        }
        // Random sample atomCount atoms
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        const sampled = shuffled.slice(0, deps.atomCount);
        const fresh = initialMockState({ atoms: sampled, durationSec: deps.durationSec });
        setState(fresh);
        setStatus('in_progress');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage(err?.message ?? 'Failed to load mock');
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.exam, deps.atomCount, deps.durationSec]);

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

  return { status, currentAtom, progress, secondsLeft, score, submit, errorMessage };
}
