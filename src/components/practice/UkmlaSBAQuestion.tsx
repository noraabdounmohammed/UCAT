import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronRight, Brain, ArrowLeft, ChevronLeft, Sun, Moon } from 'lucide-react';
import type { QuestionData } from './questionTypes';
import ReactMarkdown from 'react-markdown';
import { AIHelper } from './AIHelperClean';

interface UkmlaSBAQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalQuestions?: number;
  title?: string;
}

export const UkmlaSBAQuestion: React.FC<UkmlaSBAQuestionProps> = ({
  question,
  onAnswer,
  onNext,
  onPrevious,
  onExit,
  currentIndex = 0,
  totalQuestions = 0,
  title = "UKMLA SBA"
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  
  // Store answer states in sessionStorage for persistence across navigation
  const getStorageKey = () => `sba_answer_${question.id || question.question?.substring(0, 50)}`;
  
  // Load saved answer state when question changes
  useEffect(() => {
    const storageKey = getStorageKey();
    const savedState = sessionStorage.getItem(storageKey);
    
    if (savedState) {
      try {
        const { selectedOption: savedOption, hasSubmitted: savedSubmitted } = JSON.parse(savedState);
        setSelectedOption(savedOption);
        setHasSubmitted(savedSubmitted);
      } catch (error) {
        console.error('Error loading saved answer state:', error);
        // Reset to default state if there's an error
        setSelectedOption(null);
        setHasSubmitted(false);
      }
    } else {
      // No saved state, reset to default
      setSelectedOption(null);
      setHasSubmitted(false);
    }
    
    // Always reset AI Helper when changing questions
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
      const isCorrect = optionId === correctAnswerId;
      setHasSubmitted(true);
      
      // Save answer state to sessionStorage
      const storageKey = getStorageKey();
      sessionStorage.setItem(storageKey, JSON.stringify({
        selectedOption: optionId,
        hasSubmitted: true
      }));
      
      // Notify parent component
      onAnswer(isCorrect);
    }
  };

  // Answer is submitted immediately when an option is clicked

  // Format question content
  const questionContent = question.question || question.question_stem || '';
  const explanation = question.explanation || question.worked_solution || '';

  return (
    <div className={`fixed inset-0 flex flex-col overflow-hidden ${isLightMode ? 'bg-zinc-50' : 'bg-[#0A0A0A]'}`}>
      {/* Header Navbar */}
      <div className={`flex items-center justify-between px-4 py-4 border-b flex-shrink-0 ${
        isLightMode ? 'border-zinc-200' : 'border-white/10'
      }`}>
        <button
          onClick={onExit}
          className={`p-2 rounded-lg transition-colors ${
            isLightMode ? 'hover:bg-zinc-200' : 'hover:bg-white/5'
          }`}
          aria-label="Go back"
        >
          <ArrowLeft className={`h-5 w-5 ${isLightMode ? 'text-zinc-700' : 'text-white/70'}`} />
        </button>
        <div className="flex-1 text-center">
          <h1 className={`text-lg font-semibold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{title}</h1>
          {totalQuestions > 0 && (
            <p className={`text-sm ${isLightMode ? 'text-zinc-500' : 'text-white/60'}`}>{currentIndex + 1} / {totalQuestions}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Dark/Light Mode Toggle */}
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            className={`p-2 rounded-lg transition-colors ${
              isLightMode ? 'hover:bg-zinc-200' : 'hover:bg-white/5'
            }`}
            aria-label="Toggle theme"
          >
            {isLightMode ? (
              <Moon className="h-5 w-5 text-zinc-700" />
            ) : (
              <Sun className="h-5 w-5 text-white/70" />
            )}
          </button>
          {/* Previous Button */}
          <button
            onClick={onPrevious}
            disabled={!onPrevious || currentIndex === 0}
            className={`p-2 rounded-lg transition-colors ${
              !onPrevious || currentIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : isLightMode
                ? 'hover:bg-zinc-200'
                : 'hover:bg-white/5'
            }`}
            aria-label="Previous question"
          >
            <ChevronLeft className={`h-5 w-5 ${isLightMode ? 'text-zinc-700' : 'text-white/70'}`} />
          </button>
          {/* Next Button */}
          <button
            onClick={onNext}
            disabled={currentIndex >= totalQuestions - 1}
            className={`p-2 rounded-lg transition-colors ${
              currentIndex >= totalQuestions - 1
                ? 'opacity-30 cursor-not-allowed'
                : isLightMode
                ? 'hover:bg-zinc-200'
                : 'hover:bg-white/5'
            }`}
            aria-label="Next question"
          >
            <ChevronRight className={`h-5 w-5 ${isLightMode ? 'text-zinc-700' : 'text-white/70'}`} />
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-start justify-center p-3 sm:p-4 md:p-6 min-h-full">
      <div className="relative w-full max-w-2xl mx-auto my-4 sm:my-6 md:my-8">
        {/* Stacked cards effect - background layers (hidden on mobile for performance) */}
        <div 
          className="hidden sm:block absolute w-full h-full rounded-[24px] bg-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
          style={{ 
            top: '16px',
            left: '0',
            zIndex: 1,
            filter: 'blur(1.5px)',
            opacity: 0.6
          }}
        />
        <div 
          className="hidden sm:block absolute w-full h-full rounded-[24px] bg-[#252525] shadow-[0_3px_10px_rgba(0,0,0,0.25)]"
          style={{ 
            top: '8px',
            left: '0',
            zIndex: 2,
            filter: 'blur(0.5px)',
            opacity: 0.8
          }}
        />
        
        {/* Main card */}
        <div className="relative bg-[#1E1E1E] rounded-2xl sm:rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] sm:shadow-[0_6px_20px_rgba(0,0,0,0.35)] overflow-visible" style={{ zIndex: 3 }}>
          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-2xl sm:rounded-[24px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-2xl sm:rounded-[24px]" />
          
          {/* Content */}
          <div className="relative p-4 sm:p-6 md:p-8 pb-safe">
            {/* Question */}
            <div className="mb-5 sm:mb-6 md:mb-8">
              <div className="text-[14px] sm:text-[15px] md:text-[17px] font-medium leading-[1.5] sm:leading-[1.4] text-white">
                <ReactMarkdown>{questionContent}</ReactMarkdown>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2.5 sm:space-y-3">
              {options.map((option: { id: string; text: string }) => (
                <div
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`flex items-start p-3 sm:p-3.5 md:p-4 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                    hasSubmitted && option.id === correctAnswerId
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : hasSubmitted && option.id === selectedOption
                      ? 'bg-rose-500/20 border-2 border-rose-500'
                      : selectedOption === option.id
                      ? 'bg-white/10 border-2 border-white/30'
                      : 'bg-white/5 border-2 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex-shrink-0 w-7 h-7 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mr-2.5 sm:mr-3 mt-0.5 bg-white/10 border border-white/20">
                    <span className="text-xs sm:text-sm font-semibold text-white">{option.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] sm:text-[14px] md:text-[15px] font-medium leading-[1.4] sm:leading-[1.3] text-white break-words">
                      <ReactMarkdown>{option.text}</ReactMarkdown>
                    </div>
                  </div>
                  {hasSubmitted && option.id === correctAnswerId && (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 ml-2 flex-shrink-0" />
                  )}
                  {hasSubmitted && option.id === selectedOption && option.id !== correctAnswerId && (
                    <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-400 ml-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Feedback section - normal flow */}
            {hasSubmitted && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Explanation section */}
                {explanation && (
                  <div className="mt-4 sm:mt-5 md:mt-6 pt-4 sm:pt-5 md:pt-6 border-t border-white/10">
                    <div className="text-[13px] sm:text-[14px] md:text-[15px] font-medium leading-[1.5] sm:leading-[1.4] text-white/80">
                      <ReactMarkdown>{explanation}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* AI Helper toggle */}
                <div className="mt-4 sm:mt-5 md:mt-6 flex justify-end">
                  <button
                    onClick={() => setShowAIHelper(!showAIHelper)}
                    className={`flex items-center px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl transition-all text-xs sm:text-sm md:text-base active:scale-95 ${
                      showAIHelper
                        ? 'bg-white/20 border-2 border-white/30 text-white'
                        : 'bg-white/5 border-2 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">{showAIHelper ? 'Hide AI Helper' : 'Show AI Helper'}</span>
                    <span className="sm:hidden">{showAIHelper ? 'Hide AI' : 'AI Helper'}</span>
                  </button>
                </div>

                {/* AI Helper */}
                {showAIHelper && (
                  <div className="mt-4 sm:mt-5 md:mt-6 pt-4 sm:pt-5 md:pt-6 border-t border-white/10">
                    <AIHelper 
                      question={question}
                      selectedAnswer={selectedOption || ''}
                      correctAnswer={correctAnswerId}
                      explanation={explanation}
                      integrated={true}
                      onMessageSent={() => {
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
                <div className="mt-4 sm:mt-5 md:mt-6 pt-4 sm:pt-5 md:pt-6 border-t border-white/10">
                  <button
                    onClick={onNext}
                    className="w-full py-3 sm:py-3 md:py-3.5 bg-white/10 hover:bg-white/20 active:bg-white/15 text-white font-semibold rounded-lg sm:rounded-xl transition-all border-2 border-white/20 hover:border-white/30 active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};
