import type { Atom } from '@/atom/types';

export interface MockAnswer {
  correct: boolean;
  choiceIndex: number;
}

export interface MockState {
  atoms: Atom[];
  atomIndex: number;
  secondsLeft: number;
  answers: MockAnswer[];
}

export function initialMockState({ atoms, durationSec }: { atoms: Atom[]; durationSec: number }): MockState {
  return { atoms, atomIndex: 0, secondsLeft: durationSec, answers: [] };
}

export function submitAnswer(state: MockState, answer: MockAnswer): MockState {
  if (isFinished(state)) return state;
  return { ...state, atomIndex: state.atomIndex + 1, answers: [...state.answers, answer] };
}

export function tickTimer(state: MockState, deltaSec: number): MockState {
  return { ...state, secondsLeft: Math.max(0, state.secondsLeft - deltaSec) };
}

export function isFinished(state: MockState): boolean {
  return state.secondsLeft === 0 || state.atomIndex >= state.atoms.length;
}

export function computeScore(state: MockState): { correct: number; total: number; percentage: number } {
  const correct = state.answers.filter(a => a.correct).length;
  const total = state.answers.length;
  return { correct, total, percentage: total === 0 ? 0 : (correct / total) * 100 };
}
