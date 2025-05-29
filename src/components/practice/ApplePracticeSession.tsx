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
import { DataVisualization } from './DataVisualization';
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
  data_block?: Array<{ label: string; value: number }> | Record<string, unknown> | null;
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

  // Get the current question
  const currentQuestion = useMemo(() => {
    return questionsRef.current[currentIndex];
  }, [currentIndex]);

  // Stable question content with memoization to prevent re-renders
  const questionContent = useMemo((): StableQuestionContent => {
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
    
    // For debugging - log the current question to see its structure
    console.log('Current question:', currentQuestion);
    console.log('Data type:', currentQuestion.data_type);
    console.log('Data block:', currentQuestion.data_block);
    
    return {
      id: questionId,
      question: currentQuestion.question_stem || 
               currentQuestion.content || 
               currentQuestion.individual_question || '',
      stem: currentQuestion.question_stem || '',
      options: Array.isArray(currentQuestion.options) ? 
               [...currentQuestion.options] : [],
      correctAnswer: String(currentQuestion.correct_answer || currentQuestion.correctAnswer || 'A'),
      explanation: currentQuestion.worked_solution || 
                  currentQuestion.explanation || ''
    };
  }, [currentIndex, questionId, currentQuestion]);

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

  // Handle selecting an answer
  const handleAnswerSelect = (answer: string) => {
    if (showFeedback || isTransitioning) return;
    
    // Update selected answer
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Show feedback
    setShowFeedback(true);
    
    // Track user progress if authenticated
    if (user && supabase) {
      // This would be implemented in a real app
      console.log('Tracking user progress for question:', questionId);
    }
  };

  // Handle moving to the next question
  const handleNextQuestion = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setShowFeedback(false);
    setShowExplanation(false);
    
    // Use setTimeout to create a smooth transition
    setTimeout(() => {
      // If we've seen all questions, complete the session
      if (seenQuestions.size >= questions.length) {
        onComplete();
        return;
      }
      
      // Find a question that hasn't been seen yet
      let nextIndex = currentIndex;
      const maxAttempts = questions.length;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        nextIndex = (nextIndex + 1) % questions.length;
        const nextQuestionId = questions[nextIndex]?.id;
        
        if (nextQuestionId && !seenQuestions.has(nextQuestionId)) {
          break;
        }
        
        attempts++;
      }
      
      // Update seen questions
      if (questions[nextIndex]?.id) {
        setSeenQuestions(prev => new Set([...prev, questions[nextIndex].id]));
      }
      
      // Update current index
      setCurrentIndex(nextIndex);
      setIsTransitioning(false);
    }, 150); // Match the transition duration in the CSS
  };

  // Toggle explanation visibility
  const toggleExplanation = () => {
    setShowExplanation((prev: boolean) => !prev);
  };

  // Render the component
  return (
    <div className="apple-question-container">
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
              {/* Question title */}
              <h2 className="apple-question-title">
                {questionContent.question}
              </h2>
              
              {/* Data visualization - only show for questions with data blocks */}
              {currentQuestion && currentQuestion.data_block && Array.isArray(currentQuestion.data_block) && currentQuestion.data_block.length > 0 && (
                <div className="apple-data-visualization">
                  <DataVisualization 
                    type={currentQuestion.data_type || 'bar_chart'} 
                    data={currentQuestion.data_block} 
                  />
                </div>
              )}
              
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
