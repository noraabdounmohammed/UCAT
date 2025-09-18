import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
runimport { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { QuestionRenderer } from './QuestionRenderer';
import { ExitConfirmationDialog } from '@/components/ui/dialog';
import { updateQuestionProgress } from '@/utils/userProgressStorage';
import './apple-question-styles.css';
import { QuestionData } from './questionTypes';

interface PracticeSessionProps {
  questions: QuestionData[];
  onComplete: () => void;
  onAnswerSubmit?: (questionId: string, isCorrect: boolean) => void;
  section?: string; // Add section prop to track which section questions belong to
  defaultFormat?: 'sba' | 'flashcard'; // Default question format if not specified in the question
}

export function ApplePracticeSession({ 
  questions, 
  onComplete, 
  onAnswerSubmit, 
  section, 
  defaultFormat = 'sba' 
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
    }
  }, [questions]);
  
  // Scroll to top when component mounts
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

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
    
    // Extract question text from various possible fields
    const questionText = q.question || q.question_stem || q.content || q.individual_question || '';
    
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-3 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => setShowExitConfirmation(true)}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <span className="ml-4 font-medium text-gray-800 dark:text-gray-200">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentIndex === 0}
            className={`p-1 rounded-full ${
              currentIndex === 0 
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={handleNextQuestion}
            className="p-1 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto" ref={containerRef}>
        <div className="max-w-4xl mx-auto py-6 px-4">
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
              updateQuestionProgress(questionId, status, String(topic), String(skill), String(currentSection));
              
              // Call the onAnswerSubmit callback if provided
              if (onAnswerSubmit) {
                onAnswerSubmit(questionId, isCorrect);
              }
              
              console.log(`Question ${questionId} answered: ${status} - Progress saved to dashboard`);
            }}
            onNext={handleNextQuestion}
          />
        </div>
      </div>

      {/* Exit confirmation modal */}
      {showExitConfirmation && (
        <ExitConfirmationDialog
          isOpen={showExitConfirmation}
          onConfirm={handleExitConfirm}
          onClose={handleExitCancel}
        />
      )}
    </div>
  );
}
