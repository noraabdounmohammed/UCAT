import React, { useRef, useState, useEffect } from 'react';
import { BookOpen, ClipboardList, Stethoscope, ChevronLeft, ChevronRight } from 'lucide-react';

export interface QuestionFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  pastel: {
    cardBg: string;
    cardBorder: string;
    iconBg: string;
    iconColor: string;
    accent: string;
    text: string;
  };
}

export const QUESTION_FORMATS: QuestionFormat[] = [
  {
    id: 'flashcard',
    name: 'Flashcards',
    description: 'Quick review flip cards',
    icon: BookOpen,
    color: 'from-violet-400 to-purple-400',
    pastel: {
      cardBg: 'from-violet-50 via-purple-50 to-violet-100',
      cardBorder: 'border-violet-200/70',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-500',
      accent: 'bg-violet-300/30',
      text: 'text-violet-900',
    }
  },
  {
    id: 'sba',
    name: 'Quick SBA',
    description: 'Concise SBA questions',
    icon: ClipboardList,
    color: 'from-sky-400 to-cyan-400',
    pastel: {
      cardBg: 'from-sky-50 via-cyan-50 to-sky-100',
      cardBorder: 'border-sky-200/70',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-500',
      accent: 'bg-sky-300/30',
      text: 'text-sky-900',
    }
  },
  {
    id: 'ukmla_sba',
    name: 'UKMLA SBA',
    description: 'Clinical case scenarios',
    icon: Stethoscope,
    color: 'from-rose-400 to-pink-400',
    pastel: {
      cardBg: 'from-rose-50 via-pink-50 to-rose-100',
      cardBorder: 'border-rose-200/70',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-500',
      accent: 'bg-rose-300/30',
      text: 'text-rose-900',
    }
  },
];

interface QuestionFormatSelectorProps {
  selectedFormat?: string; // Optional, not currently used
  onFormatChange: (formatId: string) => void;
  onOpenFilters?: (format?: string) => void;
  concepts?: any[]; // Optional, not currently used
}

export const QuestionFormatSelector: React.FC<QuestionFormatSelectorProps> = ({
  onFormatChange,
  onOpenFilters
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setShowLeftArrow(container.scrollLeft > 10);
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    setIsDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeft(container.scrollLeft);
    container.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 2;
    container.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    const container = scrollContainerRef.current;
    if (container) {
      container.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      const container = scrollContainerRef.current;
      if (container) {
        container.style.cursor = 'grab';
      }
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollAmount = 300;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="mb-8 w-full">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-medium text-stone-900 mb-2 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
          Practice by Format
        </h2>
        <p className="text-sm md:text-base text-stone-500 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
          Choose your preferred learning style
        </p>
      </div>

      {/* Horizontal scrollable container with drag support */}
      <div className="relative">
        {/* Left scroll arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-lg flex items-center justify-center hover:bg-white transition-all opacity-0 md:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-stone-700" />
          </button>
        )}

        {/* Right scroll arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xl border border-black/[0.06] shadow-lg flex items-center justify-center hover:bg-white transition-all opacity-0 md:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-stone-700" />
          </button>
        )}

        <div 
          ref={scrollContainerRef}
          className="w-full overflow-x-auto scrollbar-hide p-4 cursor-grab select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex gap-4">
        {QUESTION_FORMATS.map((format) => {
          const Icon = format.icon;
          
          return (
            <button
              key={format.id}
              onClick={() => {
                onFormatChange(format.id);
                if (onOpenFilters) {
                  onOpenFilters(format.id);
                }
              }}
              className={`group relative flex-shrink-0 w-[240px] rounded-2xl overflow-hidden border transition-all duration-300 ease-out bg-gradient-to-br ${format.pastel.cardBg} ${format.pastel.cardBorder} shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:-translate-y-0.5`}
              style={{ height: '220px' }}
            >
              {/* Subtle top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${format.color} opacity-60`} />

              {/* Content */}
              <div className="relative h-full flex flex-col items-center justify-center gap-5 p-6">
                {/* Icon circle */}
                <div className={`w-16 h-16 rounded-2xl ${format.pastel.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
                  <Icon className={`h-8 w-8 ${format.pastel.iconColor}`} />
                </div>

                {/* Text */}
                <div className="text-center">
                  <h3 className={`text-base font-semibold ${format.pastel.text} mb-1`} style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {format.name}
                  </h3>
                  <p className="text-xs text-stone-500 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {format.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
}