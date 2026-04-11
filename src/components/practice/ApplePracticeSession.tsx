import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { QuestionRenderer } from './QuestionRenderer';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import './apple-question-styles.css';
import { QuestionData } from './questionTypes';
import { SessionReviewScreen } from './SessionReviewScreen';
import { SessionAnswer } from './SessionProgressDropdown';

interface PracticeSessionProps {
  questions: QuestionData[];
  onComplete: () => void;
  onAnswerSubmit?: (questionId: string, isCorrect: boolean) => void;
  section?: string;
  defaultFormat?: 'flashcard' | 'sba' | 'ukmla_sba' | 'mindmap' | 'custom';
}

export function ApplePracticeSession({
  questions,
  onComplete,
  onAnswerSubmit,
  section,
  defaultFormat = 'ukmla_sba'
}: PracticeSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);

  const questionsRef = useRef<QuestionData[]>(questions);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (questions && questions.length > 0) {
      questionsRef.current = questions;
      if (process.env.NODE_ENV === 'development') {
        const mindMapCount = questions.filter(q => q.format === 'mindmap').length;
        if (mindMapCount > 0) {
          console.log('🗺️ ApplePracticeSession received mind map questions:', {
            total: questions.length, mindMaps: mindMapCount, firstQuestion: questions[0]
          });
        }
      }
    }
  }, [questions]);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      // Use questionsRef.current to avoid stale closure issues
      const currentQuestion = questionsRef.current[currentIndex];
      const resolvedFormat = currentQuestion?.format || defaultFormat;
      if (process.env.NODE_ENV === 'development') {
        console.log('⌨️ Keyboard handler:', { key: event.key, format: currentQuestion?.format, resolvedFormat, isFlashcard: resolvedFormat === 'flashcard' });
      }
      if (resolvedFormat === 'flashcard' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === ' ')) return;
      switch (event.key) {
        case 'ArrowLeft': case 'h': event.preventDefault(); handlePreviousQuestion(); break;
        case 'ArrowRight': case 'l': event.preventDefault(); handleNextQuestion(); break;
        case 'Escape': event.preventDefault(); setShowExitConfirmation(true); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, defaultFormat]);

  const currentQuestion = useMemo(() => questionsRef.current[currentIndex], [currentIndex]);
  const questionId = useMemo(() => currentQuestion?.id || `question-${currentIndex}`, [currentQuestion, currentIndex]);

  const questionContent = useMemo(() => {
    const q = currentQuestion;
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 ApplePracticeSession received question:', {
        id: q.id, question: q.question?.substring(0, 50) + '...',
        question_stem: q.question_stem?.substring(0, 50) + '...',
        has_clinical_vignette: !!q.clinical_vignette, options_count: q.options?.length
      });
    }
    const questionText = q.question_stem || q.question || q.content || q.individual_question || '';
    const options = q.options.map((option, index) => {
      if (typeof option === 'string') return { id: String.fromCharCode(65 + index), text: option };
      return option;
    });
    let correctAnswer = q.correctAnswer || q.correct_answer || 'A';
    if (typeof correctAnswer === 'number') correctAnswer = String.fromCharCode(65 + correctAnswer);
    const explanation = q.explanation || q.worked_solution || '';
    const format = q.format || defaultFormat;
    return { id: q.id, question: questionText, stem: questionText, options, correctAnswer, explanation, format };
  }, [currentQuestion, defaultFormat]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    const status = isCorrect ? 'correct' : 'incorrect';
    const topic = currentQuestion.topic || (currentQuestion as any).title || 'Unknown Topic';
    const skill = Array.isArray(currentQuestion.tags) ? currentQuestion.tags[0] : 'Unknown Skill';
    const currentSection = section || 'Unknown Section';
    try {
      localStorage.setItem(`question_progress_${questionId}`, JSON.stringify({
        status, topic: String(topic), skill: String(skill),
        section: String(currentSection), timestamp: new Date().toISOString()
      }));
    } catch (error) { console.error('Failed to save progress:', error); }
    setSessionAnswers(prev => {
      // Replace existing answer for this question (handles retries)
      const filtered = prev.filter(a => a.questionIndex !== currentIndex);
      return [...filtered, { questionIndex: currentIndex, isCorrect, topic: String(topic) }];
    });
    if (onAnswerSubmit) onAnswerSubmit(questionId, isCorrect);
  }, [currentIndex, currentQuestion, questionId, section, onAnswerSubmit]);

  const handleNextQuestion = () => {
    if (currentIndex < questionsRef.current.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo(0, 0);
    } else {
      setShowReview(true);
    }
  };

  const handlePreviousQuestion = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const handleJumpTo = useCallback((index: number) => setCurrentIndex(index), []);

  const handleRetryIncorrect = () => {
    const incorrectAnswers = sessionAnswers
      .filter(a => !a.isCorrect)
      .sort((a, b) => a.questionIndex - b.questionIndex);

    if (incorrectAnswers.length === 0) return;

    // Clear sessionStorage for all incorrect questions so they reset to unanswered state
    incorrectAnswers.forEach(({ questionIndex }) => {
      const q = questionsRef.current[questionIndex];
      if (q) {
        const key = `sba_answer_${q.id || q.question?.substring(0, 50)}`;
        sessionStorage.removeItem(key);
      }
    });

    setCurrentIndex(incorrectAnswers[0].questionIndex);
    setShowReview(false);
  };

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
    return;
  }, [questionContent.format]);

  if (showReview) {
    return (
      <SessionReviewScreen
        answers={sessionAnswers}
        questions={questionsRef.current}
        onRetryIncorrect={handleRetryIncorrect}
        onDone={onComplete}
      />
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-screen overflow-hidden",
      (questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba')
        ? "bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900"
        : "bg-gradient-to-br from-stone-50 to-stone-100/50"
    )}>
      {/* Header - only shown for non-SBA formats */}
      {(questionContent.format !== 'flashcard' && questionContent.format !== 'sba' && questionContent.format !== 'ukmla_sba') && (
        <header className="sticky top-0 z-10 bg-white/60 backdrop-blur-2xl border-b border-white/30">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setShowExitConfirmation(true)} className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 transition-colors">
              <X className="h-5 w-5 text-zinc-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-white/60 backdrop-blur-xl rounded-lg border border-black/[0.08]">
                <span className="text-[15px] font-semibold text-zinc-900">{currentIndex + 1}</span>
                <span className="text-[13px] text-zinc-500 mx-1">of</span>
                <span className="text-[15px] font-medium text-zinc-600">{questions.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handlePreviousQuestion} disabled={currentIndex === 0} className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${currentIndex === 0 ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-600 hover:bg-black/5'}`}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={handleNextQuestion} className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-600 hover:bg-black/5 transition-all">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-2">
            <div className="h-1 bg-zinc-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-[#007AFF] transition-all duration-300 ease-out rounded-full" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
            </div>
          </div>
        </header>
      )}

      <div className={(questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba') ? "flex-1 overflow-y-auto" : "flex-1 overflow-auto"} ref={containerRef}>
        <QuestionRenderer
          question={{ ...currentQuestion, options: questionContent.options, correctAnswer: questionContent.correctAnswer, question: questionContent.question, explanation: questionContent.explanation }}
          format={questionContent.format}
          onAnswer={handleAnswer}
          onNext={handleNextQuestion}
          onPrevious={handlePreviousQuestion}
          onExit={() => setShowExitConfirmation(true)}
          currentIndex={currentIndex}
          totalCards={questions.length}
          sessionAnswers={sessionAnswers}
          onJumpTo={handleJumpTo}
        />
      </div>

      {showExitConfirmation && (
        <Dialog open={showExitConfirmation}>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-medium text-stone-900 mb-3 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Exit Practice Session?
              </h2>
              <p className="text-sm text-stone-600 font-light mb-8" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                Your progress will be saved.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowExitConfirmation(false)} className="px-6 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-50 transition-all text-sm font-medium uppercase tracking-wider" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 50