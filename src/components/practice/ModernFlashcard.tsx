import React, { useState, useEffect } from 'react';
import { ChevronRight, ThumbsUp, ThumbsDown, BookOpen } from 'lucide-react';
import type { QuestionData } from './questionTypes';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ModernFlashcardProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

export const ModernFlashcard: React.FC<ModernFlashcardProps> = ({
  question,
  onAnswer,
  onNext
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [animation, setAnimation] = useState<string>('');

  // Extract front and back content 
  const backContent = question.explanation || 'No explanation available';
  const title = question.title || 'Flashcard';
  const tags: string[] = Array.isArray(question.tags) ? question.tags : [];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSelfRating = (rating: number) => {
    setSelfRating(rating);
    setHasAnswered(true);
    onAnswer(rating >= 3);
  };

  // Reset state when question ID changes (indicating a new question)
  useEffect(() => {
    setIsFlipped(false);
    setHasAnswered(false);
    setSelfRating(null);
    setAnimation('');
  }, [question.id, question.question, question.question_stem]);

  // Reset animation class after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimation('');
    }, 500);
    return () => clearTimeout(timer);
  }, [animation]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-1">
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review the concept, then flip the card to see the explanation
          </p>
        </div>
        
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {tags.slice(0, 3).map((tag: string, index: number) => (
              <span 
                key={index} 
                className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div 
        className={cn(
          "relative w-full h-96 rounded-xl shadow-lg transition-all duration-500 cursor-pointer",
          isFlipped ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20" : "bg-white dark:bg-gray-800",
          animation
        )}
        style={{ perspective: '1000px' }}
        onClick={handleFlip}
      >
        {/* Front of card */}
        <div className={cn(
          "absolute w-full h-full rounded-xl p-8 backface-hidden transition-all duration-500",
          isFlipped ? "rotate-y-180 invisible" : "rotate-y-0"
        )}>
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="prose dark:prose-invert max-w-none">
                {question.question || question.question_stem || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Card back */}
        <div 
          className={cn(
            "absolute w-full h-full rounded-xl p-8 backface-hidden transition-all duration-500",
            isFlipped ? "rotate-y-0" : "rotate-y-180 invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleFlip();
          }}
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center mb-4">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Explanation
              </h3>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{backContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4 flex items-center">
            <ThumbsUp className="h-4 w-4 mr-2 text-blue-600" />
            How well did you know this?
          </h3>
          
          <div className="flex justify-between gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelfRating(rating);
                }}
                disabled={hasAnswered}
                className={cn(
                  "flex-1 py-4 rounded-lg transition-colors font-medium text-lg",
                  selfRating === rating && rating < 3 && "bg-red-500 text-white",
                  selfRating === rating && rating === 3 && "bg-yellow-500 text-white",
                  selfRating === rating && rating > 3 && "bg-green-500 text-white",
                  !selfRating && "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600",
                  hasAnswered && selfRating !== rating ? "opacity-50" : ""
                )}
              >
                {rating}
              </button>
            ))}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
            <span className="flex items-center">
              <ThumbsDown className="h-3 w-3 mr-1 text-red-500" />
              Not at all
            </span>
            <span className="flex items-center">
              Perfect
              <ThumbsUp className="h-3 w-3 ml-1 text-green-500" />
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!hasAnswered}
          className={cn(
            "flex items-center px-6 py-2 bg-blue-600 text-white rounded-md",
            !hasAnswered ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
          )}
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
        .flip-card {
          animation: flip 0.5s ease-out forwards;
        }
        .unflip-card {
          animation: unflip 0.5s ease-out forwards;
        }
        @keyframes flip {
          0% { transform: rotateY(0); }
          100% { transform: rotateY(180deg); }
        }
        @keyframes unflip {
          0% { transform: rotateY(180deg); }
          100% { transform: rotateY(0); }
        }
      `}} />
    </div>
  );
};
