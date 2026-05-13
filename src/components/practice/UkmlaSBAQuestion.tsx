import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ChevronRight, ArrowLeft, ChevronLeft, Sun, Moon, X, ChevronDown, Settings2, BookOpen, ExternalLink, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { PracticeFilterModal } from './PracticeFilterModal';
import { useTheme } from '@/contexts/ThemeContext';
import type { QuestionData } from './questionTypes';
import ReactMarkdown from 'react-markdown';
import { AIHelper } from './AIHelperClean';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SessionProgressDropdown, SessionAnswer } from './SessionProgressDropdown';
import { generateVignetteVisual, generateExplanationVisual, getCachedVisual, isImageGenAvailable } from '@/services/visualGenerator';

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
  availableFilters?: string[];
  activeFilter?: string | null;
  onFilterSelect?: (filter?: string) => void;
  currentFormat?: string;
  onChangeFormat?: (format: string) => void;
  // Review mode props - show question in already-answered state
  preSelectedAnswer?: string;
  preSubmitted?: boolean;
  // Custom button text for review mode
  nextButtonText?: string;
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
  onJumpTo,
  availableFilters = [],
  activeFilter = null,
  onFilterSelect,
  currentFormat = 'ukmla_sba',
  onChangeFormat,
  preSelectedAnswer,
  preSubmitted = false,
  nextButtonText
}) => {
  // Initialize from preSelectedAnswer/preSubmitted for review mode
  const [selectedOption, setSelectedOption] = useState<string | null>(preSelectedAnswer || null);
  const [hasSubmitted, setHasSubmitted] = useState(preSubmitted);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isLightMode = theme === 'light';
  const [showFullExplanation, setShowFullExplanation] = useState(preSubmitted); // Show explanation in review mode
  
  // Visual generation state
  const [vignetteImage, setVignetteImage] = useState<string | null>(null);
  const [explanationImage, setExplanationImage] = useState<string | null>(null);
  const [memoryHook, setMemoryHook] = useState<string | null>(null);
  const [generatingVignette, setGeneratingVignette] = useState(false);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  
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

  // Check for cached visuals when question changes
  useEffect(() => {
    const questionId = question.id || question.concept_id || `q_${question.question?.substring(0, 30)}`;
    
    // Reset visuals for new question
    setVignetteImage(null);
    setExplanationImage(null);
    setMemoryHook(null);
    
    // Check cache for existing visuals
    getCachedVisual(questionId, 'vignette').then(cached => {
      if (cached) setVignetteImage(cached.image_url);
    });
    getCachedVisual(questionId, 'explanation').then(cached => {
      if (cached) {
        setExplanationImage(cached.image_url);
        if (cached.memory_hook) setMemoryHook(cached.memory_hook);
      }
    });
  }, [question.id, question.concept_id, question.question]);

  // Handle vignette visual generation
  const handleGenerateVignette = async () => {
    const questionId = question.id || question.concept_id || `q_${question.question?.substring(0, 30)}`;
    const stem = question.question_stem || question.question || '';
    
    setGeneratingVignette(true);
    const result = await generateVignetteVisual(questionId, stem);
    if (result) {
      setVignetteImage(result.image_url);
    }
    setGeneratingVignette(false);
  };

  // Handle explanation visual generation
  const handleGenerateExplanation = async () => {
    const questionId = String(question.id || question.concept_id || `q_${question.question?.substring(0, 30)}`);
    const conceptTitle = String(question.conceptTitle || question.title || 'Medical Concept');
    const explanationText = String(question.explanation || question.keyFact || '');
    const correctAnswer = String(question.correctAnswer ?? question.correct_answer ?? 'A');
    
    setGeneratingExplanation(true);
    const result = await generateExplanationVisual(questionId, conceptTitle, explanationText, correctAnswer);
    if (result) {
      setExplanationImage(result.image_url);
      if (result.memory_hook) setMemoryHook(result.memory_hook);
    }
    setGeneratingExplanation(false);
  };
  
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
          {/* Configure Practice Button */}
          <button
            onClick={() => setShowConfigPanel(true)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium',
              showConfigPanel
                ? isLightMode ? 'bg-zinc-200 text-stone-900' : 'bg-white/15 text-white'
                : isLightMode ? 'hover:bg-zinc-200 text-zinc-700' : 'hover:bg-white/5 text-white/70'
            )}
            aria-label="Configure practice"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Configure</span>
          </button>
          {/* AI Helper Button - only show after answer submitted */}
          {hasSubmitted && (
            <button
              onClick={() => setShowAIHelper(!showAIHelper)}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-colors text-sm font-medium',
                showAIHelper
                  ? isLightMode ? 'bg-zinc-200 text-stone-900' : 'bg-white/15 text-white'
                  : isLightMode ? 'hover:bg-zinc-200 text-zinc-700' : 'hover:bg-white/5 text-white/70'
              )}
              aria-label={showAIHelper ? 'Close AI' : 'Open AI'}
            >
              AI
            </button>
          )}
          {/* Dark/Light Mode Toggle */}
          <button
            onClick={toggleTheme}
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
            {/* Study Reason Badge + AI Disclaimer */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Study reason badge */}
              {(question as any).study_reason && (
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider",
                  (question as any).study_reason === 'due' && (isLightMode 
                    ? "bg-orange-100 text-orange-700 border border-orange-200" 
                    : "bg-orange-950/40 text-orange-300 border border-orange-800"),
                  (question as any).study_reason === 'needs_review' && (isLightMode 
                    ? "bg-amber-100 text-amber-700 border border-amber-200" 
                    : "bg-amber-950/40 text-amber-300 border border-amber-800"),
                  (question as any).study_reason === 'new' && (isLightMode 
                    ? "bg-blue-100 text-blue-700 border border-blue-200" 
                    : "bg-blue-950/40 text-blue-300 border border-blue-800"),
                  (question as any).study_reason === 'reinforcement' && (isLightMode 
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                    : "bg-emerald-950/40 text-emerald-300 border border-emerald-800")
                )}>
                  {(question as any).study_reason === 'due' && '📅 Due for review'}
                  {(question as any).study_reason === 'needs_review' && '🔄 Needs work'}
                  {(question as any).study_reason === 'new' && '✨ New concept'}
                  {(question as any).study_reason === 'reinforcement' && '💪 Reinforcement'}
                </span>
              )}
              
              {/* AI Disclaimer */}
              <div className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs",
                isLightMode 
                  ? "bg-amber-50 border border-amber-200 text-amber-900" 
                  : "bg-amber-950/30 border border-amber-900 text-amber-200"
              )}>
                <span className="font-medium">AI-generated.</span>{' '}
                <span className={isLightMode ? "text-amber-800/90" : "text-amber-200/90"}>
                  Verify against official guidelines.
                </span>
              </div>
            </div>

            {/* Vignette Visual - Clinical scene (doesn't reveal answer) */}
            {(vignetteImage || isImageGenAvailable()) && (
              <div className="mb-4">
                {vignetteImage ? (
                  <div 
                    className="rounded-xl overflow-hidden mb-2 cursor-zoom-in relative group"
                    onClick={() => window.open(vignetteImage, '_blank')}
                  >
                    <img 
                      src={vignetteImage} 
                      alt="Clinical scenario" 
                      className="w-full h-auto max-h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="text-white text-xs bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Tap to enlarge
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateVignette}
                    disabled={generatingVignette}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                      isLightMode
                        ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                        : "bg-purple-950/30 text-purple-300 border border-purple-800 hover:bg-purple-900/40",
                      generatingVignette && "opacity-50 cursor-wait"
                    )}
                  >
                    {generatingVignette ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating scene...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>Generate Scene Visual</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
            
            {/* Question */}
            <div className="mb-5 sm:mb-6 md:mb-8">
              <div className={cn(
                "text-base sm:text-lg md:text-xl font-semibold leading-snug",
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
                      "text-sm sm:text-base md:text-lg font-semibold leading-relaxed break-words",
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
                      "text-sm sm:text-base leading-snug font-medium",
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
                      "text-sm sm:text-base md:text-lg leading-relaxed",
                      isLightMode ? "text-zinc-700" : "text-white/75"
                    )}>
                      <ReactMarkdown components={{ p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p> }}>{explanation}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Explanation Visual - Concept map/flowchart (after answer) */}
                {hasSubmitted && (
                  <div className={cn(
                    "mt-4 pt-4 border-t",
                    isLightMode ? "border-zinc-200" : "border-white/10"
                  )}>
                    {explanationImage ? (
                      <div>
                        {memoryHook && (
                          <div className={cn(
                            "mb-2 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium",
                            isLightMode
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-emerald-950/30 text-emerald-300 border border-emerald-800"
                          )}>
                            <Sparkles className="h-3 w-3" />
                            <span>Memory hook: {memoryHook}</span>
                          </div>
                        )}
                        <div 
                          className="rounded-xl overflow-hidden cursor-zoom-in relative group"
                          onClick={() => window.open(explanationImage, '_blank')}
                        >
                          <img 
                            src={explanationImage} 
                            alt="Concept diagram" 
                            className="w-full h-auto"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="text-white text-xs bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              Tap to enlarge
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateExplanation}
                        disabled={generatingExplanation}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                          isLightMode
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-emerald-950/30 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/40",
                          generatingExplanation && "opacity-50 cursor-wait"
                        )}
                      >
                        {generatingExplanation ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Generating concept map...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Generate Concept Visual</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Guideline Citation - Always visible when available */}
                {(question.guideline || question.guideline_url) && (
                  <div className={cn(
                    "mt-3 pt-3 border-t",
                    isLightMode ? "border-zinc-200" : "border-white/10"
                  )}>
                    <div className={cn(
                      "flex items-start gap-2 p-3 rounded-xl",
                      isLightMode 
                        ? "bg-blue-50 border border-blue-200" 
                        : "bg-blue-500/10 border border-blue-500/20"
                    )}>
                      <BookOpen className={cn(
                        "w-4 h-4 flex-shrink-0 mt-0.5",
                        isLightMode ? "text-blue-600" : "text-blue-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-[11px] uppercase tracking-widest font-semibold mb-1",
                          isLightMode ? "text-blue-700" : "text-blue-300"
                        )}>
                          UK Clinical Guideline
                        </div>
                        {question.guideline_url ? (
                          <a
                            href={question.guideline_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "text-sm font-medium hover:underline inline-flex items-center gap-1.5",
                              isLightMode ? "text-blue-700" : "text-blue-300"
                            )}
                          >
                            {question.guideline || 'View guideline'}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className={cn(
                            "text-sm font-medium",
                            isLightMode ? "text-blue-700" : "text-blue-300"
                          )}>
                            {question.guideline}
                          </span>
                        )}
                        {question.guideline_section && (
                          <div className={cn(
                            "text-xs mt-1",
                            isLightMode ? "text-blue-600/70" : "text-blue-400/70"
                          )}>
                            {question.guideline_section}
                          </div>
                        )}
                      </div>
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
                    <span>{nextButtonText || 'Next Question'}</span>
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

      {/* Configure Practice Modal */}
      {showConfigPanel && (
        <PracticeFilterModal
          isLightMode={isLightMode}
          onClose={() => setShowConfigPanel(false)}
          currentFormat={currentFormat}
          onChangeFormat={(format) => {
            onChangeFormat?.(format);
            setShowConfigPanel(false);
          }}
        />
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
                  "px-3 py-1.5 rounded-lg font-bold text-sm flex-shrink-0",
                  isLightMode ? "bg-stone-900 text-white" : "bg-white text-stone-900"
                )}>
                  AI
                </div>
                <div className="min-w-0">
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
                aria-label="Close AI"
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
