import React, { useRef, useState, useEffect } from 'react';
import { BookOpen, ClipboardList, Stethoscope, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';

export interface QuestionFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  fg: string;
}

export const QUESTION_FORMATS: QuestionFormat[] = [
  {
    id: 'flashcard',
    name: 'Flashcards',
    description: 'Active recall',
    icon: BookOpen,
    bg: '#F7F4F0',
    fg: '#1C1917',
  },
  {
    id: 'sba',
    name: 'Quick SBA',
    description: 'Single best answer',
    icon: ClipboardList,
    bg: '#EFF3F6',
    fg: '#0C1A2E',
  },
  {
    id: 'ukmla_sba',
    name: 'UKMLA SBA',
    description: 'Clinical vignettes',
    icon: Stethoscope,
    bg: '#F0F5F2',
    fg: '#0D1F18',
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
                if (onOpenFilters) onOpenFilters(format.id);
              }}
              className="group relative flex-shrink-0 w-[200px] rounded-2xl overflow-hidden transition-all duration-200 ease-out hover:scale-[1.02]"
              style={{ height: '200px', backgroundColor: format.bg }}
            >
              {/* Content: icon top-left, text bottom-left, arrow top-right */}
              <div className="h-full flex flex-col justify-between p-5">
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <Icon
                    className="h-5 w-5 opacity-40"
                    style={{ color: format.fg }}
                  />
                  <ArrowUpRight
                    className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity duration-200"
                    style={{ color: format.fg }}
                  />
                </div>

                {/* Bottom text */}
                <div>
                  <p
                    className="text-[11px] uppercase tracking-[0.12em] mb-2 opacity-40"
                    style={{ fontFamily: "'Manrope', sans-serif", color: format.fg }}
                  >
                    {format.description}
                  </p>
                  <h3
                    className="text-[17px] leading-tight"
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 400, letterSpacing: '-0.02em', color: format.fg }}
                  >
                    {format.name}
                  </h3>
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