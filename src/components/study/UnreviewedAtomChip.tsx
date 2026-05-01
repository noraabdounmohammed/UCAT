import type { Atom } from '@/atom/types';

/**
 * Inline disclaimer chip for non-approved atoms. Two flavours:
 *
 *  - `ai-draft`  → "AI-drafted, not yet reviewed" (amber, strong warning)
 *  - `doctor_seed` → "Pending clinician sign-off" (stone, soft note)
 *
 * Doctor-seed atoms are hand-authored from NICE/BNF/Resus Council UK
 * and cited directly — same trust posture as approved, just awaiting
 * formal sign-off in Nora's review queue. Calling them "AI-drafted" is
 * misleading and brand-damaging.
 *
 * Renders nothing for approved atoms.
 */
export function UnreviewedAtomChip({ atom }: { atom: Atom }) {
  if (atom.status === 'approved') return null;

  if (atom.sourceType === 'ai-draft') {
    return (
      <div
        role="note"
        aria-label="Unreviewed AI draft"
        className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
      >
        <span className="font-medium">AI-drafted, not yet reviewed.</span>{' '}
        <span className="text-amber-800/90 dark:text-amber-200/90">
          Treat as practice only — verify against your own sources before relying on the answer.
        </span>
      </div>
    );
  }

  if (atom.sourceType === 'doctor_seed') {
    return (
      <div
        role="note"
        aria-label="Pending clinician sign-off"
        className="rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-3 py-2 text-xs text-stone-700 dark:text-stone-300"
      >
        <span className="font-medium">Pending clinician sign-off.</span>{' '}
        <span className="text-stone-600 dark:text-stone-400">
          Hand-authored and cited from NICE/BNF — awaiting final review.
        </span>
      </div>
    );
  }

  // Fallback for any other source_type that isn't approved (past_paper draft etc.)
  return (
    <div
      role="note"
      aria-label="Unreviewed content"
      className="rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-3 py-2 text-xs text-stone-700 dark:text-stone-300"
    >
      <span className="font-medium">Pending review.</span>{' '}
      <span className="text-stone-600 dark:text-stone-400">
        See the cited source for verification.
      </span>
    </div>
  );
}
