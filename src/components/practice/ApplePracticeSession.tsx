import { useState, useEffect, useRef, useMemo } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataVisualization } from './DataVisualization';
import { AIHelper } from './AIHelper';
import './apple-question-styles.css';
import { updateQuestionProgress } from '../../utils/userProgressStorage';
import ReactMarkdown from 'react-markdown';

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
  // New properties for table and chart data
  table?: {
    columns?: string[];
    rows?: Array<Array<string | number>>;
  };
  chart?: {
    type?: string;
    data?: Array<{label?: string; value?: number}> | Record<string, unknown>;
  };
  [key: string]: unknown; 
}

interface PracticeSessionProps {
  questions: QuestionData[];
  onComplete: () => void;
  section?: string; // Add section prop to track which section questions belong to
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

export function ApplePracticeSession({ questions, onComplete, section = 'QR' }: PracticeSessionProps) {
  // Component state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [skippedQuestions] = useState<string[]>([]); // Kept for future use
  const [flaggedQuestions] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showStats] = useState(false); // Kept for future use
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Track seen questions to prevent repeats
  const [seenQuestions, setSeenQuestions] = useState<Set<string>>(new Set());
  // State for exit confirmation dialog
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Services
  const supabase = useSupabaseClient();
  const user = useUser();

  // Refs to prevent unnecessary re-renders
  const questionsRef = useRef<QuestionData[]>(questions);
  
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
    
    // Show feedback with explanation automatically displayed
    setShowFeedback(true);
    
    // Determine if the answer is correct
    const isCorrect = answer === questionContent.correctAnswer;
    const status = isCorrect ? 'correct' : 'incorrect';
    
    // Log the current question to debug its structure
    console.log('Current question structure:', currentQuestion);
    
    // Extract topic, skill, and section from the question
    // Using optional chaining and fallbacks for safety
    const topic = currentQuestion?.topic || '';
    const skill = Array.isArray(currentQuestion?.tags) && currentQuestion.tags.length > 0 
      ? currentQuestion.tags[0] 
      : '';
    // Use the section passed from props
    // section prop is already defined in function parameters with default 'QR'
    
    // Update user progress in local storage
    // Ensure all parameters are strings
    updateQuestionProgress(
      String(questionId), 
      status, 
      String(topic || 'General'), 
      String(skill || 'General'), 
      String(section)
    );
    console.log(`Question ${questionId} marked as ${status} for topic: ${topic}, skill: ${skill}, section: ${section}`);
    
    // Track user progress if authenticated (for future server-side tracking)
    if (user && supabase) {
      console.log('Tracking user progress for question:', questionId, 'Status:', status);
    }
  };

  // Handle moving to the next question
  const handleNextQuestion = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setShowFeedback(false);
    
    // Scroll to top of page smoothly
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
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

  // No longer needed as explanation is shown automatically
  // Keeping the showExplanation state for future use

  // Handle exit confirmation
  const handleExitConfirm = () => {
    setShowExitConfirmation(false);
    // Call the onComplete callback to return to the practice section
    onComplete();
  };

  const handleExitCancel = () => {
    setShowExitConfirmation(false);
  };

  // Render the component
  return (
    <>
      {/* Modern ChatGPT-style Navbar - Outside container for proper sticky */}
      <div className="sticky top-0 left-0 right-0 z-50 w-full" style={{
        background: '#F5F5F7',
        borderBottom: '0.5px solid rgba(0, 0, 0, 0.06)',
        margin: '0',
        padding: '0'
      }}>
        <div className="flex items-center justify-between h-16 px-5">
          {/* Left - Modern Back button */}
          <button 
            onClick={() => setShowExitConfirmation(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ease-out active:scale-90"
            style={{
              background: 'transparent',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label="Exit to main page"
          >
            <ArrowLeft className="h-5 w-5 text-[#1D1D1F]" strokeWidth={2.5} />
          </button>
          
          {/* Center - Question Counter */}
          <div className="flex-1 text-center px-6">
            <div className="text-[14px] text-[#1D1D1F] font-semibold tracking-wide">
              Q{currentIndex + 1} of {questions.length}
            </div>
          </div>
          
          {/* Right - Modern Action space */}
          <div className="w-9 h-9 flex items-center justify-center">
            {/* Future: Settings or menu button */}
          </div>
        </div>
      </div>

      <div className="apple-question-container">

      {/* Exit confirmation dialog */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-xl p-5 max-w-xs w-full shadow-lg">
            <h3 className="text-[17px] font-medium text-[#1D1D1F] mb-3">Exit Practice Session?</h3>
            <p className="text-[15px] text-[#3A3A3C] mb-5" data-component-name="ApplePracticeSession">Your progress will be automatically saved as you practice.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={handleExitCancel}
                className="flex-1 py-2 px-4 rounded-xl border border-[#8E8E93] text-[#1D1D1F] font-medium text-[15px]"
              >
                Cancel
              </button>
              <button 
                onClick={handleExitConfirm}
                className="flex-1 py-2 px-4 rounded-xl bg-[#FF3B30] text-white font-medium text-[15px]"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-1 pb-12">
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
              {/* Question title in a professional Apple-style card */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '32px',
                marginBottom: '28px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  width: '100%',
                  alignItems: 'flex-start'
                }}>

                  {/* Combined question stem and question in same paragraph */}
                  {(() => {
                    // Simple function to parse markdown bold text and format combined content
                    const parseMarkdown = (text: string) => {
                      // Replace **text** with <strong>text</strong>
                      return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    };
                    
                    // Split content into passage and question, then combine them
                    const parts = questionContent.question.split('\n\n');
                    if (parts.length > 1) {
                      // Combine stem and question with the question part being bold
                      const stem = parts.slice(0, -1).join(' ');
                      const question = parts[parts.length - 1];
                      const combinedContent = `${stem} <strong>${question}</strong>`;
                      
                      return (
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: '400',
                            color: '#2C2C2E',
                            margin: '0 0 20px 0',
                            lineHeight: '1.7',
                            width: '100%',
                            textAlign: 'left',
                            hyphens: 'auto',
                            letterSpacing: '-0.01em'
                          }}
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(combinedContent) }}
                        />
                      );
                    } else {
                      // Single part - just display as is
                      return (
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: '400',
                            color: '#2C2C2E',
                            margin: '0 0 20px 0',
                            lineHeight: '1.7',
                            width: '100%',
                            textAlign: 'left',
                            hyphens: 'auto',
                            letterSpacing: '-0.01em'
                          }}
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(questionContent.question) }}
                        />
                      );
                    }
                  })()}
                  
                  {/* Data visualization inside question container - only show if data exists */}
                  {currentQuestion && (currentQuestion.table || currentQuestion.chart || (currentQuestion.data_block && Array.isArray(currentQuestion.data_block) && currentQuestion.data_block.length > 0)) && (
                    <div className="apple-data-visualization mt-6">
                      {/* Handle table data */}
                      {currentQuestion.table && (
                        <div className="mb-4">
                          <DataVisualization 
                            type="table" 
                            data={currentQuestion.table} 
                          />
                        </div>
                      )}
                      
                      {/* Handle chart data */}
                      {currentQuestion.chart && (
                        <div className="mb-4">
                          <DataVisualization 
                            type={currentQuestion.chart?.type || 'bar_chart'} 
                            data={currentQuestion.chart?.data} 
                          />
                        </div>
                      )}
                      
                      {/* Handle legacy data_block format */}
                      {currentQuestion.data_block && !currentQuestion.table && !currentQuestion.chart && (
                        <div className="mb-4">
                          <DataVisualization 
                            type={currentQuestion.data_type || 'bar_chart'} 
                            data={currentQuestion.data_block} 
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Answer options */}
              <div className="apple-answer-options apple-slide-up" style={{ width: '100%', alignItems: 'flex-start', marginLeft: '0' }}>
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
                        "apple-answer-option rounded-xl border border-[#E5E5EA] bg-white p-4 mb-1.5 flex items-center transition-all",
                        showFeedback && isCorrect && "correct border-[#34C759] bg-[rgba(52,199,89,0.05)]",
                        showFeedback && isSelected && !isCorrect && "incorrect border-[#FF3B30] bg-[rgba(255,59,48,0.05)]",
                        !showFeedback && isSelected && "selected border-[#007AFF] bg-[rgba(0,122,255,0.05)]",
                        !showFeedback && !isSelected && "hover:border-[#8E8E93] hover:bg-[#F5F5F7]"
                      )}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#F5F5F7] mr-3 font-medium text-[14px] text-[#1D1D1F]">
                        {optionLetter}
                      </div>
                      <div className="flex-1 text-[18px] text-[#1D1D1F] font-normal leading-relaxed">{optionText}</div>
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
              </div>
            
            {/* Action buttons - moved above feedback section */}
            {showFeedback && (
              <div className="flex justify-center w-full mt-[-24px] mb-8">
                {currentIndex === questions.length - 1 || seenQuestions.size >= questions.length ? (
                  <button
                    className="py-2.5 px-5 rounded-xl bg-[#007AFF] text-white font-medium text-[17px] flex items-center justify-center w-full transition-all hover:bg-[#0062CC] active:bg-[#0055B3] disabled:opacity-40 shadow-sm"
                    onClick={() => {
                      toast.success('Practice session completed!');
                      onComplete();
                    }}
                    disabled={isTransitioning}
                  >
                    Complete Session
                  </button>
                ) : (
                  <button
                    className="py-2.5 px-5 rounded-xl bg-[#007AFF] text-white font-medium text-[17px] flex items-center justify-center w-full transition-all hover:bg-[#0062CC] active:bg-[#0055B3] disabled:opacity-40 shadow-sm"
                    onClick={handleNextQuestion}
                    disabled={isTransitioning}
                  >
                    <span>Next Question</span>
                    <ChevronRight className="h-4 w-4 ml-1.5" />
                  </button>
                )}
              </div>
            )}
            
            {/* Feedback section */}
            {showFeedback && (
              <div className={cn(
                "apple-feedback rounded-2xl p-6 mb-6",
                selectedAnswers[questionId] === questionContent.correctAnswer 
                  ? "bg-[rgba(52,199,89,0.08)] border border-[#34C759]" 
                  : "bg-[rgba(255,59,48,0.08)] border border-[#FF3B30]"
              )}>
                <div className="flex items-center gap-3 font-semibold text-[18px]">
                  {selectedAnswers[questionId] === questionContent.correctAnswer ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-[#34C759]" />
                      <span className="text-[#1D1D1F]">Correct Answer</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-[#FF3B30]" />
                      <span className="text-[#1D1D1F]">Incorrect Answer</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Explanation section - automatically shown when question is answered */}
            {showFeedback && questionContent.explanation && (
              <div className="apple-explanation bg-white rounded-2xl p-6 border border-[#E5E5EA] shadow-sm mt-6 apple-fade-in">
                <BookOpen className="h-6 w-6 text-[#007AFF] mb-4" />
                <span className="font-semibold text-[18px] text-[#1D1D1F] mb-4 block">Explanation</span>
                
                <div className="explanation-content prose prose-lg max-w-none" style={{
                  fontSize: '17px',
                  lineHeight: '1.7',
                  color: '#1D1D1F'
                }}>
                  <ReactMarkdown
                    components={{
                      h1: ({children}) => <h1 className="text-xl font-bold text-gray-900 mb-4 mt-6">{children}</h1>,
                      h2: ({children}) => <h2 className="text-lg font-semibold text-gray-900 mb-3 mt-5">{children}</h2>,
                      h3: ({children}) => <h3 className="text-base font-semibold text-gray-900 mb-2 mt-4">{children}</h3>,
                      p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="mb-4 space-y-2">{children}</ul>,
                      ol: ({children}) => <ol className="mb-4 space-y-2 list-decimal list-inside">{children}</ol>,
                      li: ({children}) => <li className="flex items-start space-x-2"><span className="text-blue-500 font-bold mt-0.5">•</span><span className="flex-1">{children}</span></li>,
                      strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      em: ({children}) => <em className="italic text-gray-700">{children}</em>,
                      code: ({children}) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-700">{children}</blockquote>
                    }}
                  >
                    {questionContent.explanation}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* AI Helper section - separate from explanation */}
            {showFeedback && (
              <div className="mt-6">
                <AIHelper 
                  question={currentQuestion}
                  selectedAnswer={selectedAnswers[questionId] || null}
                  correctAnswer={questionContent.correctAnswer}
                  explanation={questionContent.explanation || ''}
                  integrated={false}
                />
              </div>
            )}

            {/* Action buttons moved above the feedback section */}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
