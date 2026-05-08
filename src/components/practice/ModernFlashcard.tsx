import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Sun, Moon, X, Settings2, BookOpen, ExternalLink } from 'lucide-react';
import type { QuestionData } from './questionTypes';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { AIHelper } from './AIHelperClean';
import { PracticeFilterModal } from './PracticeFilterModal';

interface ModernFlashcardProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalCards?: number;
  title?: string;
  availableFilters?: string[];
  activeFilter?: string | null;
  onFilterSelect?: (filter?: string) => void;
  currentFormat?: string;
  onChangeFormat?: (format: string) => void;
}

// Helper function to convert inline bullet points to proper markdown
const formatBulletPoints = (text: string): string => {
  let formatted = text;
  
  // Convert inline bullet points (• or *) after colons to proper markdown lists
  formatted = formatted.replace(
    /([:\n])\s*[•\*]\s*([^•\*\n]+?)(?=\s*[•\*]|\s*$)/g,
    (_match: string, prefix: string, content: string) => {
      if (prefix === ':') {
        return `:\n- ${content.trim()}`;
      }
      return `\n- ${content.trim()}`;
    }
  );
  
  // Clean up any remaining inline bullets in paragraph form
  formatted = formatted.replace(
    /([^:\n])\s+[•\*]\s+/g,
    '$1\n- '
  );
  
  // Convert numbered lists: "1) text 2) text" -> "1. text\n2. text"
  formatted = formatted.replace(
    /(\d+)\)\s+([^0-9]+?)(?=\s*\d+\)|\s*$)/g,
    '$1. $2\n'
  );
  
  return formatted;
};

export const ModernFlashcard: React.FC<ModernFlashcardProps> = ({
  question,
  onAnswer,
  onNext,
  onPrevious,
  onExit,
  currentIndex = 0,
  totalCards = 0,
  title = "Flashcards",
  availableFilters = [],
  activeFilter,
  onFilterSelect,
  currentFormat = 'flashcard',
  onChangeFormat
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [animation, setAnimation] = useState<string>('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isLightMode, setIsLightMode] = useState(true);
  const [interactionCount, setInteractionCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Motion values for swipe
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-200, 0, 200], [15, 0, -15]);
  const rotateZ = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  
  // Opacity transforms for swipe labels
  const knowOpacity = useTransform(x, [0, 150], [0, 1]);
  const dontKnowOpacity = useTransform(x, [-150, 0], [1, 0]);

  // Extract front and back content and format bullet points
  const rawBackContent = question.explanation || 'No explanation available';
  
  // Remove "Clinical Relevance" sections and clean up stray markdown
  const cleanedContent = rawBackContent
    .replace(/Clinical Relevance:[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/\*\*Clinical Relevance:\*\*[\s\S]*?(?=\n\n|$)/gi, '')
    // Fix malformed markdown bold syntax
    .replace(/^\*\*([^*\n]+):/gm, '**$1:**')  // Fix **Text: to **Text:**
    .replace(/\*\*([^*]+)$/gm, '**$1**')  // Add closing ** if missing at end of line
    // Remove standalone ** that aren't part of proper markdown bold syntax
    .replace(/\*\*\s*$/gm, '')  // Remove ** at end of lines
    .replace(/^\s*\*\*\s*$/gm, '')  // Remove lines with only **
    .replace(/\*\*\s+\*\*/g, '')  // Remove ** ** patterns
    .trim();
  
  const backContent = formatBulletPoints(cleanedContent);
  const custom_filters: string[] = Array.isArray(question.custom_filters) ? question.custom_filters : [];
  const frontText = question.question || question.question_stem || '';

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    setInteractionCount(prev => prev + 1);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipeThreshold = 60;
    const velocityThreshold = 400;

    // Only handle horizontal swipes (know/don't know)
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
        // Swipe right = Know
        setIsDragging(false);
        handleSelfRating(5);
        return;
      }
      if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
        // Swipe left = Don't know
        setIsDragging(false);
        handleSelfRating(1);
        return;
      }
    }
    // End dragging state immediately to allow tap to work
    setTimeout(() => setIsDragging(false), 0);
  };

  const handleSelfRating = (rating: number) => {
    setHasAnswered(true);
    setIsExiting(true);
    setExitDirection(rating >= 3 ? 'right' : 'left');
    setInteractionCount(prev => prev + 1);
    
    onAnswer(rating >= 3);
    
    // Reset motion values immediately before advancing
    setTimeout(() => {
      x.set(0);
      y.set(0);
    }, 100);
    
    // Auto-advance to next question after exit animation
    setTimeout(() => {
      onNext();
      setIsExiting(false);
      setExitDirection(null);
    }, 400);
  };

  // Reset state when question ID changes (indicating a new question)
  useEffect(() => {
    setIsFlipped(false);
    setHasAnswered(false);
    setAnimation('');
    setIsExiting(false);
    setExitDirection(null);
    x.set(0);
    y.set(0);
  }, [question.id, question.question, question.question_stem, x, y]);

  // Show tutorial on first load
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('flashcard-tutorial-seen');
    if (!hasSeenTutorial && currentIndex === 0) {
      setShowTutorial(true);
    }
  }, [currentIndex]);

  // Set body background based on theme
  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = (document.documentElement as HTMLElement).style.backgroundColor;
    if (isLightMode) {
      document.body.style.backgroundColor = '#fafafa';
      (document.documentElement as HTMLElement).style.backgroundColor = '#fafafa';
    } else {
      document.body.style.backgroundColor = '#0a0a0a';
      (document.documentElement as HTMLElement).style.backgroundColor = '#0a0a0a';
    }
    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      (document.documentElement as HTMLElement).style.backgroundColor = prevHtmlBg;
    };
  }, [isLightMode]);


  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('flashcard-tutorial-seen', 'true');
  };

  // Reset animation class after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimation('');
    }, 500);
    return () => clearTimeout(timer);
  }, [animation]);

  // Keyboard shortcuts for flashcard interactions
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close AI Helper with Escape
      if (event.key === 'Escape' && showAIHelper) {
        event.preventDefault();
        setShowAIHelper(false);
        return;
      }

      // Ignore if user is typing in an input field or AI Helper is open
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || showAIHelper) {
        return;
      }

      switch (event.key) {
        case ' ':
        case 'ArrowUp':
        case 'ArrowDown':
          event.preventDefault();
          handleFlip();
          break;
        case 'ArrowRight':
          event.preventDefault();
          // Animate card to the right (Know)
          x.set(300);
          setTimeout(() => {
            handleSelfRating(5);
          }, 200);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          // Animate card to the left (Don't Know)
          x.set(-300);
          setTimeout(() => {
            handleSelfRating(1);
          }, 200);
          break;
        case 'Enter':
          event.preventDefault();
          handleFlip();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, hasAnswered, onNext, x, showAIHelper]);

  return (
    <div className={cn(
      "fixed inset-0 flex flex-col overflow-hidden",
      isLightMode 
        ? "bg-zinc-50" 
        : "bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-4 border-b flex-shrink-0",
        isLightMode ? "border-zinc-200" : "border-white/10"
      )}>
        <button
          onClick={onExit}
          className={cn(
            "p-2 rounded-lg transition-colors",
            isLightMode ? "hover:bg-zinc-200" : "hover:bg-white/5"
          )}
          aria-label="Go back"
        >
          <ArrowLeft className={cn("h-5 w-5", isLightMode ? "text-zinc-700" : "text-white/70")} />
        </button>
        <div className="flex-1 text-center">
          <h1 className={cn("text-lg font-semibold", isLightMode ? "text-zinc-900" : "text-white")}>{title}</h1>
          {totalCards > 0 && (
            <p className={cn("text-sm", isLightMode ? "text-zinc-500" : "text-white/50")}>{currentIndex + 1} / {totalCards}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Configure Practice Button */}
          <button
            onClick={() => setShowConfigPanel(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium",
              showConfigPanel
                ? isLightMode ? "bg-zinc-200 text-stone-900" : "bg-white/15 text-white"
                : isLightMode ? "hover:bg-zinc-200 text-zinc-700" : "hover:bg-white/5 text-white/70"
            )}
            aria-label="Configure practice"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Configure</span>
          </button>
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isLightMode ? "hover:bg-zinc-200" : "hover:bg-white/5"
            )}
            aria-label="Toggle theme"
          >
            {isLightMode ? (
              <Moon className="h-5 w-5 text-zinc-700" />
            ) : (
              <Sun className="h-5 w-5 text-white/70" />
            )}
          </button>
          <button
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentIndex === 0
                ? isLightMode 
                  ? "opacity-30 cursor-not-allowed text-zinc-400"
                  : "opacity-30 cursor-not-allowed text-white/30"
                : isLightMode
                  ? "hover:bg-zinc-200 text-zinc-700"
                  : "hover:bg-white/5 text-white/70"
            )}
            aria-label="Previous card"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={onNext}
            disabled={currentIndex === totalCards - 1}
            className={cn(
              "p-2 rounded-lg transition-colors",
              currentIndex === totalCards - 1
                ? isLightMode
                  ? "opacity-30 cursor-not-allowed text-zinc-400"
                  : "opacity-30 cursor-not-allowed text-white/30"
                : isLightMode
                  ? "hover:bg-zinc-200 text-zinc-700"
                  : "hover:bg-white/5 text-white/70"
            )}
            aria-label="Next card"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* AI Helper Floating Button - always visible, toggles panel */}
      <button
        onClick={() => setShowAIHelper(!showAIHelper)}
        className={cn(
          "fixed bottom-4 right-4 md:bottom-6 md:right-6 px-4 py-2.5 md:px-5 md:py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 font-medium text-sm md:text-base",
          showAIHelper ? "z-[60]" : "z-40", // Higher z-index when open to stay above panel
          isLightMode 
            ? "bg-white/90 backdrop-blur-xl border border-black/[0.08] hover:bg-white text-stone-900" 
            : "bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] hover:bg-white/[0.12] text-white"
        )}
        aria-label={showAIHelper ? "Close AI" : "Open AI"}
      >
        AI
      </button>

      {/* AI Helper Side Panel */}
      {showAIHelper && (
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
                    Ask me anything about this flashcard
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAIHelper(false)}
                className={cn(
                  "p-2 rounded-lg transition-colors flex-shrink-0 md:hidden",
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
                correctAnswer={backContent}
                selectedAnswer={null}
                explanation={backContent}
                integrated={true}
                lightMode={isLightMode}
              />
            </div>
          </motion.div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
      {/* Tutorial Overlay */}
      {showTutorial && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={dismissTutorial}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">How to Use Flashcards</h3>
            <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
              <p className="flex items-center gap-3">
                <span className="text-2xl">👆</span>
                <span><strong>Tap</strong> to flip the card</span>
              </p>
              <p className="flex items-center gap-3">
                <span className="text-2xl">👉</span>
                <span><strong>Swipe right</strong> if you know it</span>
              </p>
              <p className="flex items-center gap-3">
                <span className="text-2xl">👈</span>
                <span><strong>Swipe left</strong> if you don't know</span>
              </p>
              <p className="flex items-center gap-3">
                <span className="text-2xl">⌨️</span>
                <span><strong>Arrow keys</strong> for keyboard control</span>
              </p>
            </div>
            <button
              onClick={dismissTutorial}
              className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
            >
              Got it!
            </button>
          </motion.div>
        </motion.div>
      )}


      {/* Filter Tags */}
      {custom_filters.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {custom_filters.slice(0, 3).map((filter: string, index: number) => (
            <span 
              key={index} 
              className="px-3 py-1 text-[11px] font-medium rounded-lg bg-blue-50/80 dark:bg-blue-900/20 text-[#007AFF] border border-blue-200/50 dark:border-blue-800/50"
            >
              {filter}
            </span>
          ))}
        </div>
      )}

      {/* Stacked Flashcard Container */}
      <div className="relative w-[360px] mx-auto" style={{ paddingBottom: '20px' }}>
        {/* Background stacked cards - subtle, peeking from bottom only */}
        <motion.div 
          animate={isExiting ? { scale: 0.97, y: -8 } : { scale: 0.94, y: 16 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "absolute w-[360px] h-[500px] rounded-[24px]",
            isLightMode ? "bg-zinc-200 shadow-[0_2px_8px_rgba(0,0,0,0.1)]" : "bg-[#2A2A2A] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
          )}
          style={{ 
            top: '0',
            left: '0',
            zIndex: 1,
            filter: 'blur(1.5px)',
            opacity: 0.6
          }}
        />
        <motion.div 
          animate={isExiting ? { scale: 1, y: 0 } : { scale: 0.97, y: 8 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "absolute w-[360px] h-[500px] rounded-[24px]",
            isLightMode ? "bg-zinc-100 shadow-[0_3px_10px_rgba(0,0,0,0.15)]" : "bg-[#252525] shadow-[0_3px_10px_rgba(0,0,0,0.25)]"
          )}
          style={{ 
            top: '0',
            left: '0',
            zIndex: 2,
            filter: 'blur(0.5px)',
            opacity: 0.8
          }}
        />
        
        {/* Front card with exit animation */}
        <motion.div
          key={question.id}
          drag={!isExiting ? 'x' : false}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.8}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
          dragDirectionLock
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          animate={isExiting ? { 
            x: exitDirection === 'right' ? 500 : -500,
            opacity: 0,
            scale: 0.8,
            transition: { duration: 0.3 }
          } : undefined}
          initial={false}
          whileTap={!isExiting ? { scale: 0.98 } : undefined}
          style={!isExiting ? { 
            x,
            y,
            rotateX,
            rotateZ,
            perspective: '1000px',
            zIndex: 3
          } : {
            perspective: '1000px',
            zIndex: 3
          }}
          className={cn(
            "relative w-full h-[500px] rounded-[24px] cursor-grab active:cursor-grabbing overflow-hidden touch-none",
            isLightMode ? "bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)]" : "bg-[#1E1E1E] shadow-[0_6px_20px_rgba(0,0,0,0.35)]",
            animation
          )}
          onTap={() => { if (!isDragging) handleFlip(); }}
        >
          {/* Gradient overlay for depth */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-b pointer-events-none rounded-[24px]",
            isLightMode ? "from-black/[0.02] to-transparent" : "from-white/[0.03] to-transparent"
          )} />
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t pointer-events-none rounded-[24px]",
            isLightMode ? "from-black/[0.03] to-transparent" : "from-black/10 to-transparent"
          )} />
          {/* Swipe feedback labels */}
          <motion.div
            className="absolute top-8 right-8 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-lg shadow-lg z-20"
            style={{ opacity: knowOpacity }}
          >
            ✓ KNOW
          </motion.div>
          <motion.div
            className="absolute top-8 left-8 px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-lg shadow-lg z-20"
            style={{ opacity: dontKnowOpacity }}
          >
            ✗ DON'T KNOW
          </motion.div>

        {/* Front Side */}
        <div className={cn(
          "absolute w-full h-full rounded-[24px] p-8 backface-hidden transition-all duration-500",
          isFlipped ? "rotate-y-180 invisible" : "rotate-y-0"
        )}>
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto touch-pan-y flex items-center justify-center">
              <div className="text-center">
                <div 
                  className={cn(
                    "text-lg sm:text-xl md:text-2xl font-medium leading-snug",
                    isLightMode ? "text-zinc-900" : "text-white"
                  )}
                  style={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}
                >
                  {frontText}
                </div>
              </div>
            </div>
            {interactionCount < 5 && (
              <div className="mt-4 text-center space-y-2">
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: interactionCount >= 5 ? 0 : 1 }}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 backdrop-blur-xl rounded-lg border",
                    isLightMode ? "bg-black/5 border-black/10" : "bg-white/10 border-white/20"
                  )}
                >
                  <span className={cn("text-[13px]", isLightMode ? "text-zinc-600" : "text-white/60")}>Tap or press</span>
                  <kbd className={cn(
                    "px-1.5 py-0.5 text-[11px] font-mono rounded border",
                    isLightMode ? "bg-black/10 border-black/20 text-zinc-900" : "bg-white/20 border-white/30 text-white"
                  )}>Space</kbd>
                  <span className={cn("text-[13px]", isLightMode ? "text-zinc-600" : "text-white/60")}>to flip</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: interactionCount >= 5 ? 0 : 1 }}
                  className={cn("flex items-center justify-center gap-4 text-[11px]", isLightMode ? "text-zinc-500" : "text-white/50")}
                >
                  <div className="flex items-center gap-1.5">
                    <kbd className={cn(
                      "px-1.5 py-0.5 font-mono rounded border",
                      isLightMode ? "bg-black/5 border-black/10 text-zinc-700" : "bg-white/10 border-white/20 text-white/60"
                    )}>←</kbd>
                    <span>Don't Know</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className={cn(
                      "px-1.5 py-0.5 font-mono rounded border",
                      isLightMode ? "bg-black/5 border-black/10 text-zinc-700" : "bg-white/10 border-white/20 text-white/60"
                    )}>→</kbd>
                    <span>Know</span>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Back Side */}
        <div 
          className={cn(
            "absolute w-full h-full rounded-[24px] p-8 backface-hidden transition-all duration-500",
            isFlipped ? "rotate-y-0" : "rotate-y-180 invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleFlip();
          }}
        >
          <div className="h-full flex flex-col justify-center">
            <div className="overflow-auto touch-pan-y scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown 
                  components={{
                    p: ({children}) => (
                      <p 
                        className={cn(
                          "text-base sm:text-lg md:text-xl font-medium leading-relaxed mb-3",
                          isLightMode ? "text-zinc-900" : "text-white"
                        )}
                        style={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}
                      >
                        {children}
                      </p>
                    ),
                    ul: ({children}) => (
                      <ul className="list-disc list-outside space-y-1.5 my-2 ml-5 pl-2">
                        {children}
                      </ul>
                    ),
                    ol: ({children}) => (
                      <ol className="list-decimal list-outside space-y-1.5 my-2 ml-5 pl-2">
                        {children}
                      </ol>
                    ),
                    li: ({children}) => (
                      <li 
                        className={cn(
                          "text-base sm:text-lg md:text-xl font-medium leading-relaxed pl-1",
                          isLightMode ? "text-zinc-900" : "text-white"
                        )}
                        style={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}
                      >
                        {children}
                      </li>
                    ),
                    strong: ({children}) => (
                      <strong className={cn(
                        "font-semibold",
                        isLightMode ? "text-zinc-900" : "text-white"
                      )}>
                        {children}
                      </strong>
                    ),
                    h1: ({children}) => (
                      <h1 
                        className="text-xl font-bold text-white mb-3 mt-4"
                        style={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}
                      >
                        {children}
                      </h1>
                    ),
                    h2: ({children}) => (
                      <h2 
                        className="text-lg font-bold text-white mb-2 mt-3"
                        style={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({children}) => (
                      <h3 
                        className="text-base font-semibold text-white mb-2 mt-3"
                        style={{ fontFamily: "'Poppins', 'Roboto', sans-serif" }}
                      >
                        {children}
                      </h3>
                    )
                  }}
                >
                  {backContent}
                </ReactMarkdown>
                
                {/* Guideline Citation - Always visible when available */}
                {(question.guideline || question.guideline_url) && (
                  <div className={cn(
                    "mt-4 pt-3 border-t",
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
                          "text-[10px] uppercase tracking-widest font-semibold mb-1",
                          isLightMode ? "text-blue-700" : "text-blue-300"
                        )}>
                          UK Clinical Guideline
                        </div>
                        {question.guideline_url ? (
                          <a
                            href={question.guideline_url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "text-sm font-medium hover:underline inline-flex items-center gap-1.5",
                              isLightMode ? "text-blue-700" : "text-blue-300"
                            )}
                          >
                            {(question.guideline as string) || 'View guideline'}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className={cn(
                            "text-sm font-medium",
                            isLightMode ? "text-blue-700" : "text-blue-300"
                          )}>
                            {question.guideline as string}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </motion.div>
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
