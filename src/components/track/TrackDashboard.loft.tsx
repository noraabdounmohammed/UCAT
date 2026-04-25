import React, { useMemo } from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { WeakestList } from './WeakestList';
import { SessionsCompletedTable } from './SessionsCompletedTable';
import { BarChart, PieChart } from 'lucide-react';

type ConceptStat = {
  id: string;
  title: string;
  tags: string[];
  masteryScore: number;
  attempts: number;
  correct: number;
  incorrect: number;
  lastReviewed?: string;
};

type CoverageBucket = {
  key: string;
  label: string;
  total: number;
  mastered: number;
  attempted?: number;
  correct?: number;
  incorrect?: number;
  weak: number;
};

type DailyStat = {
  date: string;
  reviews: number;
  accuracy: number;
  minutes: number;
  dueReviews: number;
};

type TrackData = {
  counts: { correct: number; incorrect: number; unseen: number };
  masteryPercent: number;
  weakestConcepts: ConceptStat[];
  daily: DailyStat[];
  coverage: { categoryName: string; items: CoverageBucket[] }[];
  blooms: { level: string; accuracy: number; attempts: number }[];
  recentSessions: { date: string; items: number; accuracy: number; minutes: number }[];
  aiMessage: string;
};

interface TrackDashboardProps {
  curriculumId?: string;
  onAddConcepts?: () => void;
}

export const TrackDashboard: React.FC<TrackDashboardProps> = ({ curriculumId = 'default', onAddConcepts }) => {
  const { filteredConcepts, updateFilterState, filterState, filterCategories } = useConceptStore();
  const [coverageSortAscending, setCoverageSortAscending] = React.useState(true);
  const [activeCoverageTab, setActiveCoverageTab] = React.useState<string>('');
  const [coverageCategoryCount, setCoverageCategoryCount] = React.useState(0);
  
  // Mastery view type (bar or ring)
  const [masteryViewType, setMasteryViewType] = React.useState<'bar' | 'ring'>(() => {
    const saved = localStorage.getItem('masteryViewType');
    return (saved === 'ring' || saved === 'bar') ? saved : 'ring';
  });
  
  // Category view type (bar or ring)
  const [categoryViewType, setCategoryViewType] = React.useState<'bar' | 'ring'>(() => {
    const saved = localStorage.getItem('categoryViewType');
    return (saved === 'ring' || saved === 'bar') ? saved : 'bar';
  });
  
  // Save view preferences to localStorage
  React.useEffect(() => {
    localStorage.setItem('masteryViewType', masteryViewType);
  }, [masteryViewType]);
  
  React.useEffect(() => {
    localStorage.setItem('categoryViewType', categoryViewType);
  }, [categoryViewType]);

  // Force bar view on mobile
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && categoryViewType === 'ring') {
        setCategoryViewType('bar');
      }
    };
    
    // Check on mount
    handleResize();
    
    // Check on resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [categoryViewType]);

  const trackData: TrackData = useMemo(() => {
    // Load recent sessions first - needed for daily calculations
    const sessionsKey = `${curriculumId}_practice_sessions_history`;
    const savedSessions = localStorage.getItem(sessionsKey);
    const recentSessions = savedSessions 
      ? JSON.parse(savedSessions).slice(0, 50) // Get more sessions for daily calculation
      : [];

    console.log('🔍 TrackDashboard Debug:', {
      curriculumId,
      sessionsKey,
      savedSessions: !!savedSessions,
      recentSessionsCount: recentSessions.length,
      recentSessions: recentSessions.slice(0, 3) // Show first 3 for debugging
    });

    // Calculate daily stats from sessions
    const dailyMap = new Map<string, { reviews: number; correct: number; total: number; minutes: number }>();
    
    recentSessions.forEach((session: any) => {
      // Validate date before using it
      if (!session.completedAt) return;
      
      const dateObj = new Date(session.completedAt);
      if (isNaN(dateObj.getTime())) return; // Skip invalid dates
      
      const date = dateObj.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { reviews: 0, correct: 0, total: 0, minutes: 0 };
      
      dailyMap.set(date, {
        reviews: existing.reviews + (session.totalQuestions || 0),
        correct: existing.correct + (session.correctAnswers || 0),
        total: existing.total + (session.totalQuestions || 0),
        minutes: existing.minutes + (session.duration || 0)
      });
    });

    // Convert to array and sort by date (most recent first)
    const daily: DailyStat[] = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        reviews: stats.reviews,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
        minutes: Math.round(stats.minutes / 60), // Convert seconds to minutes
        dueReviews: 0 // Not tracking due reviews yet
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30); // Last 30 days

    // Calculate mastery counts
    // Simple: correct/incorrect/unseen based on most recent answer (mastery_level)
    // New 3-level system: 0=unseen, 1=incorrect, 2=correct
    const counts = filteredConcepts.reduce(
      (acc, c) => {
        const level = c.mastery_data?.mastery_level || 0;
        if (level === 2) acc.correct++;
        else if (level === 1) acc.incorrect++;
        else acc.unseen++;
        return acc;
      },
      { correct: 0, incorrect: 0, unseen: 0 }
    );

    const masteryPercent = filteredConcepts.length > 0
      ? (counts.correct / filteredConcepts.length) * 100
      : 0;

    console.log('📈 Progress Tab Stats:', {
      total: filteredConcepts.length,
      correct: counts.correct,
      incorrect: counts.incorrect,
      unseen: counts.unseen,
      masteryPercent: Math.round(masteryPercent) + '%',
      sampleConcepts: filteredConcepts.slice(0, 3).map(c => ({
        title: c.title,
        mastery_level: c.mastery_data?.mastery_level,
        attempts: c.mastery_data?.attempts
      }))
    });

    // Weakest concepts - only show concepts that have been attempted at least once
    const weakestConcepts: ConceptStat[] = filteredConcepts
      .filter(c => {
        const attempts = c.mastery_data?.attempts || 0;
        return attempts > 0;
      })
      .map(c => {
        const attempts = c.mastery_data?.attempts || 0;
        const correct = c.mastery_data?.correct || 0;
        const incorrect = c.mastery_data?.incorrect || 0;
        // Calculate accuracy: (correct / attempts) as a decimal (0-1 scale for percentage display)
        const masteryScore = attempts > 0 ? correct / attempts : 0;
        
        return {
          id: c.concept_id,
          title: c.title,
          tags: c.custom_filters || [],
          masteryScore: masteryScore,
          attempts: attempts,
          correct: correct,
          incorrect: incorrect,
          lastReviewed: undefined
        };
      })
      .sort((a, b) => a.masteryScore - b.masteryScore)
      .slice(0, 10);

    // Coverage by filter categories
    const filterAssignments = JSON.parse(localStorage.getItem(`${curriculumId}_filter_assignments`) || '{}');
    const storedCategories = JSON.parse(localStorage.getItem(`${curriculumId}_filter_categories`) || '[]');
    
    const coverage: { categoryName: string; items: CoverageBucket[] }[] = [];

    // Group by categories only
    storedCategories.forEach((category: any) => {
      const categoryFilters = Object.entries(filterAssignments)
        .filter(([_, catId]) => catId === category.id)
        .map(([filter, _]) => filter);

      const items: CoverageBucket[] = categoryFilters.map(filter => {
        const concepts = filteredConcepts.filter(c => c.custom_filters?.includes(filter));
        
        // Calculate mastery: number of concepts where mastery_level === 2 / total concepts
        let masteredCount = 0;
        let totalCorrect = 0;
        let totalIncorrect = 0;
        let totalAttempted = 0;
        
        concepts.forEach(c => {
          const attempts = c.mastery_data?.attempts || 0;
          const correct = c.mastery_data?.correct || 0;
          const incorrect = c.mastery_data?.incorrect || 0;
          const masteryLevel = c.mastery_data?.mastery_level || 0;
          
          // Count as mastered if mastery_level === 2 (last attempt was correct)
          if (masteryLevel === 2) {
            masteredCount++;
          }
          
          if (attempts > 0) {
            totalAttempted++;
            totalCorrect += correct;
            totalIncorrect += incorrect;
          }
        });
        
        // Calculate mastery percentage: mastered concepts / total concepts (0-100)
        const masteryPercent = concepts.length > 0 ? Math.round((masteredCount / concepts.length) * 100) : 0;

        return {
          key: filter,
          label: filter,
          total: concepts.length,
          mastered: masteryPercent, // Mastery percentage based on mastered concepts
          attempted: totalAttempted,
          correct: totalCorrect,
          incorrect: totalIncorrect,
          weak: totalAttempted - Math.floor((totalCorrect / (totalCorrect + totalIncorrect || 1)) * totalAttempted)
        };
      });

      if (items.length > 0) {
        coverage.push({
          categoryName: category.name,
          items
        });
      }
    });

    return {
      counts,
      masteryPercent,
      weakestConcepts,
      daily,
      coverage,
      blooms: [],
      recentSessions: recentSessions.slice(0, 10).map((s: any) => ({
        date: s.completedAt || s.date || new Date().toISOString(), // Use ISO string for proper date parsing
        items: s.totalQuestions || 0,
        accuracy: s.totalQuestions > 0 ? (s.correctAnswers / s.totalQuestions) * 100 : 0,
        minutes: Math.round((s.duration || 0) / 60),
        formats: s.formats || []
      })),
      aiMessage: ''
    };
  }, [filteredConcepts, curriculumId]);

  // Coverage by category with sorting
  const coverageByCategory = useMemo(() => {
    return trackData.coverage.map(category => ({
      ...category,
      items: [...category.items].sort((a, b) => {
        // Use the mastered field which is now the accuracy percentage (0-100)
        const accuracyA = a.mastered || 0;
        const accuracyB = b.mastered || 0;
        return coverageSortAscending ? accuracyA - accuracyB : accuracyB - accuracyA;
      })
    }));
  }, [trackData.coverage, coverageSortAscending]);

  // Set initial active tab
  React.useEffect(() => {
    if (coverageByCategory.length > 0 && !activeCoverageTab) {
      setActiveCoverageTab(coverageByCategory[0].categoryName);
    }
    setCoverageCategoryCount(coverageByCategory.length);
  }, [coverageByCategory, activeCoverageTab]);

  const currentActiveTab = activeCoverageTab || (coverageByCategory[0]?.categoryName || '');
  const activeCategory = coverageByCategory.find(c => c.categoryName === currentActiveTab);

  const weakestItems = trackData.weakestConcepts.map(c => ({
    id: c.id,
    title: c.title,
    masteryScore: c.masteryScore,
    attempts: c.attempts,
    lastReviewed: c.lastReviewed
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overall Mastery Card */}
      <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] backdrop-saturate-150 overflow-hidden">
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-stone-200/50 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-medium text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
            Overall Mastery
          </h3>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white/60 backdrop-blur-xl rounded-full p-1 border border-stone-300">
            <button
              onClick={() => setMasteryViewType('bar')}
              className={`p-2 rounded-full transition-all duration-300 ${
                masteryViewType === 'bar'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Bar view"
            >
              <BarChart className="h-3 w-3" />
            </button>
            <button
              onClick={() => setMasteryViewType('ring')}
              className={`p-2 rounded-full transition-all duration-300 ${
                masteryViewType === 'ring'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Ring view"
            >
              <PieChart className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-8">
          <div className="text-sm text-stone-500">Predicted exam score (Plan 6)</div>
        </div>
      </div>

      {/* Grid Layout for Coverage and Weakest */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Coverage - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] backdrop-saturate-150 overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-stone-200/50">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-medium text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Progress by Category
              </h3>
            
              {/* View Toggle and Sort */}
              <div className="flex items-center gap-2">
              {/* View Toggle - Hidden on mobile, only show on desktop */}
              <div className="hidden md:flex items-center gap-1 bg-white/60 backdrop-blur-xl rounded-full p-1 border border-stone-300">
                <button
                  onClick={() => setCategoryViewType('bar')}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    categoryViewType === 'bar'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Bar view"
                >
                  <BarChart className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setCategoryViewType('ring')}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    categoryViewType === 'ring'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Ring view"
                >
                  <PieChart className="h-3 w-3" />
                </button>
              </div>
              
              {/* Sort Button */}
              <button
                onClick={() => setCoverageSortAscending(!coverageSortAscending)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] uppercase tracking-widest rounded-full bg-white/60 text-stone-600 hover:bg-white/80 transition-all border border-stone-300"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                <span>Mastery</span>
                <svg 
                  className={`w-3 h-3 transition-transform ${coverageSortAscending ? '' : 'rotate-180'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-8">
            {/* Category Tabs */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-wrap gap-2">
                {coverageByCategory.map((category) => (
                  <button
                    key={category.categoryName}
                    onClick={() => setActiveCoverageTab(category.categoryName)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-[11px] uppercase tracking-widest rounded-full whitespace-nowrap transition-all ${
                      currentActiveTab === category.categoryName
                        ? 'bg-stone-900 text-white shadow-lg'
                        : 'bg-white/60 text-stone-600 hover:bg-white/80 border border-stone-300'
                    }`}
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                  >
                    {category.categoryName}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Active Category Content - Fixed height with scroll */}
            <div className="max-h-[400px] overflow-y-auto pr-2">
              <div className="text-sm text-stone-500">Predicted exam score (Plan 6)</div>
            </div>
          </div>
        </div>

        {/* Weakest Concepts - Takes 1 column on desktop */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] backdrop-saturate-150 overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-stone-200/50">
            <h3 className="text-base sm:text-lg font-medium text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              Weakest Concepts
            </h3>
          </div>
          <div className="p-4 sm:p-8">
            <WeakestList 
              items={weakestItems}
              onReview={(conceptId) => {
                const concept = filteredConcepts.find(c => c.concept_id === conceptId);
                if (concept && concept.custom_filters && concept.custom_filters.length > 0) {
                  updateFilterState({ custom_filters: [concept.custom_filters[0]] });
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Sessions - Full Width */}
      <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] backdrop-saturate-150 overflow-hidden">
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-stone-200/50">
          <h3 className="text-base sm:text-lg font-medium text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
            Recent Sessions
          </h3>
        </div>
        <div className="p-4 sm:p-8">
          <SessionsCompletedTable sessions={trackData.recentSessions} />
        </div>
      </div>
    </div>
  );
};
