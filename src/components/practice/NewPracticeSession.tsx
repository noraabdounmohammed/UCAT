import { useState, useEffect, useRef, useMemo } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Clock, BarChart3, Flag, SkipForward, CheckCircle, XCircle, ArrowRight, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import './apple-styles.css';

// Define properly typed interfaces for the centralized database questions
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

export function NewPracticeSession({ questions, onComplete }: PracticeSessionProps) {
  // Component state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<string[]>([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per question
  const [showFeedback, setShowFeedback] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Services
  const supabase = useSupabaseClient();
  const user = useUser();

  // Refs to prevent unnecessary re-renders
  const questionsRef = useRef<QuestionData[]>(questions);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Update questions ref when prop changes
  useEffect(() => {
    if (questions && questions.length > 0) {
      questionsRef.current = questions;
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

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = ((currentIndex + 1) / questions.length) * 100;
  
  // Get stats for the current session
  const getSessionStats = () => {
    const answered = Object.keys(selectedAnswers).length;
    const correct = questions.filter(
      q => selectedAnswers[q.id] === (q.correct_answer || q.correctAnswer)
    ).length;
    const incorrect = answered - correct;
    const skipped = skippedQuestions.length;
    const flagged = flaggedQuestions.length;
    
    return { answered, correct, incorrect, skipped, flagged };
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
          if (prev <= 0) {
            // When time runs out, stop the timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            // Show feedback but don't auto-advance
            setShowFeedback(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    
    // Cleanup on unmount or dependencies change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIndex, showFeedback, questions, isTransitioning]);

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    // Only allow selecting an answer if feedback isn't already showing
    if (!showFeedback && !isTransitioning) {
      // Record the selected answer using the stable questionId
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: answer,
      }));
      
      // Show feedback but don't automatically advance to next question
      setShowFeedback(true);
      
      // Reset the timer when an answer is selected
      setTimeRemaining(120);
      
      // Save the attempt to the database
      if (user) {
        saveQuestionAttempt(
          questionId, 
          answer === questionContent.correctAnswer
        ).catch(err => {
          console.error('Failed to save question attempt:', err);
        });
      }
    }
  };

  // Save question attempt to database
  const saveQuestionAttempt = async (questionId: string, isCorrect: boolean) => {
    if (!user) return;

    try {
      // Ensure user profile exists
      const profile = await getOrCreateUserProfile(user.id, user.email || '');
      if (!profile) {
        throw new Error('Could not get or create user profile');
      }

      // Save the question attempt
      const { error } = await supabase.from('question_attempts').insert([
        {
          user_id: user.id,
          question_id: questionId,
          is_correct: isCorrect,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error('Error saving question attempt:', error);
        throw new Error('Failed to save question attempt');
      }
    } catch (error) {
      console.error('Error in saveQuestionAttempt:', error);
    }
  };

  // Get or create user profile
  const getOrCreateUserProfile = async (userId: string, userEmail: string) => {
    try {
      // First try to get the existing profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        throw new Error('Failed to fetch user profile');
      }

      // If profile exists, return it
      if (profile) return profile;

      // If not, create a new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email: userEmail,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        throw new Error('Failed to create user profile');
      }

      return newProfile;
    } catch (error) {
      console.error('Error in getOrCreateUserProfile:', error);
      return null;
    }
  };

  // Handle moving to the next question
  const handleNextQuestion = async () => {
    // If this is the last question, complete the session
    if (currentIndex === questions.length - 1) {
      onComplete();
      return;
    }

    // Start transition
    setIsTransitioning(true);
    
    // Use setTimeout to ensure smooth transition
    setTimeout(() => {
      // Move to the next question
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
      setTimeRemaining(120); // Reset timer for the next question
      
      // End transition after a short delay to ensure smooth rendering
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 100);
  };

  // Handle skipping a question
  const handleSkip = () => {
    // Only allow skipping if feedback isn't already showing
    if (!showFeedback && !isTransitioning) {
      // Record the skipped question
      setSkippedQuestions(prev => [...prev, questionId]);
      
      // If this is the last question, complete the session
      if (currentIndex === questions.length - 1) {
        onComplete();
        return;
      }
      
      // Start transition
      setIsTransitioning(true);
      
      // Use setTimeout to ensure smooth transition
      setTimeout(() => {
        // Move to the next question
        setCurrentIndex(currentIndex + 1);
        setTimeRemaining(120); // Reset timer for the next question
        
        // End transition after a short delay to ensure smooth rendering
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 100);
    }
  };

  // Handle flagging a question
  const handleFlag = () => {
    // Toggle the flagged status of the current question
    setFlaggedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };
  
  // Handle exit button click
  const handleExitClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm("Are you sure you want to exit the practice session?")) {
      toast.info("Exiting practice session");
      // Call onComplete directly without any delay
      onComplete();
    }
  };

  // Render the component
  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top navigation bar - Apple style */}
      <div className="apple-nav flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="apple-caption">
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div className="w-32 apple-progress-track">
            <div 
              className="apple-progress-bar" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{formatTime(timeRemaining)}</span>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setShowStats(!showStats)}
                >
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Stats</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full",
                    flaggedQuestions.includes(questionId) && "text-amber-500"
                  )}
                  onClick={handleFlag}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Flag Question</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={handleSkip}
                  disabled={showFeedback || isTransitioning}
                >
                  <SkipForward className="h-4 w-4 text-slate-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Skip Question</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={handleExitClick}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exit Session</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F5F5F7]">
        <div className="max-w-3xl mx-auto">
          {showStats ? (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-medium text-slate-800 mb-4">Session Stats</h2>
              <div className="space-y-4">
                {Object.entries(getSessionStats()).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center">
                    <div className="text-slate-600 capitalize">{key}</div>
                    <div className="text-slate-800 font-medium">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div 
              className={cn(
                "apple-card p-6 transition-opacity apple-fade-in",
                isTransitioning ? "opacity-0" : "opacity-100"
              )}
              style={{ 
                willChange: 'opacity, transform',
                transform: 'translateZ(0)',
                WebkitFontSmoothing: 'subpixel-antialiased',
                position: 'relative',
                zIndex: 1,
                transition: 'opacity 0.15s ease-in-out'
              }}
            >
                {showFeedback && (
                  <div className={cn(
                    "px-6 py-4 apple-subheading apple-fade-in",
                    selectedAnswers[questionId] === questionContent.correctAnswer ? 
                      "bg-[#E9F9EF] text-[#34C759]" : "bg-[#FFEBE9] text-[#FF3B30]"
                  )}>
                    {selectedAnswers[questionId] === questionContent.correctAnswer ? (
                      <div className="flex justify-center gap-4 mt-6">
                        <button 
                          className="apple-button apple-button-secondary"
                          onClick={handleExitClick}
                        >
                          Exit Session
                        </button>
                        <button 
                          className="apple-button apple-button-primary"
                          onClick={handleNextQuestion} 
                          disabled={isTransitioning}
                        >
                          Next Question <ArrowRight className="ml-2 h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        <span>Incorrect Answer</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-6 space-y-6 apple-text">
                  {/* Question Stem */}
                  {questionContent.stem && (
                    <div className="bg-[#F2F2F7] rounded-lg p-4 border border-[#E5E5EA]">
                      <p className="text-[#1D1D1F] text-[15px] leading-relaxed whitespace-pre-line">
                        {questionContent.stem}
                      </p>
                    </div>
                  )}

                  {/* Question */}
                  <div className="apple-heading">
                    {questionContent.question}
                  </div>

                  {/* Options */}
                  <div className="space-y-3 apple-slide-up">
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
                            "apple-option",
                            showFeedback && isCorrect && "correct",
                            showFeedback && isSelected && !isCorrect && "incorrect",
                            !showFeedback && isSelected && "selected"
                          )}
                        >
                          <div className="apple-option-indicator">
                            {optionLetter}
                          </div>
                          <span className="apple-body flex-1">{optionText}</span>
                          {showFeedback && (
                            <div>
                              {isCorrect && (
                                <CheckCircle className="h-5 w-5 text-[#34C759]" />
                              )}
                              {isSelected && !isCorrect && (
                                <XCircle className="h-5 w-5 text-[#FF3B30]" />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Worked Solution */}
                  {showFeedback && questionContent.explanation && (
                    <div className="bg-[#F0F0FF] border border-[#E0E0FF] rounded-lg p-4 space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-[#007AFF]">
                        <BookOpen className="h-4 w-4" />
                        <h3 className="font-medium">Explanation</h3>
                      </div>
                      <p className="text-[15px] leading-relaxed text-[#1D1D1F]">
                        {questionContent.explanation}
                      </p>
                    </div>
                  )}
                </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom navigation bar - Apple style */}
      <div className="apple-nav flex justify-between items-center">
        <div className="flex items-center gap-2">
          {showFeedback && selectedAnswers[questionId] === questionContent.correctAnswer ? (
            <div className="flex items-center gap-1.5 text-[#34C759] apple-caption">
              <CheckCircle className="h-4 w-4" />
              <span>Correct</span>
            </div>
          ) : showFeedback ? (
            <div className="flex items-center gap-1.5 text-[#FF3B30] apple-caption">
              <XCircle className="h-4 w-4" />
              <span>Incorrect</span>
            </div>
          ) : (
            <div className="apple-caption text-[#8E8E93]">
              Select an answer to continue
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Exit button always visible */}
          <button 
            className="apple-button apple-button-secondary flex items-center gap-1.5"
            onClick={handleExitClick}
          >
            <X className="h-4 w-4 mr-1" />
            Exit
          </button>
          
          {/* Next question button only visible after answering */}
          {showFeedback && (
            <button 
              onClick={handleNextQuestion}
              className="apple-button apple-button-primary flex items-center gap-1.5"
              disabled={isTransitioning}
            >
              {currentIndex === questions.length - 1 ? 'Complete Session' : 'Next Question'}
              {currentIndex !== questions.length - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
