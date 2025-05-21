import { useState, useEffect, useRef, useMemo } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, BarChart3, Flag, SkipForward, CheckCircle, XCircle, ArrowRight, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define properly typed interfaces for the centralized database questions
interface QuestionData {
  id: string;
  individual_question?: string;
  content?: string;
  question?: string;
  question_stem?: string;
  options: Array<{ text: string; id: string } | string>;
  correct_answer?: string;
  correctAnswer?: number;
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

export function PracticeSession({ questions, onComplete }: PracticeSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<string[]>([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per question
  const [showFeedback, setShowFeedback] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const supabase = useSupabaseClient();
  const user = useUser();

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
      q => selectedAnswers[q.id] === q.correct_answer
    ).length;
    const incorrect = answered - correct;
    const skipped = skippedQuestions.length;
    const flagged = flaggedQuestions.length;
    
    return { answered, correct, incorrect, skipped, flagged };
  };

  // Use a ref to store ALL questions to prevent re-renders from causing flashing
  const questionsRef = useRef<QuestionData[]>([]);
  
  // Update the questions ref when questions prop changes
  useEffect(() => {
    if (questions && questions.length > 0) {
      questionsRef.current = questions;
    }
  }, [questions]);

  // Use a stable approach to get the current question
  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null;
  }, [questions, currentIndex]);
  
  // Ensure we have a stable question ID
  const questionId = useMemo(() => {
    return currentQuestion?.id || `question-${currentIndex}`;
  }, [currentQuestion, currentIndex]);
  
  // Get the question content in a stable way
  const questionContent = useMemo(() => {
    if (!currentQuestion) return null;
    
    return {
      id: questionId,
      question: currentQuestion.individual_question || 
               currentQuestion.content || 
               currentQuestion.question || '',
      stem: currentQuestion.question_stem || '',
      options: Array.isArray(currentQuestion.options) ? 
               [...currentQuestion.options] : [],
      correctAnswer: currentQuestion.correct_answer || 'A',
      explanation: currentQuestion.worked_solution || 
                  currentQuestion.explanation || ''
    };
  }, [currentQuestion, questionId]);
  
  // Use a separate effect for initial questions validation
  useEffect(() => {
    if (!questions || questions.length === 0) {
      toast.error('No questions available for practice');
      onComplete();
    }
  }, [questions, onComplete]); // Include dependencies to satisfy the linter
  
  // Use a ref for the timer to avoid unnecessary re-renders
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Handle timer logic without causing re-renders
  useEffect(() => {
    // Set up the mounted ref
    isMountedRef.current = true;
    
    // Clean up function
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  // Separate effect to start/stop timer based on conditions
  useEffect(() => {
    // Don't start timer if feedback is already showing or no questions
    if (showFeedback || !questions || questions.length === 0) {
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
  }, [currentIndex, showFeedback, questions]);

  const handleAnswerSelect = (answer: string) => {
    console.log('Answer selected:', answer);
    // Only allow selecting an answer if feedback isn't already showing
    if (!showFeedback) {
      // Record the selected answer using the stable questionId
      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }));
      // Show feedback but don't automatically advance to next question
      setShowFeedback(true);
      
      // Reset the timer when an answer is selected
      setTimeRemaining(120);
    }
  };

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

  const handleNextQuestion = async () => {
    // If there's a selected answer, save the attempt
    if (selectedAnswers[questionId]) {
      const isCorrect = selectedAnswers[questionId] === questionContent?.correctAnswer;
      await saveQuestionAttempt(questionId, isCorrect);
    }

    // If this is the last question, complete the session
    if (currentIndex === questions.length - 1) {
      onComplete();
      return;
    }

    // Otherwise, move to the next question
    setCurrentIndex(currentIndex + 1);
    setShowFeedback(false);
    setTimeRemaining(120); // Reset timer for the next question
  };

  const handleSkip = () => {
    // Only allow skipping if feedback isn't already showing
    if (!showFeedback) {
      // Record the skipped question
      setSkippedQuestions((prev) => [...prev, questionId]);
      
      // Move to the next question
      if (currentIndex === questions.length - 1) {
        onComplete();
        return;
      }
      
      setCurrentIndex(currentIndex + 1);
      setTimeRemaining(120); // Reset timer for the next question
    }
  };

  const handleFlag = () => {
    // Toggle the flagged status of the current question
    setFlaggedQuestions((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top navigation bar */}
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            Question {currentIndex + 1} of {questions.length}
          </div>
          <Progress value={progressPercentage} className="w-32 h-2" />
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
                  disabled={showFeedback}
                >
                  <SkipForward className="h-4 w-4 text-slate-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Skip Question</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
          ) : currentQuestion ? (
            <div 
              className="bg-white rounded-xl shadow-md p-6"
              style={{ 
                willChange: 'auto',
                transform: 'translateZ(0)',
                WebkitFontSmoothing: 'subpixel-antialiased',
                position: 'relative',
                zIndex: 1,
                visibility: 'visible',
                opacity: 1,
                transition: 'none'
              }}
            >
              <Card className="border-none shadow-sm rounded-xl overflow-hidden">
                {showFeedback && (
                  <div className={cn(
                    "px-6 py-3 text-sm font-medium",
                    selectedAnswers[questionId] === questionContent?.correctAnswer ? 
                      "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>
                    {selectedAnswers[questionId] === questionContent?.correctAnswer ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Correct Answer</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        <span>Incorrect Answer</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-6 space-y-6">
                  {/* Question Stem */}
                  {questionContent?.stem && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                        {questionContent.stem}
                      </p>
                    </div>
                  )}

                  {/* Question */}
                  <div className="text-base md:text-lg font-medium text-slate-800">
                    {questionContent?.question}
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {questionContent?.options.map((option, index) => {
                      const optionLetter = String.fromCharCode(65 + index);
                      const optionText = typeof option === 'string' 
                        ? option 
                        : option.text || '';
                      
                      const isSelected = selectedAnswers[questionId] === optionLetter;
                      const isCorrect = questionContent?.correctAnswer === optionLetter;
                      
                      return (
                        <button
                          key={index}
                          disabled={showFeedback}
                          onClick={() => handleAnswerSelect(optionLetter)}
                          className={cn(
                            "w-full text-left flex items-center gap-3 p-4 rounded-lg border",
                            "transition-all duration-200 focus:outline-none",
                            showFeedback ? (
                              isCorrect
                                ? "bg-green-50 border-green-200 text-green-800"
                                : isSelected
                                ? "bg-red-50 border-red-200 text-red-800"
                                : "bg-slate-50 border-slate-200 text-slate-500"
                            ) : (
                              isSelected
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                            )
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium",
                            showFeedback ? (
                              isCorrect
                                ? "bg-green-100 text-green-700"
                                : isSelected
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-200 text-slate-600"
                            ) : (
                              isSelected
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-slate-100 text-slate-600"
                            )
                          )}>
                            {optionLetter}
                          </div>
                          <span className="text-base flex-1">{optionText}</span>
                          {showFeedback && (
                            <div>
                              {isCorrect && (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                              {isSelected && !isCorrect && (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Worked Solution */}
                  {showFeedback && questionContent?.explanation && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-700">
                        <BookOpen className="h-4 w-4" />
                        <h3 className="font-medium">Explanation</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700">
                        {questionContent.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Bottom navigation bar */}
      <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {showFeedback && selectedAnswers[questionId] === questionContent?.correctAnswer ? (
            <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              <span>Correct</span>
            </div>
          ) : showFeedback ? (
            <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
              <XCircle className="h-4 w-4" />
              <span>Incorrect</span>
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Select an answer to continue
            </div>
          )}
        </div>
        
        {showFeedback && (
          <Button 
            onClick={handleNextQuestion}
            className="px-6 py-2 flex items-center gap-1.5"
            size="lg"
          >
            {currentIndex === questions.length - 1 ? 'Complete Session' : 'Next Question'}
            {currentIndex !== questions.length - 1 && <ArrowRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
