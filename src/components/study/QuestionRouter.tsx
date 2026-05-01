import { useMemo } from 'react';
import type { Atom } from '@/atom/types';
import { AtomRenderer, type AtomRated } from './AtomRenderer';
import { ClozeRenderer } from './ClozeRenderer';
import { CalcRenderer } from './CalcRenderer';
import { CaseVignette } from './CaseVignette';
import { supabase } from '@/lib/supabase';

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
  // Case-bound atoms must keep their author-intended structure. Cloze would
  // break the case stem (e.g. asking the user to type a phrase from the
  // vignette). Default to SBA for anything attached to a clinical case.
  if (atom.caseId) return 'sba';
  // Otherwise hash the id to a stable bucket: cloze or sba.
  const bucket = (hashStr(atom.id) % 100) / 100;
  return bucket < CLOZE_RATIO ? 'cloze' : 'sba';
}

export function QuestionRouter({ atom, onRated }: { atom: Atom; onRated: (r: AtomRated) => void }) {
  const kind = useMemo(() => pickRenderer(atom), [atom.id]);
  // Chained-case vignette renders above the question when caseId is set —
  // independent of the renderer kind (sba / cloze / calc all benefit).
  const vignette = atom.caseId
    ? <CaseVignette supabase={supabase} caseId={atom.caseId} />
    : null;
  const body = kind === 'calc'
    ? <CalcRenderer atom={atom} onRated={onRated} />
    : kind === 'cloze'
      ? <ClozeRenderer atom={atom} onRated={onRated} />
      : <AtomRenderer atom={atom} onRated={onRated} />;
  if (!vignette) return body;
  return (
    <div className="space-y-3">
      {vignette}
      {body}
    </div>
  );
}
