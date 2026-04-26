import { useMemo } from 'react';
import type { Atom } from '@/atom/types';
import { AtomRenderer, type AtomRated } from './AtomRenderer';
import { ClozeRenderer } from './ClozeRenderer';
import { CalcRenderer } from './CalcRenderer';

/**
 * Picks which renderer to use for a given atom:
 *   - SBA   (multiple choice)         ← default, ≈70% of /study draws
 *   - EMQ   (extended matching, 9-12) ← author-set via question_kind='emq'
 *   - CALC  (numeric drug calc)       ← author-set via question_kind='calc'
 *   - CLOZE (type the answer)         ← ≈30%, recall variant; selected by
 *                                       deterministic hash on atom.id
 *
 * Hash-based selection means refreshing the same atom keeps the same
 * kind (no flicker, no game-able re-rolls). Author-set kinds always
 * win over the random mix.
 */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const CLOZE_RATIO = 0.3;

export function pickRenderer(atom: Atom): 'sba' | 'cloze' | 'calc' {
  if (atom.questionKind === 'calc') return 'calc';
  if (atom.questionKind === 'cloze') return 'cloze';
  // EMQ + SBA both render as multi-option MCQ via <AtomRenderer />.
  if (atom.questionKind === 'sba' || atom.questionKind === 'emq') return 'sba';
  // Otherwise hash the id to a stable bucket: cloze or sba.
  const bucket = (hashStr(atom.id) % 100) / 100;
  return bucket < CLOZE_RATIO ? 'cloze' : 'sba';
}

export function QuestionRouter({ atom, onRated }: { atom: Atom; onRated: (r: AtomRated) => void }) {
  const kind = useMemo(() => pickRenderer(atom), [atom.id]);
  if (kind === 'calc') return <CalcRenderer atom={atom} onRated={onRated} />;
  if (kind === 'cloze') return <ClozeRenderer atom={atom} onRated={onRated} />;
  return <AtomRenderer atom={atom} onRated={onRated} />;
}
