import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeedAtom } from '@/hooks/useSeedAtom';
import type { DraftAtomInput } from '@/atom/seedRepository';

function makeRepo(returns: { id: string } | Error = { id: 'a1' }) {
  return {
    createDraftAtom: vi.fn(async () => {
      if (returns instanceof Error) throw returns;
      return returns;
    }),
  };
}

const validInput: DraftAtomInput = {
  exam: 'UKMLA',
  topicPath: ['Cardiology'],
  claim: 'fact',
  canonicalStem: 'Stem?',
  answer: 'Answer',
  distractors: ['x', 'y', 'z'],
  difficulty: 3,
  citationUrl: 'https://nice.org.uk/cg126',
  citationLabel: 'NICE CG126',
  sourceType: 'NICE',
};

describe('useSeedAtom', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initial state is idle with no lastAtomId', () => {
    const repo = makeRepo();
    const { result } = renderHook(() => useSeedAtom({ repo: repo as any }));
    expect(result.current.status).toBe('idle');
    expect(result.current.lastAtomId).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('submit sets status=success and exposes lastAtomId', async () => {
    const repo = makeRepo({ id: 'new-atom-1' });
    const { result } = renderHook(() => useSeedAtom({ repo: repo as any }));

    await act(async () => {
      await result.current.submit(validInput);
    });

    expect(repo.createDraftAtom).toHaveBeenCalledWith(validInput);
    expect(result.current.status).toBe('success');
    expect(result.current.lastAtomId).toBe('new-atom-1');
  });

  it('submit with thrown error sets status=error with message', async () => {
    const repo = makeRepo(new Error('insert blocked'));
    const { result } = renderHook(() => useSeedAtom({ repo: repo as any }));

    await act(async () => {
      await result.current.submit(validInput);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('insert blocked');
    expect(result.current.lastAtomId).toBeNull();
  });

  it('reset returns to idle', async () => {
    const repo = makeRepo({ id: 'a1' });
    const { result } = renderHook(() => useSeedAtom({ repo: repo as any }));

    await act(async () => {
      await result.current.submit(validInput);
    });
    expect(result.current.status).toBe('success');

    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.lastAtomId).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });
});
