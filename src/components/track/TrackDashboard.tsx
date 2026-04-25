import React, { useMemo } from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { WeakestList } from './WeakestList';
import { TrendSpark } from './TrendSpark';
import { SessionsCompletedTable } from './SessionsCompletedTable';

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
  
  // Mastery / category view-type toggles removed alongside the rings + bars in
  // Task A4. The single placeholder below stands in until Plan 6 ships the
  // predicted-exam-score view.

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

    // Calculate mastery counts from filtered concepts
    // Simple: correct/incorrect/unseen based on most recent answer (mastery_level)
    const counts = {
      correct: filteredConcepts.filter(c => c.mastery_data?.mastery_level === 2).length,
      incorrect: filteredConcepts.filter(c => c.mastery_data?.mastery_level === 1).length,
      unseen: filteredConcepts.filter(c => c.mastery_data?.mastery_level === 0).length
    };

    const masteryPercent = filteredConcepts.length > 0 
      ? Math.round((counts.correct / filteredConcepts.length) * 100) 
      : 0;

    console.log('📈 Progress Tab Stats:', {
      total: filteredConcepts.length,
      correct: counts.correct,
      incorrect: counts.incorrect,
      unseen: counts.unseen,
      masteryPercent: masteryPercent + '%',
      sampleConcepts: filteredConcepts.slice(0, 3).map(c => ({
        title: c.title,
        mastery_level: c.mastery_data?.mastery_level,
        attempts: c.mastery_data?.attempts
      }))
    });

    // Find weakest concepts from filtered set
    // Only show concepts that have been attempted
    const weakestConcepts: ConceptStat[] = filteredConcepts
      .filter(c => {
        const attempts = c.mastery_data?.attempts || 0;
        // Only include concepts that have been practiced
        return attempts > 0;
      })
      .map(c => {
        const attempts = c.mastery_data?.attempts || 0;
        const correct = c.mastery_data?.correct || 0;
        
        // Calculate accuracy score based on all attempts
        // If never attempted, score is 0
        const masteryScore = attempts > 0 ? correct / attempts : 0;
        
        return {
          id: c.concept_id,
          title: c.title,
          tags: c.custom_filters || [],
          masteryScore,
          attempts,
          correct: c.mastery_data?.correct_count || 0,
          incorrect: 0,
          lastReviewed: undefined
        };
      })
      .sort((a, b) => {
        // Sort by mastery score (lowest first), then by attempts (fewer = weaker)
        if (a.masteryScore !== b.masteryScore) {
          return a.masteryScore - b.masteryScore;
        }
        return a.attempts - b.attempts;
      })
      .slice(0, 5);

    // Generate daily stats from actual session data (last 28 days)
    const daily: DailyStat[] = Array.from({ length: 28 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (27 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      // Find sessions for this date
      const sessionsForDate = recentSessions.filter((session: any) => session.date === dateStr);
      
      // Calculate stats for this date
      const reviews = sessionsForDate.reduce((sum: number, session: any) => sum + (session.items || 0), 0);
      const totalAccuracy = sessionsForDate.reduce((sum: number, session: any) => sum + (session.accuracy || 0), 0);
      const accuracy = sessionsForDate.length > 0 ? Math.round(totalAccuracy / sessionsForDate.length) : 0;
      const minutes = sessionsForDate.reduce((sum: number, session: any) => sum + (session.minutes || 0), 0);
      
      return {
        date: dateStr,
        reviews,
        accuracy,
        minutes,
        dueReviews: 0 // Could be calculated based on spaced repetition algorithm
      };
    });

    // Group by custom filters for coverage - show concept mastery breakdown
    // Exclude filters that are currently selected (active filters)
    const activeFilters = filterState.custom_filters || [];
    
    const filterGroups = new Map<string, { total: number; correct: number; incorrect: number; unseen: number }>();
    filteredConcepts.forEach(c => {
      const filters = c.custom_filters || ['Uncategorized'];
      const masteryLevel = c.mastery_data?.mastery_level || 0;
      
      filters.forEach(filter => {
        // Skip filters that are currently selected
        if (activeFilters.includes(filter)) {
          return;
        }
        
        if (!filterGroups.has(filter)) {
          filterGroups.set(filter, { total: 0, correct: 0, incorrect: 0, unseen: 0 });
        }
        const group = filterGroups.get(filter)!;
        group.total += 1;
        
        // Count by mastery level (0=unseen, 1=incorrect, 2=correct)
        if (masteryLevel === 2) {
          group.correct += 1;
        } else if (masteryLevel === 1) {
          group.incorrect += 1;
        } else {
          group.unseen += 1;
        }
      });
    });

    // Load filter assignments to get category mapping
    const assignmentsKey = `${curriculumId}_filter_assignments`;
    const storedAssignments = localStorage.getItem(assignmentsKey);
    const filterAssignments = storedAssignments ? JSON.parse(storedAssignments) : {};
    
    // Group coverage by category
    const coverageByCategory = new Map<string, CoverageBucket[]>();
    
    Array.from(filterGroups.entries()).forEach(([filterName, stats]) => {
      // Calculate percentage of correct concepts (mastery_level === 2)
      const correctPercent = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      const categoryId = filterAssignments[filterName];
      const category = filterCategories.find(c => c.id === categoryId);
      const categoryName = category?.name || 'Uncategorized';
      
      if (!coverageByCategory.has(categoryName)) {
        coverageByCategory.set(categoryName, []);
      }
      
      coverageByCategory.get(categoryName)!.push({
        key: filterName,
        label: filterName,
        total: stats.total, // Total number of concepts
        mastered: correctPercent, // Percentage of correct concepts
        attempted: stats.correct + stats.incorrect, // Number of concepts attempted (seen)
        correct: stats.correct, // Number of correct concepts
        incorrect: stats.incorrect, // Number of incorrect concepts
        weak: 0
      });
    });
    
    
    // Keep category structure for display
    const coverage = Array.from(coverageByCategory.entries())
      .map(([categoryName, items]) => ({
        categoryName,
        items: items // Show all items, scrolling handled in UI
      }));

    // Bloom's levels - compute from actual data if available
    // TODO: Implement when Bloom's taxonomy is added to concept metadata
    const blooms = [
      { level: 'Remember', accuracy: 0, attempts: 0 },
      { level: 'Understand', accuracy: 0, attempts: 0 },
      { level: 'Apply', accuracy: 0, attempts: 0 },
      { level: 'Analyze', accuracy: 0, attempts: 0 }
    ];

    // Recent sessions already loaded at the top

    // AI message
    const aiMessage = masteryPercent > 70 
      ? `You're +${masteryPercent}% this week — keep momentum with ${counts.incorrect} concepts to review.`
      : counts.incorrect > 5
      ? `Accuracy needs attention in ${weakestConcepts[0]?.tags[0] || 'some topics'}. Try a 10-min review set?`
      : 'Great progress! Review your weak concepts to build mastery.';

    return {
      counts,
      masteryPercent,
      weakestConcepts,
      daily,
      coverage,
      blooms,
      recentSessions: recentSessions.slice(0, 5), // Only show last 5 sessions in the UI
      aiMessage
    };
  }, [filteredConcepts, curriculumId, filterState.custom_filters, filterCategories]);

  if (filteredConcepts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            You have no concepts yet. Add a few to unlock the progress dashboard.
          </p>
          <button
            onClick={onAddConcepts}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all"
          >
            Add Concepts
          </button>
        </div>
      </div>
    );
  }

  // handleMasterySelect removed — only consumers were the deleted
  // <MasterySummaryBar/> + <MasteryProgressRing/> in Task A4.

  // Prepare data for new components
  const summaryData = {
    correct: trackData.counts.correct,
    incorrect: trackData.counts.incorrect,
    unseen: trackData.counts.unseen
  };

  const weakestItems = trackData.weakestConcepts.map(c => {
    const concept = filteredConcepts.find(fc => fc.concept_id === c.id);
    return {
      id: c.id,
      title: c.title,
      masteryScore: c.masteryScore,
      attempts: c.attempts,
      lastReviewed: c.lastReviewed,
      preview: concept?.content || ''
    };
  });

  // Flatten coverage categories and sort
  const coverageByCategory = trackData.coverage.map(category => ({
    ...category,
    items: category.items.sort((a, b) => {
      return coverageSortAscending 
        ? a.mastered - b.mastered 
        : b.mastered - a.mastered;
    })
  }));
  
  // Update category count and active tab when categories change
  if (coverageByCategory.length !== coverageCategoryCount) {
    setCoverageCategoryCount(coverageByCategory.length);
    if (coverageByCategory.length > 0 && !activeCoverageTab) {
      setActiveCoverageTab(coverageByCategory[0].categoryName);
    }
  }
  
  // Set default active tab to first category if not set
  const currentActiveTab = activeCoverageTab || (coverageByCategory.length > 0 ? coverageByCategory[0].categoryName : '');
  const activeCategory = coverageByCategory.find(c => c.categoryName === currentActiveTab) || coverageByCategory[0];

  const trendData = trackData.daily.slice(-14).map(d => ({
    date: d.date,
    accuracy: d.accuracy,
    reviews: d.reviews
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Overall Mastery Summary - Full Width */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-6">
        <div className="text-sm text-stone-500 dark:text-stone-400">
          Predicted exam-day score arrives in Plan 6.
        </div>
      </div>

      {/* Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coverage - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08]">
            <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white">Progress by Category</h3>
          </div>
          <div className="p-6">
            {/* Category Tabs with Toggle and Sort Button */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {coverageByCategory.map((category) => (
                  <button
                    key={category.categoryName}
                    onClick={() => setActiveCoverageTab(category.categoryName)}
                    className={`px-3 py-1.5 text-[13px] font-semibold rounded-lg whitespace-nowrap transition-all ${
                      currentActiveTab === category.categoryName
                        ? 'bg-[#007AFF] text-white shadow-sm'
                        : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700/80 border border-black/[0.08] dark:border-white/[0.08]'
                    }`}
                  >
                    {category.categoryName}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Sort Button */}
                <button
                  onClick={() => setCoverageSortAscending(!coverageSortAscending)}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium rounded-lg bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 transition-all border border-black/[0.08] dark:border-white/[0.08]"
                >
                  <span>Sort by Accuracy</span>
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
            
            {/* Active Category Content - Fixed height with scroll */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pr-2">
              <div className="text-sm text-stone-500 dark:text-stone-400">
                Per-category coverage arrives in Plan 6.
              </div>
            </div>
          </div>
        </div>

        {/* Weakest Concepts - Takes 1 column on desktop */}
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08]">
            <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white">Weakest Concepts</h3>
          </div>
          <div className="p-6">
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
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08]">
          <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white">Recent Sessions</h3>
        </div>
        <div className="p-6">
          <SessionsCompletedTable sessions={trackData.recentSessions} />
        </div>
      </div>
    </div>
  );
};
