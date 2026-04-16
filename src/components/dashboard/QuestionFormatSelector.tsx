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
    bg: '#F2D4C8',   // blush
    fg: '#5A2818',
  },
  {
    id: 'sba',
    name: 'Quick SBA',
    description: 'Single best answer',
    icon: ClipboardList,
    bg: '#EDD9CC',   // glaze
    fg: '#4A2810',
  },
  {
    id: 'ukmla_sba',
    name: 'UKMLA SBA',
    description: 'Clinical vignettes',
    icon: Stethoscope,
    bg: '#E4D4C4',   // praline
    fg: '#3A1E08',
  },
];

// Thin border per format card — one shade darker than the bg
const FORMAT_BORDERS: Record<string, string> = {
  flashcard: '#DEB8A8',
  sba:       '#D8C0AE',
  ukmla_sba: '#D0C0B0',
};

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
      {/* Section header — matches "By System" / "By Condition" editorial style */}
      <div className="flex items-baseline justify-between mb-3">
        <h2
          style={{
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 300,
            fontSize: '20px',
            letterSpacing: '-0.02em',
            color: '#1C1814',
          }}
        >
          By <em style={{ fontStyle: 'italic' }}>Format</em>
        </h2>
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

        {/* Right-edge fade — parchment-matched */}
        {showRightArrow && (
          <div
            className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent, #F4EFE8)' }}
          />
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
          return (
            <button
              key={format.id}
              onClick={() => {
                onFormatChange(format.id);
                if (onOpenFilters) onOpenFilters(format.id);
              }}
              className="group flex-shrink-0 rounded-[20px] transition-all duration-150 active:scale-[0.98]"
              style={{
                minWidth: '162px',
                backgroundColor: format.bg,
                border: `0.5px solid ${FORMAT_BORDERS[format.id] || '#D8C8B8'}`,
              }}
            >
              <div className="flex flex-col" style={{ padding: '18px 17px 16px', minHeight: '185px' }}>
                {/* Eyebrow */}
                <p
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: '10px',
                    fontWeight: 300,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: format.fg,
                    opacity: 0.6,
                    marginBottom: '16px',
                  }}
                >
                  {format.description}
                </p>

                {/* Name */}
                <h3
                  style={{
                    fontFamily: "'Unbounded', sans-serif",
                    fontWeight: 300,
                    fontSize: '22px',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    color: format.fg,
                    flex: 1,
                    marginBottom: '16px',
                  }}
                >
                  {format.name}
                </h3>

                {/* Begin pill */}
                <span
                  style={{
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '5px 12px',
                    borderRadius: '999px',
                    backgroundColor: `${format.fg}18`,
                    color: format.fg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: 'fit-content',
                  }}
                >
                  Begin →
                </span>
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