import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, X, Sparkles, BookOpen } from 'lucide-react';
import type { Atom, ConfidenceValue, FsrsRatingValue } from '@/atom/types';
import { UnreviewedAtomChip } from './UnreviewedAtomChip';

export interface AtomRated {
  rating: FsrsRatingValue;
  confidence: ConfidenceValue;
  responseMs: number;
}

/**
 * Multiple-choice study card — modernised for student audience.
 *
 * Flow:
 *   1. Show stem (+ optional image) and 4 shuffled options as letter chips.
 *   2. User clicks an option → that option highlights with a subtle scale,
 *      then the correct answer reveals (green check) and any wrong pick
 *      gets a soft red ring + cross. Other options dim.
 *   3. Feedback card shows verdict, the answer, the "Why" explanation,
 *      and a citation link. Bottom action row: Next + optional "Easy".
 *
 * The previous flow worked but the styling was flat and corporate — student
 * users on the audience asked for less boring. This version uses bigger
 * letter chips, animated reveal, and softer typography.
 */
export function AtomRenderer({ atom, onRated }: { atom: Atom; onRated: (r: AtomRated) => void }) {
  const startedAt = useRef(performance.now());
  const [picked, setPicked] = useState<{ index: number; correct: boolean } | null>(null);

  // Stable shuffle per atom — same pattern as MockQuestion.
  const options = useMemo(() => {
    const all = [
      { text: atom.answer, isAnswer: true },
      ...atom.distractors.map((d) => ({ text: d, isAnswer: false })),
    ];
    return [...all].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atom.id]);

  const handlePick = (i: number) => {
    if (picked) return;
    setPicked({ index: i, correct: options[i].isAnswer });
  };

  const advance = (override?: 'easy') => {
    if (!picked) return;
    const responseMs = Math.round(performance.now() - startedAt.current);
    if (override === 'easy') {
      onRated({ rating: 4, confidence: 4, responseMs });
      return;
    }
    if (picked.correct) {
      onRated({ rating: 3, confidence: 3, responseMs });
    } else {
      onRated({ rating: 1, confidence: 1, responseMs });
    }
  };

  const isEmq = atom.questionKind === 'emq';
  const emqTheme = isEmq ? atom.topicPath?.[1]?.replace(/^EMQ:\s*/, '') ?? null : null;

  return (
    <div className="space-y-4">
      <UnreviewedAtomChip atom={atom} />

      {isEmq && (
        <div
          className="flex items-center gap-2 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950/30 border border-fuchsia-200 dark:border-fuchsia-900/40 px-3 py-2"
          role="note"
        >
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <span className="uppercase tracking-widest text-[10px] text-fuchsia-700 dark:text-fuchsia-300 font-semibold mr-1.5">
              EMQ
            </span>
            {emqTheme && (
              <span className="font-medium text-stone-900 dark:text-stone-100">{emqTheme}</span>
            )}
            <span className="text-stone-500 dark:text-stone-400 ml-1">
              · pick best of {options.length}
            </span>
          </div>
        </div>
      )}

      {/* Question stem — slightly larger, more breathable typography */}
      <h2 className="text-lg leading-snug font-medium text-stone-900 dark:text-stone-100">
        {atom.canonicalStem}
      </h2>

      {atom.imageUrl && (
        <img
          src={atom.imageUrl}
          alt={atom.imageAlt ?? ''}
          className="rounded-xl max-h-72 mx-auto border border-stone-200 dark:border-stone-800"
        />
      )}

      {/* Options — letter-chip style, animated state changes */}
      <div className="space-y-2.5" role="group" aria-label="Answer options">
        {options.map((opt, i) => {
          const isPicked = picked?.index === i;
          const showAsCorrect = picked && opt.isAnswer;
          const showAsWrong = picked && isPicked && !opt.isAnswer;
          const dimmed = picked && !showAsCorrect && !showAsWrong;
          const letter = String.fromCharCode(65 + i);

          return (
            <button
              key={i}
              type="button"
              disabled={!!picked}
              onClick={() => handlePick(i)}
              className={[
                'group flex items-start gap-3 w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200',
                showAsCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40 ring-4 ring-emerald-500/15'
                  : showAsWrong
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/40 ring-4 ring-red-500/15'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/50',
                dimmed ? 'opacity-40' : '',
              ].join(' ')}
              aria-pressed={isPicked || undefined}
            >
              {/* Letter chip */}
              <span
                className={[
                  'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors',
                  showAsCorrect
                    ? 'bg-emerald-500 text-white'
                    : showAsWrong
                      ? 'bg-red-500 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 group-hover:bg-stone-200 dark:group-hover:bg-stone-700',
                ].join(' ')}
              >
                {showAsCorrect ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : showAsWrong ? (
                  <X className="w-3.5 h-3.5" strokeWidth={3} />
                ) : (
                  letter
                )}
              </span>
              <span
                className={[
                  'flex-1 text-sm leading-relaxed',
                  showAsCorrect
                    ? 'text-emerald-900 dark:text-emerald-100 font-medium'
                    : showAsWrong
                      ? 'text-red-900 dark:text-red-100 font-medium'
                      : 'text-stone-800 dark:text-stone-200',
                ].join(' ')}
              >
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reveal card — verdict, answer, explanation, citation */}
      {picked && (
        <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className={[
              'rounded-2xl p-4 border-2 shadow-sm',
              picked.correct
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/50 dark:to-emerald-950/40 border-emerald-300 dark:border-emerald-700/60'
                : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/50 dark:to-red-950/40 border-red-300 dark:border-red-700/60',
            ].join(' ')}
          >
            <div className="flex items-center gap-2 mb-2">
              {picked.correct ? (
                <>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Nice — that's right
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white">
                    <X className="w-3.5 h-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                    Not this one
                  </span>
                </>
              )}
            </div>

            {!picked.correct && (
              <div className="text-sm text-stone-800 dark:text-stone-200 mb-2">
                Correct answer: <span className="font-semibold">{atom.answer}</span>
              </div>
            )}

            {atom.explanation && (
              <div className="mt-3 pt-3 border-t border-stone-200/70 dark:border-stone-800/70">
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
              className="text-xs text-stone-600 dark:text-stone-400 hover:underline mt-3 inline-block"
            >
              Source: {atom.citationLabel} →
            </a>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => advance()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
            >
              Next question
              <ArrowRight className="w-4 h-4" />
            </button>
            {picked.correct && (
              <button
                type="button"
                onClick={() => advance('easy')}
                className="px-4 py-3 rounded-full border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                title="I knew that easily — show me less often"
              >
                Easy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
