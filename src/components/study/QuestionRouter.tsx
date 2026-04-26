import { useMemo } from 'react';
import type { Atom } from '@/atom/types';
import { AtomRenderer, type AtomRated } from './AtomRenderer';
import { ClozeRenderer } from './ClozeRenderer';

/**
 * Picks which renderer to use for a given atom. The split:
 *   - SBA (multiple choice)   ← the default, ≈70% of /study draws
 *   - CLOZE (type the answer) ← ≈30%, recall-not-recognition variant
 *
 * Selection is deterministic per atom.id (so refreshing the same atom
 * keeps the same kind — no flicker, no game-able re-rolls). If
 * `atom.questionKind` is set, that takes precedence.
 *
 * EMQ format is teed up in the schema (`question_kind = 'emq'`) but
 * needs grouped option lists to render — coming next iteration.
 */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const CLOZE_RATIO = 0.3;

export function pickRenderer(atom: Atom): 'sba' | 'cloze' {
  // Author-set kind wins over the default mix.
  if (atom.questionKind === 'cloze') return 'cloze';
  if (atom.questionKind === 'sba' || atom.questionKind === 'emq') return 'sba';
  // Otherwise hash the id to a stable bucket.
  const bucket = (hashStr(atom.id) % 100) / 100;
  return bucket < CLOZE_RATIO ? 'cloze' : 'sba';
}

export function QuestionRouter({ atom, onRated }: { atom: Atom; onRated: (r: AtomRated) => void }) {
  const kind = useMemo(() => pickRenderer(atom), [atom.id]);
  if (kind === 'cloze') return <ClozeRenderer atom={atom} onRated={onRated} />;
  return <AtomRenderer atom={atom} onRated={onRated} />;
}
