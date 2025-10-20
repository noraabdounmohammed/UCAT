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
  let backContent = question.explanation || question.worked_solution || '';
  
  // Convert bullet points to proper markdown format if they're not already
  console.log('Original backContent:', backContent);
  if (backContent.includes('•')) {
    backContent = backContent
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•')) {
          return trimmed.replace(/^•\s*/, '- ');
        }
        return line;
      })
      .join('\n');
    console.log('Converted backContent:', backContent);
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-[20px] font-semibold text-zinc-900 dark:text-white mb-2">
          Flashcard
        </h2>
        <p className="text-[15px] text-zinc-600 dark:text-zinc-400">
          Review the concept, then flip the card to see the explanation
        </p>
      </div>

      {/* Flashcard Container */}
      <div 
        className={`relative w-full min-h-[320px] rounded-2xl transition-all duration-500 cursor-pointer ${
          isFlipped 
            ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-xl' 
            : 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] shadow-xl'
        }`}
        style={{ perspective: '1000px' }}
        onClick={handleFlip}
      >
        {/* Front Side */}
        <div 
          className={`absolute w-full h-full rounded-2xl p-6 backface-hidden transition-all duration-500 ${
            isFlipped ? 'rotate-y-180 invisible' : 'rotate-y-0'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown 
                  components={{
                    p: ({children}) => (
                      <p className="text-[17px] leading-relaxed text-zinc-900 dark:text-white mb-4">
                        {children}
                      </p>
                    ),
                    h1: ({children}) => (
                      <h1 className="text-[20px] font-semibold text-zinc-900 dark:text-white mb-3">
                        {children}
                      </h1>
                    ),
                    h2: ({children}) => (
                      <h2 className="text-[18px] font-semibold text-zinc-900 dark:text-white mb-3">
                        {children}
                      </h2>
                    )
                  }}
                >
                  {frontContent}
                </ReactMarkdown>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-lg border border-black/[0.08] dark:border-white/[0.08]">
                <span className="text-[13px] text-zinc-600 dark:text-zinc-400">Tap to reveal explanation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div 
          className={`absolute w-full h-full rounded-2xl p-6 backface-hidden transition-all duration-500 ${
            isFlipped ? 'rotate-y-0' : 'rotate-y-180 invisible'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-xl rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                <span className="text-[13px] font-semibold text-[#007AFF]">✓ Explanation</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown 
                  components={{
                    p: ({children}) => (
                      <p className="text-[15px] leading-relaxed text-zinc-900 dark:text-white mb-3">
                        {children}
                      </p>
                    ),
                    ul: ({children}) => (
                      <ul className="list-disc list-inside space-y-2 my-3 ml-2">
                        {children}
                      </ul>
                    ),
                    li: ({children}) => (
                      <li className="text-[15px] leading-relaxed text-zinc-900 dark:text-white">
                        {children}
                      </li>
                    ),
                    strong: ({children}) => (
                      <strong className="font-semibold text-zinc-900 dark:text-white">
                        {children}
                      </strong>
                    )
                  }}
                >
                  {backContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Section */}
      {isFlipped && (
        <div className="mt-6">
          <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-5">
            <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white mb-4 text-center">
              👍 How well did you know this?
            </h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleSelfRating(rating)}
                  disabled={hasAnswered}
                  className={`flex-1 py-3 rounded-xl font-semibold text-[15px] transition-all ${
                    selfRating === rating
                      ? 'bg-[#007AFF] text-white shadow-lg scale-105'
                      : 'bg-white/80 dark:bg-zinc-700/80 text-zinc-900 dark:text-white hover:bg-white dark:hover:bg-zinc-700 border border-black/[0.08] dark:border-white/[0.08]'
                  } ${hasAnswered && selfRating !== rating ? 'opacity-50' : ''}`}
                >
                  {rating}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 px-2">
              <span>😔 Not at all</span>
              <span>🎯 Perfectly</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl text-zinc-700 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-zinc-800/80 rounded-xl border border-black/[0.08] dark:border-white/[0.08] transition-all font-medium text-[15px]"
        >
          <RotateCcw className="h-[18px] w-[18px]" />
          Reset
        </button>

        <button
          onClick={onNext}
          disabled={!hasAnswered}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-[15px] transition-all ${
            !hasAnswered 
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed' 
              : 'bg-[#007AFF] hover:bg-[#0056CC] text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
          }`}
        >
          Next
          <ChevronRight className="h-[18px] w-[18px]" />
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
