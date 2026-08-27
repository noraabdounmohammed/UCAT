import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { QuestionData } from './questionTypes';
import { ReportQuestionButton } from './ReportQuestionButton';
import { stripFlashcardFrontFormatting } from '@/services/flashcardQuality';

interface ModernFlashcardProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalCards?: number;
  title?: string;
  availableFilters?: string[];
  activeFilter?: string | null;
  onFilterSelect?: (filter?: string) => void;
  currentFormat?: string;
  onChangeFormat?: (format: string) => void;
  onRestartWithFilters?: () => void;
}

type RecallRating = 'again' | 'hard' | 'good' | 'easy';

const RATINGS: Array<{ id: RecallRating; label: string; key: string; isCorrect: boolean }> = [
  { id: 'again', label: 'Again', key: '1', isCorrect: false },
  { id: 'hard', label: 'Hard', key: '2', isCorrect: true },
  { id: 'good', label: 'Good', key: '3', isCorrect: true },
  { id: 'easy', label: 'Easy', key: '4', isCorrect: true },
];

export const ModernFlashcard: React.FC<ModernFlashcardProps> = ({
  question,
  onAnswer,
  onNext,
  onPrevious,
  onExit,
  currentIndex = 0,
  totalCards = 0,
  title = 'Flashcards',
}) => {
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const front = useMemo(
    () => stripFlashcardFrontFormatting(question.question_stem || question.question || ''),
    [question.question_stem, question.question],
  );
  const back = useMemo(() => String(question.explanation || '').trim(), [question.explanation]);
  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  useEffect(() => {
    setRevealed(false);
    setSubmitting(false);
  }, [question.id, question.question_stem, question.question]);

  const reveal = useCallback(() => {
    if (!submitting) setRevealed(true);
  }, [submitting]);

  const rate = useCallback((rating: RecallRating) => {
    if (!revealed || submitting) return;
    const selected = RATINGS.find(item => item.id === rating);
    if (!selected) return;

    setSubmitting(true);
    onAnswer(selected.isCorrect);
    window.setTimeout(() => onNext(), 120);
  }, [onAnswer, onNext, revealed, submitting]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
        reveal();
        return;
      }

      if (revealed && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault();
        const selected = RATINGS.find(item => item.key === event.key);
        if (selected) rate(selected.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, rate, reveal]);

  return (
    <main className="min-h-screen bg-[#FAF5EC] text-[#2A1E16]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6">
        <header className="flex items-center gap-3 py-2">
          <button
            type="button"
            onClick={onExit}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E8DCC4] bg-[#FFFDF8] text-[#6F5D4E] transition active:scale-[0.97]"
            aria-label="Leave flashcards"
          >
            <X className="h-[18px] w-[18px]" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A7560]">{title}</div>
            <div className="mt-0.5 text-sm font-medium tabular-nums text-[#2A1E16]">
              {totalCards > 0 ? `${currentIndex + 1} / ${totalCards}` : currentIndex + 1}
            </div>
          </div>

          <button
            type="button"
            onClick={onPrevious}
            disabled={currentIndex === 0 || !onPrevious}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E8DCC4] bg-[#FFFDF8] text-[#6F5D4E] transition enabled:active:scale-[0.97] disabled:opacity-30"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
        </header>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E8DCC4]" aria-hidden="true">
          <div className="h-full rounded-full bg-[#DDA097] transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>

        <section className="flex flex-1 flex-col justify-center py-6 sm:py-10">
          <button
            type="button"
            onClick={reveal}
            className="group flex min-h-[390px] w-full flex-col rounded-[30px] border border-[#E8DCC4] bg-[#FFFDF8] p-7 text-left shadow-[0_18px_50px_rgba(65,43,27,0.07)] transition active:scale-[0.997] sm:min-h-[430px] sm:p-10"
            aria-label={revealed ? 'Flashcard answer revealed' : 'Reveal flashcard answer'}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A18A75]">
              {revealed ? 'Answer' : 'Recall'}
            </div>

            {!revealed ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <h1
                  className="max-w-[620px] text-center text-[29px] font-light leading-[1.2] tracking-[-0.035em] text-[#261A12] sm:text-[38px]"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {front}
                </h1>
              </div>
            ) : (
              <div className="flex flex-1 flex-col justify-center py-6">
                <div className="mb-5 text-[13px] leading-5 text-[#8A7560]">{front}</div>
                <div className="border-t border-[#E8DCC4] pt-6 text-[18px] leading-8 text-[#2A1E16] sm:text-[20px]">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="ml-5 list-disc space-y-2">{children}</ul>,
                      ol: ({ children }) => <ol className="ml-5 list-decimal space-y-2">{children}</ol>,
                      strong: ({ children }) => <strong className="font-semibold text-[#1F140C]">{children}</strong>,
                    }}
                  >
                    {back || 'No answer available.'}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {!revealed && (
              <div className="text-center text-xs text-[#A18A75]">Tap to reveal · Space or Enter</div>
            )}
          </button>

          {!revealed ? (
            <button
              type="button"
              onClick={reveal}
              className="mt-4 min-h-12 w-full rounded-full bg-[#1F140C] px-5 py-3 text-sm font-medium text-white transition active:scale-[0.99]"
            >
              Show answer
            </button>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="How well did you remember this?">
              {RATINGS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => rate(item.id)}
                  className="min-h-14 rounded-2xl border border-[#DFD1BC] bg-[#FFFDF8] px-3 py-2 text-sm font-medium text-[#2A1E16] transition hover:bg-[#F7EFE3] active:scale-[0.98] disabled:opacity-50"
                >
                  <span>{item.label}</span>
                  <span className="ml-2 text-[10px] font-normal text-[#A18A75]">{item.key}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 px-1">
            <p className="text-[11px] leading-4 text-[#9B8570]">
              {revealed ? 'Rate the recall, then StudyEdit moves on.' : 'Try to answer before revealing.'}
            </p>
            <ReportQuestionButton question={question} />
          </div>
        </section>
      </div>
    </main>
  );
};
