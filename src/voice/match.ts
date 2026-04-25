import type { Atom } from '@/atom/types';

/**
 * Outcome of matching a spoken transcript against an atom's answer
 * and distractors. Used by voice mode to derive an FSRS rating.
 */
export type MatchOutcome =
  | { kind: 'answer' }
  | { kind: 'distractor'; index: number }
  | { kind: 'no-match' };

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function fuzzyContains(haystack: string, needle: string): boolean {
  if (!needle) return false;
  // Bidirectional substring check: either side may be the longer phrase.
  return haystack.includes(needle) || needle.includes(haystack);
}

/**
 * Loose match: case- and punctuation-insensitive substring containment
 * in either direction. Returns the first matching candidate.
 *
 * v1 — Levenshtein/embedding similarity is deferred to Plan 8B.
 */
export function matchSpokenAnswer(transcript: string, atom: Atom): MatchOutcome {
  const t = normalize(transcript);
  if (!t) return { kind: 'no-match' };
  const answer = normalize(atom.answer);
  if (fuzzyContains(t, answer)) return { kind: 'answer' };
  for (let i = 0; i < atom.distractors.length; i++) {
    if (fuzzyContains(t, normalize(atom.distractors[i]))) {
      return { kind: 'distractor', index: i };
    }
  }
  return { kind: 'no-match' };
}
