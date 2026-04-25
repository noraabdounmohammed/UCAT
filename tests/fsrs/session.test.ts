import { describe, it, expect } from 'vitest';
import { pickNextAtomId, isSessionDone, type SessionState } from '@/fsrs/session';

describe('session logic', () => {
  it('picks the first not-yet-rated atom from the due queue', () => {
    const state: SessionState = {
      atomIds: ['a1', 'a2', 'a3'],
      ratedAtomIds: ['a1'],
      maxAtoms: 5,
    };
    expect(pickNextAtomId(state)).toBe('a2');
  });

  it('returns null when all atoms are rated', () => {
    const state: SessionState = {
      atomIds: ['a1', 'a2'],
      ratedAtomIds: ['a1', 'a2'],
      maxAtoms: 5,
    };
    expect(pickNextAtomId(state)).toBeNull();
  });

  it('caps the session at maxAtoms even if more are due', () => {
    const state: SessionState = {
      atomIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
      ratedAtomIds: ['a1', 'a2', 'a3', 'a4', 'a5'],
      maxAtoms: 5,
    };
    expect(pickNextAtomId(state)).toBeNull();
    expect(isSessionDone(state)).toBe(true);
  });

  it('isSessionDone is false until the cap or queue is exhausted', () => {
    const state: SessionState = {
      atomIds: ['a1', 'a2', 'a3'],
      ratedAtomIds: ['a1'],
      maxAtoms: 5,
    };
    expect(isSessionDone(state)).toBe(false);
  });
});
