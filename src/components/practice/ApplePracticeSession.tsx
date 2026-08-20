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

  const questionsRef = useRef<QuestionData[]>(questions);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveQuestions(questions);
  }, [questions]);

  useEffect(() => {
    if (activeQuestions && activeQuestions.length > 0) {
      questionsRef.current = activeQuestions;
      if (process.env.NODE_ENV === 'development') {
        const mindMapCount = questions.filter(q => q.format === 'mindmap').length;
        if (mindMapCount > 0) {
          console.log('🗺️ ApplePracticeSession received mind map questions:', {
            total: questions.length,
            mindMaps: mindMapCount,
            firstQuestion: questions[0]
          });
        }
      }
    }
  }, [questions, activeQuestions]);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  const handlePreviousQuestion = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const handleNextQuestion = useCallback(() => {
    if (currentIndex < questionsRef.current.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo(0, 0);
    } else {
      setShowReview(true);
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const currentQuestion = questions[currentIndex];
      if (currentQuestion?.format === 'flashcard' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) return;

      switch (event.key) {
        case 'ArrowLeft':
        case 'h':
          event.preventDefault();
          handlePreviousQuestion();
          break;
        case 'ArrowRight':
        case 'l':
          event.preventDefault();
          handleNextQuestion();
          break;
        case 'Escape':
          event.preventDefault();
          setShowExitConfirmation(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions, handlePreviousQuestion, handleNextQuestion]);

  const currentQuestion = useMemo(() => questionsRef.current[currentIndex], [currentIndex]);
  const questionId = useMemo(() => currentQuestion?.id || `question-${currentIndex}`, [currentQuestion, currentIndex]);

  const questionContent = useMemo(() => {
    const q = currentQuestion;
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 ApplePracticeSession received question:', {
        id: q.id,
        question: q.question?.substring(0, 50) + '...',
        question_stem: q.question_stem?.substring(0, 50) + '...',
        question_stem_length: q.question_stem?.length,
        has_clinical_vignette: !!q.clinical_vignette,
        options_count: q.options?.length
      });
    }

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
      document.body.style.backgroundColor = '#0a0a0a';
      (document.documentElement as HTMLElement).style.backgroundColor = '#0a0a0a';
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
      <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900">
        <header className="sticky top-0 z-10 bg-black/20 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={handleBackToReview} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Review</span>
            </button>
            <div className="flex-1" />
            <span className="text-xs text-white/40">Question {reviewingQuestionIndex + 1} of {activeQuestions.length}</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">
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
                nextButtonText="Back to Review"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  const isSba = questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba';

  return (
    <div className={cn('flex flex-col h-screen overflow-hidden', isSba ? 'bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900' : 'bg-gradient-to-br from-stone-50 to-stone-100/50')}>
      {!isSba && (
        <header className="sticky top-0 z-10 bg-white/60 backdrop-blur-2xl border-b border-white/30">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setShowExitConfirmation(true)} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <X className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-lg border border-black/[0.08] dark:border-white/[0.08]">
                <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">{currentIndex + 1}</span>
                <span className="text-[13px] text-zinc-500 dark:text-zinc-400 mx-1">of</span>
                <span className="text-[15px] font-medium text-zinc-600 dark:text-zinc-400">{activeQuestions.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sessionAnswers.length > 0 && <SessionProgressDropdown answers={sessionAnswers} total={activeQuestions.length} currentIndex={currentIndex} isLightMode={true} />}
              <button onClick={handlePreviousQuestion} disabled={currentIndex === 0} className={`flex items-center justify-center w-8 h-8 rounded-full transition-all group ${currentIndex === 0 ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed' : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95'}`} title="Previous (← or H)">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={handleNextQuestion} className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 group" title="Next (→ or L)">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-2">
            <div className="h-1 bg-zinc-200/60 dark:bg-zinc-700/60 rounded-full overflow-hidden">
              <div className="h-full bg-[#007AFF] transition-all duration-300 ease-out rounded-full" style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }} />
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
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="exit-practice-title"
              className="w-full max-w-[420px] rounded-[28px] border border-[#E8DCC4] bg-[#FFFDF8] px-6 pb-6 pt-7 shadow-[0_18px_55px_rgba(31,20,12,0.16)] sm:px-7 sm:pb-7 sm:pt-8"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A7560]">Leave this session?</div>
              <h2 id="exit-practice-title" className="text-[30px] font-light leading-[1.08] tracking-[-0.03em] text-[#1F140C]" style={{ fontFamily: "'Fraunces', serif" }}>
                Stop here for now?
              </h2>
              <p className="mt-3 text-[15px] font-medium leading-6 text-[#8A7560]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Your answered questions are already saved. You can head home without losing today’s progress.
              </p>

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row-reverse">
                <button
                  onClick={handleExitConfirm}
                  className="flex min-h-[52px] flex-1 items-center justify-center rounded-full bg-[#1F140C] px-5 text-[15px] font-semibold text-[#FAF5EC] transition active:scale-[0.99]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Exit to Home
                </button>
                <button
                  onClick={handleExitCancel}
                  className="flex min-h-[52px] flex-1 items-center justify-center rounded-full border border-[#E8DCC4] bg-[#FAF5EC] px-5 text-[15px] font-semibold text-[#2A1E16] transition active:scale-[0.99]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Keep practising
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
