import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronRight, BookOpen, Brain } from 'lucide-react';
import type { QuestionData } from './questionTypes';
import ReactMarkdown from 'react-markdown';
import { AIHelper } from './AIHelperClean';
import { cn } from '@/lib/utils';
import './apple-question-styles.css';

interface UkmlaSBAOriginalProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

export const UkmlaSBAOriginal: React.FC<UkmlaSBAOriginalProps> = ({
  question,
  onAnswer,
  onNext
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  
  // Process options to ensure they're in the right format
  const options = question.options.map((option: any, index: number) => {
    if (typeof option === 'string') {
      return { id: String.fromCharCode(65 + index), text: option };
    }
    return option;
  });

  // Determine correct answer
  const correctAnswer = question.correctAnswer || question.correct_answer || 'A';
  const correctAnswerId = typeof correctAnswer === 'number' 
    ? String.fromCharCode(65 + correctAnswer) 
    : correctAnswer;

  const handleOptionSelect = (optionId: string) => {
    if (!hasSubmitted) {
      setSelectedOption(optionId);
    }
  };

  const handleSubmit = () => {
    if (selectedOption && !hasSubmitted) {
      const isCorrect = selectedOption === correctAnswerId;
      setHasSubmitted(true);
      onAnswer(isCorrect);
    }
  };

  // Format question content
  const questionContent = question.question || question.question_stem || '';
  const explanation = question.explanation || question.worked_solution || '';

  return (
    <div className="apple-question-container">
      {/* Question content */}
      <div className="apple-question-content">
        <div className="apple-question-box">
          <div className="apple-question-title">
            <ReactMarkdown>{questionContent}</ReactMarkdown>
          </div>
        </div>
        
        {/* Answer options */}
        <div className="apple-answer-options">
          {options.map((option: { id: string; text: string }) => (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              className={cn(
                "apple-answer-option",
                selectedOption === option.id && !hasSubmitted && "selected",
                hasSubmitted && selectedOption === option.id && option.id === correctAnswerId && "correct",
                hasSubmitted && selectedOption === option.id && option.id !== correctAnswerId && "incorrect"
              )}
              disabled={hasSubmitted}
            >
              <div className="apple-answer-letter">
                {option.id}
              </div>
              <div className="apple-answer-text">
                <ReactMarkdown>{option.text}</ReactMarkdown>
              </div>
              {hasSubmitted && selectedOption === option.id && (
                <div className="apple-answer-icon">
                  {option.id === correctAnswerId ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
        
        {/* Submit button */}
        {!hasSubmitted ? (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className="apple-button apple-button-primary"
            >
              Submit Answer
            </button>
          </div>
        ) : (
          <>
            {/* Feedback */}
            <div className={cn(
              "apple-feedback",
              selectedOption === correctAnswerId ? "correct" : "incorrect"
            )}>
              {selectedOption === correctAnswerId ? (
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
            
            {/* Explanation */}
            <div className="apple-explanation">
              <div className="apple-explanation-title">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <span>Explanation</span>
              </div>
              <div className="apple-explanation-content">
                <ReactMarkdown>{explanation}</ReactMarkdown>
              </div>
              
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Correct answer: {correctAnswerId}
                </div>
                
                <button
                  onClick={() => setShowAIHelper(!showAIHelper)}
                  className={cn(
                    "flex items-center px-3 py-1.5 rounded-lg transition-colors",
                    showAIHelper 
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  )}
                >
                  <Brain className="h-4 w-4 mr-1.5" />
                  <span>{showAIHelper ? 'Hide AI Helper' : 'Show AI Helper'}</span>
                </button>
              </div>
            </div>
            
            {/* AI Helper */}
            {showAIHelper && (
              <div className="mt-8 apple-fade-in">
                <AIHelper 
                  question={question}
                  selectedAnswer={selectedOption || ''}
                  correctAnswer={correctAnswerId}
                  explanation={explanation}
                  integrated={true}
                  onMessageSent={() => {
                    // Scroll to bottom of page when user sends a message
                    setTimeout(() => {
                      window.scrollTo({
                        top: document.body.scrollHeight,
                        behavior: 'smooth'
                      });
                    }, 100);
                  }}
                />
              </div>
            )}
            
            {/* Next button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={onNext}
                className="apple-button apple-button-primary"
              >
                Next Question
                <ChevronRight className="h-5 w-5 ml-2" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
