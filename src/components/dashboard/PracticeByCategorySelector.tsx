import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
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

  // Ensure filters are displayed in a stable, user-friendly order
  // This uses a locale-aware, numeric sort so that e.g. "topic-2-*" comes
  // after "topic-1-*" rather than simple ASCII order.
  const sortedFilters = [...filters].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

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
        {sortedFilters.map((filter) => {
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
              className="group relative flex-shrink-0 w-[200px] rounded-2xl overflow-hidden transition-all duration-200 ease-out hover:scale-[1.02]"
              style={{ height: '200px', backgroundColor: '#F7F4F0' }}
            >
              {/* Content */}
              <div className="h-full flex flex-col justify-between p-5">
                {/* Top row: concept count left, arrow right */}
                <div className="flex items-start justify-between">
                  <span
                    className="text-[11px] uppercase tracking-[0.12em] opacity-40"
                    style={{ fontFamily: "'Manrope', sans-serif", color: '#1C1917' }}
                  >
                    {totalConcepts} concepts
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity duration-200"
                    style={{ color: '#1C1917' }}
                  />
                </div>

                {/* Bottom: mastery % large + title */}
                <div>
                  {totalConcepts > 0 && (
                    <p
                      className="text-[28px] font-light leading-none mb-3 opacity-20"
                      style={{ fontFamily: "'Unbounded', sans-serif", color: '#1C1917' }}
                    >
                      {Math.round(masteredPercent)}%
                    </p>
                  )}
                  <h3
                    className="text-[15px] leading-tight mb-3"
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 400, letterSpacing: '-0.02em', color: '#1C1917' }}
                  >
                    {displayName}
                  </h3>
                  {/* Thin progress bar */}
                  <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(28,25,23,0.1)' }}>
                    <div className="h-full flex">
                      <div style={{ width: `${masteredPercent}%`, backgroundColor: '#6EE7B7' }} />
                      <div style={{ width: `${incorrectPercent}%`, backgroundColor: '#FCA5A5' }} />
                    </div>
                  </div>
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
};
