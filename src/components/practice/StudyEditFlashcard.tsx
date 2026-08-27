import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { QuestionData } from './questionTypes';

interface StudyEditFlashcardProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalCards?: number;
}

const C = {
  parchment: '#FAF5EC',
  paper: '#FFFDF8',
  cream: '#F4ECDF',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  blush: '#E5A89D',
  blushSoft: '#FBEDE7',
  sage: '#8FA379',
  sageSoft: '#EEF2E8',
};

const cleanMarkdown = (value: string) => value
  .replace(/\*\*\s*\*\*/g, '')
  .replace(/([^\n])\s+[•]\s+/g, '$1\n- ')
  .trim();

export const StudyEditFlashcard: React.FC<StudyEditFlashcardProps> = ({
  question,
  onAnswer,
  onNext,
  onPrevious,
  onExit,
  currentIndex = 0,
  totalCards = 0,
}) => {
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setRated(false);
  }, [question.id]);

  const front = useMemo(
    () => String(question.question_stem || question.question || question.content || 'Recall this concept.'),
    [question],
  );
  const back = useMemo(
    () => cleanMarkdown(String(question.explanation || question.worked_solution || 'Review the key fact for this concept.')),
    [question],
  );
  const conceptTitle = String(question.concept_title || question.title || '').trim();
  const progress = totalCards ? Math.min(100, ((currentIndex + 1) / totalCards) * 100) : 0;

  const rate = (known: boolean) => {
    if (!revealed || rated) return;
    setRated(true);
    onAnswer(known);
    window.setTimeout(onNext, 180);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: C.parchment, color: C.ink }}>
      <header className="shrink-0 px-5 pb-2 pt-5 sm:px-8 sm:pt-7">
        <div className="mx-auto flex w-full max-w-[620px] items-center justify-between gap-4">
          <div>
            <div className="text-[13px] font-semibold" style={{ color: C.muted }}>
              Flashcard {currentIndex + 1}{totalCards ? ` of ${totalCards}` : ''}
            </div>
            {conceptTitle && (
              <div className="mt-1 max-w-[230px] truncate text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: C.muted }}>
                {conceptTitle}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onPrevious && (
              <button
                type="button"
                onClick={onPrevious}
                disabled={currentIndex === 0}
                className="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-[0.96] disabled:opacity-25"
                style={{ color: C.muted }}
                aria-label="Previous flashcard"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-[0.96]"
              style={{ color: C.muted }}
              aria-label="Next flashcard"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/[0.04] active:scale-[0.96]"
                style={{ color: C.muted }}
                aria-label="Exit practice"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <div className="mx-auto mt-3 h-[3px] w-full max-w-[620px] overflow-hidden rounded-full" style={{ backgroundColor: C.line }}>
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${progress}%`, backgroundColor: C.blush }} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto flex min-h-full w-full max-w-[620px] flex-col px-5 pb-8 pt-5 sm:px-8 sm:pt-8">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.muted }}>
            {revealed ? 'Answer' : 'Active recall'}
          </div>

          <section
            className="flex min-h-[390px] flex-1 flex-col rounded-[28px] border px-6 py-8 shadow-[0_16px_45px_rgba(31,20,12,0.07)] sm:min-h-[430px] sm:px-9 sm:py-10"
            style={{ backgroundColor: C.paper, borderColor: C.line }}
            aria-live="polite"
          >
            {!revealed ? (
              <div className="flex flex-1 flex-col">
                <div className="flex flex-1 items-center justify-center">
                  <div className="max-w-[500px] text-center text-[24px] font-semibold leading-[1.5] tracking-[-0.02em] sm:text-[28px]" style={{ color: C.espresso }}>
                    <ReactMarkdown components={{ p: ({ children }) => <>{children}</>, strong: ({ children }) => <strong className="font-bold">{children}</strong> }}>
                      {front}
                    </ReactMarkdown>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="mt-8 flex w-full items-center justify-center rounded-full px-6 py-[17px] text-[16px] font-bold transition active:scale-[0.99]"
                  style={{ backgroundColor: C.espresso, color: C.parchment }}
                >
                  Reveal answer
                </button>
                <div className="mt-3 text-center text-[12px] leading-5" style={{ color: C.muted }}>
                  Try to say it from memory before you reveal it.
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col">
                <div className="border-b pb-6 text-[17px] font-semibold leading-[1.55]" style={{ borderColor: C.line, color: C.muted }}>
                  <ReactMarkdown components={{ p: ({ children }) => <>{children}</> }}>{front}</ReactMarkdown>
                </div>

                <div className="flex-1 py-8 text-[20px] font-semibold leading-[1.65] sm:text-[21px]" style={{ color: C.espresso }}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="my-3 space-y-2 pl-5">{children}</ul>,
                      ol: ({ children }) => <ol className="my-3 space-y-2 pl-5">{children}</ol>,
                      li: ({ children }) => <li className="list-disc pl-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-extrabold">{children}</strong>,
                    }}
                  >
                    {back}
                  </ReactMarkdown>
                </div>

                <div className="border-t pt-6" style={{ borderColor: C.line }}>
                  <div className="mb-3 text-center text-[13px] font-semibold" style={{ color: C.muted }}>
                    Did you know it before revealing?
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => rate(false)}
                      disabled={rated}
                      className="flex min-h-[54px] items-center justify-center gap-2 rounded-full border px-4 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-50"
                      style={{ backgroundColor: C.blushSoft, borderColor: C.blush, color: C.espresso }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Again
                    </button>
                    <button
                      type="button"
                      onClick={() => rate(true)}
                      disabled={rated}
                      className="flex min-h-[54px] items-center justify-center rounded-full border px-4 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-50"
                      style={{ backgroundColor: C.sageSoft, borderColor: C.sage, color: C.espresso }}
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};
