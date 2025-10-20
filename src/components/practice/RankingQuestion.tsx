import React, { useState } from 'react';
import { QuestionData } from './questionTypes';
import { Check, X } from 'lucide-react';

interface RankingQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

export const RankingQuestion: React.FC<RankingQuestionProps> = ({
  question,
  onAnswer,
  onNext
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleAnswerSelect = (optionId: string) => {
    if (hasAnswered) return;
    setSelectedAnswer(optionId);
  };

  const handleSubmit = () => {
    if (!selectedAnswer || hasAnswered) return;
    
    const isCorrect = selectedAnswer === question.correct_answer;
    setHasAnswered(true);
    setShowExplanation(true);
    onAnswer(isCorrect);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setHasAnswered(false);
    setShowExplanation(false);
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Clinical Scenario */}
      {question.clinical_vignette && (
        <div className="mb-6 p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
          <p className="text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {question.clinical_vignette}
          </p>
        </div>
      )}

      {/* Question Stem */}
      <div className="mb-6 p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
        <h2 className="text-[20px] font-semibold text-zinc-900 dark:text-white">
          {question.question_stem}
        </h2>
      </div>

      {/* Management Options */}
      <div className="space-y-3 mb-6">
        {question.options?.map((option) => (
          <button
            key={option.id}
            onClick={() => handleAnswerSelect(option.id)}
            disabled={hasAnswered}
            className={`w-full p-5 text-left rounded-xl transition-all border-2 ${
              selectedAnswer === option.id
                ? hasAnswered
                  ? option.id === question.correct_answer
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                : hasAnswered && option.id === question.correct_answer
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                : 'bg-white/60 dark:bg-zinc-800/60 border-black/[0.08] dark:border-white/[0.08] hover:bg-white/80 dark:hover:bg-zinc-800/80'
            } ${hasAnswered ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[14px] font-semibold text-zinc-700 dark:text-zinc-300">
                {option.id}
              </span>
              <div className="flex-1">
                <p className="text-[15px] text-zinc-900 dark:text-white leading-relaxed">
                  {option.text}
                </p>
              </div>
              {hasAnswered && (
                <div className="flex-shrink-0">
                  {option.id === question.correct_answer ? (
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-[13px] font-medium text-green-700 dark:text-green-300">
                        Best Answer
                      </span>
                    </div>
                  ) : selectedAnswer === option.id ? (
                    <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                  ) : null}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Explanation */}
      {showExplanation && question.explanation && (
        <div className={`mb-6 p-6 rounded-2xl border-2 ${
          selectedAnswer === question.correct_answer
            ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
            : 'bg-red-50 dark:bg-red-900/20 border-red-500'
        }`}>
          <h3 className="text-[17px] font-semibold mb-3 flex items-center gap-2">
            {selectedAnswer === question.correct_answer ? (
              <>
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-green-900 dark:text-green-100">Correct!</span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-red-900 dark:text-red-100">Incorrect</span>
              </>
            )}
          </h3>
          <p className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {question.explanation}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {!hasAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className={`px-6 py-3 rounded-xl text-[15px] font-semibold transition-all ${
              selectedAnswer
                ? 'bg-[#007AFF] text-white hover:opacity-90 shadow-sm'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-[#007AFF] text-white rounded-xl text-[15px] font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
};
