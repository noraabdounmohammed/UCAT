import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';
import { updateQuestionProgress } from '@/utils/userProgressStorage';
import { InteractionStatus } from '@/types/practice';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft,
  HelpCircle,
  Bookmark,
  BookmarkCheck,
  Lightbulb,
  Check
} from 'lucide-react';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';

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

// Define stats interface for type safety
interface SessionStats {
  correct: number;
  incorrect: number;
  skipped: number;
  total: number;
  timeSpent: number;
}

interface PracticeSessionProps {
  questions: QuestionData[];
  onComplete: () => void;
}

// Normalize question data to a consistent format
function normalizeQuestion(question: QuestionData): {
  id: string;
  stem: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation: string;
} {
  // Extract the question stem from various possible fields
  const stem = question.question_stem || 
               question.question || 
               question.content || 
               question.individual_question || 
               "No question text available";
  
  // Normalize options to a consistent format
  const options = question.options.map((option, index) => {
    if (typeof option === 'string') {
      return { id: String.fromCharCode(65 + index), text: option };
    }
    return { id: option.id || String.fromCharCode(65 + index), text: option.text };
  });
  
  // Extract correct answer
  let correctAnswer = '';
  if (question.correct_answer) {
    correctAnswer = question.correct_answer;
  } else if (typeof question.correctAnswer === 'number') {
    correctAnswer = String.fromCharCode(65 + question.correctAnswer);
  } else if (typeof question.correctAnswer === 'string') {
    correctAnswer = question.correctAnswer;
  }
  
  // Extract explanation
  const explanation = question.explanation || 
                     question.worked_solution || 
                     "No explanation available";
  
  return {
    id: question.id,
    stem,
    options,
    correctAnswer,
    explanation
  };
}

export function ModernPracticeSession({ questions, onComplete }: PracticeSessionProps) {
  console.log('ModernPracticeSession rendering with questions:', questions);
  const supabase = useSupabaseClient();
  const user = useUser();
  
  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [reviewMode] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<string[]>([]);
  // Stats are calculated on-the-fly when needed, no need to store in state
  const [startTime] = useState(Date.now());
  const [timeElapsed, setTimeElapsed] = useState(0);
  // Performance review state
  const [showPerformanceReview, setShowPerformanceReview] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [answersSummary, setAnswersSummary] = useState<Array<{
    id: string;
    stem: string;
    userAnswer: string;
    userAnswerText: string;
    correctAnswer: string;
    correctAnswerText: string;
    explanation: string;
    isCorrect: boolean;
    isSkipped: boolean;
  }>>([]);
  
  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [startTime]);
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Generate a personalized insight based on performance
  const getPersonalizedInsight = (stats: SessionStats): string => {
    if (stats.incorrect > stats.correct) {
      return "Focus on reviewing the questions you got wrong. Consider studying the explanations and worked solutions carefully.";
    } else if (stats.skipped > 0) {
      return `You skipped ${stats.skipped} questions. Try to answer all questions next time to improve your knowledge.`;
    } else if (stats.correct === stats.total) {
      return "Perfect score! Great job mastering this material. Try increasing the difficulty level for more challenge.";
    } else if (stats.correct / stats.total > 0.8) {
      return "Excellent work! You're showing strong understanding of the material. Keep practicing to achieve mastery.";
    } else {
      return "Good progress! Keep practicing to improve your accuracy and speed.";
    }
  };
  
  // Calculate stats for the performance review
  const calculateStats = (): SessionStats => {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    
    questions.forEach(question => {
      const normalizedQuestion = normalizeQuestion(question);
      const userAnswer = selectedAnswers[normalizedQuestion.id];
      
      if (!userAnswer) {
        skipped++;
      } else if (userAnswer === normalizedQuestion.correctAnswer) {
        correct++;
      } else {
        incorrect++;
      }
    });
    
    return {
      correct,
      incorrect,
      skipped,
      total: questions.length,
      timeSpent: timeElapsed
    };
  };
  
  // Generate answers summary for review
  const getAnswersSummary = () => {
    return questions.map(question => {
      const normalizedQuestion = normalizeQuestion(question);
      const userAnswer = selectedAnswers[normalizedQuestion.id];
      const isCorrect = userAnswer === normalizedQuestion.correctAnswer;
      const isSkipped = !userAnswer;
      
      // Find the text of the user's selected answer
      const userAnswerText = userAnswer ? 
        normalizedQuestion.options.find(opt => opt.id === userAnswer)?.text || '' : 
        '';
      
      // Find the text of the correct answer
      const correctAnswerText = normalizedQuestion.options.find(
        opt => opt.id === normalizedQuestion.correctAnswer
      )?.text || '';
      
      return {
        id: normalizedQuestion.id,
        stem: normalizedQuestion.stem,
        userAnswer,
        userAnswerText,
        correctAnswer: normalizedQuestion.correctAnswer,
        correctAnswerText,
        explanation: normalizedQuestion.explanation,
        isCorrect,
        isSkipped
      };
    });
  };
  
  // Check if questions array is valid and has items
  if (!questions || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 w-full">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }
  
  // If showing performance review, render that instead of questions
  if (showPerformanceReview && sessionStats) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Card className="shadow-md border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl text-center text-indigo-800">
              Practice Session Complete
            </CardTitle>
            <div className="text-center text-xs sm:text-sm text-slate-500 mt-1">
              Session duration: {formatTime(sessionStats.timeSpent)}
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Performance stats cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-green-50 rounded-lg p-3 sm:p-4 text-center border border-green-100">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{sessionStats.correct}</div>
                <div className="text-xs sm:text-sm text-green-700 mt-1">Correct</div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-3 sm:p-4 text-center border border-red-100">
                <div className="text-xl sm:text-2xl font-bold text-red-600">{sessionStats.incorrect}</div>
                <div className="text-xs sm:text-sm text-red-700 mt-1">Incorrect</div>
              </div>
              
              <div className="bg-amber-50 rounded-lg p-3 sm:p-4 text-center border border-amber-100">
                <div className="text-xl sm:text-2xl font-bold text-amber-600">{sessionStats.skipped}</div>
                <div className="text-xs sm:text-sm text-amber-700 mt-1">Skipped</div>
              </div>
            </div>
            
            {/* Performance metrics */}
            <div className="bg-white rounded-lg border p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3 text-slate-700">Performance Summary</h3>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-slate-600">Accuracy</span>
                  <span className="text-xs sm:text-sm font-medium">
                    {sessionStats.total > 0 ? Math.round((sessionStats.correct / (sessionStats.total - sessionStats.skipped)) * 100) : 0}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                  <div 
                    className="bg-indigo-600 h-1.5 sm:h-2 rounded-full" 
                    style={{ width: `${sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center mt-2 sm:mt-3">
                  <span className="text-xs sm:text-sm text-slate-600">Completion</span>
                  <span className="text-xs sm:text-sm font-medium">
                    {sessionStats.total > 0 ? Math.round(((sessionStats.correct + sessionStats.incorrect) / sessionStats.total) * 100) : 0}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                  <div 
                    className="bg-blue-500 h-1.5 sm:h-2 rounded-full" 
                    style={{ width: `${sessionStats.total > 0 ? Math.round(((sessionStats.correct + sessionStats.incorrect) / sessionStats.total) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Practice insights */}
            <div className="bg-indigo-50 rounded-lg p-3 sm:p-4 border border-indigo-100">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-indigo-100 p-1 sm:p-1.5 rounded-full">
                  <Lightbulb className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-indigo-600" />
                </div>
                <h3 className="text-xs sm:text-sm font-medium text-indigo-800">Practice Insights</h3>
              </div>
              
              <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-700 space-y-2">
                <p>{getPersonalizedInsight(sessionStats)}</p>
              </div>
            </div>
            
            {/* Answers review section */}
            <div className="bg-white rounded-lg border p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3 text-slate-700">Question Review</h3>
              
              <div className="space-y-4">
                {answersSummary.map((answer, index) => (
                  <Card key={answer.id} className="shadow-sm border overflow-hidden">
                    <CardHeader className="p-3 bg-gray-50 border-b">
                      <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
                        <span className="bg-gray-200 text-gray-700 rounded-full h-5 w-5 flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        <span className="flex-1">{answer.stem}</span>
                        {answer.isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : answer.isSkipped ? (
                          <HelpCircle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-3 sm:p-4 space-y-3 text-xs sm:text-sm">
                      {/* User's answer */}
                      <div className="space-y-1">
                        <div className="font-medium text-gray-700">Your Answer:</div>
                        <div className={cn(
                          "p-2 rounded border",
                          answer.isCorrect 
                            ? "bg-green-50 border-green-100 text-green-700" 
                            : answer.isSkipped 
                              ? "bg-amber-50 border-amber-100 text-amber-700" 
                              : "bg-red-50 border-red-100 text-red-700"
                        )}>
                          {answer.isSkipped ? "Skipped" : answer.userAnswerText}
                        </div>
                      </div>
                      
                      {/* Correct answer */}
                      <div className="space-y-1">
                        <div className="font-medium text-gray-700">Correct Answer:</div>
                        <div className="p-2 rounded bg-green-50 border border-green-100 text-green-700">
                          {answer.correctAnswerText}
                        </div>
                      </div>
                      
                      {/* Explanation */}
                      {answer.explanation && (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-700">Explanation:</div>
                          <div className="p-2 rounded bg-blue-50 border border-blue-100 text-blue-700">
                            <div className="prose prose-sm max-w-none whitespace-pre-line">
                              {answer.explanation}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Worked solution (if available) */}
                      {answer.explanation && answer.explanation.includes('Step') && (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-700">Worked Solution:</div>
                          <div className="p-2 rounded bg-indigo-50 border border-indigo-100 text-indigo-700">
                            <div className="prose prose-sm max-w-none">
                              <ol className="list-decimal pl-4 space-y-1">
                                {answer.explanation
                                  .split('\n')
                                  .filter(line => line.trim().startsWith('Step'))
                                  .map((step, i) => (
                                    <li key={i}>{step.replace(/^Step \d+:?\s*/, '')}</li>
                                  ))}
                              </ol>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-center border-t p-3 sm:p-4 bg-gradient-to-r from-gray-50/80 to-white">
            <Button
              onClick={() => onComplete()}
              className="flex items-center gap-1.5 h-9 text-sm bg-indigo-500 hover:bg-indigo-600 rounded"
              size="default"
            >
              Complete
              <Check className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Normalize current question
  const normalizedQuestion = normalizeQuestion(questions[currentIndex]);
  
  // Check if this is the last question
  const isLastQuestion = currentIndex === questions.length - 1;
  
  // Get the current answer
  const currentAnswer = selectedAnswers[normalizedQuestion.id] || '';
  
  // Check if current question is answered
  const isAnswered = Boolean(currentAnswer);
  
  // Check if current question is bookmarked
  const isBookmarked = bookmarkedQuestions.includes(normalizedQuestion.id);
  
  // Is answer correct
  const isCorrect = currentAnswer === normalizedQuestion.correctAnswer;
  
  // Handle selecting an answer
  const handleSelectAnswer = (optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [normalizedQuestion.id]: optionId
    }));
    
    // Determine if answer is correct
    const isAnswerCorrect = optionId === normalizedQuestion.correctAnswer;
    
    // Update user progress in local storage
    const status: InteractionStatus = isAnswerCorrect ? 'correct' : 'incorrect';
    const question = questions[currentIndex];
    
    // Get topic, skill, and section from the question
    const topic = (question.main_topic || question.topic || '') as string;
    const skill = (question.micro_skill || question.microSkill || '') as string;
    const section = (question.section || '') as string;
    
    // Update progress in local storage
    updateQuestionProgress(
      normalizedQuestion.id,
      status,
      topic,
      skill,
      section
    );
    
    // Auto-show explanation after selecting an answer
    setShowExplanation(true);
  };
  
  // Handle moving to next question
  const handleNextQuestion = () => {
    // If current question is not answered, mark it as skipped
    if (!isAnswered) {
      const question = questions[currentIndex];
      
      // Get topic, skill, and section from the question
      const topic = question.main_topic || question.topic || '';
      const skill = question.micro_skill || question.microSkill || '';
      const section = question.section || '';
      
      // Update progress in local storage as skipped
      updateQuestionProgress(
        normalizedQuestion.id,
        'skipped',
        topic as string,
        skill as string,
        section as string
      );
    }
    
    if (isLastQuestion && !reviewMode) {
      // Calculate stats and generate answers summary for the performance review
      const stats = calculateStats();
      const summary = getAnswersSummary();
      
      // Save results to database if user is logged in
      if (user) {
        saveSessionResults(stats);
      }
      
      // Show the performance review screen instead of immediately returning to filter page
      setSessionStats(stats);
      setAnswersSummary(summary);
      setShowPerformanceReview(true);
    } else if (reviewMode && isLastQuestion) {
      // If in review mode and at the last question, go back to filter page
      onComplete();
    } else {
      // Move to next question
      // Jump to top of page instantly
      window.scrollTo({ top: 0, behavior: 'auto' });
      setCurrentIndex(currentIndex + 1);
      setShowExplanation(false);
    }
  };
  
  // Handle moving to previous question
  const handlePreviousQuestion = () => {
    // Jump to top of page instantly
    window.scrollTo({ top: 0, behavior: 'auto' });
    setCurrentIndex(prev => Math.max(prev - 1, 0));
    setShowExplanation(false);
  };
  
  // Toggle bookmark for current question
  const handleToggleBookmark = () => {
    const newBookmarkState = !isBookmarked;
    
    if (isBookmarked) {
      setBookmarkedQuestions(prev => prev.filter(id => id !== normalizedQuestion.id));
    } else {
      setBookmarkedQuestions(prev => [...prev, normalizedQuestion.id]);
    }
    
    // If bookmarking, update the question status to flagged in local storage
    if (newBookmarkState) {
      const question = questions[currentIndex];
      
      // Get topic, skill, and section from the question
      const topic = question.main_topic || question.topic || '';
      const skill = question.micro_skill || question.microSkill || '';
      const section = question.section || '';
      
      // Update progress in local storage
      updateQuestionProgress(
        normalizedQuestion.id,
        'flagged',
        topic as string,
        skill as string,
        section as string
      );
    }
  };
  
  // Save session results to the database
  const saveSessionResults = async (stats: SessionStats) => {
    if (!user) return;
    
    try {
      // Save session stats to the database
      const { error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: user.id,
          correct_count: stats.correct,
          incorrect_count: stats.incorrect,
          skipped_count: stats.skipped,
          total_questions: stats.total,
          time_spent_seconds: stats.timeSpent,
          completed_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error saving session results:', error);
        toast.error('Failed to save your progress');
        return;
      }
      
      console.log('Session results saved successfully');
      
      // Save individual question results
      const questionResults = questions.map(q => {
        const normalized = normalizeQuestion(q);
        const answer = selectedAnswers[normalized.id];
        const isCorrect = answer === normalized.correctAnswer;
        
        return {
          user_id: user.id,
          question_id: normalized.id,
          selected_answer: answer || null,
          is_correct: answer ? isCorrect : null,
          is_bookmarked: bookmarkedQuestions.includes(normalized.id),
          time_spent_seconds: Math.floor(stats.timeSpent / questions.length) // Approximate time per question
        };
      });
      
      // Log question results for debugging
      console.log('Question results prepared:', questionResults.length);
      
      // Save question attempts to the database
      const { error: attemptsError } = await supabase
        .from('question_attempts')
        .insert(questionResults);
        
      if (attemptsError) {
        console.error('Error saving question attempts:', attemptsError);
        toast.error('Failed to save question attempts');
      } else {
        toast.success('Practice results saved successfully');
      }
    } catch (err) {
      console.error('Error in saveSessionResults:', err);
      toast.error('Failed to save your progress');
    }
  };
  

  
  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
      {/* Header with progress and stats - mobile responsive */}
      <div className="bg-white rounded-md sm:rounded-lg border border-gray-200/80 shadow-sm p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="bg-indigo-100 rounded-full p-1 sm:p-1.5">
              <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-indigo-600" />
            </div>
            <div className="text-xs sm:text-sm font-medium">{formatTime(timeElapsed)}</div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            {reviewMode && (
              <div className="bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium">
                Review Mode
              </div>
            )}
            
            <div className="flex items-center gap-1 text-red-500">
              <XCircle className="h-3 w-3" />
              <span>
                {Object.values(selectedAnswers).filter((ans, idx) => {
                  const q = questions[idx];
                  return ans && ans !== normalizeQuestion(q).correctAnswer;
                }).length}
              </span>
            </div>
            
            {bookmarkedQuestions.length > 0 && (
              <div className="flex items-center gap-1 text-indigo-500">
                <Bookmark className="h-3 w-3" />
                <span>{bookmarkedQuestions.length}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="relative h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
          ></div>
        </div>
      </div>
      
      {/* Question card - Mobile responsive design */}
      <Card className="shadow-sm border-0 overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-white border-b border-gray-100 pb-3 sm:pb-4 pt-3 sm:pt-4 px-3 sm:px-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              <span className="text-[10px] sm:text-xs font-medium text-indigo-600">
                Question {currentIndex + 1}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleBookmark}
              className={cn(
                "h-6 sm:h-7 w-6 sm:w-7 p-0 rounded-full hover:bg-indigo-50",
                isBookmarked && "text-indigo-500"
              )}
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              ) : (
                <Bookmark className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              )}
            </Button>
          </div>
          <CardTitle className="text-sm sm:text-base font-medium mt-2 sm:mt-3 text-gray-800 leading-relaxed">
            {normalizedQuestion.stem}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-5">
          <RadioGroup 
            value={currentAnswer} 
            onValueChange={handleSelectAnswer}
            className="space-y-2 sm:space-y-3"
          >
            {normalizedQuestion.options.map((option) => {
              const isSelected = currentAnswer === option.id;
              const isCorrectOption = normalizedQuestion.correctAnswer === option.id;
              const showCorrectness = isAnswered && showExplanation;
              
              return (
                <div 
                  key={option.id}
                  className={cn(
                    "flex items-center space-x-2 sm:space-x-3 rounded border p-2.5 sm:p-3.5 transition-all text-xs sm:text-sm",
                    isSelected && !showCorrectness && "border-indigo-200 bg-indigo-50/30 shadow-sm",
                    showCorrectness && isCorrectOption && "border-green-200 bg-green-50/30 shadow-sm",
                    showCorrectness && isSelected && !isCorrectOption && "border-red-200 bg-red-50/30 shadow-sm",
                    !isSelected && !showCorrectness && "hover:border-indigo-100 hover:bg-indigo-50/10"
                  )}
                >
                  <RadioGroupItem 
                    value={option.id} 
                    id={`option-${option.id}`}
                    disabled={false}
                    className={cn(
                      "h-3.5 sm:h-4 w-3.5 sm:w-4",
                      showCorrectness && isCorrectOption && "text-green-500 border-green-500",
                      showCorrectness && isSelected && !isCorrectOption && "text-red-500 border-red-500"
                    )}
                  />
                  <Label 
                    htmlFor={`option-${option.id}`}
                    className="flex-1 cursor-pointer font-normal text-gray-700 text-xs sm:text-sm"
                  >
                    <div className="flex items-center">
                      <div className="flex-1">
                        <span className="font-medium mr-1.5 sm:mr-2 text-indigo-600 w-4 sm:w-5">{option.id}.</span>
                        <span className="leading-relaxed">{option.text}</span>
                      </div>
                      {showCorrectness && (
                        <div>
                          {isCorrectOption && (
                            <CheckCircle className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-green-500 ml-1.5 sm:ml-2 shrink-0" />
                          )}
                          {isSelected && !isCorrectOption && (
                            <XCircle className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-red-500 ml-1.5 sm:ml-2 shrink-0" />
                          )}
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          
          {/* Explanation section - Mobile responsive */}
          {showExplanation && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-gray-100">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <div className="bg-amber-100 rounded-full p-0.5 sm:p-1">
                  <Lightbulb className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-amber-600" />
                </div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-800">Explanation</h3>
              </div>
              <div className="bg-gradient-to-r from-amber-50/80 to-white border border-amber-100/80 rounded p-3 sm:p-4 text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {normalizedQuestion.explanation}
              </div>
              
              {isAnswered && (
                <div className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm bg-gray-50 p-2 sm:p-3 rounded border border-gray-100">
                  {isCorrect ? (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-green-600">
                      <div className="bg-green-100 rounded-full p-0.5 sm:p-1">
                        <CheckCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                      </div>
                      <span className="font-medium text-xs sm:text-sm">Correct answer!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-red-600">
                      <div className="bg-red-100 rounded-full p-0.5 sm:p-1">
                        <XCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                      </div>
                      <span className="text-xs sm:text-sm">
                        <span className="font-medium">Incorrect.</span> The correct answer is <span className="font-medium">{normalizedQuestion.correctAnswer}</span>.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-3 sm:p-4 bg-gradient-to-r from-gray-50/80 to-white">
          <div>
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-9 text-[10px] sm:text-xs px-2 sm:px-3 border-gray-200 rounded"
              size="sm"
            >
              <ArrowLeft className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
              Previous
            </Button>
          </div>
          
          <div className="flex gap-1.5 sm:gap-2">
            {!showExplanation && !reviewMode && isAnswered && (
              <Button
                variant="secondary"
                onClick={() => setShowExplanation(true)}
                className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-9 text-[10px] sm:text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-0 rounded"
                size="sm"
              >
                <HelpCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                Show Explanation
              </Button>
            )}
            
            <Button
              onClick={handleNextQuestion}
              className="flex items-center gap-1 sm:gap-1.5 h-7 sm:h-9 text-[10px] sm:text-xs bg-indigo-500 hover:bg-indigo-600 rounded"
              size="sm"
            >
              {isLastQuestion && !reviewMode ? (
                <>
                  Complete
                  <Check className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
