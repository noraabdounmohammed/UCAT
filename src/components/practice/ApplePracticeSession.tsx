import { useState, useEffect, useRef, useMemo } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  ChevronRight,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './apple-question-styles.css';

// Define properly typed interfaces for the questions
export interface QuestionData {
  id: string;
  individual_question?: string;
  content?: string;
  question?: string;
  question_stem?: string;
  options: Array<{ text: string; id: string } | string>;
  correct_answer?: string;
  correctAnswer?: string | number;
  worked_solution?: string;
  explanation?: string;
  data_block?: Record<string, unknown> | null;
  data_type?: string;
  [key: string]: unknown; 
}

interface PracticeSessionProps {
  questions: QuestionData[];
  onComplete: () => void;
}

// Stable question content type
interface StableQuestionContent {
  id: string;
  question: string;
  stem: string;
  options: Array<{ text: string; id: string } | string>;
  correctAnswer: string;
  explanation: string;
}

export function ApplePracticeSession({ questions, onComplete }: PracticeSessionProps) {
  // Component state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [skippedQuestions] = useState<string[]>([]); // Kept for future use
  const [flaggedQuestions] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per question
  const [showFeedback, setShowFeedback] = useState(false);
  const [showStats] = useState(false); // Kept for future use
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  // Track seen questions to prevent repeats
  const [seenQuestions, setSeenQuestions] = useState<Set<string>>(new Set());

  // Services
  const supabase = useSupabaseClient();
  const user = useUser();
  const navigate = useNavigate(); // Add navigation hook

  // Refs to prevent unnecessary re-renders
  const questionsRef = useRef<QuestionData[]>(questions);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Update questions ref when prop changes and initialize seen questions
  useEffect(() => {
    if (questions && questions.length > 0) {
      questionsRef.current = questions;
      
      // Initialize seen questions with the first question
      if (questions[0]?.id) {
        setSeenQuestions(new Set([questions[0].id]));
      }
    }
  }, [questions]);

  // Stable question ID
  const questionId = useMemo(() => {
    const currentQuestion = questionsRef.current[currentIndex];
    return currentQuestion?.id || `question-${currentIndex}`;
  }, [currentIndex]);

  // Stable question content with memoization to prevent re-renders
  const questionContent = useMemo((): StableQuestionContent => {
    const currentQuestion = questionsRef.current[currentIndex];
    
    if (!currentQuestion) {
      return {
        id: `question-${currentIndex}`,
        question: '',
        stem: '',
        options: [],
        correctAnswer: '',
        explanation: ''
      };
    }
    
    return {
      id: questionId,
      question: currentQuestion.individual_question || 
               currentQuestion.content || 
               currentQuestion.question || '',
      stem: currentQuestion.question_stem || '',
      options: Array.isArray(currentQuestion.options) ? 
               [...currentQuestion.options] : [],
      correctAnswer: String(currentQuestion.correct_answer || currentQuestion.correctAnswer || 'A'),
      explanation: currentQuestion.worked_solution || 
                  currentQuestion.explanation || ''
    };
  }, [currentIndex, questionId]);

  // Format time as MM:SS - kept for future use
  // const formatTime = (seconds: number) => {
  //   const mins = Math.floor(seconds / 60);
  //   const secs = seconds % 60;
  //   return `${mins}:${secs.toString().padStart(2, '0')}`;
  // };

  // Calculate progress percentage - kept for future use
  // const progressPercentage = ((currentIndex + 1) / questions.length) * 100;
  
  // Get stats for the current session
  const getSessionStats = () => {
    const answered = Object.keys(selectedAnswers).length;
    const correct = questions.filter(
      q => selectedAnswers[q.id] === (q.correct_answer || q.correctAnswer)
    ).length;
    const incorrect = answered - correct;
    const skipped = skippedQuestions.length;
    const flagged = flaggedQuestions.length;
    
    return { 
      answered, 
      correct, 
      incorrect, 
      skipped, 
      flagged,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0
    };
  };
  
  // Check for empty questions
  useEffect(() => {
    if (!questions || questions.length === 0) {
      toast.error('No questions available for practice');
      onComplete();
    }
  }, [questions, onComplete]);
  
  // Handle component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  // Timer logic
  useEffect(() => {
    // Don't start timer if feedback is already showing or no questions
    if (showFeedback || !questions || questions.length === 0 || isTransitioning) {
      return;
    }
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Start a new timer
    timerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setTimeRemaining(prev => {
          // If time is up, show feedback
          if (prev <= 1) {
            // Clear the timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            // Show feedback only if user has selected an answer
            if (selectedAnswers[questionId]) {
              setShowFeedback(true);
            } else {
              // If no answer selected, just show a message that time is up
              toast.info("Time's up! Please select an answer.");
            }
            
            return 0;
          }
          
          return prev - 1;
        });
      }
    }, 1000);
    
    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIndex, showFeedback, questionId, selectedAnswers, questions, isTransitioning]);
  
  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    // Only allow selection if feedback isn't already showing
    if (!showFeedback && !isTransitioning) {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Record the selected answer
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }));
      
      // Show feedback
      setShowFeedback(true);

      // Auto-show explanation for incorrect answers
      if (answer !== questionContent.correctAnswer) {
        setShowExplanation(true);
      }
      
      // Save the answer to the database if user is logged in
      if (user) {
        try {
          // Use async/await with proper error handling
          const saveAnswer = async () => {
            try {
              const { error } = await supabase
                .from('practice_answers')
                .insert({
                  user_id: user.id,
                  question_id: questionId,
                  answer: answer,
                  correct: answer === questionContent.correctAnswer,
                  time_spent: 120 - timeRemaining
                });
              
              if (error) {
                // Log error but don't disrupt user experience
                console.log('Non-critical error saving answer:', error.message);
              }
            } catch (err) {
              // Catch any unexpected errors but don't disrupt user experience
              console.log('Error in save answer operation:', err);
            }
          };
          
          // Execute but don't await - we don't want to block the UI
          saveAnswer();
        } catch (e) {
          // Fallback error handling
          console.log('Unexpected error in answer handling:', e);
        }
      }
    }
  };
  
  // Handle moving to the next question
  const handleNextQuestion = () => {
    // If this is the last question, complete the session
    if (currentIndex === questions.length - 1 || seenQuestions.size >= questions.length) {
      // Save session results to database if user is logged in
      if (user) {
        try {
          const stats = getSessionStats();
          
          // Use async/await with proper error handling
          const saveSession = async () => {
            try {
              const { error } = await supabase
                .from('practice_sessions')
                .insert({
                  user_id: user.id,
                  total_questions: questions.length,
                  correct_count: stats.correct,
                  incorrect_count: stats.incorrect,
                  skipped_count: stats.skipped,
                  accuracy_percentage: stats.accuracy
                });
              
              if (error) {
                // Log error but don't disrupt user experience
                console.log('Non-critical error saving session:', error.message);
              }
            } catch (err) {
              // Catch any unexpected errors but don't disrupt user experience
              console.log('Error in save session operation:', err);
            }
          };
          
          // Execute but don't await - we don't want to block the UI
          saveSession();
        } catch (e) {
          // Fallback error handling
          console.log('Unexpected error in session handling:', e);
        }
      }
      
      // Show completion message and navigate to the main practice section selection page
      toast.success('Practice session completed!');
      
      // Navigate directly to the main practice section selection page (root path)
      navigate('/');
      return;
    }
    
    // Reset state for the next question
    setShowFeedback(false);
    setShowExplanation(false);
    setTimeRemaining(120);
    
    // Start transition
    setIsTransitioning(true);
    
    // Find the next unseen question
    let nextIndex = currentIndex + 1;
    let foundUnseen = false;
    
    // Look for an unseen question
    while (nextIndex < questions.length && !foundUnseen) {
      const nextQuestionId = questions[nextIndex]?.id;
      if (nextQuestionId && !seenQuestions.has(nextQuestionId)) {
        foundUnseen = true;
        // Add this question to seen questions
        setSeenQuestions(prev => new Set([...prev, nextQuestionId]));
      } else {
        nextIndex++;
      }
    }
    
    // If we couldn't find an unseen question, end the session
    if (!foundUnseen) {
      toast.success('You have completed all available questions!');
      // Call onComplete to return to the practice filter page
      onComplete();
      return;
    }
    
    // Use setTimeout to ensure smooth transition
    setTimeout(() => {
      // Set the index to the next unseen question
      setCurrentIndex(nextIndex);
      
      // End transition after a short delay to ensure smooth rendering
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 100);
  };

  // Handle flagging a question - kept for future use
  // const handleFlag = () => {
  //   // Toggle the flagged status of the current question
  //   setFlaggedQuestions((prev: string[]) => {
  //     if (prev.includes(questionId)) {
  //       return prev.filter((id: string) => id !== questionId);
  //     } else {
  //       return [...prev, questionId];
  //     }
  //   });
  //   // Show toast notification
  //   const isFlagged = flaggedQuestions.includes(questionId);
  //   toast.info(isFlagged ? 'Question unflagged' : 'Question flagged for review');
  // };
  
  // Exit functionality removed as the exit button has been removed

  // Toggle explanation visibility
  const toggleExplanation = () => {
    setShowExplanation((prev: boolean) => !prev);
  };

  // Render the component
  return (
    <div className="apple-question-container">
      {/* We've moved the exit button inside the card for better HIG compliance */}
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {showStats ? (
          /* Stats panel */
          <div className="apple-stats-panel">
            <h2 className="apple-stats-title">Session Statistics</h2>
            
            <div className="space-y-2">
              {Object.entries(getSessionStats()).map(([key, value]) => (
                <div key={key} className="apple-stats-item">
                  <div className="apple-stats-label capitalize">{key}</div>
                  <div className="apple-stats-value">
                    {key === 'accuracy' ? `${value}%` : value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Question card */
          <div 
            className={cn(
              "apple-question-card",
              isTransitioning ? "opacity-0" : "opacity-100 apple-fade-in"
            )}
            style={{ 
              transition: 'opacity 0.15s ease-in-out',
              willChange: 'opacity'
            }}
          >
            {/* Question content */}
            <div className="apple-question-content">
              {/* Question stem */}
              {questionContent.stem && (
                <div className="apple-question-stem">
                  {questionContent.stem}
                </div>
              )}
              
              {/* Exit button removed as requested */}
              
              {/* Question title */}
              <h2 className="apple-question-title">
                {questionContent.question}
              </h2>
              
              {/* Answer options */}
              <div className="apple-answer-options apple-slide-up">
                {questionContent.options.map((option, index) => {
                  const optionLetter = String.fromCharCode(65 + index);
                  const optionText = typeof option === 'string' 
                    ? option 
                    : option.text || '';
                  
                  const isSelected = selectedAnswers[questionId] === optionLetter;
                  const isCorrect = questionContent.correctAnswer === optionLetter;
                  
                  return (
                    <button
                      key={index}
                      disabled={showFeedback || isTransitioning}
                      onClick={() => handleAnswerSelect(optionLetter)}
                      className={cn(
                        "apple-answer-option rounded-xl border border-[#E5E5EA] bg-white p-4 mb-3 flex items-center transition-all",
                        showFeedback && isCorrect && "correct border-[#34C759] bg-[rgba(52,199,89,0.05)]",
                        showFeedback && isSelected && !isCorrect && "incorrect border-[#FF3B30] bg-[rgba(255,59,48,0.05)]",
                        !showFeedback && isSelected && "selected border-[#007AFF] bg-[rgba(0,122,255,0.05)]",
                        !showFeedback && !isSelected && "hover:border-[#8E8E93] hover:bg-[#F5F5F7]"
                      )}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F5F5F7] mr-3 font-medium text-[15px] text-[#1D1D1F]">
                        {optionLetter}
                      </div>
                      <div className="flex-1 text-[17px] text-[#1D1D1F] font-normal">{optionText}</div>
                      {showFeedback && (
                        <div className="ml-2">
                          {isCorrect && (
                            <CheckCircle className="h-6 w-6 text-[#34C759]" />
                          )}
                          {isSelected && !isCorrect && (
                            <XCircle className="h-6 w-6 text-[#FF3B30]" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Feedback section */}
              {showFeedback && (
                <div className={cn(
                  "apple-feedback apple-fade-in",
                  selectedAnswers[questionId] === questionContent.correctAnswer 
                    ? "correct" 
                    : "incorrect"
                )}>
                  <div className="flex items-center gap-2 font-medium">
                    {selectedAnswers[questionId] === questionContent.correctAnswer ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>Correct Answer</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5" />
                        <span>Incorrect Answer</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Explanation */}
              {showFeedback && questionContent.explanation && (
                <div className="mt-6">
                  <button 
                    className="flex items-center gap-2 text-[#007AFF] mb-4 py-2 px-3 rounded-md hover:bg-[rgba(0,122,255,0.05)]"
                    onClick={toggleExplanation}
                  >
                    <Info className="h-4 w-4" />
                    <span className="font-medium text-[17px]">
                      {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
                    </span>
                    {showExplanation ? (
                      <ChevronUp className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </button>
                  
                  {showExplanation && (
                    <div className="apple-explanation apple-fade-in">
                      <div className="apple-explanation-title">
                        <BookOpen className="h-4 w-4" />
                        <span>Explanation</span>
                      </div>
                      <div className="apple-explanation-content">
                        {questionContent.explanation}
                      </div>
                    </div>
                  )}
                </div>
              )}

              
              {/* Action buttons - Apple HIG style */}
              {showFeedback && (
                <div className="flex justify-center mt-8">
                  {currentIndex === questions.length - 1 || seenQuestions.size >= questions.length ? (
                    <button 
                      className="py-3 px-6 rounded-full bg-[#007AFF] text-white font-medium text-[17px] flex items-center justify-center w-full max-w-xs transition-all hover:bg-[#0062CC] active:bg-[#0055B3] disabled:opacity-40 shadow-sm"
                      onClick={() => {
                        toast.success('Practice session completed!');
                        navigate('/');
                      }}
                      disabled={isTransitioning}
                    >
                      Complete Session
                    </button>
                  ) : (
                    <button 
                      className="py-3 px-6 rounded-full bg-[#007AFF] text-white font-medium text-[17px] flex items-center justify-center w-full max-w-xs transition-all hover:bg-[#0062CC] active:bg-[#0055B3] disabled:opacity-40 shadow-sm"
                      onClick={handleNextQuestion}
                      disabled={isTransitioning}
                    >
                      <span>Next Question</span>
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
