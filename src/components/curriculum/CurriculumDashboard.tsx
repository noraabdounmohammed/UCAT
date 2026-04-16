import React, { useState, useEffect } from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { SimpleMasteryRing } from './SimpleMasteryRing';
import { NextSessionCard } from './NextSessionCard';
import { QuestionFormatSelector } from '@/components/dashboard/QuestionFormatSelector';
import { PracticeByCategorySelector } from '@/components/dashboard/PracticeByCategorySelector';
import { useAuth } from '@/contexts/AuthContext';

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

  const { user } = useAuth();
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  // Day of week greeting
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // User initials from name or email
  const getInitials = (): string => {
    const name: string = (user as any)?.user_metadata?.full_name || user?.email || '';
    const parts = name.split(/[\s@]/);
    return parts
      .slice(0, 2)
      .map((p: string) => (p[0] || '').toUpperCase())
      .join('') || 'M';
  };

  // Load saved format preference from localStorage
  useEffect(() => {
    const savedFormat = localStorage.getItem('preferredQuestionFormat');
    if (savedFormat) {
      setSelectedFormat(savedFormat);
    }
  }, []);

  // Save format preference when it changes
  const handleFormatChange = (formatId: string) => {
    setSelectedFormat(formatId);
    localStorage.setItem('preferredQuestionFormat', formatId);
  };

  // Calculate dashboard stats
  const totalConcepts = concepts.length;
  const correctConcepts = stats.by_mastery[2] || 0;
  const incorrectConcepts = stats.by_mastery[1] || 0;
  const notStartedConcepts = stats.by_mastery[0] || 0;
  const progressPercentage = totalConcepts > 0 ? Math.round((correctConcepts / totalConcepts) * 100) : 0;

  return (
    <div className="flex-1 pb-20 md:pb-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-4 md:pt-0">

        {/* ── TOP BAR ──────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 300,
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#A89880',
            }}
          >
            {dayName}
          </span>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#F2D4C8',
              color: '#6A2E1E',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 500,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {getInitials()}
          </div>
        </div>

        {/* ── HERO ─────────────────────────────────────────── */}
        <div style={{ marginBottom: '36px' }}>
          <h1
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontWeight: 300,
              fontSize: 'clamp(26px, 5.5vw, 36px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#1C1814',
            }}
          >
            Study with
            <br />
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

        {/* ── BY CATEGORY ──────────────────────────────────── */}
        {filterCategories && filterCategories.length > 0 && filterCategories.map((category) => {
          const filterAssignments = JSON.parse(
            localStorage.getItem(`${curriculum?.id}_filter_assignments`) || '{}'
          );

          const categoryFilters = Object.entries(filterAssignments)
            .filter(([_, catId]) => catId === category.id)
            .map(([filter]) => filter);

          if (categoryFilters.length === 0) return null;

          return (
            <div key={category.id}>
              <PracticeByCategorySelector
                category={category}
                filters={categoryFilters}
                curriculumId={curriculum?.id || ''}
                concepts={concepts}
                onFilterClick={(filter) => {
                  if (onOpenFilters) {
                    onOpenFilters(undefined, filter);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
