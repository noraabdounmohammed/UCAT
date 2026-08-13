import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, X, ChevronDown, Settings2, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { PracticeFilterModalParchment as PracticeFilterModal } from './PracticeFilterModalParchment';
import { useTheme } from '@/contexts/ThemeContext';
import type { QuestionData } from './questionTypes';
import type { FilterState } from './PracticeFilterModalParchment';
import ReactMarkdown from 'react-markdown';
import { AIHelper } from './AIHelperClean';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SessionAnswer } from './SessionProgressDropdown';
import { generateVignetteVisual, generateExplanationVisual, getCachedVisual, isImageGenAvailable } from '@/services/visualGenerator';
import { useConceptStore } from '@/contexts/ConceptStoreContext';

// Feature flag — set to true to re-enable the "Go deeper" image generation section
// ("See this play out" / "Map the concept"). All underlying handlers, state, and
// services remain intact so flipping this back to true fully restores the feature.
const SHOW_IMAGE_GENERATION = false;

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
  onRestartWithFilters?: (filters?: FilterState) => void; // Called when user applies new filters from config modal
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
  onRestartWithFilters,
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
  
  // Get concept mastery stats from store
  let concepts: any[] = [];
  try {
    const store = useConceptStore();
    concepts = store.concepts || [];
  } catch {
    // Context not available (e.g., in review mode outside provider)
    concepts = [];
  }
  
  const conceptStats = useMemo(() => {
    const conceptId = question.concept_id;
    if (!conceptId || concepts.length === 0) return null;
    
    const concept = concepts.find((c: any) => c.concept_id === conceptId);
    if (!concept?.mastery_data) return null;
    
    const { attempts, correct } = concept.mastery_data;
    if (attempts === 0) return null;
    
    const accuracy = Math.round((correct / attempts) * 100);
    return { attempts, correct, accuracy };
  }, [question.concept_id, concepts]);
  
  // Visual generation state
  const [vignetteImage, setVignetteImage] = useState<string | null>(null);
  const [explanationImage, setExplanationImage] = useState<string | null>(null);
  const [memoryHook, setMemoryHook] = useState<string | null>(null);
  const [generatingVignette, setGeneratingVignette] = useState(false);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  
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
    
    // First check if question has pre-loaded images (featured questions)
    const q = question as any;
    if (q.vignette_image_url) {
      setVignetteImage(q.vignette_image_url);
    }
    if (q.explanation_image_url) {
      setExplanationImage(q.explanation_image_url);
      if (q.memory_hook) setMemoryHook(q.memory_hook);
    }
    
    // If no pre-loaded images, check cache for existing visuals
    if (!q.vignette_image_url) {
      getCachedVisual(questionId, 'vignette').then(cached => {
        if (cached) setVignetteImage(cached.image_url);
      });
    }
    if (!q.explanation_image_url) {
      getCachedVisual(questionId, 'explanation').then(cached => {
        if (cached) {
          setExplanationImage(cached.image_url);
          if (cached.memory_hook) setMemoryHook(cached.memory_hook);
        }
      });
    }
  }, [question.id, question.concept_id, question.question]);

  // Get the full question content for visual generation and AI helper
  // This is the complete clinical vignette that the user sees
  const fullQuestionContent = question.question_stem || question.question || '';

  // Handle vignette visual generation
  const handleGenerateVignette = async () => {
    const questionId = question.id || question.concept_id || `q_${fullQuestionContent?.substring(0, 30)}`;
    
    // Use the full question content (clinical vignette) for accurate visual generation
    console.log('🎨 Generating vignette with full question:', fullQuestionContent.substring(0, 100) + '...');
    
    setGeneratingVignette(true);
    const result = await generateVignetteVisual(questionId, fullQuestionContent);
    if (result) {
      setVignetteImage(result.image_url);
    }
    setGeneratingVignette(false);
  };

  // Handle explanation visual generation
  const handleGenerateExplanation = async () => {
    const questionId = String(question.id || question.concept_id || `q_${fullQuestionContent?.substring(0, 30)}`);
    const conceptTitle = String((question as any).concept_title || question.conceptTitle || question.title || 'Medical Concept');
    const explanationText = String(question.explanation || question.keyFact || '');
    const correctAnswer = String(question.correctAnswer ?? question.correct_answer ?? 'A');
    
    console.log('📊 Generating explanation visual for:', conceptTitle);
    
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

  // Format question content - prefer question_stem as it contains the full vignette
  const questionContent = question.question_stem || question.question || '';
  const explanation = sanitiseExplanation(question.explanation || question.worked_solution || '');
  const keyFact = sanitiseExplanation((question as any).key_fact || '');
  const isCorrect = hasSubmitted && selectedOption === correctAnswerId;

  // StudyEdit parchment theme - only applies in light mode
  const useParchmentTheme = isLightMode;

  return (
    <div className={cn(
      "fixed inset-0 flex flex-col overflow-hidden",
      useParchmentTheme ? "bg-[#F4ECDF]" : "bg-[#0A0A0A]"
    )}
    style={useParchmentTheme ? {
      // Paper texture overlay
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0.03 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      backgroundBlendMode: 'multiply'
    } : undefined}
    >
      {/* Header - StudyEdit style */}
      <div className={cn(
        "flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0",
        useParchmentTheme 
          ? "bg-transparent" 
          : "bg-transparent"
      )}>
        {/* Left: Progress */}
        <div className={cn(
          "text-[11px] font-medium tracking-[0.2em] uppercase",
          useParchmentTheme ? "text-[#8A7560]" : "text-white/50"
        )}
        style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {totalQuestions > 0 && (
            <>
              <span className={cn(
                "font-['Fraunces'] italic normal-case tracking-normal text-[13px] mr-1",
                useParchmentTheme ? "text-[#2A1E16]" : "text-white"
              )}>
                Concept {currentIndex + 1}
              </span>
              of {totalQuestions}
            </>
          )}
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-3">
          {/* Configure */}
          <button
            onClick={() => setShowConfigPanel(true)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              useParchmentTheme 
                ? "hover:bg-[#EBE1D0] text-[#8A7560]" 
                : "hover:bg-white/5 text-white/70"
            )}
            aria-label="Configure practice"
          >
            <Settings2 className="h-[18px] w-[18px]" />
          </button>
          {/* AI Helper - only after submit */}
          {hasSubmitted && (
            <button
              onClick={() => setShowAIHelper(!showAIHelper)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide transition-colors",
                showAIHelper
                  ? useParchmentTheme 
                    ? "bg-[#1F140C] text-[#FAF5EC]" 
                    : "bg-white text-[#0A0A0A]"
                  : useParchmentTheme 
                    ? "bg-[#EBE1D0] text-[#3B2A1E] hover:bg-[#D9CCB6]" 
                    : "bg-white/10 text-white/70 hover:bg-white/20"
              )}
            >
              AI
            </button>
          )}
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "p-2 rounded-lg transition-colors",
              useParchmentTheme 
                ? "hover:bg-[#EBE1D0] text-[#8A7560]" 
                : "hover:bg-white/5 text-white/70"
            )}
            aria-label="Toggle theme"
          >
            {isLightMode ? (
              <Moon className="h-[18px] w-[18px]" />
            ) : (
              <Sun className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[480px] mx-auto">
          {/* Content area */}
          <div className="px-5 sm:px-6 pt-5 pb-4 pb-safe">
            {/* Vignette Visual */}
            {vignetteImage && (
              <div className="-mx-5 sm:mx-0 mb-5">
                <div 
                  className="overflow-hidden cursor-zoom-in relative group sm:rounded-xl"
                  onClick={() => setFullscreenImage(vignetteImage)}
                >
                  <img 
                    src={vignetteImage} 
                    alt="Clinical scenario" 
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      Tap to enlarge
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Vignette Text - Fraunces serif */}
            <div 
              className={cn(
                "text-[19px] sm:text-[19.5px] font-light leading-[1.55] tracking-[-0.005em] mb-[26px]",
                useParchmentTheme ? "text-[#2A1E16]" : "text-white/90"
              )}
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                  strong: ({ children }) => (
                    <span 
                      className="font-medium"
                      style={{ 
                        background: 'linear-gradient(to top, rgba(229,168,157,0.25) 35%, transparent 35%)',
                        padding: '0 2px'
                      }}
                    >
                      {children}
                    </span>
                  ),
                }}
              >{questionContent}</ReactMarkdown>
            </div>

            {/* Ask line - the actual question */}
            {((question as any).question_text || (question as any).stem_question) && (
              <div className={cn(
                "text-[14.5px] font-medium tracking-[0.01em] mb-[18px] pt-[18px] border-t",
                useParchmentTheme ? "text-[#2A1E16] border-[#E8DCC4]" : "text-white border-white/10"
              )}>
                {(question as any).question_text || (question as any).stem_question || 'What is the most appropriate next step?'}
              </div>
            )}

            {/* Options - StudyEdit style */}
            <div className="flex flex-col gap-[10px] mb-[26px]">
              {options.map((option: { id: string; text: string }) => {
                const isSelected = selectedOption === option.id;
                const isCorrectOption = option.id === correctAnswerId;
                const isWrongChoice = hasSubmitted && isSelected && !isCorrectOption;
                const isCorrectChoice = hasSubmitted && isCorrectOption;
                const isOtherOption = hasSubmitted && !isSelected && !isCorrectOption;
                
                return (
                  <div
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    className={cn(
                      "flex items-center gap-[14px] px-4 py-[15px] rounded-[14px] border-[1.5px] transition-all duration-[0.18s]",
                      hasSubmitted ? "cursor-default" : "cursor-pointer",
                      // Answered states
                      isCorrectChoice && (useParchmentTheme 
                        ? "bg-[#E2EAD6] border-[#8FA379] text-[#4d5e3b]" 
                        : "bg-emerald-500/15 border-emerald-500 text-emerald-300"),
                      isWrongChoice && (useParchmentTheme 
                        ? "bg-[#F9E4DF] border-[#E5A89D] text-[#8a3328]" 
                        : "bg-rose-500/15 border-rose-500 text-rose-300"),
                      isOtherOption && "opacity-55 bg-transparent border-[1px]",
                      // Pre-submit states
                      !hasSubmitted && isSelected && (useParchmentTheme 
                        ? "bg-[#FAF5EC] border-[#1F140C] shadow-[0_0_0_3px_rgba(31,20,12,0.08)]" 
                        : "bg-white/10 border-white shadow-[0_0_0_3px_rgba(255,255,255,0.1)]"),
                      !hasSubmitted && !isSelected && (useParchmentTheme 
                        ? "bg-[#FAF5EC] border-[#D9CCB6] hover:border-[#8A7560]" 
                        : "bg-white/5 border-white/20 hover:border-white/40"),
                    )}
                  >
                    {/* Letter badge */}
                    <div className={cn(
                      "flex-shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] font-medium transition-all",
                      isCorrectChoice && (useParchmentTheme 
                        ? "bg-[#8FA379]/32 text-[#4d5e3b]" 
                        : "bg-emerald-500/30 text-emerald-300"),
                      isWrongChoice && (useParchmentTheme 
                        ? "bg-[#E5A89D]/35 text-[#8a3328]" 
                        : "bg-rose-500/30 text-rose-300"),
                      !hasSubmitted && isSelected && (useParchmentTheme 
                        ? "bg-[#1F140C] text-[#FAF5EC]" 
                        : "bg-white text-[#0A0A0A]"),
                      !hasSubmitted && !isSelected && (useParchmentTheme 
                        ? "bg-[#1F140C]/[0.06] text-[#3B2A1E]" 
                        : "bg-white/10 text-white/70"),
                      isOtherOption && (useParchmentTheme 
                        ? "bg-[#1F140C]/[0.06] text-[#3B2A1E]" 
                        : "bg-white/10 text-white/70"),
                    )}>
                      {option.id}
                    </div>
                    
                    {/* Option text */}
                    <span className={cn(
                      "flex-1 text-[15px]",
                      useParchmentTheme ? "text-[#2A1E16]" : "text-white",
                      isOtherOption && "opacity-70"
                    )}>
                      {option.text}
                    </span>
                    
                    {/* Check/X mark */}
                    {isCorrectChoice && (
                      <span className={cn(
                        "text-[14px] ml-auto w-[22px] h-[22px] flex items-center justify-center",
                        useParchmentTheme ? "text-[#8FA379]" : "text-emerald-400"
                      )}>✓</span>
                    )}
                    {isWrongChoice && (
                      <span className={cn(
                        "text-[14px] ml-auto w-[22px] h-[22px] flex items-center justify-center",
                        useParchmentTheme ? "text-[#E5A89D]" : "text-rose-400"
                      )}>✕</span>
                    )}
                  </div>
                );
              })}
            </div>


            {/* Feedback section - StudyEdit style */}
            {hasSubmitted && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Concept Reveal - quiet metadata block */}
                <div 
                  className="py-4 pb-[18px] mt-[22px] mb-2 border-t"
                  style={{ 
                    borderColor: useParchmentTheme ? '#E8DCC4' : 'rgba(255,255,255,0.1)',
                    animation: 'revealIn 0.6s 0.05s both cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div 
                    className="text-[10px] font-medium tracking-[0.24em] uppercase mb-[6px]"
                    style={{ color: useParchmentTheme ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
                  >
                    You were just tested on
                  </div>
                  <div 
                    className="text-[17px] font-medium leading-[1.25] mb-1"
                    style={{ 
                      fontFamily: "'Fraunces', serif",
                      color: useParchmentTheme ? '#2A1E16' : 'white',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    {(question as any).concept_title || question.title || (question as any).topic || 'Clinical Concept'}
                    {(question as any).microSkill && (
                      <span className="text-[#E5A89D] italic font-normal"> · {(question as any).microSkill}</span>
                    )}
                  </div>
                  {/* Why line */}
                  {((question as any).study_reason || (conceptStats && conceptStats.attempts > 0)) && (
                    <p 
                      className="text-[12.5px] italic leading-relaxed"
                      style={{ 
                        fontFamily: "'Fraunces', serif",
                        color: useParchmentTheme ? '#8A7560' : 'rgba(255,255,255,0.5)'
                      }}
                    >
                      <span className="text-[#E5A89D] not-italic mr-1">because</span>
                      {(question as any).study_reason === 'due' && 'this concept is due for review'}
                      {(question as any).study_reason === 'needs_review' && 'you need more practice on this'}
                      {(question as any).study_reason === 'new' && "you haven't seen this concept yet"}
                      {(question as any).study_reason === 'reinforcement' && 'reinforcing what you know'}
                      {!(question as any).study_reason && conceptStats && conceptStats.attempts > 0 && `you've answered this concept wrong ${conceptStats.attempts - conceptStats.correct} times`}
                    </p>
                  )}
                </div>

                {/* Verdict Strip */}
                <div className="flex items-center justify-between gap-2.5 mt-1 mb-1">
                  <div className={cn(
                    "inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase",
                    isCorrect 
                      ? (useParchmentTheme ? "text-[#4d5e3b]" : "text-emerald-400")
                      : (useParchmentTheme ? "text-[#8a3328]" : "text-rose-400")
                  )}>
                    <span className={cn(
                      "w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12px] font-bold",
                      isCorrect 
                        ? (useParchmentTheme ? "bg-[#8FA379] text-[#FAF5EC]" : "bg-emerald-500 text-white")
                        : (useParchmentTheme ? "bg-[#E5A89D] text-[#FAF5EC]" : "bg-rose-500 text-white")
                    )}>
                      {isCorrect ? '✓' : '✕'}
                    </span>
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </div>
                  
                  {/* Heat chip - test stats */}
                  {conceptStats && (
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium",
                      isCorrect
                        ? (useParchmentTheme ? "bg-[#8FA379]/20 border border-[#8FA379] text-[#4d5e3b]" : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300")
                        : (useParchmentTheme ? "bg-[#E5A89D]/30 border border-[#E5A89D] text-[#8a3328]" : "bg-rose-500/15 border border-rose-500/30 text-rose-300")
                    )}>
                      Tested <span className="font-['Fraunces'] italic text-[13px]">{conceptStats.attempts}×</span>
                      {' · still '}
                      <span className="font-['Fraunces'] italic text-[13px]">{conceptStats.accuracy}%</span>
                    </div>
                  )}
                </div>

                {/* Link Card - hero text */}
                {(keyFact || explanation) && (
                  <div 
                    className="mx-[-22px] my-5 px-6 py-7 relative"
                    style={{ 
                      background: useParchmentTheme ? '#FBEDE7' : 'rgba(229,168,157,0.1)',
                      borderTop: '1px solid rgba(229,168,157,0.35)',
                      borderBottom: '1px solid rgba(229,168,157,0.35)'
                    }}
                  >
                    <div 
                      className="text-[10px] font-medium tracking-[0.24em] uppercase mb-[14px]"
                      style={{ color: useParchmentTheme ? '#E5A89D' : '#f87171' }}
                    >
                      The link
                    </div>
                    <div 
                      className="text-[26px] font-light leading-[1.32]"
                      style={{ 
                        fontFamily: "'Fraunces', serif",
                        color: useParchmentTheme ? '#2A1E16' : 'white',
                        letterSpacing: '-0.018em'
                      }}
                    >
                      {keyFact ? (
                        <span dangerouslySetInnerHTML={{ 
                          __html: keyFact.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, `<em style="color: ${useParchmentTheme ? '#E5A89D' : '#f87171'}">$1</em>`)
                        }} />
                      ) : (
                        explanation && explanation.split('.')[0] + '.'
                      )}
                    </div>
                  </div>
                )}

                {/* Why not the others */}
                {!isCorrect && (question as any).distractorExplanations && (
                  <div className="mb-6">
                    <div className={cn(
                      "text-[10.5px] font-semibold tracking-[0.22em] uppercase mb-3",
                      useParchmentTheme ? "text-[#8A7560]" : "text-white/50"
                    )}>
                      Why not the others
                    </div>
                    <div className="flex flex-col">
                      {Object.entries((question as any).distractorExplanations || {}).map(([letter, text]: [string, any]) => (
                        letter !== correctAnswerId && (
                          <div 
                            key={letter}
                            className={cn(
                              "grid grid-cols-[24px_1fr] gap-3 py-3 text-[13.5px] leading-[1.5] border-t",
                              useParchmentTheme ? "border-[#E8DCC4] text-[#3B2A1E]" : "border-white/10 text-white/70"
                            )}
                          >
                            <span 
                              className="text-[14px] italic leading-[1.5]"
                              style={{ fontFamily: "'Fraunces', serif", color: useParchmentTheme ? '#E5A89D' : '#f87171' }}
                            >
                              {letter}.
                            </span>
                            <span>
                              <strong className={useParchmentTheme ? "text-[#2A1E16] font-medium" : "text-white font-medium"}>
                                {options.find((o: any) => o.id === letter)?.text?.split(' ').slice(0, 3).join(' ')}
                              </strong>
                              {' — '}{text}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Reasoning toggle - folded by default */}
                {explanation && (
                  <>
                    <button
                      onClick={() => setShowFullExplanation(v => !v)}
                      className={cn(
                        "w-full flex items-center justify-between py-3.5 mb-1 border-y text-[13px] font-medium tracking-[0.02em]",
                        useParchmentTheme 
                          ? "border-[#E8DCC4] text-[#3B2A1E]" 
                          : "border-white/10 text-white/70"
                      )}
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      <span>{showFullExplanation ? 'Hide the full reasoning' : 'Show the full reasoning'}</span>
                      <span className={cn(
                        "transition-transform duration-250",
                        showFullExplanation && "rotate-180"
                      )}>⌄</span>
                    </button>
                    
                    {showFullExplanation && (
                      <div 
                        className={cn(
                          "py-4 pb-[18px] text-[15px] font-light leading-[1.6]",
                          useParchmentTheme ? "text-[#3B2A1E]" : "text-white/75"
                        )}
                        style={{ fontFamily: "'Fraunces', serif" }}
                      >
                        <ReactMarkdown 
                          components={{ 
                            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p> 
                          }}
                        >
                          {explanation}
                        </ReactMarkdown>
                      </div>
                    )}
                  </>
                )}

                {/* Visual generation section.
                    Temporarily disabled per user request — flip SHOW_IMAGE_GENERATION
                    to true to bring it back. All underlying code (handlers, state,
                    isImageGenAvailable, services) is intentionally kept intact. */}
                {SHOW_IMAGE_GENERATION && isImageGenAvailable() && (
                  <div className="my-5">
                    <div className={cn(
                      "text-[10.5px] font-medium tracking-[0.22em] uppercase mb-3",
                      useParchmentTheme ? "text-[#8A7560]" : "text-white/50"
                    )}>
                      Go deeper
                    </div>
                    
                    {/* Viz rows */}
                    <div className="flex flex-col">
                      {!vignetteImage && (
                        <button
                          onClick={handleGenerateVignette}
                          disabled={generatingVignette}
                          className={cn(
                            "flex items-center gap-[14px] py-3 border-t transition-all",
                            useParchmentTheme 
                              ? "border-[#E8DCC4] hover:pl-1" 
                              : "border-white/10 hover:pl-1",
                            generatingVignette && "opacity-50"
                          )}
                        >
                          <div className={cn(
                            "w-[28px] h-[28px] rounded-lg flex items-center justify-center border flex-shrink-0",
                            useParchmentTheme 
                              ? "bg-[#F4ECDF] border-[#D9CCB6] text-[#1F140C]" 
                              : "bg-white/5 border-white/20 text-white"
                          )}>
                            {generatingVignette ? <Loader2 className="h-[14px] w-[14px] animate-spin" /> : <ImageIcon className="h-[14px] w-[14px]" />}
                          </div>
                          <div className="flex-1 text-left">
                            <div className={cn(
                              "text-[14.5px] font-normal leading-[1.2]",
                              useParchmentTheme ? "text-[#2A1E16]" : "text-white"
                            )} style={{ fontFamily: "'Fraunces', serif" }}>
                              See this <em className="text-[#E5A89D]">play out</em>
                            </div>
                            <div className={cn(
                              "text-[11.5px] mt-[2px]",
                              useParchmentTheme ? "text-[#8A7560]" : "text-white/50"
                            )}>
                              {generatingVignette ? 'Creating...' : 'A clinical scene of the scenario'}
                            </div>
                          </div>
                          <span className={cn(
                            "text-[16px]",
                            useParchmentTheme ? "text-[#8A7560]" : "text-white/50"
                          )}>›</span>
                        </button>
                      )}
                      
                      {!explanationImage && (
                        <button
                          onClick={handleGenerateExplanation}
                          disabled={generatingExplanation}
                          className={cn(
                            "flex items-center gap-[14px] py-3 border-t transition-all",
                            useParchmentTheme 
                              ? "border-[#E8DCC4] hover:pl-1" 
                              : "border-white/10 hover:pl-1",
                            generatingExplanation && "opacity-50"
                          )}
                        >
                          <div className={cn(
                            "w-[28px] h-[28px] rounded-lg flex items-center justify-center border flex-shrink-0",
                            useParchmentTheme 
                              ? "bg-[#F4ECDF] border-[#D9CCB6] text-[#1F140C]" 
                              : "bg-white/5 border-white/20 text-white"
                          )}>
                            {generatingExplanation ? <Loader2 className="h-[14px] w-[14px] animate-spin" /> : <ImageIcon className="h-[14px] w-[14px]" />}
                          </div>
                          <div className="flex-1 text-left">
                            <div className={cn(
                              "text-[14.5px] font-normal leading-[1.2]",
                              useParchmentTheme ? "text-[#2A1E16]" : "text-white"
                            )} style={{ fontFamily: "'Fraunces', serif" }}>
                              Map the <em className="text-[#E5A89D]">concept</em>
                            </div>
                            <div className={cn(
                              "text-[11.5px] mt-[2px]",
                              useParchmentTheme ? "text-[#8A7560]" : "text-white/50"
                            )}>
                              {generatingExplanation ? 'Creating...' : 'How the pieces connect'}
                            </div>
                          </div>
                          <span className={cn(
                            "text-[16px]",
                            useParchmentTheme ? "text-[#8A7560]" : "text-white/50"
                          )}>›</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Continue button - StudyEdit style */}
                <div className="mt-4">
                  <button
                    onClick={onNext}
                    className={cn(
                      "w-full py-[18px] px-6 rounded-full font-medium text-[14.5px] leading-[1.3] tracking-[0.01em] transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98]",
                      useParchmentTheme
                        ? "bg-[#1F140C] text-[#FAF5EC] hover:bg-[#3B2A1E] hover:-translate-y-0.5"
                        : "bg-white text-[#0A0A0A] hover:bg-white/90 hover:-translate-y-0.5"
                    )}
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <div className="flex flex-col gap-[2px] items-center">
                      <span className="text-[15px] font-medium">{nextButtonText || 'Continue'}</span>
                      <span 
                        className="text-[11.5px] italic font-normal"
                        style={{ 
                          fontFamily: "'Fraunces', serif",
                          color: useParchmentTheme ? 'rgba(245,239,227,0.7)' : 'rgba(10,10,10,0.7)'
                        }}
                      >
                        {isCorrect ? 'Moving on' : 'One more on this concept first'}
                      </span>
                    </div>
                    <span className="transition-transform hover:translate-x-1 flex-shrink-0">→</span>
                  </button>
                  
                  {/* Flag link */}
                  <a 
                    href="#"
                    className="block text-center mt-[14px] py-1.5"
                    style={{ 
                      fontFamily: "'Fraunces', serif",
                      fontStyle: 'italic',
                      fontSize: '12.5px',
                      color: useParchmentTheme ? '#8A7560' : 'rgba(255,255,255,0.5)',
                      textDecoration: 'none'
                    }}
                  >
                    This doesn't look right · flag the concept
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configure Practice Modal */}
      {showConfigPanel && (
        <PracticeFilterModal
          isOpen={showConfigPanel}
          onClose={() => setShowConfigPanel(false)}
          onApplyFilters={(filters) => {
            onRestartWithFilters?.(filters);
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
              !useParchmentTheme && (isLightMode ? "bg-stone-50" : "bg-[#1a1a1a]")
            )}
            style={useParchmentTheme ? { backgroundColor: '#FAF5EC' } : undefined}
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b flex-shrink-0",
              !useParchmentTheme && (isLightMode ? "border-black/[0.08] bg-stone-50" : "border-white/10 bg-[#1a1a1a]")
            )}
              style={useParchmentTheme ? { borderColor: '#E8DCC4', backgroundColor: '#FAF5EC' } : undefined}
            >
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <div className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-sm flex-shrink-0",
                  !useParchmentTheme && (isLightMode ? "bg-stone-900 text-white" : "bg-white text-stone-900")
                )}
                  style={useParchmentTheme ? { backgroundColor: '#1F140C', color: '#FAF5EC' } : undefined}
                >
                  AI
                </div>
                <div className="min-w-0">
                  <p className={cn("text-xs md:text-sm font-light truncate hidden sm:block", !useParchmentTheme && (isLightMode ? "text-stone-500" : "text-white/50"))}
                    style={useParchmentTheme ? { fontFamily: "'Manrope', sans-serif", color: '#8A7560' } : { fontFamily: "'Manrope', sans-serif" }}
                  >
                    Ask me anything about this question
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAIHelper(false)}
                className={cn(
                  "p-2 rounded-lg transition-colors flex-shrink-0",
                  useParchmentTheme ? "hover:bg-[#EBE1D0]" : (isLightMode ? "hover:bg-black/[0.05]" : "hover:bg-white/10")
                )}
                aria-label="Close AI"
              >
                <X className={cn("h-5 w-5", !useParchmentTheme && (isLightMode ? "text-stone-700" : "text-zinc-300"))} style={useParchmentTheme ? { color: '#3B2A1E' } : undefined} />
              </button>
            </div>

            {/* AI Helper Content */}
            <div className={cn("flex-1 overflow-hidden", !useParchmentTheme && (isLightMode ? "bg-stone-50" : "bg-[#1a1a1a]"))}
              style={useParchmentTheme ? { backgroundColor: '#FAF5EC' } : undefined}
            >
              <AIHelper
                question={question}
                correctAnswer={correctAnswerId}
                selectedAnswer={selectedOption || ''}
                explanation={explanation}
                integrated={true}
                lightMode={isLightMode}
                parchment={useParchmentTheme}
              />
            </div>
          </motion.div>
        </>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img 
            src={fullscreenImage} 
            alt="Enlarged view" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 text-white/60 text-sm">Tap anywhere to close</p>
        </div>
      )}
    </div>
  );
};
