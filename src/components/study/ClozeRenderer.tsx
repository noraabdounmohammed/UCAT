import { useRef, useState } from 'react';
import type { Atom, ConfidenceValue, FsrsRatingValue } from '@/atom/types';
import { UnreviewedAtomChip } from './UnreviewedAtomChip';
import type { AtomRated } from './AtomRenderer';

/**
 * CLOZE / type-the-answer renderer.
 *
 * Recall-not-recognition variant of <AtomRenderer />. Shows the same stem
 * but no options — the user types the answer. Comparison is
 * case-insensitive substring (so 'beta blocker' matches 'Beta-blocker' or
 * 'beta-blockers' — punctuation/whitespace tolerant).
 *
 * Why: SBAs let students recognise the right answer from the four options.
 * Cloze forces them to retrieve it from memory — closer to actual practice
 * + UKMLA SAQ-style questions. Mixing cloze in 30% of /study sessions
 * doubles the cognitive lift without doubling the question bank.
 *
 * Same FSRS rating contract as <AtomRenderer />:
 *   correct → 3 (Good), wrong → 1 (Forgot), Easy override → 4
 */
export function ClozeRenderer({ atom, onRated }: { atom: Atom; onRated: (r: AtomRated) => void }) {
  const startedAt = useRef(performance.now());
  const [typed, setTyped] = useState('');
  const [submitted, setSubmitted] = useState<{ correct: boolean } | null>(null);

  const normalise = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;
    if (typed.trim().length === 0) return;
    const userN = normalise(typed);
    const answerN = normalise(atom.answer);
    // Match if user input contains the answer or vice-versa (covers minor
    // morphology like 'beta-blockers' vs 'beta-blocker').
    const correct = userN.length >= 2 && (userN.includes(answerN) || answerN.includes(userN));
    setSubmitted({ correct });
  };

  const advance = (override?: 'easy') => {
    if (!submitted) return;
    const responseMs = Math.round(performance.now() - startedAt.current);
    if (override === 'easy') {
      onRated({ rating: 4, confidence: 4, responseMs });
      return;
    }
    if (submitted.correct) {
      onRated({ rating: 3, confidence: 3, responseMs });
    } else {
      onRated({ rating: 1, confidence: 1, responseMs });
    }
  };

  return (
    <div className="space-y-4">
      <UnreviewedAtomChip atom={atom} />
      <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400">
        Type-the-answer
      </div>
      <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100">
        {atom.canonicalStem}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={!!submitted}
          placeholder="Type your answer…"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={[
            'w-full px-4 py-3 rounded-lg border text-sm bg-white dark:bg-stone-900',
            'text-stone-900 dark:text-stone-100 placeholder-stone-400',
            'focus:outline-none focus:ring-2 focus:ring-stone-500',
            submitted?.correct
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
              : submitted && !submitted.correct
                ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                : 'border-stone-300 dark:border-stone-700',
          ].join(' ')}
          aria-label="Your answer"
        />
        {!submitted && (
          <button
            type="submit"
            disabled={typed.trim().length === 0}
            className="w-full px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50"
          >
            Submit
          </button>
        )}
      </form>

      {submitted && (
        <div className="space-y-3 pt-1">
          <div className="rounded-lg bg-stone-50 dark:bg-stone-900 p-3 border border-stone-200 dark:border-stone-800">
            <div className="text-xs uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">
              {submitted.correct ? 'Correct' : 'Not quite'}
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
            {submitted.correct && (
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
