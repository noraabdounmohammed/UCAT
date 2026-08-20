import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Settings2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PracticeFilterModalParchment as PracticeFilterModal } from './PracticeFilterModalParchment';
import type { FilterState } from './PracticeFilterModalParchment';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';
import { AIHelper } from './AIHelperClean';

interface UkmlaSBAQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalQuestions?: number;
  title?: string;
  sessionAnswers?: SessionAnswer[];
  onJumpTo?: (index: number) => void;
  availableFilters?: string[];
  activeFilter?: string | null;
  onFilterSelect?: (filter?: string) => void;
  currentFormat?: string;
  onChangeFormat?: (format: string) => void;
  onRestartWithFilters?: (filters?: FilterState) => void;
  preSelectedAnswer?: string;
  preSubmitted?: boolean;
  nextButtonText?: string;
}

const C = {
  parchment: '#F4ECDF',
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  blush: '#E5A89D',
  blushSoft: '#F9E4DF',
  sage: '#8FA379',
  sageSoft: '#E2EAD6',
};

function sanitiseExplanation(text: string): string {
  return text
    .replace(/[Tt]he content explicitly states? that ['\"]/g, '')
    .replace(/['\"]\s*\.\s*(?=Option|The correct)/g, '. ')
    .replace(/[Tt]he content (explicitly )?(states?|says?|mentions?|indicates?|notes?)[^.]*\.\s*/g, '')
    .replace(/[Bb]ased on (the )?(concept |provided )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Aa]ccording to (the )?(concept |provided )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Aa]s (stated|mentioned|described|provided|outlined|given) in (the )?(concept |provided )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Ff]rom (the )?(concept )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Aa]s per (the )?(concept )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Bb]ased on (the )?(provided|given) (information|material|concept)[^,.]*[,.]?\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function firstUsefulSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const match = clean.match(/^(.+?[.!?])(?:\s|$)/);
  return match?.[1] || clean;
}

export const UkmlaSBAQuestion: React.FC<UkmlaSBAQuestionProps> = ({
  question,
  onAnswer,
  onNext,
  onExit,
  currentIndex = 0,
  totalQuestions = 0,
  onRestartWithFilters,
  preSelectedAnswer,
  preSubmitted = false,
  nextButtonText,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(preSelectedAnswer || null);
  const [hasSubmitted, setHasSubmitted] = useState(preSubmitted);
  const [showFullExplanation, setShowFullExplanation] = useState(preSubmitted);
  const [showAllDistractors, setShowAllDistractors] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const getStorageKey = () => `sba_answer_${question.id || question.question?.substring(0, 50)}`;

  useEffect(() => {
    if (preSubmitted) {
      setSelectedOption(preSelectedAnswer || null);
      setHasSubmitted(true);
      setShowFullExplanation(true);
      setShowAllDistractors(false);
      setShowAIHelper(false);
      return;
    }

    const savedState = sessionStorage.getItem(getStorageKey());
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setSelectedOption(parsed.selectedOption || null);
        setHasSubmitted(Boolean(parsed.hasSubmitted));
      } catch {
        setSelectedOption(null);
        setHasSubmitted(false);
      }
    } else {
      setSelectedOption(null);
      setHasSubmitted(false);
    }
    setShowFullExplanation(false);
    setShowAllDistractors(false);
    setShowAIHelper(false);
  }, [question.id, question.question, question.question_stem, preSubmitted, preSelectedAnswer]);

  const options = useMemo(() => (question.options || []).map((option: any, index: number) => {
    if (typeof option === 'string') return { id: String.fromCharCode(65 + index), text: option };
    return option;
  }), [question.options]);

  const rawCorrectAnswer = question.correctAnswer ?? question.correct_answer ?? 'A';
  const correctAnswerId = typeof rawCorrectAnswer === 'number'
    ? String.fromCharCode(65 + rawCorrectAnswer)
    : String(rawCorrectAnswer);

  const questionContent = question.question_stem || question.question || '';
  const askLine = (question as any).question_text || (question as any).stem_question || '';
  const explanation = sanitiseExplanation(question.explanation || question.worked_solution || '');
  const keyFact = sanitiseExplanation((question as any).key_fact || '');
  const conceptTitle = (question as any).concept_title || question.title || (question as any).topic || 'Clinical concept';
  const distractors = ((question as any).distractorExplanations || {}) as Record<string, string>;
  const selectedDistractor = selectedOption && selectedOption !== correctAnswerId ? distractors[selectedOption] : '';
  const selectedOptionText = options.find((option: any) => option.id === selectedOption)?.text || '';
  const correctOptionText = options.find((option: any) => option.id === correctAnswerId)?.text || '';
  const isCorrect = hasSubmitted && selectedOption === correctAnswerId;
  const takeaway = keyFact || firstUsefulSentence(explanation);

  const handleOptionSelect = (optionId: string) => {
    if (hasSubmitted) return;
    const correct = optionId === correctAnswerId;
    setSelectedOption(optionId);
    setHasSubmitted(true);
    sessionStorage.setItem(getStorageKey(), JSON.stringify({ selectedOption: optionId, hasSubmitted: true }));
    onAnswer(correct);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: C.parchment, color: C.ink }}>
      <header className="flex shrink-0 items-center justify-between border-b px-5 py-4" style={{ borderColor: C.line, backgroundColor: C.cream }}>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: C.espresso }}>
            Question {currentIndex + 1}{totalQuestions ? ` of ${totalQuestions}` : ''}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.muted }}>UKMLA AKT</div>
        </div>
        <div className="flex items-center gap-1">
          {onRestartWithFilters && (
            <button onClick={() => setShowConfigPanel(true)} className="rounded-full p-2.5" style={{ color: C.muted }} aria-label="Configure practice">
              <Settings2 className="h-[18px] w-[18px]" />
            </button>
          )}
          {onExit && (
            <button onClick={onExit} className="rounded-full p-2.5" style={{ color: C.muted }} aria-label="Exit practice">
              <X className="h-[19px] w-[19px]" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-[620px] px-5 pb-10 pt-7 sm:px-8 sm:pt-10">
          <section aria-label="Question">
            <div className="text-[21px] font-semibold leading-[1.68] tracking-[-0.01em] sm:text-[22px]" style={{ color: C.espresso, fontFamily: "Inter, sans-serif" }}>
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-5 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                }}
              >{questionContent}</ReactMarkdown>
            </div>

            {askLine && (
              <div className="mt-7 border-t pt-6 text-[19px] font-bold leading-[1.5] sm:text-[20px]" style={{ borderColor: C.line, color: C.espresso }}>
                {askLine}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {options.map((option: { id: string; text: string }) => {
                const selected = selectedOption === option.id;
                const correct = option.id === correctAnswerId;
                const wrongSelected = hasSubmitted && selected && !correct;
                const correctAfterSubmit = hasSubmitted && correct;
                const mutedAfterSubmit = hasSubmitted && !selected && !correct;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleOptionSelect(option.id)}
                    disabled={hasSubmitted}
                    className="flex w-full items-center gap-4 rounded-[16px] border px-4 py-4 text-left transition sm:px-5 sm:py-[18px]"
                    style={{
                      backgroundColor: correctAfterSubmit ? C.sageSoft : wrongSelected ? C.blushSoft : C.paper,
                      borderColor: correctAfterSubmit ? C.sage : wrongSelected ? C.blush : C.line,
                      opacity: mutedAfterSubmit ? 0.52 : 1,
                    }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
                      style={{
                        backgroundColor: correctAfterSubmit ? 'rgba(143,163,121,.22)' : wrongSelected ? 'rgba(229,168,157,.25)' : 'rgba(31,20,12,.06)',
                        color: C.espresso,
                      }}
                    >{option.id}</span>
                    <span className="flex-1 text-[17px] font-semibold leading-[1.45] sm:text-[18px]" style={{ color: C.espresso }}>{option.text}</span>
                    {correctAfterSubmit && <span className="font-bold" style={{ color: '#62734F' }}>✓</span>}
                    {wrongSelected && <span className="font-bold" style={{ color: '#9B5146' }}>×</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {hasSubmitted && (
            <section className="mt-8 border-t pt-7" style={{ borderColor: C.line }} aria-label="Answer feedback">
              <div className="flex items-center gap-2.5 text-[15px] font-bold" style={{ color: isCorrect ? '#62734F' : '#94483D' }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: isCorrect ? C.sage : C.blush }}>
                  {isCorrect ? '✓' : '×'}
                </span>
                {isCorrect ? 'Correct' : 'Not quite'}
              </div>

              {!isCorrect && (
                <div className="mt-4 text-[16px] font-semibold leading-6" style={{ color: C.espresso }}>
                  Correct answer: <strong>{correctAnswerId} — {correctOptionText}</strong>
                </div>
              )}

              {takeaway && (
                <div className="mt-6 rounded-[20px] border p-5 sm:p-6" style={{ backgroundColor: C.blushSoft, borderColor: '#F0D2CA' }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#A9675D' }}>Key point</div>
                  <div className="mt-3 text-[21px] font-bold leading-[1.45] tracking-[-0.015em] sm:text-[23px]" style={{ color: C.espresso }}>
                    <ReactMarkdown components={{ p: ({ children }) => <>{children}</>, strong: ({ children }) => <strong>{children}</strong> }}>{takeaway}</ReactMarkdown>
                  </div>
                </div>
              )}

              {explanation && (
                <div className="mt-6">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.muted }}>Why</div>
                  <div className="mt-2 text-[17px] font-semibold leading-[1.65]" style={{ color: '#3B2A1E' }}>
                    {firstUsefulSentence(explanation)}
                  </div>
                </div>
              )}

              {!isCorrect && selectedOption && (
                <div className="mt-6 rounded-[17px] border p-4 sm:p-5" style={{ backgroundColor: C.paper, borderColor: C.line }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.muted }}>You chose {selectedOption}</div>
                  <div className="mt-2 text-[16px] font-bold leading-6" style={{ color: C.espresso }}>{selectedOptionText}</div>
                  <p className="mt-2 text-[15px] font-medium leading-6" style={{ color: '#59483B' }}>
                    {selectedDistractor || 'This option does not fit the decisive clinical clues as well as the correct answer.'}
                  </p>
                </div>
              )}

              {Object.keys(distractors).length > 0 && (
                <div className="mt-5 border-t pt-4" style={{ borderColor: C.line }}>
                  <button type="button" onClick={() => setShowAllDistractors(value => !value)} className="flex w-full items-center justify-between py-2 text-left text-[14px] font-semibold" style={{ color: C.muted }}>
                    <span>{showAllDistractors ? 'Hide other options' : 'Why the other options are wrong'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAllDistractors ? 'rotate-180' : ''}`} />
                  </button>
                  {showAllDistractors && (
                    <div className="mt-2 divide-y" style={{ borderColor: C.line }}>
                      {Object.entries(distractors).filter(([letter]) => letter !== correctAnswerId).map(([letter, text]) => (
                        <div key={letter} className="grid grid-cols-[26px_1fr] gap-3 py-3 text-[15px] font-medium leading-6" style={{ color: '#59483B', borderColor: C.line }}>
                          <strong style={{ color: C.espresso }}>{letter}.</strong><span>{text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {explanation && explanation !== firstUsefulSentence(explanation) && (
                <div className="mt-2 border-t pt-4" style={{ borderColor: C.line }}>
                  <button type="button" onClick={() => setShowFullExplanation(value => !value)} className="flex w-full items-center justify-between py-2 text-left text-[14px] font-semibold" style={{ color: C.muted }}>
                    <span>{showFullExplanation ? 'Hide full reasoning' : 'Show full reasoning'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showFullExplanation ? 'rotate-180' : ''}`} />
                  </button>
                  {showFullExplanation && (
                    <div className="mt-2 text-[16px] font-medium leading-[1.7]" style={{ color: '#4C3A2E' }}>
                      <ReactMarkdown components={{ p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p> }}>{explanation}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 border-t pt-5" style={{ borderColor: C.line }}>
                <button type="button" onClick={() => setShowAIHelper(value => !value)} className="flex w-full items-center justify-between rounded-[16px] border px-4 py-4 text-left" style={{ backgroundColor: C.paper, borderColor: C.line }}>
                  <div>
                    <div className="text-[15px] font-bold" style={{ color: C.espresso }}>Still unsure? Ask StudyEdit</div>
                    <div className="mt-1 text-[12px]" style={{ color: C.muted }}>Get help with this exact question.</div>
                  </div>
                  <span className="text-lg" style={{ color: C.muted }}>›</span>
                </button>

                {showAIHelper && (
                  <div className="mt-3 overflow-hidden rounded-[18px] border" style={{ backgroundColor: C.paper, borderColor: C.line, minHeight: 320 }}>
                    <AIHelper
                      question={question}
                      correctAnswer={correctAnswerId}
                      selectedAnswer={selectedOption || ''}
                      explanation={explanation}
                      integrated={true}
                      lightMode={true}
                      parchment={true}
                    />
                  </div>
                )}
              </div>

              <div className="mt-7">
                <button type="button" onClick={onNext} className="flex w-full items-center justify-center rounded-full px-6 py-[18px] text-[16px] font-bold" style={{ backgroundColor: C.espresso, color: C.cream }}>
                  {nextButtonText || 'Next question'} →
                </button>
                <div className="mt-3 text-center text-[12px]" style={{ color: C.muted }}>
                  {conceptTitle}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {showConfigPanel && (
        <PracticeFilterModal
          isOpen={showConfigPanel}
          onClose={() => setShowConfigPanel(false)}
          onApplyFilters={(filters) => {
            onRestartWithFilters?.(filters);
            setShowConfigPanel(false);
          }}
        />
      )}
    </div>
  );
};
