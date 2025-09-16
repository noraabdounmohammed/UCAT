import React, { useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import type { QuestionData } from './questionTypes';
import ReactMarkdown from 'react-markdown';

interface FlashcardQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

export const FlashcardQuestion: React.FC<FlashcardQuestionProps> = ({
  question,
  onAnswer,
  onNext
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selfRating, setSelfRating] = useState<number | null>(null);

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  };

  const handleSelfRating = (rating: number) => {
    setSelfRating(rating);
    setHasAnswered(true);
    onAnswer(rating >= 3); // Consider ratings 3-5 as "correct"
  };

  const handleReset = () => {
    setIsFlipped(false);
    setHasAnswered(false);
    setSelfRating(null);
  };

  // Extract front and back content from question
  const frontContent = question.question || question.question_stem || '';
  const backContent = question.explanation || question.worked_solution || '';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Flashcard
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review the concept, then flip the card to see the explanation. Rate your understanding.
        </p>
      </div>

      <div 
        className={`relative w-full h-80 rounded-xl shadow-md transition-all duration-500 cursor-pointer ${
          isFlipped ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
        }`}
        style={{ perspective: '1000px' }}
        onClick={handleFlip}
      >
        <div 
          className={`absolute w-full h-full rounded-xl p-6 backface-hidden transition-all duration-500 ${
            isFlipped ? 'rotate-y-180 invisible' : 'rotate-y-0'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{frontContent}</ReactMarkdown>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Click to flip
            </div>
          </div>
        </div>

        <div 
          className={`absolute w-full h-full rounded-xl p-6 backface-hidden transition-all duration-500 ${
            isFlipped ? 'rotate-y-0' : 'rotate-y-180 invisible'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{backContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="mt-6">
          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
            How well did you know this?
          </h3>
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleSelfRating(rating)}
                disabled={hasAnswered}
                className={`flex-1 py-3 rounded-md transition-colors ${
                  selfRating === rating
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                } ${hasAnswered && selfRating !== rating ? 'opacity-50' : ''}`}
              >
                {rating}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
            <span>Not at all</span>
            <span>Perfectly</span>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={handleReset}
          className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </button>

        <button
          onClick={onNext}
          disabled={!hasAnswered}
          className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-md ${
            !hasAnswered ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-0 {
          transform: rotateY(0deg);
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}} />
    </div>
  );
};
