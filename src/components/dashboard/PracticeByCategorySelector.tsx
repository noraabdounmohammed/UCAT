import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FilterCategory } from '@/types/conceptTypes';

interface PracticeByCategorySelectorProps {
  category: FilterCategory;
  filters: string[];
  curriculumId: string;
  concepts: any[];
  onFilterClick: (filter: string) => void;
  accentIndex?: number; // allows parent to assign a colour slot per section
}

// Rhode-inspired warm palette: card state communicates through background tint
// Unstarted  → warm off-white surface (#FBF8F4)
// In-progress → blush tint (#F5E0D4) — warmth signals activity
// Progress bar always uses blush (#E8B4A0) for consistency

// Per-section accent used ONLY for the progress bar and Begin pill text
const SECTION_ACCENTS = [
  { bar: '#C47A62', text: '#5A2818' }, // blush / terracotta
  { bar: '#7B9E87', text: '#1A3A28' }, // sage
  { bar: '#7A8FA6', text: '#0C1A2E' }, // slate blue
  { bar: '#B08EA2', text: '#3A1A30' }, // mauve
  { bar: '#A89B72', text: '#2E2810' }, // khaki
  { bar: '#6E9EA6', text: '#0A2428' }, // teal
];

function accentForCategory(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return SECTION_ACCENTS[Math.abs(hash) % SECTION_ACCENTS.length];
}

export const PracticeByCategorySelector: React.FC<PracticeByCategorySelectorProps> = ({
  category,
  filters,
  curriculumId,
  concepts,
  onFilterClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  if (!filters || filters.length === 0) return null;

  const accent = accentForCategory(category.name);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setShowLeftArrow(container.scrollLeft > 10);
    setShowRightArrow(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setIsDragging(true);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeftState(container.scrollLeft);
    container.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container) return;
    const x = e.pageX - container.offsetLeft;
    container.scrollLeft = scrollLeftState - (x - startX) * 2;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) scrollContainerRef.current.style.cursor = 'grab';
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (scrollContainerRef.current) scrollContainerRef.current.style.cursor = 'grab';
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    scrollContainerRef.current?.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const sortedFilters = [...filters].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  return (
    <div className="mb-6 w-full">
      {/* Section header */}
      <div className="mb-3">
        <h2
          className="text-xl font-light tracking-tight"
          style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 300, color: '#1C1814' }}
        >
          By <em style={{ fontStyle: 'italic', fontWeight: 300 }}>{category.name}</em>
        </h2>
      </div>

      {/* Scroll wrapper with right-edge fade */}
      <div className="relative">
        {/* Left arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-black/[0.06] shadow flex items-center justify-center hover:bg-stone-50 transition-all opacity-0 md:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4 text-stone-600" />
          </button>
        )}

        {/* Right-edge fade — always present, makes cut-off intentional */}
        {showRightArrow && (
          <div
            className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent, white)' }}
          />
        )}

        <div
          ref={scrollContainerRef}
          className="w-full overflow-x-auto scrollbar-hide py-3 px-1 cursor-grab select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex gap-3">
            {sortedFilters.map((filter) => {
              const displayName = filter
                .split('-')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');

              const filterConcepts = concepts.filter((c: any) => c.custom_filters?.includes(filter));
              const totalConcepts = filterConcepts.length;
              const masteredConcepts = filterConcepts.filter((c: any) => c.mastery_data?.mastery_level === 2).length;
              const incorrectConcepts = filterConcepts.filter((c: any) => c.mastery_data?.mastery_level === 1).length;

              const masteredPercent = totalConcepts > 0 ? (masteredConcepts / totalConcepts) * 100 : 0;
              const incorrectPercent = totalConcepts > 0 ? (incorrectConcepts / totalConcepts) * 100 : 0;
              const hasStarted = masteredConcepts > 0 || incorrectConcepts > 0;

              return (
                <button
                  key={filter}
                  onClick={() => onFilterClick(filter)}
                  className="group relative flex-shrink-0 w-[155px] rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.98]"
                  style={{ backgroundColor: hasStarted ? '#F5E0D4' : '#FBF8F4' }}
                >
                  <div className="flex flex-col p-4" style={{ minHeight: '175px' }}>
                    {/* Eyebrow: concept count */}
                    <p
                      className="text-[10px] uppercase tracking-[0.08em] mb-5"
                      style={{
                        fontFamily: "'Manrope', sans-serif",
                        opacity: 0.45,
                        color: hasStarted ? accent.text : '#1C1814',
                      }}
                    >
                      {totalConcepts.toLocaleString()} concepts
                    </p>

                    {/* Name */}
                    <h3
                      className="text-[15px] leading-tight flex-1"
                      style={{
                        fontFamily: "'Unbounded', sans-serif",
                        fontWeight: 300,
                        letterSpacing: '-0.02em',
                        color: hasStarted ? accent.text : '#1C1814',
                      }}
                    >
                      {displayName}
                    </h3>

                    {/* Progress bar + % or Begin pill */}
                    {hasStarted ? (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="flex-1 rounded-full overflow-hidden"
                            style={{ height: '1.5px', backgroundColor: `${accent.bar}28` }}
                          >
                            <div
                              style={{
                                width: `${masteredPercent}%`,
                                height: '1.5px',
                                backgroundColor: accent.bar,
                                transition: 'width 600ms ease-out',
                              }}
                            />
                          </div>
                          <span
                            className="text-[10px] font-medium min-w-[26px] text-right"
                            style={{ fontFamily: "'Manrope', sans-serif", color: accent.bar }}
                          >
                            {Math.round(masteredPercent)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <span
                          className="inline-flex items-center text-[11px] font-medium px-3 py-1.5 rounded-full"
                          style={{
                            fontFamily: "'Manrope', sans-serif",
                            backgroundColor: '#1C181418',
                            color: '#1C1814',
                          }}
                        >
                          Begin →
                        </span>
                      </div>
                    )}
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
