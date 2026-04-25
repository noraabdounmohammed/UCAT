import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { VoiceAtomView } from '@/components/voice/VoiceAtomView';
import type { Atom } from '@/atom/types';

/**
 * The voice flow uses real Web Speech APIs in production. In the test we
 * mock the speech module so speak() fires onEnd synchronously and listen()
 * resolves a configurable transcript on the microtask queue. This lets
 * the speak → listen → match → onMatch chain run end-to-end without timers.
 *
 * `nextTranscript` is module-scoped and reset per test — easier than
 * vi.doMock + dynamic re-import for our use case.
 */
let nextTranscript = 'Beta-blocker';

vi.mock('@/voice/speech', () => ({
  isVoiceAvailable: () => true,
  speak: ({ onEnd }: any) => {
    onEnd?.();
  },
  listen: ({ onResult }: any) => {
    Promise.resolve().then(() => onResult(nextTranscript));
    return { stop: () => {} };
  },
}));

const atom: Atom = {
  id: 'a1',
  exam: 'UKMLA',
  topicPath: ['Cardiology'],
  claim: 'beta-blocker first-line',
  canonicalStem: 'A 60-year-old man with stable angina. First-line antianginal?',
  answer: 'Beta-blocker',
  distractors: ['ACE inhibitor', 'Calcium-channel blocker', 'Aspirin'],
  difficulty: 3,
  imageUrl: null,
  imageAlt: null,
  citationUrl: 'https://www.nice.org.uk/guidance/cg126',
  citationLabel: 'NICE CG126',
  sourceType: 'NICE',
  prereqAtomIds: [],
  highYield: true,
  freeTier: true,
  reviewedBy: null,
  reviewedAt: null,
  status: 'approved',
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
};

describe('VoiceAtomView integration (mocked Web Speech)', () => {
  beforeEach(() => {
    nextTranscript = 'Beta-blocker';
  });

  it('full flow: speaks → listens → matches answer → calls onMatch with kind=answer', async () => {
    nextTranscript = 'I think it is a beta-blocker';
    const onMatch = vi.fn();
    render(<VoiceAtomView atom={atom} onMatch={onMatch} />);

    await waitFor(() => expect(onMatch).toHaveBeenCalledTimes(1));
    expect(onMatch.mock.calls[0][0]).toEqual({ kind: 'answer' });
  });

  it('reports a distractor match by index when transcript matches a distractor', async () => {
    nextTranscript = 'ACE inhibitor';
    const onMatch = vi.fn();
    render(<VoiceAtomView atom={atom} onMatch={onMatch} />);

    await waitFor(() => expect(onMatch).toHaveBeenCalledTimes(1));
    expect(onMatch.mock.calls[0][0]).toEqual({ kind: 'distractor', index: 0 });
  });

  it('reports no-match when transcript matches nothing', async () => {
    nextTranscript = 'something completely unrelated';
    const onMatch = vi.fn();
    render(<VoiceAtomView atom={atom} onMatch={onMatch} />);

    await waitFor(() => expect(onMatch).toHaveBeenCalledTimes(1));
    expect(onMatch.mock.calls[0][0]).toEqual({ kind: 'no-match' });
  });
});
