import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import type { FilterCategory } from '@/types/conceptTypes';

interface PracticeByCategorySelectorProps {
  category: FilterCategory;
  filters: string[];
  curriculumId: string;
  concepts: any[];
  onFilterClick: (filter: string) => void;
  accentIndex?: number; // allows parent to assign a colour slot per section
}

// Muted editorial accent palette — one per category section
const ACCENT_PALETTE = [
  { bar: '#C4956A', begin: '#C4956A' }, // warm terracotta
  { bar: '#7B9E87', begin: '#7B9E87' }, // sage
  { bar: '#7A8FA6', begin: '#7A8FA6' }, // slate blue
  { bar: '#B08EA2', begin: '#B08EA2' }, // dusty mauve
  { bar: '#A89B72', begin: '#A89B72' }, // warm khaki
  { bar: '#6E9EA6', begin: '#6E9EA6' }, // teal
];

// Derive a stable accent from the category name so it's consistent across renders
function accentForCategory(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return ACCENT_PALETTE[Math.abs(hash) % ACCENT_PALETTE.length];
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
      {/* Section header — tighter gap below */}
      <div className="mb-3">
        <h2
          className="text-2xl md:text-3xl font-medium text-stone-900 tracking-tight"
          style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
        >
          Practice by {category.name}
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
                  className="group relative flex-shrink-0 w-[196px] rounded-2xl overflow-hidden transition-all duration-200 ease-out hover:scale-[1.02]"
                  style={{ height: '196px', backgroundColor: '#F7F4F0' }}
                >
                  <div className="h-full flex flex-col justify-between p-5">
                    {/* Top row: accent dot + arrow */}
                    <div className="flex items-start justify-between">
                      <span
                        className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0"
                        style={{ backgroundColor: accent.bar, opacity: 0.7 }}
                      />
                      <ArrowUpRight
                        className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity duration-200"
                        style={{ color: '#1C1917' }}
                      />
                    </div>

                    {/* Bottom section */}
                    <div>
                      {/* Name — primary, large */}
                      <h3
                        className="text-[15px] leading-tight mb-1"
                        style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 400, letterSpacing: '-0.02em', color: '#1C1917' }}
                      >
                        {displayName}
                      </h3>

                      {/* Concept count — small, muted */}
                      <p
                        className="text-[10px] uppercase tracking-[0.1em] mb-3 opacity-35"
                        style={{ fontFamily: "'Manrope', sans-serif", color: '#1C1917' }}
                      >
                        {totalConcepts} concepts
                      </p>

                      {/* Progress bar or Begin pill */}
                      {hasStarted ? (
                        <div
                          className="h-[2px] w-full rounded-full overflow-hidden"
                          style={{ backgroundColor: 'rgba(28,25,23,0.1)' }}
                        >
                          <div className="h-full flex">
                            <div
                              style={{
                                width: `${masteredPercent}%`,
                                backgroundColor: accent.bar,
                                transition: 'width 400ms ease-out',
                              }}
                            />
                            <div
                              style={{
                                width: `${incorrectPercent}%`,
                                backgroundColor: '#FCA5A5',
                                transition: 'width 400ms ease-out',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full"
                          style={{
                            fontFamily: "'Manrope', sans-serif",
                            color: accent.begin,
                            backgroundColor: `${accent.begin}18`,
                          }}
                        >
                          Begin
                        </span>
                      )}
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
