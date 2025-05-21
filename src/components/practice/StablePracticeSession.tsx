import { useState, useEffect, useRef, useCallback } from 'react';
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

// Stable question component to prevent flashing
function StableQuestion({ 
  question, 
  selectedAnswer, 
  onAnswerSelect, 
  showFeedback 
}: { 
  question: QuestionData | null; 
  selectedAnswer: string | null; 
  onAnswerSelect: (answer: string) => void; 
  showFeedback: boolean;
}) {
  if (!question) return null;

  // Extract question content in a stable way
  const questionText = question.individual_question || 
                     question.content || 
                     question.question || '';
  const questionStem = question.question_stem || '';
  const options = Array.isArray(question.options) ? 
                 [...question.options] : [];
  const correctAnswer = question.correct_answer || '';
  const explanation = question.worked_solution || 
                    question.explanation || '';
  
  // Determine if the selected answer is correct
  const isCorrect = selectedAnswer === correctAnswer;
  
  return (
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
            isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          )}>
            {isCorrect ? (
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
          {questionStem && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                {questionStem}
              </p>
            </div>
          )}
          
          {/* Question */}
          <div className="space-y-2">
            <h3 className="font-medium text-slate-900">
              {questionText}
            </h3>
          </div>
          
          {/* Options */}
          <div className="space-y-3">
            {options.map((option, index) => {
              const optionId = typeof option === 'string' 
                ? String.fromCharCode(65 + index) 
                : option.id;
              
              const optionText = typeof option === 'string' 
                ? option 
                : option.text;
              
              const isSelected = selectedAnswer === optionId;
              const isCorrectOption = correctAnswer === optionId;
              
              return (
                <button
                  key={optionId}
                  onClick={() => onAnswerSelect(optionId)}
                  disabled={showFeedback}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                    isSelected && !showFeedback && "border-indigo-400 bg-indigo-50",
                    showFeedback && isCorrectOption && "border-green-400 bg-green-50",
                    showFeedback && isSelected && !isCorrectOption && "border-red-400 bg-red-50",
                    !isSelected && !showFeedback && "border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mt-0.5",
                      isSelected && !showFeedback && "bg-indigo-100 text-indigo-700",
                      showFeedback && isCorrectOption && "bg-green-100 text-green-700",
                      showFeedback && isSelected && !isCorrectOption && "bg-red-100 text-red-700",
                      !isSelected && !showFeedback && "bg-slate-100 text-slate-700"
                    )}>
                      {optionId}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {optionText}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Explanation */}
          {showFeedback && explanation && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700">
                <BookOpen className="h-4 w-4" />
                <h3 className="font-medium">Explanation</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                {explanation}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export function StablePracticeSession({ questions, onComplete }: PracticeSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<string[]>([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per question
  const [showFeedback, setShowFeedback] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const supabase = useSupabaseClient();
  const user = useUser();
  
  // Use refs to prevent unnecessary re-renders
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const questionsRef = useRef<QuestionData[]>(questions);

  // Update questions ref when questions prop changes
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = ((currentIndex + 1) / questions.length) * 100;
  
  // Get stats for the current session
  const getSessionStats = useCallback(() => {
    const answered = Object.keys(selectedAnswers).length;
    const correct = questions.filter(
      q => selectedAnswers[q.id] === q.correct_answer
    ).length;
    const incorrect = answered - correct;
    const skipped = skippedQuestions.length;
    const flagged = flaggedQuestions.length;
    
    return { answered, correct, incorrect, skipped, flagged };
  }, [selectedAnswers, questions, skippedQuestions, flaggedQuestions]);

  // Get the current question in a stable way
  const currentQuestion = questions[currentIndex] || null;
  
  // Get a stable question ID
  const questionId = currentQuestion?.id || `question-${currentIndex}`;

  // Validate questions on mount
  useEffect(() => {
    if (!questions || questions.length === 0) {
      toast.error('No questions available for practice');
      onComplete();
    }
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [questions, onComplete]);

  // Move to the next question
  const moveToNextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowFeedback(false);
      setTimeRemaining(120);
    } else {
      // End of questions
      if (user) {
        try {
          const stats = getSessionStats();
          supabase.from('practice_sessions').insert({
            user_id: user.id,
            total_questions: questions.length,
            correct_answers: stats.correct,
            incorrect_answers: stats.incorrect,
            skipped_questions: stats.skipped,
            completed_at: new Date().toISOString(),
          }).then(({ error }) => {
            if (error) throw error;
            toast.success('Practice session completed!');
          });
        } catch (error) {
          console.error('Error saving practice session:', error);
          toast.error('Failed to save your results');
        }
      }
      
      onComplete();
    }
  }, [currentIndex, questions.length, user, getSessionStats, supabase, onComplete]);

  // Handle skipping a question
  const handleSkip = useCallback(() => {
    // Only allow skipping if not showing feedback
    if (!showFeedback) {
      setSkippedQuestions(prev => [...prev, questionId]);
      moveToNextQuestion();
    }
  }, [showFeedback, questionId, moveToNextQuestion]);
  
  // Handle timer
  useEffect(() => {
    // Only start the timer if we're not showing feedback
    if (!showFeedback) {
      timerRef.current = setInterval(() => {
        if (isMountedRef.current) {
          setTimeRemaining(prev => {
            if (prev <= 0) {
              // Auto-skip when time runs out
              if (!showFeedback) {
                setSkippedQuestions(prev => [...prev, questionId]);
                moveToNextQuestion();
              }
              return 120; // Reset timer
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      // Clear the timer when showing feedback
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [showFeedback, currentIndex, questionId, moveToNextQuestion]);

  // Handle answer selection
  const handleAnswerSelect = useCallback((answer: string) => {
    if (!showFeedback) {
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: answer,
      }));
      setShowFeedback(true);
      setTimeRemaining(120);
    }
  }, [showFeedback, questionId]);

  // Handle flagging a question
  const handleFlag = useCallback(() => {
    setFlaggedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  }, [questionId]);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowFeedback(false);
      setTimeRemaining(120);
    } else {
      // End of questions
      handleComplete();
    }
  }, [currentIndex, questions.length]);

  // Handle completion of the practice session
  const handleComplete = useCallback(async () => {
    // Save results to database if user is logged in
    if (user) {
      try {
        const stats = getSessionStats();
        const { error } = await supabase.from('practice_sessions').insert({
          user_id: user.id,
          total_questions: questions.length,
          correct_answers: stats.correct,
          incorrect_answers: stats.incorrect,
          skipped_questions: stats.skipped,
          completed_at: new Date().toISOString(),
        });
        
        if (error) throw error;
        toast.success('Practice session completed!');
      } catch (error) {
        console.error('Error saving practice session:', error);
        toast.error('Failed to save your results');
      }
    }
    
    onComplete();
  }, [user, supabase, questions.length, getSessionStats, onComplete]);

  // Show stats before completing
  const handleShowStats = useCallback(() => {
    setShowStats(true);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header with progress */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium">Question {currentIndex + 1} of {questions.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className={cn(
              "font-medium",
              timeRemaining < 30 ? "text-red-500" : "text-slate-500"
            )}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-1.5" />
      </div>
      
      {/* Main content area with question */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 flex flex-col items-center">
        <div 
          className="w-full max-w-3xl" 
          style={{ 
            minHeight: '400px', 
            contain: 'content',
            position: 'relative',
            isolation: 'isolate'
          }}
        >
          {showStats ? (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h3 className="text-lg font-medium text-slate-900">Practice Session Summary</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-500">Total Questions</p>
                    <p className="text-2xl font-semibold text-slate-900">{questions.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-600">Correct Answers</p>
                    <p className="text-2xl font-semibold text-green-700">{getSessionStats().correct}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">Incorrect Answers</p>
                    <p className="text-2xl font-semibold text-red-700">{getSessionStats().incorrect}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-500">Skipped Questions</p>
                    <p className="text-2xl font-semibold text-slate-900">{getSessionStats().skipped}</p>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowStats(false)}
                    className="px-6"
                  >
                    Return to Questions
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <StableQuestion
              question={currentQuestion}
              selectedAnswer={selectedAnswers[questionId] || null}
              onAnswerSelect={handleAnswerSelect}
              showFeedback={showFeedback}
            />
          )}
        </div>
      </div>
      
      {/* Footer with actions */}
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleFlag}
                    className={cn(
                      flaggedQuestions.includes(questionId) && "text-amber-500 border-amber-200 bg-amber-50"
                    )}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Flag this question</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShowStats}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View session stats</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex items-center gap-2">
            {!showFeedback && (
              <Button
                variant="outline"
                onClick={handleSkip}
                className="gap-1"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            )}
            
            {showFeedback && currentIndex < questions.length - 1 && (
              <Button
                onClick={moveToNextQuestion}
                className="gap-1"
              >
                Next Question
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            
            {showFeedback && currentIndex === questions.length - 1 && (
              <Button
                onClick={handleComplete}
              >
                Complete Practice
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
