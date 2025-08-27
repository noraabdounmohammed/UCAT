import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  ChevronRight,
  Menu,
  Home,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIHelper } from './AIHelper';
import { ThemeToggle } from '../ui/ThemeToggle';
import { FontSizeToggle } from '../ui/FontSizeToggle';
import './apple-question-styles.css';
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

export function ApplePracticeSession({ questions, onComplete }: PracticeSessionProps) {
  // Component state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  // Refs to prevent unnecessary re-renders
  const questionsRef = useRef<QuestionData[]>(questions);
  
  // Update questions ref when prop changes
  useEffect(() => {
    if (questions && questions.length > 0) {
      questionsRef.current = questions;
    }
  }, [questions]);

  // Get the current question
  const currentQuestion = useMemo(() => {
    return questionsRef.current[currentIndex];
  }, [currentIndex]);

  // Stable question ID
  const questionId = useMemo(() => {
    return currentQuestion?.id || `question-${currentIndex}`;
  }, [currentQuestion, currentIndex]);

  // Stable question content
  const questionContent: StableQuestionContent = useMemo(() => {
    if (!currentQuestion) {
      return {
        id: `question-${currentIndex}`,
        question: 'Loading question...',
        stem: '',
        options: [],
        correctAnswer: 'A',
        explanation: ''
      };
    }

    const questionText = currentQuestion.individual_question || 
                        currentQuestion.content || 
                        currentQuestion.question || 
                        currentQuestion.question_stem || 
                        'No question text available';

    const options = currentQuestion.options || [];
    const correctAnswer = currentQuestion.correct_answer || 
                         currentQuestion.correctAnswer || 
                         'A';
    const explanation = currentQuestion.worked_solution || 
                       currentQuestion.explanation || 
                       'No explanation available';

    return {
      id: currentQuestion.id || `question-${currentIndex}`,
      question: questionText,
      stem: questionText,
      options,
      correctAnswer: String(correctAnswer),
      explanation
    };
  }, [currentQuestion, currentIndex]);

  // Track questions shown in chat to avoid duplicates
  const [chatShownQuestions, setChatShownQuestions] = useState<Set<string>>(new Set());

  // Effect to listen for navigation events from AIHelper
  useEffect(() => {
    const handleRequestNextQuestionData = () => {
      const currentQuestionId = questions[currentIndex]?.id;
      let nextQuestion = null;
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        if (!chatShownQuestions.has(question.id) && question.id !== currentQuestionId) {
          nextQuestion = question;
          break;
        }
      }

      if (nextQuestion) {
        setChatShownQuestions(prev => new Set([...prev, nextQuestion.id]));
        window.dispatchEvent(new CustomEvent('nextQuestionDataReceived', { 
          detail: nextQuestion 
        }));
      } else {
        window.dispatchEvent(new CustomEvent('nextQuestionDataReceived', { 
          detail: null 
        }));
      }
    };

    window.addEventListener('requestNextQuestionData', handleRequestNextQuestionData);
    return () => {
      window.removeEventListener('requestNextQuestionData', handleRequestNextQuestionData);
    };
  }, [questions, chatShownQuestions, currentIndex]);


  // Navigation functions
  const handlePreviousQuestionNav = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setShowFeedback(false);
        setIsTransitioning(false);
        // Clear any selected answer for the previous question
        const prevQuestionId = questions[currentIndex - 1]?.id || `question-${currentIndex - 1}`;
        setSelectedAnswers(prev => {
          const newAnswers = { ...prev };
          delete newAnswers[prevQuestionId];
          return newAnswers;
        });
      }, 150);
    }
  };

  const handleNextQuestionNav = () => {
    if (currentIndex < questions.length - 1) {
      setIsTransitioning(true);
      // Jump to top of page instantly
      window.scrollTo({ top: 0, behavior: 'auto' });
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setShowFeedback(false);
        setIsTransitioning(false);
        // Clear any selected answer for the new question
        const nextQuestionId = questions[currentIndex + 1]?.id || `question-${currentIndex + 1}`;
        setSelectedAnswers(prev => {
          const newAnswers = { ...prev };
          delete newAnswers[nextQuestionId];
          return newAnswers;
        });
      }, 150);
    }
  };

  // Handle selecting an answer
  const handleAnswerSelect = (answer: string) => {
    if (showFeedback || isTransitioning) return;
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    setShowFeedback(true);
    
    // Track progress if needed - simplified for now
    console.log(`Question ${questionId} answered: ${answer === questionContent.correctAnswer ? 'correct' : 'incorrect'}`);
  };

  const handleExitConfirm = () => {
    setShowExitConfirmation(false);
    onComplete();
  };

  const handleExitCancel = () => {
    setShowExitConfirmation(false);
  };

  // Render the component
  return (
    <>
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ChatGPT-style Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out z-50 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Doctoprep</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 p-4 space-y-2">
            <button
              onClick={() => {
                setSidebarOpen(false);
                setShowExitConfirmation(true);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <Home className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100">Dashboard</span>
            </button>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>
              <ThemeToggle />
            </div>
            <div className="space-y-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Font Size</span>
              <FontSizeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Modern ChatGPT-style Navbar */}
      <div className="sticky top-0 left-0 right-0 z-30 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between h-16 px-5">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ease-out active:scale-90 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5 text-gray-900 dark:text-gray-100" strokeWidth={2.5} />
          </button>

          <div className="flex-1 text-center px-6">
            <div className="text-[14px] text-gray-900 dark:text-gray-100 font-semibold tracking-wide">
              Q{currentIndex + 1} of {questions.length}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePreviousQuestionNav}
              disabled={currentIndex === 0}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ease-out active:scale-90",
                currentIndex === 0 
                  ? "opacity-30 cursor-not-allowed" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              aria-label="Previous question"
            >
              <ChevronRight className="h-5 w-5 text-gray-900 dark:text-gray-100 rotate-180" strokeWidth={2.5} />
            </button>

            <button 
              onClick={handleNextQuestionNav}
              disabled={currentIndex === questions.length - 1}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ease-out active:scale-90",
                currentIndex === questions.length - 1 
                  ? "opacity-30 cursor-not-allowed" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              aria-label="Next question"
            >
              <ChevronRight className="h-5 w-5 text-gray-900 dark:text-gray-100" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Exit confirmation dialog */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 max-w-xs w-full shadow-lg">
            <h3 className="text-[17px] font-medium text-[#1D1D1F] dark:text-gray-100 mb-3">Exit Practice Session?</h3>
            <p className="text-[15px] text-[#3A3A3C] dark:text-gray-300 mb-5">Your progress will be automatically saved as you practice.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={handleExitCancel}
                className="flex-1 py-2 px-4 rounded-xl border border-[#8E8E93] dark:border-gray-600 text-[#1D1D1F] dark:text-gray-100 font-medium text-[15px]"
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
          <div className="apple-question-content">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#E5E5EA] dark:border-gray-700 p-8 mb-7" style={{
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'rgba(0, 0, 0, 0.06) 0px 4px 16px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '100%',
                alignItems: 'flex-start'
              }}>
                <div className="text-gray-900 dark:text-gray-100 apple-question-text" style={{
                  margin: '0 0 20px 0',
                  lineHeight: '1.7',
                  width: '100%',
                  textAlign: 'left',
                  hyphens: 'auto',
                  letterSpacing: '-0.01em'
                }} dangerouslySetInnerHTML={{ __html: questionContent.question }} />
              </div>
            </div>

            <div className="apple-answer-options apple-slide-up" style={{
              width: '100%',
              alignItems: 'flex-start',
              marginLeft: '0'
            }}>
              {questionContent.options.map((option, index) => {
                const optionLetter = String.fromCharCode(65 + index);
                const optionText = typeof option === 'string' ? option.replace(/^[A-D]\.\s*/, '') : option.text;
                
                const isSelected = selectedAnswers[questionId] === optionLetter;
                const isCorrect = questionContent.correctAnswer === optionLetter;
                
                return (
                  <button
                    key={index}
                    disabled={showFeedback || isTransitioning}
                    onClick={() => handleAnswerSelect(optionLetter)}
                    className={cn(
                      "apple-answer-option rounded-xl border border-[#E5E5EA] dark:border-gray-700 bg-white dark:bg-gray-800 p-4 mb-1.5 flex items-center transition-all",
                      showFeedback && isCorrect && "correct border-[#34C759] bg-[rgba(52,199,89,0.05)] dark:border-[#34C759] dark:bg-[rgba(52,199,89,0.15)]",
                      showFeedback && isSelected && !isCorrect && "incorrect border-[#FF3B30] bg-[rgba(255,59,48,0.05)] dark:border-[#FF3B30] dark:bg-[rgba(255,59,48,0.15)]",
                      !showFeedback && isSelected && "selected border-[#007AFF] bg-[rgba(0,122,255,0.05)] dark:border-[#007AFF] dark:bg-[rgba(0,122,255,0.15)]",
                      !showFeedback && !isSelected && "hover:border-[#8E8E93] hover:bg-[#F5F5F7] dark:hover:bg-gray-700"
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#F5F5F7] dark:bg-gray-700 mr-3 font-medium text-[14px] text-[#1D1D1F] dark:text-gray-100">
                      {optionLetter}
                    </div>
                    <div className="flex-1 apple-answer-text text-gray-900 dark:text-gray-100 leading-relaxed">{optionText}</div>
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

            {showFeedback && (
              <div className={cn(
                "rounded-2xl p-4 mb-6 flex items-center gap-3 apple-slide-up",
                selectedAnswers[questionId] === questionContent.correctAnswer 
                  ? "bg-[rgba(52,199,89,0.08)] border border-[#34C759]" 
                  : "bg-[rgba(255,59,48,0.08)] border border-[#FF3B30]"
              )} style={{
                width: '100%',
                alignItems: 'flex-start',
                marginLeft: '0'
              }}>
                {selectedAnswers[questionId] === questionContent.correctAnswer ? (
                  <CheckCircle className="h-5 w-5 text-[#34C759] flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-[#FF3B30] flex-shrink-0" />
                )}
                <span className="text-[#1D1D1F] dark:text-gray-100 font-medium">
                  {selectedAnswers[questionId] === questionContent.correctAnswer ? 'Correct Answer' : 'Incorrect Answer'}
                </span>
              </div>
            )}

            {showFeedback && questionContent.explanation && (
              <div className="apple-explanation bg-white dark:bg-gray-800 border border-[#E5E5EA] dark:border-gray-700 rounded-xl p-6 mt-6 apple-fade-in">
                <BookOpen className="h-6 w-6 text-[#007AFF] mb-4" />
                <span className="explanation-title font-semibold text-gray-900 dark:text-gray-100 mb-4 block">Explanation</span>
                
                <div className="explanation-content prose prose-lg max-w-none text-gray-900 dark:text-gray-100" style={{
                  lineHeight: '1.7'
                }}>
                  <ReactMarkdown
                    components={{
                      h1: ({children}) => <h1 className="mb-4 mt-6">{children}</h1>,
                      h2: ({children}) => <h2 className="mb-3 mt-5">{children}</h2>,
                      h3: ({children}) => <h3 className="mb-2 mt-4">{children}</h3>,
                      p: ({children}) => <p className="mb-4 leading-relaxed">{children}</p>,
                      ul: ({children}) => <ul className="mb-4 space-y-2">{children}</ul>,
                      ol: ({children}) => <ol className="mb-4 space-y-2 list-decimal list-inside">{children}</ol>,
                      li: ({children}) => <li className="flex items-start space-x-2"><span className="text-blue-500 font-bold mt-0.5">•</span><span className="flex-1">{children}</span></li>,
                      strong: ({children}) => <strong className="px-1 rounded text-gray-900 dark:text-gray-100 bg-yellow-50 dark:bg-yellow-900/30">{children}</strong>,
                      em: ({children}) => <em className="italic text-gray-700 dark:text-gray-300">{children}</em>,
                      code: ({children}) => <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-700 dark:text-gray-300">{children}</blockquote>
                    }}
                  >
                    {questionContent.explanation}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {showFeedback && (
              <div className="mt-8">
                <AIHelper 
                  question={currentQuestion}
                  selectedAnswer={selectedAnswers[questionId] || null}
                  correctAnswer={questionContent.correctAnswer}
                  explanation={questionContent.explanation || ''}
                  integrated={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
