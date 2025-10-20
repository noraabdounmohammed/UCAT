import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { QuestionRenderer } from './QuestionRenderer';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import './apple-question-styles.css';
import { QuestionData } from './questionTypes';

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

  // Refs to prevent unnecessary re-renders
  const questionsRef = useRef<QuestionData[]>(questions);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Update questions ref when prop changes
  useEffect(() => {
    if (questions && questions.length > 0) {
      questionsRef.current = questions;
      
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
      // End of practice session
      if (onComplete) {
        onComplete();
      }
    }
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

  // Ensure full-viewport dark background for SBA/Clinical SBA and Flashcards
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

  return (
    <div 
      className={cn(
        "flex flex-col h-screen overflow-hidden",
        (questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba')
          ? "bg-zinc-950" 
          : "bg-zinc-50/50 dark:bg-zinc-950/50"
      )}
      style={(questionContent.format !== 'flashcard' && questionContent.format !== 'sba' && questionContent.format !== 'ukmla_sba') ? { backdropFilter: 'blur(20px)' } : undefined}
    >
      {/* Header - Hidden for flashcards and SBA */}
      {(questionContent.format !== 'flashcard' && questionContent.format !== 'sba' && questionContent.format !== 'ukmla_sba') && (
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08]">
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
                {questions.length}
              </span>
            </div>
          </div>
          
          {/* Right: Navigation Controls */}
          <div className="flex items-center gap-1">
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
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </header>
      )}

      {/* Main content */}
      <div className={(questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba') ? "flex-1 overflow-y-auto" : "flex-1 overflow-auto"} ref={containerRef}>
        {(questionContent.format === 'flashcard' || questionContent.format === 'sba' || questionContent.format === 'ukmla_sba') ? (
          <QuestionRenderer
            question={{
              ...currentQuestion,
              options: questionContent.options,
              correctAnswer: questionContent.correctAnswer,
              question: questionContent.question,
              explanation: questionContent.explanation
            }}
            format={questionContent.format}
            onAnswer={(isCorrect) => {
              // Track progress when answer is submitted
              const status = isCorrect ? 'correct' : 'incorrect';
              
              // Get question metadata for progress tracking
              const topic = currentQuestion.topic || 'Unknown Topic';
              const skill = Array.isArray(currentQuestion.tags) ? currentQuestion.tags[0] : 'Unknown Skill';
              const currentSection = section || 'Unknown Section';
              
              // Update progress in localStorage
              // Save progress to localStorage directly instead of using updateQuestionProgress
              try {
                const progressKey = `question_progress_${questionId}`;
                const progressData = {
                  status,
                  topic: String(topic),
                  skill: String(skill),
                  section: String(currentSection),
                  timestamp: new Date().toISOString()
                };
                localStorage.setItem(progressKey, JSON.stringify(progressData));
              } catch (error) {
                console.error('Failed to save progress:', error);
              }
              
              // Call the onAnswerSubmit callback if provided
              if (onAnswerSubmit) {
                onAnswerSubmit(questionId, isCorrect);
              }
              
              console.log(`Question ${questionId} answered: ${status} - Progress saved to dashboard`);
            }}
            onNext={handleNextQuestion}
            onPrevious={handlePreviousQuestion}
            onExit={() => setShowExitConfirmation(true)}
            currentIndex={currentIndex}
            totalCards={questions.length}
          />
        ) : (
          <QuestionRenderer
              question={{
                ...currentQuestion,
                options: questionContent.options,
                correctAnswer: questionContent.correctAnswer,
                question: questionContent.question,
                explanation: questionContent.explanation
              }}
              format={questionContent.format}
              onAnswer={(isCorrect) => {
                // Track progress when answer is submitted
                const status = isCorrect ? 'correct' : 'incorrect';
                
                // Get question metadata for progress tracking
                const topic = currentQuestion.topic || 'Unknown Topic';
                const skill = Array.isArray(currentQuestion.tags) ? currentQuestion.tags[0] : 'Unknown Skill';
                const currentSection = section || 'Unknown Section';
                
                // Update progress in localStorage
                // Save progress to localStorage directly instead of using updateQuestionProgress
                try {
                  const progressKey = `question_progress_${questionId}`;
                  const progressData = {
                    status,
                    topic: String(topic),
                    skill: String(skill),
                    section: String(currentSection),
                    timestamp: Date.now()
                  };
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">Exit Practice Session?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to exit? Your progress will be saved.</p>
              <div className="flex justify-end gap-4">
                <button 
                  onClick={handleExitCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleExitConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md"
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
