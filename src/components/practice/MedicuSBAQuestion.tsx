import React, { useState } from 'react';
import { XCircle, ChevronRight, BookOpen } from 'lucide-react';
import type { QuestionData } from './questionTypes';
import ReactMarkdown from 'react-markdown';
import { AIHelper } from './AIHelperClean';
import { cn } from '@/lib/utils';
import './medicu-styles.css';

interface MedicuSBAQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

export const MedicuSBAQuestion: React.FC<MedicuSBAQuestionProps> = ({
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
      handleSubmit(optionId);
    }
  };

  const handleSubmit = (optionId: string) => {
    if (!hasSubmitted) {
      const isCorrect = optionId === correctAnswerId;
      setHasSubmitted(true);
      onAnswer(isCorrect);
    }
  };

  // Format question content
  const questionContent = question.question || question.question_stem || '';
  const explanation = question.explanation || question.worked_solution || '';

  return (
    <div className="medicu-container">
      {/* Question content */}
      <div className="medicu-question-content">
        <div className="medicu-question-stem">
          <ReactMarkdown>{questionContent}</ReactMarkdown>
        </div>
        
        {/* Answer options */}
        <div className="medicu-options-container">
          {options.map((option: { id: string; text: string }) => (
            <div
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              className={cn(
                "medicu-option",
                selectedOption === option.id && hasSubmitted && option.id === correctAnswerId && "medicu-option-correct",
                selectedOption === option.id && hasSubmitted && option.id !== correctAnswerId && "medicu-option-incorrect"
              )}
            >
              <div className="medicu-option-letter">{option.id}</div>
              <div className="medicu-option-text">
                <ReactMarkdown>{option.text}</ReactMarkdown>
              </div>
              {selectedOption === option.id && hasSubmitted && option.id !== correctAnswerId && (
                <div className="medicu-option-icon">
                  <XCircle className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Feedback section */}
        {hasSubmitted && (
          <>
            {/* Feedback result */}
            <div className={cn(
              "medicu-feedback",
              selectedOption === correctAnswerId ? "medicu-feedback-correct" : "medicu-feedback-incorrect"
            )}>
              {selectedOption === correctAnswerId ? (
                <span>Correct Answer</span>
              ) : (
                <span>Incorrect Answer</span>
              )}
            </div>
            
            {/* Explanation */}
            <div className="medicu-explanation">
              <div className="medicu-explanation-header">
                <BookOpen className="h-5 w-5 medicu-explanation-icon" />
                <span>Explanation</span>
              </div>
              <div className="medicu-explanation-content">
                <ReactMarkdown>{explanation}</ReactMarkdown>
              </div>
              
              <div className="medicu-explanation-footer">
                <div className="medicu-correct-answer">
                  Correct answer: {correctAnswerId}
                </div>
                
                <button
                  onClick={() => setShowAIHelper(!showAIHelper)}
                  className="medicu-ai-button"
                >
                  {showAIHelper ? 'Hide AI Helper' : 'Show AI Helper'}
                </button>
              </div>
            </div>
            
            {/* AI Helper */}
            {showAIHelper && (
              <div className="medicu-ai-helper">
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
            <div className="medicu-next-container">
              <button
                onClick={onNext}
                className="medicu-next-button"
              >
                Next Question <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
