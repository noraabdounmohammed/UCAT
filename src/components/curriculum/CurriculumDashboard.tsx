import React, { useState, useEffect, useMemo } from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { SimpleMasteryRing } from './SimpleMasteryRing';
import { NextSessionCard } from './NextSessionCard';
import { QuestionFormatSelector } from '@/components/dashboard/QuestionFormatSelector';
import { PracticeByCategorySelector } from '@/components/dashboard/PracticeByCategorySelector';

interface CurriculumDashboardProps {
  curriculum?: {
    id: string;
    name: string;
    description: string;
    conceptCount: number;
    lastAccessed: Date;
    color: string;
    category: string;
    progress: number;
  };
  onStartPractice: () => void;
  onOpenFilters?: (format?: string, filter?: string) => void;
  onDirectPracticeStart?: (config: any) => void;
}

export const CurriculumDashboard: React.FC<CurriculumDashboardProps> = ({
  curriculum,
  onStartPractice,
  onOpenFilters,
  onDirectPracticeStart
}) => {
  const {
    concepts,
    stats,
    setPracticeSelection,
    filterCategories
  } = useConceptStore();

  const [selectedFormat, setSelectedFormat] = useState<string>('');

  // Day of week greeting — computed once
  const dayName = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    []
  );


  // Parse filter assignments ONCE — not inside render map
  const filterAssignments = useMemo(
    () => JSON.parse(localStorage.getItem(`${curriculum?.id}_filter_assignments`) || '{}'),
    [curriculum?.id]
  );

  // Build category+filters list once
  const categoryRows = useMemo(() => {
    if (!filterCategories) return [];
    return filterCategories
      .map(category => ({
        category,
        filters: Object.entries(filterAssignments)
          .filter(([_, catId]) => catId === category.id)
          .map(([filter]) => filter),
      }))
      .filter(row => row.filters.length > 0);
  }, [filterCategories, filterAssignments]);

  useEffect(() => {
    const savedFormat = localStorage.getItem('preferredQuestionFormat');
    if (savedFormat) setSelectedFormat(savedFormat);
  }, []);

  const handleFormatChange = (formatId: string) => {
    setSelectedFormat(formatId);
    localStorage.setItem('preferredQuestionFormat', formatId);
  };

  return (
    <div className="flex-1 pb-20 md:pb-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-4 md:pt-0">

        {/* ── TOP BAR ──────────────────────────────────────── */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 300,
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: '#A89880',
          }}>
            {dayName}
          </span>
        </div>

        {/* ── HERO ─────────────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 300,
            fontSize: '38px',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#1C1814',
            margin: 0,
          }}>
            Study with<br />
            <em style={{ fontStyle: 'italic', color: '#C47A62' }}>intention.</em>
          </h1>
        </div>

        {/* ── BY FORMAT ────────────────────────────────────── */}
        <QuestionFormatSelector
          selectedFormat={selectedFormat}
          onFormatChange={handleFormatChange}
          onOpenFilters={onOpenFilters}
          concepts={concepts}
        />

        {/* ── DIVIDER ──────────────────────────────────────── */}
        <div style={{ height: '0.5px', backgroundColor: '#E4DDD4', margin: '0 0 32px' }} />

        {/* ── BY CATEGORY (one row per category, divider between each) ── */}
        {categoryRows.map(({ category, filters }, idx) => (
          <React.Fragment key={category.id}>
            <PracticeByCategorySelector
              category={category}
              filters={filters}
              curriculumId={curriculum?.id || ''}
              concepts={concepts}
              onFilterClick={(filter) => {
                if (onOpenFilters) onOpenFilters(undefined, filter);
              }}
            />
            {/* Hairline divider between every section row */}
            {idx < categoryRows.length - 1 && (
              <div style={{ height: '0.5px', backgroundColor: '#E4DDD4', margin: '4px 0 28px' }} />
            )}
          </React.Fragment>
        ))}

      </div>
    </div>
  );
};
