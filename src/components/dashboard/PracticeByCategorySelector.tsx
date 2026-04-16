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
      {/* Section header — "By System" / "By Condition" etc. */}
      <div className="flex items-baseline justify-between mb-3 pb-0">
        <h2
          style={{
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 300,
            fontSize: '20px',
            letterSpacing: '-0.02em',
            color: '#1C1814',
          }}
        >
          By <em style={{ fontStyle: 'italic' }}>{category.name}</em>
        </h2>
      </div>

      {/* Scroll wrapper with right-edge fade */}
      <div className="relative">
        {/* Left arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full border border-black/[0.06] shadow flex items-center justify-center hover:opacity-80 transition-all opacity-0 md:opacity-100"
            style={{ backgroundColor: '#FBF8F4' }}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: '#6A5A4A' }} />
          </button>
        )}

        {/* Right-edge fade — parchment-matched so it blends with the page bg */}
        {showRightArrow && (
          <div
            className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent, #F4EFE8)' }}
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
          <div className="flex gap-2.5">
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
              const hasStarted = masteredConcepts > 0 || incorrectConcepts > 0;

              return (
                <button
                  key={filter}
                  onClick={() => onFilterClick(filter)}
                  className="group flex-shrink-0 rounded-[18px] transition-all duration-150 active:scale-[0.98]"
                  style={{
                    minWidth: '148px',
                    backgroundColor: hasStarted ? '#F5E0D4' : '#FBF8F4',
                    border: `0.5px solid ${hasStarted ? '#DEC0AE' : '#EAE4DC'}`,
                  }}
                >
                  <div className="flex flex-col" style={{ padding: '15px 14px 13px', minHeight: '170px' }}>
                    {/* Eyebrow: concept count */}
                    <p
                      style={{
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: '10px',
                        fontWeight: 300,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: hasStarted ? accent.text : '#C4AE9A',
                        marginBottom: '5px',
                      }}
                    >
                      {totalConcepts.toLocaleString()} concepts
                    </p>

                    {/* Spacer pushes name downward */}
                    <div style={{ flex: 1, minHeight: '16px' }} />

                    {/* Name — wraps naturally, no overflow */}
                    <h3
                      style={{
                        fontFamily: "'Unbounded', sans-serif",
                        fontWeight: 300,
                        fontSize: '15px',
                        lineHeight: 1.2,
                        letterSpacing: '-0.01em',
                        color: hasStarted ? accent.text : '#1C1814',
                        marginBottom: '10px',
                      }}
                    >
                      {displayName}
                    </h3>

                    {/* Progress bar + % or Begin pill */}
                    {hasStarted ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '4px' }}>
                        <div style={{ flex: 1, height: '1.5px', backgroundColor: `${accent.bar}26`, borderRadius: '2px' }}>
                          <div
                            style={{
                              width: `${masteredPercent}%`,
                              height: '1.5px',
                              backgroundColor: accent.bar,
                              borderRadius: '2px',
                              transition: 'width 600ms ease-out',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: "'Manrope', sans-serif",
                            fontSize: '10px',
                            fontWeight: 400,
                            color: accent.bar,
                            minWidth: '26px',
                            textAlign: 'right',
                          }}
                        >
                          {Math.round(masteredPercent)}%
                        </span>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontFamily: "'Manrope', sans-serif",
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '5px 12px',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(28,24,20,0.07)',
                          color: '#1C1814',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginTop: '4px',
                        }}
                      >
                        Begin →
                      </span>
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
