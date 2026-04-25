import { describe, it, expect } from 'vitest';
import { matchSpokenAnswer } from '@/voice/match';
import type { Atom } from '@/atom/types';

const atom: Atom = {
  id: 'a1', exam: 'UKMLA', topicPath: ['Cardiology'],
  claim: 'beta-blocker first-line for stable angina',
  canonicalStem: 'A 60-year-old man has stable exertional angina. What is first-line?',
  answer: 'Beta-blocker',
  distractors: ['ACE inhibitor', 'Calcium-channel blocker', 'Aspirin only'],
  difficulty: 3, imageUrl: null, imageAlt: null,
  citationUrl: 'https://www.nice.org.uk/guidance/cg126',
  citationLabel: 'NICE CG126',
  sourceType: 'NICE', prereqAtomIds: [], highYield: true, freeTier: true,
  reviewedBy: null, reviewedAt: null, status: 'approved',
  createdAt: '2026-04-25T00:00:00Z', updatedAt: '2026-04-25T00:00:00Z',
};

describe('matchSpokenAnswer', () => {
  it('matches the answer when transcript exactly equals it (case-insensitive)', () => {
    expect(matchSpokenAnswer('beta blocker', atom)).toEqual({ kind: 'answer' });
  });

  it('matches the answer when the transcript embeds it within a longer phrase', () => {
    expect(matchSpokenAnswer('I think it is a beta-blocker', atom)).toEqual({ kind: 'answer' });
  });

  it('matches a distractor by index', () => {
    expect(matchSpokenAnswer('ACE inhibitor', atom)).toEqual({ kind: 'distractor', index: 0 });
    expect(matchSpokenAnswer('calcium channel blocker', atom)).toEqual({ kind: 'distractor', index: 1 });
  });

  it('returns no-match for an empty transcript', () => {
    expect(matchSpokenAnswer('', atom)).toEqual({ kind: 'no-match' });
    expect(matchSpokenAnswer('   ', atom)).toEqual({ kind: 'no-match' });
  });

  it('returns no-match for an unrelated transcript', () => {
    expect(matchSpokenAnswer('I have no idea what this is', atom)).toEqual({ kind: 'no-match' });
  });

  it('strips punctuation when normalising the answer', () => {
    expect(matchSpokenAnswer('beta-blocker.', atom)).toEqual({ kind: 'answer' });
    expect(matchSpokenAnswer('ace inhibitor!', atom)).toEqual({ kind: 'distractor', index: 0 });
  });
});
