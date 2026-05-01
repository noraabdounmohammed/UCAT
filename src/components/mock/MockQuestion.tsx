import { useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { Atom } from '@/atom/types';
import { UnreviewedAtomChip } from '@/components/study/UnreviewedAtomChip';

export interface MockQuestionProps {
  atom: Atom;
  onSubmit: (a: { correct: boolean; choiceIndex: number }) => void;
  /** Optional flag-for-review state — controlled by parent so the flag survives navigation. */
  flagged?: boolean;
  onFlagToggle?: () => void;
  /**
   * If the user has already picked an answer for this question (e.g. when
   * navigating back to it), show that pick highlighted but don't reveal
   * correctness — real exam allows revising up until submit.
   */
  showPick?: { correct: boolean; choiceIndex: number };
}

/**
 * Mock-exam single-best-answer card.
 *
 * Mirrors `<AtomRenderer />` structure (letter chips, lettered options) so
 * the mental model is identical between /study and /mock. Differences:
 *
 *   - NO mid-exam reveal — real UKMLA AKT does not show right/wrong until
 *     the paper is submitted. We just lock the choice and advance.
 *   - Optional flag-for-review — a small bookmark in the top-right that
 *     callers can hook to a per-question flag set, surfaced in the result
 *     screen as "items you flagged".
 */
export function MockQuestion({ atom, onSubmit, flagged, onFlagToggle, showPick }: MockQuestionProps) {
  const options = useMemo(() => {
    const all = [
      { text: atom.answer, isAnswer: true },
      ...atom.distractors.map((d) => ({ text: d, isAnswer: false })),
    ];
    return [...all].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atom.id]);

  const handleClick = (i: number) => {
    onSubmit({ correct: options[i].isAnswer, choiceIndex: i });
  };

  // If the user has already picked, find the choice index in OUR shuffle.
  // The choiceIndex stored in `showPick` was relative to the previous shuffle
  // — since we use stable shuffle per atom.id (useMemo), it should still match.
  const pickedIndex = showPick?.choiceIndex;

  return (
    <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 sm:p-6 max-w-md mx-auto space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <UnreviewedAtomChip atom={atom} />
        {onFlagToggle && (
          <button
            type="button"
            onClick={onFlagToggle}
            className={[
              'flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              flagged
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800',
            ].join(' ')}
            title={flagged ? 'Unflag this question' : 'Flag for review'}
          >
            {flagged ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{flagged ? 'Flagged' : 'Flag'}</span>
          </button>
        )}
      </div>

      <h2 className="text-base sm:text-lg leading-snug font-medium text-stone-900 dark:text-stone-100">
        {atom.canonicalStem}
      </h2>

      {atom.imageUrl && (
        <img
          src={atom.imageUrl}
          alt={atom.imageAlt ?? ''}
          className="rounded-xl max-h-72 mx-auto border border-stone-200 dark:border-stone-800"
        />
      )}

      <div className="space-y-2.5" role="group" aria-label="Answer options">
        {options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isPicked = pickedIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(i)}
              className={[
                'group flex items-start gap-3 w-full text-left p-3.5 rounded-xl border-2 transition-colors',
                isPicked
                  ? 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-800 ring-2 ring-stone-900/10 dark:ring-stone-100/10'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/50',
              ].join(' ')}
              aria-pressed={isPicked || undefined}
            >
              <span
                className={[
                  'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors',
                  isPicked
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 group-hover:bg-stone-200 dark:group-hover:bg-stone-700',
                ].join(' ')}
              >
                {letter}
              </span>
              <span
                className={[
                  'flex-1 text-sm leading-relaxed',
                  isPicked
                    ? 'text-stone-900 dark:text-stone-100 font-medium'
                    : 'text-stone-800 dark:text-stone-200',
                ].join(' ')}
              >
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
