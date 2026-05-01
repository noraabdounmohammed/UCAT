import { useMemo } from 'react';
import { Check, X, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Atom } from '@/atom/types';

interface MockReviewProps {
  atom: Atom;
  pick: { correct: boolean; choiceIndex: number } | undefined;
  onPrev?: () => void;
  onNext?: () => void;
  questionNumber: number;
  totalQuestions: number;
}

/**
 * Post-submit review of a single question. Shows the user's pick (if any),
 * the correct answer, and the explanation if available. Mirrors the
 * post-pick reveal in `<AtomRenderer />` but driven by the recorded `pick`
 * state from `useMockSession`.
 *
 * MockQuestion shuffles options per atom on first render (via useMemo on
 * atom.id). Re-mounting the same atom re-shuffles, so during review we
 * regenerate the same option list deterministically by sorting it the same
 * way — but actually the shuffle uses Math.random() which is non-deterministic.
 * For review we display the "correct answer" prominently and only highlight
 * the user's choice as text, sidestepping the order issue.
 */
export function MockReview({ atom, pick, onPrev, onNext, questionNumber, totalQuestions }: MockReviewProps) {
  // Build a stable display order: correct answer first, then distractors
  // alphabetised for predictable review.
  const allChoices = useMemo(() => {
    const list = [
      { text: atom.answer, isAnswer: true as const },
      ...atom.distractors.map((d) => ({ text: d, isAnswer: false as const })),
    ];
    return list;
  }, [atom.id, atom.answer, atom.distractors]);

  const userPickedText: string | null = (() => {
    if (!pick) return null;
    // We don't know the original shuffle order. We do know whether the pick
    // was correct (pick.correct), so we can derive the picked text:
    if (pick.correct) return atom.answer;
    // It was a distractor. We can't pinpoint which distractor without the
    // shuffle order — surface this honestly.
    return null;
  })();

  const isAnswered = !!pick;

  return (
    <div className="space-y-4">
      {/* Q header with prev/next */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!onPrev}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>
        <span className="text-xs text-stone-600 dark:text-stone-400 font-medium tabular-nums">
          Question {questionNumber} of {totalQuestions}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!onNext}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 sm:p-6 space-y-4">
        {/* Verdict badge */}
        <div className="flex items-center gap-2">
          {!isAnswered ? (
            <>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold">
                —
              </span>
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                Not answered
              </span>
            </>
          ) : pick.correct ? (
            <>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                You got this right
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white">
                <X className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                You got this wrong
              </span>
            </>
          )}
        </div>

        {/* Stem */}
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

        {/* Choice rendering — show all options with the correct one highlighted. */}
        <div className="space-y-2">
          {allChoices.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isCorrect = opt.isAnswer;
            return (
              <div
                key={i}
                className={[
                  'flex items-start gap-3 p-3 rounded-xl border-2',
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 opacity-70',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                    isCorrect
                      ? 'bg-emerald-500 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
                  ].join(' ')}
                >
                  {isCorrect ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : letter}
                </span>
                <span
                  className={[
                    'flex-1 text-sm leading-relaxed',
                    isCorrect
                      ? 'text-emerald-900 dark:text-emerald-100 font-medium'
                      : 'text-stone-700 dark:text-stone-300',
                  ].join(' ')}
                >
                  {opt.text}
                </span>
              </div>
            );
          })}
        </div>

        {!pick?.correct && userPickedText !== null && (
          <div className="text-xs text-stone-600 dark:text-stone-400">
            You picked: <span className="font-medium">{userPickedText}</span>
          </div>
        )}

        {/* Explanation */}
        {atom.explanation && (
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3 h-3 text-stone-500 dark:text-stone-400" />
              <span className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-medium">
                Why
              </span>
            </div>
            <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
              {atom.explanation}
            </p>
            {atom.explanationSource && (
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 italic">
                Paraphrased from {atom.explanationSource}
              </div>
            )}
          </div>
        )}

        <a
          href={atom.citationUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-stone-600 dark:text-stone-400 hover:underline inline-block"
        >
          Source: {atom.citationLabel} →
        </a>
      </div>
    </div>
  );
}
