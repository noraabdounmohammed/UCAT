import React, { useState, useEffect } from 'react';
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

  // Debug logging
  console.log('🎯 CurriculumDashboard render:', {
    curriculum: curriculum?.name,
    conceptCount: concepts.length,
    stats,
    selectedFormat
  });

  // Calculate dashboard stats
  // New 3-level system: 0=unseen, 1=incorrect, 2=correct
  const totalConcepts = concepts.length;
  const correctConcepts = stats.by_mastery[2] || 0; // Level 2 = correct (most recent answer correct)
  const incorrectConcepts = stats.by_mastery[1] || 0; // Level 1 = incorrect (most recent answer incorrect)
  const notStartedConcepts = stats.by_mastery[0] || 0; // Level 0 = not started
  const progressPercentage = totalConcepts > 0 ? Math.round((correctConcepts / totalConcepts) * 100) : 0;

  console.log('📊 Dashboard Stats:', {
    total: totalConcepts,
    correct: correctConcepts,
    incorrect: incorrectConcepts,
    unseen: notStartedConcepts,
    progressPercentage: progressPercentage + '%',
    by_mastery: stats.by_mastery
  });


  return (
    <div className="flex-1 pb-20 md:pb-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 md:pt-0">

        {/* Question Format Selector */}
        <div>
          <QuestionFormatSelector 
            selectedFormat={selectedFormat}
            onFormatChange={handleFormatChange}
            onOpenFilters={onOpenFilters}
            concepts={concepts}
          />
        </div>

        {/* Practice by Category Selectors - one row per category */}
        {filterCategories && filterCategories.length > 0 && filterCategories.map((category) => {
          // Get filter assignments to find filters in this category
          const filterAssignments = JSON.parse(
            localStorage.getItem(`${curriculum?.id}_filter_assignments`) || '{}'
          );
          
          // Get filters that belong to this category
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
                  // Open filters modal with this filter pre-selected
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
