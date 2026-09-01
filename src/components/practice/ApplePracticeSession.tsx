import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { QuestionRenderer } from './QuestionRenderer';
import { ModernFlashcard } from './ModernFlashcard';
import { UkmlaSBAQuestion } from './UkmlaSBAQuestion';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import './apple-question-styles.css';
import { QuestionData } from './questionTypes';
import { SessionReviewScreen } from './SessionReviewScreen';
import { SessionAnswer, SessionProgressDropdown } from './SessionProgressDropdown';

interface PracticeSessionProps {
  questions: QuestionData[];
  onComplete: () => void;
  onAnswerSubmit?: (questionId: string, isCorrect: boolean) => void;
  onAnotherFive?: (filter?: string) => void;
  availableFilters?: string[];
  activeFilter?: string | null;
  section?: string;
  defaultFormat?: 'flashcard' | 'sba' | 'ukmla_sba' | 'mindmap';
  currentFormat?: string;
  onChangeFormat?: (format: string) => void;
  onRestartWithFilters?: (filters?: any) => void;
}

const tutorTopic = (q?: QuestionData) => String((q as any)?.concept_title || q?.title || q?.topic || '').trim();

export function ApplePracticeSession({
  questions,
  onComplete,
  onAnswerSubmit,
  onAnotherFive,
  availableFilters = [],
  activeFilter = null,
  section,
  defaultFormat = 'ukmla_sba',
  currentFormat = 'ukmla_sba',
  onChangeFormat,
  onRestartWithFilters
}: PracticeSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<QuestionData[]>(questions);
  const [sessionKey, setSessionKey] = useState(0);
  const [reviewingQuestionIndex, setReviewingQuestionIndex] = useState<number | null>(null);
  const [showSessionIntro, setShowSessionIntro] = useState(true);

  const questionsRef = useRef<QuestionData[]>(questions);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveQuestions(questions);
    setShowSessionIntro(true);
  }, [questions]);

  useEffect(() => {
    if (activeQuestions && activeQuestions.length > 0) questionsRef.current = activeQuestions;
  }, [activeQuestions]);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  const introTopics = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    activeQuestions.forEach(q => {
      const topic = tutorTopic(q);
      if (topic && !seen.has(topic) && result.length < 3) {
        seen.add(topic);
        result.push(topic);
      }
    });
    return result;
  }, [activeQuestions]);

  const introDirection = useMemo(() => {
    if (introTopics.length === 0) return `I've got ${activeQuestions.length} question${activeQuestions.length === 1 ? '' : 's'} for us. I'll lead the session and slow down wherever your reasoning needs it.`;
    if (introTopics.length === 1) return `We'll stay around ${introTopics[0]} today. I'll vary the angle and slow down whenever a distinction isn't secure yet.`;
    return `We'll move through ${introTopics.join(', ')}${activeQuestions.length > introTopics.length ? ' and a little more' : ''}. I'll decide when to move on and when something deserves another look.`;
  }, [activeQuestions.length, introTopics]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const advanceNow = useCallback(() => {
    if (currentIndex < questionsRef.current.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo(0, 0);
    } else {
      setShowReview(true);
    }
  }, [currentIndex]);

  const handleNextQuestion = useCallback(() => {
    advanceNow();
  }, [advanceNow]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showSessionIntro) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const currentQuestion = questionsRef.current[currentIndex];
      const format = currentQuestion?.format || defaultFormat;
      const tutorLedSba = format === 'sba' || format === 'ukmla_sba';
      if (format === 'flashcard' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) return;

      switch (event.key) {
        case 'ArrowLeft':
        case 'h':
          if (!tutorLedSba) {
            event.preventDefault();
            handlePreviousQuestion();
          }
          break;
        case 'ArrowRight':
        case 'l':
          if (!tutorLedSba) {
            event.preventDefault();
            handleNextQuestion();
          }
          break;
        case 'Escape':
          event.preventDefault();
          setShowExitConfirmation(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, defaultFormat, handlePreviousQuestion, handleNextQuestion, showSessionIntro]);

  const currentQuestion = useMemo(() => questionsRef.current[currentIndex], [currentIndex]);
  const questionId = useMemo(() => currentQuestion?.id || `question-${currentIndex}`, [currentQuestion, currentIndex]);

  const questionContent = useMemo(() => {
    const q = currentQuestion;
    const questionText = q.question_stem || q.question || q.content || q.individual_question || '';
    const options = q.options.map((option, index) => {
      if (typeof option === 'string') return { id: String.fromCharCode(65 + index), text: option };
      return option;
    });

    let correctAnswer = q.correctAnswer || q.correct_answer || 'A';
    if (typeof correctAnswer === 'number') correctAnswer = String.fromCharCode(65 + correctAnswer);

    return {
      id: q.id,
      question: questionText,
      stem: questionText,
      options,
      correctAnswer,
      explanation: q.explanation || q.worked_solution || '',
      format: q.format || defaultFormat
    };
  }, [currentQuestion, defaultFormat]);

  const recordAnswer = (isCorrect: boolean, selectedOption?: string) => {
    const q = questionsRef.current[currentIndex];
    const topic = (q?.title || q?.topic || '') as string;
    setSessionAnswers(prev => {
      const without = prev.filter(a => a.questionIndex !== currentIndex);
      return [...without, { questionIndex: currentIndex, isCorrect, topic, selectedOption }];
    });
  };

  const handleRetryIncorrect = () => {
    const incorrectIndices = sessionAnswers.filter(a => !a.isCorrect).map(a => a.questionIndex);
    const incorrectQuestions = incorrectIndices.map(i => activeQuestions[i]).filter(Boolean);
    if (incorrectQuestions.length === 0) return;

    incorrectQuestions.forEach(q => {
      if (!q) return;
      const key = `sba_answer_${q.id || q.question?.substring(0, 50)}`;
      sessionStorage.removeItem(key);
    });

    setActiveQuestions(incorrectQuestions);
    questionsRef.current = incorrectQuestions;
    setSessionAnswers([]);
    setCurrentIndex(0);
    setShowReview(false);
    setShowSessionIntro(false);
    setSessionKey(k => k + 1);
    window.scrollTo(0, 0);
  };

  const handleExitConfirm = () => {
    setShowExitConfirmation(false);
    onComplete();
  };

  const handleExitCancel = () => setShowExitConfirmation(false);

  useEffect(() => {
    if (questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba') {
      const prevBodyBg = document.body.style.backgroundColor;
      const prevHtmlBg = (document.documentElement as HTMLElement).style.backgroundColor;
      document.body.style.backgroundColor = '#F4ECDF';
      (document.documentElement as HTMLElement).style.backgroundColor = '#F4ECDF';
      return () => {
        document.body.style.backgroundColor = prevBodyBg;
        (document.documentElement as HTMLElement).style.backgroundColor = prevHtmlBg;
      };
    }
  }, [questionContent.format]);

  const handleViewQuestion = useCallback((questionIndex: number) => {
    setReviewingQuestionIndex(questionIndex);
    setShowReview(false);
  }, []);

  const handleBackToReview = useCallback(() => {
    setReviewingQuestionIndex(null);
    setShowReview(true);
  }, []);

  if (showSessionIntro && activeQuestions.length > 0) {
    return (
      <main className="fixed inset-0 overflow-y-auto bg-[#F4ECDF] text-[#2A1E16]">
        <div className="mx-auto flex min-h-full w-full max-w-[620px] flex-col px-5 pb-10 pt-7 sm:px-8 sm:pt-10">
          <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#1F140C]">StudyEdit</div>
          <div className="flex flex-1 flex-col justify-center py-14 sm:py-20">
            <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A9675D]">I'll take it from here</div>
            <h1 className="max-w-[520px] text-[42px] font-light leading-[1.06] tracking-[-0.04em] text-[#1F140C] sm:text-[52px]" style={{ fontFamily: "'Fraunces', serif" }}>
              You just need to turn up.
            </h1>
            <p className="mt-6 max-w-[520px] text-[19px] font-medium leading-[1.65] text-[#3B2A1E] sm:text-[20px]">
              {introDirection}
            </p>
            <p className="mt-5 max-w-[500px] text-[15px] font-medium leading-6 text-[#8A7560]">
              Answer naturally. Tell me when you guessed. Ask me things. I'll handle the pacing, the follow-ups and what comes next.
            </p>
            <button
              type="button"
              onClick={() => setShowSessionIntro(false)}
              className="mt-9 flex w-full items-center justify-center rounded-full bg-[#1F140C] px-6 py-[18px] text-[16px] font-bold text-[#FAF5EC] sm:max-w-[360px]"
            >
              Take me through it →
            </button>
            <div className="mt-3 text-[12px] font-medium text-[#8A7560]">{activeQuestions.length} question{activeQuestions.length === 1 ? '' : 's'} · I'll decide when to slow down</div>
          </div>
        </div>
      </main>
    );
  }

  if (showReview) {
    return (
      <SessionReviewScreen
        answers={sessionAnswers}
        questions={activeQuestions}
        onRetryIncorrect={handleRetryIncorrect}
        onDone={onComplete}
        onAnotherFive={onAnotherFive}
        onViewQuestion={handleViewQuestion}
      />
    );
  }

  if (reviewingQuestionIndex !== null) {
    const reviewQuestion = activeQuestions[reviewingQuestionIndex];
    const reviewAnswer = sessionAnswers.find(a => a.questionIndex === reviewingQuestionIndex);
    const format = reviewQuestion.format || defaultFormat;

    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#F4ECDF]">
        <header className="sticky top-0 z-10 border-b border-[#E8DCC4] bg-[#F4ECDF]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
            <button onClick={handleBackToReview} className="flex items-center gap-2 text-[#8A7560] transition-colors hover:text-[#1F140C]">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Back to review</span>
            </button>
            <div className="flex-1" />
            <span className="text-xs text-[#8A7560]">Question {reviewingQuestionIndex + 1} of {activeQuestions.length}</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-6">
            {format === 'flashcard' ? (
              <ModernFlashcard key={`review-${reviewingQuestionIndex}`} question={reviewQuestion} onAnswer={() => {}} onNext={handleBackToReview} />
            ) : (
              <UkmlaSBAQuestion
                key={`review-${reviewingQuestionIndex}`}
                question={reviewQuestion}
                onAnswer={() => {}}
                onNext={handleBackToReview}
                currentIndex={reviewingQuestionIndex}
                totalQuestions={activeQuestions.length}
                preSelectedAnswer={reviewAnswer?.selectedOption}
                preSubmitted={true}
                nextButtonText="Back to review"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  const isSba = questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba';

  return (
    <div className={cn('flex h-screen flex-col overflow-hidden', isSba ? 'bg-[#F4ECDF]' : 'bg-gradient-to-br from-stone-50 to-stone-100/50')}>
      {!isSba && (
        <header className="sticky top-0 z-10 border-b border-white/30 bg-white/60 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <button onClick={() => setShowExitConfirmation(true)} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/5">
              <X className="h-5 w-5 text-zinc-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-black/[0.08] bg-white/60 px-3 py-1.5 backdrop-blur-xl">
                <span className="text-[15px] font-semibold text-zinc-900">{currentIndex + 1}</span>
                <span className="mx-1 text-[13px] text-zinc-500">of</span>
                <span className="text-[15px] font-medium text-zinc-600">{activeQuestions.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sessionAnswers.length > 0 && <SessionProgressDropdown answers={sessionAnswers} total={activeQuestions.length} currentIndex={currentIndex} isLightMode={true} />}
              <button onClick={handlePreviousQuestion} disabled={currentIndex === 0} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 disabled:text-zinc-300">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={handleNextQuestion} className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      <div className={isSba ? 'flex-1 overflow-y-auto' : 'flex-1 overflow-auto'} ref={containerRef}>
        <QuestionRenderer
          key={`${sessionKey}-${currentIndex}`}
          question={{
            ...currentQuestion,
            options: questionContent.options,
            correctAnswer: questionContent.correctAnswer,
            question: questionContent.question,
            explanation: questionContent.explanation
          }}
          format={questionContent.format}
          onAnswer={(isCorrect) => {
            recordAnswer(isCorrect);
            const status = isCorrect ? 'correct' : 'incorrect';
            const topic = currentQuestion.topic || 'Unknown Topic';
            const skill = Array.isArray(currentQuestion.tags) ? currentQuestion.tags[0] : 'Unknown Skill';
            const currentSection = section || 'Unknown Section';
            try {
              const progressKey = `question_progress_${questionId}`;
              const progressData = { status, topic: String(topic), skill: String(skill), section: String(currentSection), timestamp: new Date().toISOString() };
              localStorage.setItem(progressKey, JSON.stringify(progressData));
            } catch (error) {
              console.error('Failed to save progress:', error);
            }
            if (onAnswerSubmit) onAnswerSubmit(questionId, isCorrect);
          }}
          onNext={handleNextQuestion}
          onPrevious={handlePreviousQuestion}
          onExit={() => setShowExitConfirmation(true)}
          currentIndex={currentIndex}
          totalCards={activeQuestions.length}
          availableFilters={availableFilters}
          activeFilter={activeFilter}
          onFilterSelect={onAnotherFive}
          onChangeFormat={onChangeFormat}
          onRestartWithFilters={onRestartWithFilters}
        />
      </div>

      {showExitConfirmation && (
        <Dialog open={showExitConfirmation}>
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F140C]/20 p-4 pb-6 sm:items-center sm:p-6" onClick={handleExitCancel}>
            <div role="dialog" aria-modal="true" aria-labelledby="exit-practice-title" className="w-full max-w-[420px] rounded-[28px] border border-[#E8DCC4] bg-[#FFFDF8] px-6 pb-6 pt-7 shadow-[0_18px_55px_rgba(31,20,12,0.16)] sm:px-7 sm:pb-7 sm:pt-8" onClick={(event) => event.stopPropagation()}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A7560]">Pause here?</div>
              <h2 id="exit-practice-title" className="text-[30px] font-light leading-[1.08] tracking-[-0.03em] text-[#1F140C]" style={{ fontFamily: "'Fraunces', serif" }}>
                We can stop here.
              </h2>
              <p className="mt-3 text-[15px] font-medium leading-6 text-[#8A7560]">
                I've already kept what we learned from the questions you've answered. You won't lose the useful part of this session.
              </p>
              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row-reverse">
                <button onClick={handleExitConfirm} className="flex min-h-[52px] flex-1 items-center justify-center rounded-full bg-[#1F140C] px-5 text-[15px] font-semibold text-[#FAF5EC]">Stop for now</button>
                <button onClick={handleExitCancel} className="flex min-h-[52px] flex-1 items-center justify-center rounded-full border border-[#E8DCC4] bg-[#FAF5EC] px-5 text-[15px] font-semibold text-[#2A1E16]">Keep going</button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}