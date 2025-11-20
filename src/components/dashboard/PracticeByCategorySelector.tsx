import React, { useRef, useState, useEffect } from 'react';
import { Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FilterCategory } from '@/types/conceptTypes';

interface PracticeByCategorySelectorProps {
  category: FilterCategory;
  filters: string[];
  curriculumId: string;
  concepts: any[];
  onFilterClick: (filter: string) => void;
}

export const PracticeByCategorySelector: React.FC<PracticeByCategorySelectorProps> = ({
  category,
  filters,
  curriculumId,
  concepts,
  onFilterClick
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  if (!filters || filters.length === 0) {
    return null;
  }

  // Parse color gradient from stored color, default to stone if not set
  const colorClass = category.color || 'from-stone-500 to-stone-600';

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
  }, [filters]);

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
    const walk = (x - startX) * 2; // Scroll speed multiplier
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
          Practice by {category.name}
        </h2>
        <p className="text-sm md:text-base text-stone-500 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
          Focus on specific {category.name.toLowerCase()} areas
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
        {filters.map((filter) => {
          // Format filter name for display (capitalize, remove hyphens)
          const displayName = filter.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          // Calculate progress for this filter
          const filterConcepts = concepts.filter((c: any) => 
            c.custom_filters?.includes(filter)
          );
          const totalConcepts = filterConcepts.length;
          const masteredConcepts = filterConcepts.filter((c: any) => 
            c.mastery_data?.mastery_level === 2
          ).length;
          const incorrectConcepts = filterConcepts.filter((c: any) => 
            c.mastery_data?.mastery_level === 1
          ).length;
          
          const masteredPercent = totalConcepts > 0 
            ? (masteredConcepts / totalConcepts) * 100 
            : 0;
          const incorrectPercent = totalConcepts > 0 
            ? (incorrectConcepts / totalConcepts) * 100 
            : 0;
          
          return (
            <button
              key={filter}
              onClick={() => onFilterClick(filter)}
              className="group relative flex-shrink-0 w-[280px] rounded-2xl overflow-hidden transition-all duration-700 ease-out shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
              style={{ 
                height: '240px'
              }}
            >
              {/* Progress bar background - fills from bottom to top */}
              <div className="absolute inset-0 bg-stone-50"></div>
              
              {/* Green bar for mastered concepts - fills from bottom */}
              <div 
                className="absolute left-0 right-0 bottom-0"
                style={{ 
                  height: `${masteredPercent}%`,
                  backgroundColor: '#86EFAC',
                  opacity: 0.6
                }}
              ></div>
              
              {/* Red bar for incorrect concepts - stacked above green */}
              <div 
                className="absolute left-0 right-0"
                style={{ 
                  bottom: `${masteredPercent}%`,
                  height: `${incorrectPercent}%`,
                  backgroundColor: '#FCA5A5',
                  opacity: 0.6
                }}
              ></div>
              
              {/* Frosted glass overlay on top */}
              <div className="absolute inset-0 bg-white/40 backdrop-blur-xl"></div>
              
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
                    {displayName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-stone-600 text-xs">
                    <Tag className="h-3 w-3" />
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}>
                      {totalConcepts} concepts · {Math.round(masteredPercent)}% mastered
                    </span>
                  </div>
                </div>

                {/* Middle section - Icon with glass effect */}
                <div className="flex-1 flex items-center justify-center overflow-visible">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-700 group-hover:scale-105 group-hover:shadow-[0_10px_40px_rgba(0,0,0,0.10)] overflow-visible">
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colorClass} opacity-10`}></div>
                    <Tag className="h-12 w-12 sm:h-14 sm:w-14 text-stone-700 relative z-10" />
                  </div>
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
