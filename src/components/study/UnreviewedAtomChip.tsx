import type { Atom } from '@/atom/types';

/**
 * Inline disclaimer chip shown above the stem of any atom whose status is
 * not `'approved'` — e.g. the `pending_review` + `ai-draft` rows that the
 * unreviewed-questions opt-in unlocks. Renders nothing for approved atoms.
 */
export function UnreviewedAtomChip({ atom }: { atom: Atom }) {
  if (atom.status === 'approved') return null;

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
