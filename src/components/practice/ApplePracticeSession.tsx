import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { QuestionRenderer } from './QuestionRenderer';
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
  section?: string; // Add section prop to track which section questions belong to
  defaultFormat?: 'flashcard' | 'sba' | 'ukmla_sba' | 'mindmap'; // Default question format if not specified in the question
}

export function ApplePracticeSession({ 
  questions, 
  onComplete, 
  onAnswerSubmit, 
  section, 
  defaultFormat = 'ukmla_sba' 
}: PracticeSessionProps) {
  // State for tracking current question and navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<QuestionData[]>(questions);
  const [sessionKey, setSessionKey] = useState(0); // incremented on retry to force remount

  // Refs to prevent unnecessary re-renders
  const questionsRef = useRef<QuestionData[]>(questions);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Sync activeQuestions when prop changes (initial load)
  useEffect(() => {
    setActiveQuestions(questions);
  }, [questions]);

  // Update questions ref when active questions change
  useEffect(() => {
    if (activeQuestions && activeQuestions.length > 0) {
      questionsRef.current = activeQuestions;
      
      // Debug logging for mind map sessions
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
  }, [questions]);
  
  // Scroll to top when component mounts
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Don't handle arrow keys for flashcards - they have their own handlers
      const currentQuestion = questions[currentIndex];
      if (currentQuestion?.format === 'flashcard' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        return;
      }

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
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions.length]);

  // Get the current question
  const currentQuestion = useMemo(() => {
    return questionsRef.current[currentIndex];
  }, [currentIndex]);

  // Stable question ID
  const questionId = useMemo(() => {
    return currentQuestion?.id || `question-${currentIndex}`;
  }, [currentQuestion, currentIndex]);

  // Normalize question data to a stable format
  const questionContent = useMemo(() => {
    const q = currentQuestion;
    
    // Debug logging to see what we're receiving
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
    
    // Extract question text from various possible fields
    const questionText = q.question_stem || q.question || q.content || q.individual_question || '';
    
    // Extract options and ensure they have consistent format
    const options = q.options.map((option, index) => {
      if (typeof option === 'string') {
        return { id: String.fromCharCode(65 + index), text: option };
      }
      return option;
    });
    
    // Determine correct answer
    let correctAnswer = q.correctAnswer || q.correct_answer || 'A';
    if (typeof correctAnswer === 'number') {
      correctAnswer = String.fromCharCode(65 + correctAnswer);
    }
    
    // Extract explanation
    const explanation = q.explanation || q.worked_solution || '';
    
    // Determine question format - Force UKMLA SBA format for all questions
    const format = q.format || defaultFormat;
    
    return {
      id: q.id,
      question: questionText,
      stem: questionText,
      options,
      correctAnswer,
      explanation,
      format
    };
  }, [currentQuestion, defaultFormat]);

  // Handle next question navigation
  const handleNextQuestion = () => {
    if (currentIndex < questionsRef.current.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo(0, 0);
    } else {
      // End of session — show review screen
      setShowReview(true);
    }
  };

  // Record an answer for the current question
  const recordAnswer = (isCorrect: boolean) => {
    const topic = questionsRef.current[currentIndex]?.title || questionsRef.current[currentIndex]?.topic;
    setSessionAnswers(prev => {
      // Overwrite if already answered this index (e.g. user went back)
      const without = prev.filter(a => a.questionIndex !== currentIndex);
      return [...without, { questionIndex: currentIndex, isCorrect, topic }];
    });
  };

  // Retry only incorrect questions
  const handleRetryIncorrect = () => {
    const incorrectIndices = sessionAnswers.filter(a => !a.isCorrect).map(a => a.questionIndex);
    const incorrectQuestions = incorrectIndices.map(i => activeQuestions[i]).filter(Boolean);
    if (incorrectQuestions.length === 0) return;

    // Clear sessionStorage answers for every incorrect question so they load fresh
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
    setSessionKey(k => k + 1); // force remount so components reset their internal state
    window.scrollTo(0, 0);
  };

  const handlePreviousQuestion = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleExitConfirm = () => {
    setShowExitConfirmation(false);
    onComplete();
  };

  const handleExitCancel = () => {
    setShowExitConfirmation(false);
  };

  // Ensure full-viewport dark background for SBA/UKMLA SBA and Flashcards
  // This prevents any white strip at the bottom by overriding body/html background.
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

  // Show review screen at end of session
  if (showReview) {
    return (
      <SessionReviewScreen
        answers={sessionAnswers}
        questions={activeQuestions}
        onRetryIncorrect={handleRetryIncorrect}
        onDone={onComplete}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen overflow-hidden",
        (questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba')
          ? "bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900" 
          : "bg-gradient-to-br from-stone-50 to-stone-100/50"
      )}
    >
      {/* Header - Hidden for flashcards and SBA */}
      {(questionContent.format !== 'flashcard' && questionContent.format !== 'sba' && questionContent.format !== 'ukmla_sba') && (
      <header className="sticky top-0 z-10 bg-white/60 backdrop-blur-2xl border-b border-white/30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Left: Close Button */}
          <button
            onClick={() => setShowExitConfirmation(true)}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          
          {/* Center: Question Counter */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-lg border border-black/[0.08] dark:border-white/[0.08]">
              <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                {currentIndex + 1}
              </span>
              <span className="text-[13px] text-zinc-500 dark:text-zinc-400 mx-1">
                of
              </span>
              <span className="text-[15px] font-medium text-zinc-600 dark:text-zinc-400">
                {activeQuestions.length}
              </span>
            </div>
          </div>
          
          {/* Right: Progress pill + Navigation Controls */}
          <div className="flex items-center gap-2">
            {sessionAnswers.length > 0 && (
              <SessionProgressDropdown
                answers={sessionAnswers}
                total={activeQuestions.length}
                currentIndex={currentIndex}
                isLightMode={true}
              />
            )}
            <button
              onClick={handlePreviousQuestion}
              disabled={currentIndex === 0}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all group ${
                currentIndex === 0
                  ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95'
              }`}
              title="Previous (← or H)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={handleNextQuestion}
              className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 group"
              title="Next (→ or L)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto px-4 pb-2">
          <div className="h-1 bg-zinc-200/60 dark:bg-zinc-700/60 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#007AFF] transition-all duration-300 ease-out rounded-full"
              style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>
      )}

      {/* Floating progress pill for flashcard only — sba/ukmla_sba have their own built-in pill in the header */}
      {questionContent.format === 'flashcard' && sessionAnswers.length > 0 && (
        <div className="fixed top-4 right-4 z-20">
          <SessionProgressDropdown
            answers={sessionAnswers}
            total={activeQuestions.length}
            currentIndex={currentIndex}
            isLightMode={false}
          />
        </div>
      )}

      {/* Main content */}
      <div className={(questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba') ? "flex-1 overflow-y-auto" : "flex-1 overflow-auto"} ref={containerRef}>
        {(questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba') ? (
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
          />
        ) : (
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
                  const progressData = { status, topic: String(topic), skill: String(skill), section: String(currentSection), timestamp: Date.now() };
                  localStorage.setItem(progressKey, JSON.stringify(progressData));
                } catch (error) {
                  console.error('Error saving progress:', error);
                }
              }}
              onNext={handleNextQuestion}
            />
        )}
      </div>

      {/* Exit confirmation modal */}
      {showExitConfirmation && (
        <Dialog open={showExitConfirmation}>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] p-8 max-w-md w-full">
              <h2 className="text-2xl font-medium text-stone-900 mb-3 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Exit Practice Session?
              </h2>
              <p className="text-sm text-stone-600 font-light mb-8" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                Are you sure you want to exit? Your progress will be saved.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={handleExitCancel}
                  className="px-6 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-50 transition-all text-sm font-medium uppercase tracking-wider"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleExitConfirm}
                  className="px-6 py-2.5 rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-all text-sm font-medium uppercase tracking-wider shadow-lg"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
