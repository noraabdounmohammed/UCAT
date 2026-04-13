import React, { useRef, useState, useEffect } from 'react';
import { BookOpen, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';

export interface QuestionFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const QUESTION_FORMATS: QuestionFormat[] = [
  {
    id: 'flashcard',
    name: 'Flashcards',
    description: 'Quick review flip cards',
    icon: BookOpen,
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'sba',
    name: 'Quick SBA',
    description: 'Concise SBA Questions',
    icon: CheckSquare,
    color: 'from-emerald-500 to-emerald-600'
  },
  {
    id: 'ukmla_sba',
    name: 'UKMLA SBA',
    description: 'Clinical case scenarios',
    icon: CheckSquare,
    color: 'from-pink-500 to-pink-600'
  }
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
              className="group relative flex-shrink-0 w-[280px] rounded-2xl overflow-hidden transition-all duration-700 ease-out shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
              style={{ 
                height: '240px'
              }}
            >
              {/* Glassmorphism base - frosted glass effect */}
              <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl"></div>
              
              {/* Noise texture for loft aesthetic */}
              <div className="absolute inset-0 opacity-[0.015]" style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
                backgroundSize: '200px 200px'
              }}></div>

              {/* Content container */}
              <div className="relative z-10 h-full flex flex-col p-5 sm:p-6">
                {/* Top section - Title with icon */}
                <div className="flex flex-col items-center mb-4">
                  <h3 className="text-lg sm:text-xl font-light text-stone-900 mb-2 tracking-tight text-center" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 300, letterSpacing: '-0.01em' }}>
                    {format.name}
                  </h3>
                  <div className="flex items-start gap-1.5 text-stone-600 text-xs">
                    <Icon className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}>
                      {format.description}
                    </span>
                  </div>
                </div>

                {/* Middle section - Icon/Image with glass effect */}
                <div className="flex-1 flex items-center justify-center">
                  {format.id === 'flashcard' ? (
                    <img 
                      src="https://res.cloudinary.com/djycz5wgq/image/upload/v1763134885/Unbenannt-7_h21zyy.png" 
                      alt="Flashcards"
                      className="h-28 w-28 sm:h-32 sm:w-32 object-contain relative z-10 transition-all duration-700 group-hover:scale-105"
                    />
                  ) : (format.id === 'sba' || format.id === 'ukmla_sba') ? (
                    <img 
                      src="https://res.cloudinary.com/djycz5wgq/image/upload/v1763135784/Unbenannt-8_ccq02e.png" 
                      alt="SBA Questions"
                      className="h-28 w-28 sm:h-32 sm:w-32 object-contain relative z-10 transition-all duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-700 group-hover:scale-105 group-hover:shadow-[0_10px_40px_rgba(0,0,0,0.10)]">
                      <Icon className="h-12 w-12 sm:h-14 sm:w-14 text-stone-700 relative z-10" />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom shine effect */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
            </button>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
};
