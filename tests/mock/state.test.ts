import { describe, it, expect } from 'vitest';
import {
  initialMockState,
  pickAnswer,
  jumpTo,
  nextQuestion,
  prevQuestion,
  toggleFlag,
  finalize,
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
  it('initialMockState starts at index 0 with full timer, empty picks, no flags, in_progress', () => {
    const s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    expect(s.atomIndex).toBe(0);
    expect(s.secondsLeft).toBe(1800);
    expect(s.picks).toEqual({});
    expect(s.flagged.size).toBe(0);
    expect(s.status).toBe('in_progress');
    expect(isFinished(s)).toBe(false);
  });

  it('pickAnswer records the pick at the current atomIndex without advancing', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = pickAnswer(s, { correct: true, choiceIndex: 0 });
    expect(s.atomIndex).toBe(0); // no auto-advance
    expect(s.picks[0]).toEqual({ correct: true, choiceIndex: 0 });
  });

  it('pickAnswer is revisable — re-picking overwrites the previous pick', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = pickAnswer(s, { correct: false, choiceIndex: 1 });
    s = pickAnswer(s, { correct: true, choiceIndex: 0 });
    expect(s.picks[0]).toEqual({ correct: true, choiceIndex: 0 });
  });

  it('jumpTo navigates to any in-range index, clamping out-of-range', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = jumpTo(s, 2);
    expect(s.atomIndex).toBe(2);
    s = jumpTo(s, 99);
    expect(s.atomIndex).toBe(2); // clamped
    s = jumpTo(s, -5);
    expect(s.atomIndex).toBe(0); // clamped
  });

  it('nextQuestion / prevQuestion respect bounds', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = nextQuestion(s);
    expect(s.atomIndex).toBe(1);
    s = prevQuestion(s);
    expect(s.atomIndex).toBe(0);
    s = prevQuestion(s);
    expect(s.atomIndex).toBe(0); // stays at 0
  });

  it('toggleFlag flips the flag for the current or specified index', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = toggleFlag(s);
    expect(s.flagged.has(0)).toBe(true);
    s = toggleFlag(s, 2);
    expect(s.flagged.has(2)).toBe(true);
    s = toggleFlag(s);
    expect(s.flagged.has(0)).toBe(false);
  });

  it('tickTimer decrements secondsLeft', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 100 });
    s = tickTimer(s, 5);
    expect(s.secondsLeft).toBe(95);
  });

  it('tickTimer to 0 auto-finalizes (status=review)', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 5 });
    s = tickTimer(s, 10);
    expect(s.secondsLeft).toBe(0);
    expect(s.status).toBe('review');
    expect(isFinished(s)).toBe(true);
  });

  it('finalize flips status to review even with picks remaining', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = pickAnswer(s, { correct: true, choiceIndex: 0 });
    s = finalize(s);
    expect(s.status).toBe('review');
    expect(isFinished(s)).toBe(true);
  });

  it('computeScore returns correct count, total, percentage, answered (blank questions count as 0)', () => {
    let s = initialMockState({ atoms: dummyAtoms as any, durationSec: 1800 });
    s = pickAnswer(s, { correct: true, choiceIndex: 0 });
    s = nextQuestion(s);
    s = pickAnswer(s, { correct: false, choiceIndex: 1 });
    // skip atom 3 — leave it blank
    s = finalize(s);
    const score = computeScore(s);
    expect(score.correct).toBe(1);
    expect(score.total).toBe(3);
    expect(score.answered).toBe(2);
    expect(score.percentage).toBeCloseTo(33.3, 0);
  });
});
