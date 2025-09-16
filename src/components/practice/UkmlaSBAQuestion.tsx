import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronRight, BookOpen, Brain } from 'lucide-react';
import type { QuestionData } from './questionTypes';
import ReactMarkdown from 'react-markdown';
import { AIHelper } from './AIHelperClean';

interface UkmlaSBAQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

export const UkmlaSBAQuestion: React.FC<UkmlaSBAQuestionProps> = ({
  question,
  onAnswer,
  onNext
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  
  // Reset state when question ID changes (indicating a new question)
  useEffect(() => {
    setSelectedOption(null);
    setHasSubmitted(false);
    setShowAIHelper(false);
  }, [question.id, question.question, question.question_stem]);
  
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
      // Immediately submit the answer when an option is clicked
      const isCorrect = optionId === correctAnswerId;
      setHasSubmitted(true);
      onAnswer(isCorrect);
    }
  };

  // Answer is submitted immediately when an option is clicked

  // Format question content
  const questionContent = question.question || question.question_stem || '';
  const explanation = question.explanation || question.worked_solution || '';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Question content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
        <div className="prose dark:prose-invert max-w-none mb-6">
          <ReactMarkdown>{questionContent}</ReactMarkdown>
        </div>

        <div className="space-y-3">
          {options.map((option: { id: string; text: string }) => (
            <div
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              className={`flex items-start p-3 rounded-md cursor-pointer transition-colors ${
                hasSubmitted && option.id === correctAnswerId
                  ? 'bg-green-100 dark:bg-green-900/20 border border-green-500'
                  : hasSubmitted && option.id === selectedOption
                  ? 'bg-red-100 dark:bg-red-900/20 border border-red-500'
                  : selectedOption === option.id
                  ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-500'
                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                <span className="text-sm font-medium">{option.id}</span>
              </div>
              <div className="flex-1">
                <div className="text-gray-800 dark:text-gray-200">
                  <ReactMarkdown>{option.text}</ReactMarkdown>
                </div>
              </div>
              {hasSubmitted && option.id === correctAnswerId && (
                <CheckCircle className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
              )}
              {hasSubmitted && option.id === selectedOption && option.id !== correctAnswerId && (
                <XCircle className="h-5 w-5 text-red-500 ml-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {hasSubmitted && (
          <>
            {/* Feedback section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mt-6">
              <div className="flex items-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  Explanation
                </h3>
              </div>
              
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{explanation}</ReactMarkdown>
              </div>
              
              <div className="mt-4 flex items-center">
                <div className={`flex items-center ${
                  selectedOption === correctAnswerId
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {selectedOption === correctAnswerId ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Correct</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Incorrect</span>
                    </>
                  )}
                </div>
                <div className="ml-4 text-gray-600 dark:text-gray-400">
                  Correct answer: {correctAnswerId}
                </div>
              </div>
            </div>

            {/* AI Helper toggle */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAIHelper(!showAIHelper)}
                className={`flex items-center px-3 py-1.5 rounded-md ${
                  showAIHelper 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Brain className="h-4 w-4 mr-1.5" />
                {showAIHelper ? 'Hide AI Helper' : 'Show AI Helper'}
              </button>
            </div>

            {/* AI Helper */}
            {showAIHelper && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
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
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onNext}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>Next Question</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
