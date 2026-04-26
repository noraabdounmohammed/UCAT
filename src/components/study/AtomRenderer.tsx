import { useMemo, useRef, useState } from 'react';
import type { Atom, ConfidenceValue, FsrsRatingValue } from '@/atom/types';
import { UnreviewedAtomChip } from './UnreviewedAtomChip';

export interface AtomRated {
  rating: FsrsRatingValue;
  confidence: ConfidenceValue;
  responseMs: number;
}

/**
 * Multiple-choice study card.
 *
 * Flow:
 *   1. Show stem (+ optional image) and 4 shuffled options.
 *   2. User clicks an option → reveal correct answer with green/red feedback,
 *      show citation, and offer "Next" + an optional "I knew that easily"
 *      override.
 *   3. "Next" auto-rates FSRS:
 *        - correct  → rating 3 (Good), confidence 3
 *        - wrong    → rating 1 (Forgot), confidence 1
 *      "Easy" lets confident learners skip ahead with rating 4 (Easy).
 *
 * The previous flow asked for confidence BEFORE revealing the answer with no
 * way to actually pick from the 4 options — users found it confusing
 * ("Guessed/Unsure/Confident/Certain looks like answer choices"). This
 * redesign uses the same option-pick pattern as `<MockQuestion>` so the
 * mental model is consistent across study + mock.
 */
export function AtomRenderer({ atom, onRated }: { atom: Atom; onRated: (r: AtomRated) => void }) {
  const startedAt = useRef(performance.now());
  const [picked, setPicked] = useState<{ index: number; correct: boolean } | null>(null);

  // Stable shuffle per atom — same pattern as MockQuestion so the mental
  // model is consistent across surfaces.
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

  // EMQ atoms get a small "Extended matching" banner so the user knows
  // why there are 9–12 options instead of the usual 4. Theme hint pulled
  // from topic_path[1] which is set to "EMQ: <theme>" by the generator.
  const isEmq = atom.questionKind === 'emq';
  const emqTheme = isEmq ? atom.topicPath?.[1]?.replace(/^EMQ:\s*/, '') ?? null : null;

  return (
    <div className="space-y-4">
      <UnreviewedAtomChip atom={atom} />
      {isEmq && (
        <div
          className="rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-xs text-stone-700 dark:text-stone-300"
          role="note"
        >
          <span className="uppercase tracking-widest text-[10px] text-stone-500 dark:text-stone-400 mr-2">
            Extended matching
          </span>
          {emqTheme && <span className="font-medium">{emqTheme}</span>}
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Pick the single best answer from the {options.length} options below.
          </div>
        </div>
      )}
      <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100">
        {atom.canonicalStem}
      </h2>
      {atom.imageUrl && (
        <img
          src={atom.imageUrl}
          alt={atom.imageAlt ?? ''}
          className="rounded-lg max-h-64 mx-auto"
        />
      )}

      {/* Option list — 4 shuffled, post-pick shows green/red feedback. */}
      <div className="space-y-2" role="group" aria-label="Answer options">
        {options.map((opt, i) => {
          const isPicked = picked?.index === i;
          const showAsCorrect = picked && opt.isAnswer;
          const showAsWrong = picked && isPicked && !opt.isAnswer;

          return (
            <button
              key={i}
              type="button"
              disabled={!!picked}
              onClick={() => handlePick(i)}
              className={[
                'block w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                showAsCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100'
                  : showAsWrong
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100'
                    : 'border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800',
                picked && !showAsCorrect && !showAsWrong ? 'opacity-50' : '',
              ].join(' ')}
              aria-pressed={isPicked || undefined}
            >
              <span className="inline-block w-5 mr-2 font-medium">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>

      {/* Post-pick: answer + explanation + citation + Next / Easy. */}
      {picked && (
        <div className="space-y-3 pt-1">
          <div className="rounded-lg bg-stone-50 dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-800">
            <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">
              {picked.correct ? 'Correct' : 'Not quite'}
            </div>
            <div className="font-medium text-stone-900 dark:text-stone-100">
              {atom.answer}
            </div>
            {atom.explanation && (
              <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800">
                <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">
                  Why
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
              className="text-xs text-stone-600 dark:text-stone-400 hover:underline mt-2 inline-block"
            >
              Source: {atom.citationLabel} →
            </a>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => advance()}
              className="flex-1 px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200"
            >
              Next question
            </button>
            {picked.correct && (
              <button
                type="button"
                onClick={() => advance('easy')}
                className="px-4 py-3 rounded-full border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
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
