import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronRight, Brain } from 'lucide-react';
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
    <div className="flex items-center justify-center p-4 h-full">
      <div className="relative w-full max-w-2xl">
        {/* Stacked cards effect - background layers */}
        <div 
          className="absolute w-full h-full rounded-[24px] bg-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
          style={{ 
            top: '16px',
            left: '0',
            zIndex: 1,
            filter: 'blur(1.5px)',
            opacity: 0.6
          }}
        />
        <div 
          className="absolute w-full h-full rounded-[24px] bg-[#252525] shadow-[0_3px_10px_rgba(0,0,0,0.25)]"
          style={{ 
            top: '8px',
            left: '0',
            zIndex: 2,
            filter: 'blur(0.5px)',
            opacity: 0.8
          }}
        />
        
        {/* Main card */}
        <div className="relative bg-[#1E1E1E] rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,0.35)] overflow-hidden" style={{ zIndex: 3 }}>
          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-[24px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-[24px]" />
          
          {/* Content */}
          <div className="relative p-8">
            {/* Question */}
            <div className="mb-8">
              <div className="text-[17px] font-medium leading-[1.4] text-white">
                <ReactMarkdown>{questionContent}</ReactMarkdown>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {options.map((option: { id: string; text: string }) => (
                <div
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`flex items-start p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    hasSubmitted && option.id === correctAnswerId
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : hasSubmitted && option.id === selectedOption
                      ? 'bg-rose-500/20 border-2 border-rose-500'
                      : selectedOption === option.id
                      ? 'bg-white/10 border-2 border-white/30'
                      : 'bg-white/5 border-2 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mr-3 mt-0.5 bg-white/10 border border-white/20">
                    <span className="text-sm font-semibold text-white">{option.id}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-medium leading-[1.3] text-white">
                      <ReactMarkdown>{option.text}</ReactMarkdown>
                    </div>
                  </div>
                  {hasSubmitted && option.id === correctAnswerId && (
                    <CheckCircle className="h-5 w-5 text-emerald-400 ml-2 flex-shrink-0" />
                  )}
                  {hasSubmitted && option.id === selectedOption && option.id !== correctAnswerId && (
                    <XCircle className="h-5 w-5 text-rose-400 ml-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Explanation section - shown after submission */}
            {hasSubmitted && explanation && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="text-[15px] font-medium leading-[1.4] text-white/80">
                  <ReactMarkdown>{explanation}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* AI Helper toggle */}
            {hasSubmitted && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowAIHelper(!showAIHelper)}
                  className={`flex items-center px-4 py-2 rounded-xl transition-all ${
                    showAIHelper 
                      ? 'bg-white/20 border-2 border-white/30 text-white' 
                      : 'bg-white/5 border-2 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {showAIHelper ? 'Hide AI Helper' : 'Show AI Helper'}
                </button>
              </div>
            )}

            {/* AI Helper */}
            {showAIHelper && (
              <div className="mt-6 pt-6 border-t border-white/10">
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
            {hasSubmitted && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={onNext}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border-2 border-white/20 hover:border-white/30 flex items-center justify-center gap-2"
                >
                  <span>Next Question</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
