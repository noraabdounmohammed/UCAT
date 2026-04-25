import { describe, it, expect } from 'vitest';
import {
  initialMockState,
  submitAnswer,
  tickTimer,
  isFinished,
  computeScore,
} from '@/mock/state';

const dummyAtoms = [
  { id: 'a1', answer: 'A1' },
  { id: 'a2', answer: 'A2' },
  { id: 'a3', answer: 'A3' },
];

describe('mock state machine', () => {
  it('initialMockState starts at index 0 with full timer and empty answers', () => {
    const s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    expect(s.atomIndex).toBe(0);
    expect(s.secondsLeft).toBe(1800);
    expect(s.answers).toEqual([]);
    expect(isFinished(s)).toBe(false);
  });

  it('submitAnswer records the answer and advances', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = submitAnswer(s, { correct: true, choiceIndex: 0 });
    expect(s.atomIndex).toBe(1);
    expect(s.answers).toHaveLength(1);
    expect(s.answers[0]).toEqual({ correct: true, choiceIndex: 0 });
  });

  it('tickTimer decrements secondsLeft', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 100 });
    s = tickTimer(s, 5);
    expect(s.secondsLeft).toBe(95);
  });

  it('tickTimer to 0 marks finished', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 5 });
    s = tickTimer(s, 10);
    expect(s.secondsLeft).toBe(0);
    expect(isFinished(s)).toBe(true);
  });

  it('isFinished true when all atoms answered', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = submitAnswer(s, { correct: true, choiceIndex: 0 });
    s = submitAnswer(s, { correct: false, choiceIndex: 1 });
    s = submitAnswer(s, { correct: true, choiceIndex: 2 });
    expect(isFinished(s)).toBe(true);
  });

  it('computeScore returns correct count, total, percentage', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = submitAnswer(s, { correct: true, choiceIndex: 0 });
    s = submitAnswer(s, { correct: false, choiceIndex: 1 });
    s = submitAnswer(s, { correct: true, choiceIndex: 2 });
    const score = computeScore(s);
    expect(score.correct).toBe(2);
    expect(score.total).toBe(3);
    expect(score.percentage).toBeCloseTo(66.7, 0);
  });
});
