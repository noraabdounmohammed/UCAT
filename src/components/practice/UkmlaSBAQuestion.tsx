import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronRight, ArrowLeft, ChevronLeft, Sun, Moon, Sparkles, X, ChevronDown } from 'lucide-react';
import type { QuestionData } from './questionTypes';
import ReactMarkdown from 'react-markdown';
import { AIHelper } from './AIHelperClean';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SessionProgressDropdown, SessionAnswer } from './SessionProgressDropdown';

interface UkmlaSBAQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalQuestions?: number;
  title?: string;
  sessionAnswers?: SessionAnswer[];
  onJumpTo?: (index: number) => void;
}

export const UkmlaSBAQuestion: React.FC<UkmlaSBAQuestionProps> = ({
  question,
  onAnswer,
  onNext,
  onPrevious,
  onExit,
  currentIndex = 0,
  totalQuestions = 0,
  title = "UKMLA SBA",
  sessionAnswers,
  onJumpTo
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  
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
    
    // Always reset AI Helper and explanation toggle when changing questions
    setShowAIHelper(false);
    setShowFullExplanation(false);
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

  // Strip any phrases that leak the AI/backend source before showing to users
  const sanitiseExplanation = (text: string): string => text
    .replace(/[Tt]he content explicitly states? that ['"]/g, '')
    .replace(/['"]\s*\.\s*(?=Option|The correct)/g, '. ')
    .replace(/[Tt]he content (explicitly )?(states?|says?|mentions?|indicates?|notes?)[^.]*\.\s*/g, '')
    .replace(/[Bb]ased on (the )?(concept |provided )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Aa]ccording to (the )?(concept |provided )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Aa]s (stated|mentioned|described|provided|outlined|given) in (the )?(concept |provided )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Ff]rom (the )?(concept )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Aa]s per (the )?(concept )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Bb]ased on (the )?(provided|given) (information|material|concept)[^,.]*[,.]?\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Format question content
  const questionContent = question.question || question.question_stem || '';
  const explanation = sanitiseExplanation(question.explanation || question.worked_solution || '');
  const keyFact = sanitiseExplanation((question as any).key_fact || '');
  const isCorrect = hasSubmitted && selectedOption === correctAnswerId;

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

        {/* Center: progress pill (replaces static title) */}
        <div className="flex-1 flex justify-center">
          {totalQuestions > 0 && sessionAnswers ? (
            <SessionProgressDropdown
              answers={sessionAnswers}
              total={totalQuestions}
              currentIndex={currentIndex}
              isLightMode={isLightMode}
              onJumpTo={onJumpTo}
            />
          ) : totalQuestions > 0 ? (
            <span className={`text-sm font-medium tabular-nums ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`}>
              {currentIndex + 1} / {totalQuestions}
            </span>
          ) : null}
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
          className={cn(
            "hidden sm:block absolute w-full h-full rounded-[24px]",
            isLightMode ? "bg-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.1)]" : "bg-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
          )}
          style={{ 
            top: '16px',
            left: '0',
            zIndex: 1,
            filter: 'blur(1.5px)',
            opacity: 0.6
          }}
        />
        <div 
          className={cn(
            "hidden sm:block absolute w-full h-full rounded-[24px]",
            isLightMode ? "bg-zinc-100 shadow-[0_3px_10px_rgba(0,0,0,0.15)]" : "bg-[#252525] shadow-[0_3px_10px_rgba(0,0,0,0.25)]"
          )}
          style={{ 
            top: '8px',
            left: '0',
            zIndex: 2,
            filter: 'blur(0.5px)',
            opacity: 0.8
          }}
        />
        
        {/* Main card */}
        <div className={cn(
          "relative rounded-2xl sm:rounded-[24px] overflow-visible",
          isLightMode 
            ? "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] sm:shadow-[0_6px_20px_rgba(0,0,0,0.15)]" 
            : "bg-[#1E1E1E] shadow-[0_4px_12px_rgba(0,0,0,0.3)] sm:shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
        )} style={{ zIndex: 3 }}>
          {/* Gradient overlays for depth */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-b pointer-events-none rounded-2xl sm:rounded-[24px]",
            isLightMode ? "from-black/[0.02] to-transparent" : "from-white/[0.03] to-transparent"
          )} />
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t pointer-events-none rounded-2xl sm:rounded-[24px]",
            isLightMode ? "from-black/[0.03] to-transparent" : "from-black/10 to-transparent"
          )} />
          
          {/* Content */}
          <div className="relative p-4 sm:p-6 md:p-8 pb-safe">
            {/* Question */}
            <div className="mb-5 sm:mb-6 md:mb-8">
              <div className={cn(
                "text-[14px] sm:text-[15px] md:text-[17px] font-medium leading-[1.5] sm:leading-[1.4]",
                isLightMode ? "text-zinc-900" : "text-white"
              )}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  }}
                >{questionContent}</ReactMarkdown>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2.5 sm:space-y-3">
              {options.map((option: { id: string; text: string }) => (
                <div
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={cn(
                    "flex items-start p-3 sm:p-3.5 md:p-4 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.98]",
                    hasSubmitted && option.id === correctAnswerId
                      ? 'bg-emerald-500/20 border-2 border-emerald-500'
                      : hasSubmitted && option.id === selectedOption
                      ? 'bg-rose-500/20 border-2 border-rose-500'
                      : selectedOption === option.id
                      ? isLightMode ? 'bg-zinc-100 border-2 border-zinc-300' : 'bg-white/10 border-2 border-white/30'
                      : isLightMode 
                        ? 'bg-zinc-50 border-2 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                        : 'bg-white/5 border-2 border-white/10 hover:bg-white/10 hover:border-white/20'
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-7 h-7 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mr-2.5 sm:mr-3 mt-0.5 border",
                    isLightMode ? "bg-zinc-200 border-zinc-300" : "bg-white/10 border-white/20"
                  )}>
                    <span className={cn(
                      "text-xs sm:text-sm font-semibold",
                      isLightMode ? "text-zinc-900" : "text-white"
                    )}>{option.id}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "text-[13px] sm:text-[14px] md:text-[15px] font-medium leading-[1.4] sm:leading-[1.3] break-words",
                      isLightMode ? "text-zinc-900" : "text-white"
                    )}>
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
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 mt-4 sm:mt-5 space-y-3">

                {/* Compact summary box */}
                <div className={cn(
                  "rounded-xl border px-4 py-3 space-y-2",
                  isCorrect
                    ? isLightMode
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-emerald-500/10 border-emerald-500/25"
                    : isLightMode
                      ? "bg-rose-50 border-rose-200"
                      : "bg-rose-500/10 border-rose-500/25"
                )}>
                  {/* Result line + concept chip */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      isCorrect
                        ? isLightMode ? "text-emerald-700" : "text-emerald-400"
                        : isLightMode ? "text-rose-700" : "text-rose-400"
                    )}>
                      {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </span>

                    {(question.title || (question as any).topic) && (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide",
                        isLightMode
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                      )}>
                        📚 {question.title || (question as any).topic}
                      </span>
                    )}

                    {(question as any).microSkill && (question as any).microSkill !== question.title && (question as any).microSkill !== (question as any).topic && (
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium",
                        isLightMode
                          ? "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          : "bg-white/8 text-white/50 border border-white/10"
                      )}>
                        {(question as any).microSkill}
                      </span>
                    )}
                  </div>

                  {/* Key fact */}
                  {keyFact && (
                    <p className={cn(
                      "text-[13px] sm:text-[14px] leading-snug font-medium",
                      isLightMode ? "text-zinc-800" : "text-white/90"
                    )}>
                      {keyFact}
                    </p>
                  )}
                </div>

                {/* Toggle for full explanation */}
                {explanation && (
                  <button
                    onClick={() => setShowFullExplanation(v => !v)}
                    className={cn(
                      "flex items-center gap-1.5 text-[12px] sm:text-[13px] font-medium transition-colors",
                      isLightMode ? "text-zinc-500 hover:text-zinc-700" : "text-white/40 hover:text-white/70"
                    )}
                  >
                    <ChevronDown className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      showFullExplanation ? "rotate-180" : ""
                    )} />
                    {showFullExplanation ? "Hide explanation" : "Show full explanation"}
                  </button>
                )}

                {/* Full explanation (collapsible) */}
                {showFullExplanation && explanation && (
                  <div className={cn(
                    "pt-3 border-t",
                    isLightMode ? "border-zinc-200" : "border-white/10"
                  )}>
                    <div className={cn(
                      "text-[13px] sm:text-[14px] md:text-[15px] leading-[1.6]",
                      isLightMode ? "text-zinc-700" : "text-white/75"
                    )}>
                      <ReactMarkdown components={{ p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p> }}>{explanation}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Next button */}
                <div className={cn(
                  "pt-3 sm:pt-4 border-t",
                  isLightMode ? "border-zinc-200" : "border-white/10"
                )}>
                  <button
                    onClick={onNext}
                    className={cn(
                      "w-full py-3 sm:py-3 md:py-3.5 font-semibold rounded-lg sm:rounded-xl transition-all border-2 active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation",
                      isLightMode
                        ? "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-white border-zinc-900 hover:border-zinc-800"
                        : "bg-white/10 hover:bg-white/20 active:bg-white/15 text-white border-white/20 hover:border-white/30"
                    )}
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

      {/* AI Helper Floating Button - only show after answer submitted */}
      {hasSubmitted && (
        <button
          onClick={() => setShowAIHelper(!showAIHelper)}
          className={cn(
            "fixed bottom-4 right-4 md:bottom-6 md:right-6 p-3 md:p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105",
            showAIHelper ? "z-[60]" : "z-40",
            isLightMode 
              ? "bg-white/90 backdrop-blur-xl border border-black/[0.08] hover:bg-white" 
              : "bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] hover:bg-white/[0.12]"
          )}
          aria-label={showAIHelper ? "Close AI Helper" : "Open AI Helper"}
        >
          <Sparkles className={cn("h-4 w-4 md:h-5 md:w-5", isLightMode ? "text-stone-900" : "text-white/80")} />
        </button>
      )}

      {/* AI Helper Side Panel */}
      {showAIHelper && hasSubmitted && (
        <>
          {/* Backdrop for mobile only */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setShowAIHelper(false)}
          />
          
          {/* Side Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 bottom-0 w-full md:w-[500px] lg:w-[600px] z-50 shadow-2xl flex flex-col",
              isLightMode ? "bg-stone-50" : "bg-[#1a1a1a]"
            )}
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b flex-shrink-0",
              isLightMode ? "border-black/[0.08] bg-stone-50" : "border-white/10 bg-[#1a1a1a]"
            )}>
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className={cn(
                  "p-1.5 md:p-2 rounded-xl border flex-shrink-0",
                  isLightMode ? "bg-black/[0.03] border-black/[0.06]" : "bg-white/[0.05] border-white/[0.08]"
                )}>
                  <Sparkles className={cn("h-4 w-4 md:h-5 md:w-5", isLightMode ? "text-stone-700" : "text-white/70")} />
                </div>
                <div className="min-w-0">
                  <h2 className={cn("text-base md:text-lg font-light truncate", isLightMode ? "text-stone-900" : "text-white/90")} style={{ fontFamily: "'Manrope', sans-serif" }}>
                    AI Helper
                  </h2>
                  <p className={cn("text-xs md:text-sm font-light truncate hidden sm:block", isLightMode ? "text-stone-500" : "text-white/50")} style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Ask me anything about this question
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAIHelper(false)}
                className={cn(
                  "p-2 rounded-lg transition-colors flex-shrink-0",
                  isLightMode ? "hover:bg-black/[0.05]" : "hover:bg-white/10"
                )}
                aria-label="Close AI Helper"
              >
                <X className={cn("h-5 w-5", isLightMode ? "text-stone-700" : "text-zinc-300")} />
              </button>
            </div>

            {/* AI Helper Content */}
            <div className={cn("flex-1 overflow-hidden", isLightMode ? "bg-stone-50" : "bg-[#1a1a1a]")}>
              <AIHelper
                question={question}
                correctAnswer={correctAnswerId}
                selectedAnswer={selectedOption || ''}
                explanation={explanation}
                integrated={true}
                lightMode={isLightMode}
              />
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};
