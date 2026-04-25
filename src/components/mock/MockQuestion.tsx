import { useMemo, useState } from 'react';
import type { Atom } from '@/atom/types';

export interface MockQuestionProps {
  atom: Atom;
  onSubmit: (a: { correct: boolean; choiceIndex: number }) => void;
}

export function MockQuestion({ atom, onSubmit }: MockQuestionProps) {
  const [submitted, setSubmitted] = useState(false);

  // Build a stable shuffled option list per atom, with answer at a random index
  const options = useMemo(() => {
    const all = [
      { text: atom.answer, isAnswer: true },
      ...atom.distractors.map(d => ({ text: d, isAnswer: false })),
    ];
    return [...all].sort(() => Math.random() - 0.5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atom.id]);

  const handleClick = (i: number) => {
    if (submitted) return;
    setSubmitted(true);
    onSubmit({ correct: options[i].isAnswer, choiceIndex: i });
  };

  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-base font-medium text-stone-900">{atom.canonicalStem}</h2>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            disabled={submitted}
            onClick={() => handleClick(i)}
            className="block w-full text-left px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-50 text-sm"
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
