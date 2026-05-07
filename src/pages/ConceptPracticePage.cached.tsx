/**
 * Concept Practice Page with Question Caching
 * 
 * Uses JSON concepts + cached questions from Supabase.
 * Manhattan loft UI with instant question loading.
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useJsonConceptPractice } from '@/hooks/useJsonConceptPractice';
import { ConceptFilterPanel } from '@/components/concept/ConceptFilterPanel';
import { Plus, Sliders, Search, Grid, List, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy load heavy components
const ApplePracticeSession = lazy(() => 
  import('@/components/practice/ApplePracticeSession').then(m => ({ default: m.ApplePracticeSession }))
);

const PracticeConfigModal = lazy(() => 
  import('@/components/practice/PracticeConfigModal').then(m => ({ default: m.PracticeConfigModal }))
);

export function ConceptPracticePageCached() {
  const {
    filteredConcepts,
    isLoading,
    isPracticing,
    practiceQuestions,
    isLoadingQuestions,
    error,
    filterState,
    availableFilters,
    availableSpecialties,
    stats,
    setFilterState,
    startPractice,
    endPractice,
    generateMissingQuestions
  } = useJsonConceptPractice();

  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Update search in filter state
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilterState({ searchQuery });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, setFilterState]);

  // Handle start practice from config modal
  const handleStartPractice = async (config: any) => {
    setFilterState({
      questionCount: config.question_count || 10,
      questionFormat: config.format || 'ukmla_sba'
    });
    setShowPracticeConfig(false);
    await startPractice();
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-white/70 animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  // Show practice session
  if (isPracticing && practiceQuestions.length > 0) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-white/70 animate-spin mx-auto mb-4" />
            <p className="text-white/50">Loading practice session...</p>
          </div>
        </div>
      }>
        <ApplePracticeSession
          questions={practiceQuestions}
          onComplete={endPractice}
          section="UKMLA AKT"
          defaultFormat={filterState.questionFormat}
        />
      </Suspense>
    );
  }

  // Show loading questions
  if (isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Loader2 className="h-8 w-8 text-white/70 animate-spin mx-auto mb-4" />
          <p className="text-white/70 font-medium mb-2">
            {stats.totalQuestionsCached > 0 
              ? 'Fetching cached questions...' 
              : 'Generating questions with AI...'}
          </p>
          <p className="text-white/40 text-sm">
            {stats.totalQuestionsCached > 0 
              ? `Using ${stats.totalQuestionsCached} cached questions` 
              : 'This may take a moment. Future users will get instant access!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">UKMLA AKT Practice</h1>
              <p className="text-sm text-white/50">
                {stats.totalConcepts.toLocaleString()} concepts • {stats.totalQuestionsCached.toLocaleString()} questions cached
                {stats.coverage > 0 && ` • ${stats.coverage}% coverage`}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search concepts..."
                  className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 w-64"
                />
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-white/5 rounded-lg border border-white/10">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-l-lg transition-colors",
                    viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70"
                  )}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-r-lg transition-colors",
                    viewMode === 'list' ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Filter button */}
              <button
                onClick={() => setShowFiltersPanel(true)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                  showFiltersPanel || filterState.customFilters.length > 0
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                )}
              >
                <Sliders className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {filterState.customFilters.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {filterState.customFilters.length}
                  </span>
                )}
              </button>

              {/* Start Practice */}
              <button
                onClick={() => setShowPracticeConfig(true)}
                disabled={filteredConcepts.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Brain className="h-4 w-4" />
                Start Practice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Filter tags display */}
        {(filterState.specialties.length > 0 || filterState.customFilters.length > 0) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {filterState.specialties.map(spec => (
              <span
                key={spec}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
              >
                {spec}
                <button
                  onClick={() => setFilterState({
                    specialties: filterState.specialties.filter(s => s !== spec)
                  })}
                  className="hover:text-blue-300"
                >
                  ×
                </button>
              </span>
            ))}
            {filterState.customFilters.map(filter => (
              <span
                key={filter}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm"
              >
                {filter}
                <button
                  onClick={() => setFilterState({
                    customFilters: filterState.customFilters.filter(f => f !== filter)
                  })}
                  className="hover:text-purple-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Concepts grid/list */}
        <div className={cn(
          viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-3"
        )}>
          {filteredConcepts.map((concept) => (
            <div
              key={concept.concept_id}
              className={cn(
                "p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors",
                viewMode === 'list' && "flex items-center gap-4"
              )}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{concept.title}</h3>
                <p className="text-white/50 text-sm line-clamp-2 mt-1">{concept.content}</p>
                
                <div className="flex flex-wrap gap-1 mt-3">
                  {concept.custom_filters.slice(0, 3).map(filter => (
                    <span
                      key={filter}
                      className="px-2 py-0.5 bg-white/10 text-white/60 rounded text-xs"
                    >
                      {filter}
                    </span>
                  ))}
                  {concept.custom_filters.length > 3 && (
                    <span className="px-2 py-0.5 text-white/40 text-xs">
                      +{concept.custom_filters.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredConcepts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-white/50">No concepts match your filters</p>
            <button
              onClick={() => {
                setFilterState({ specialties: [], customFilters: [], searchQuery: '' });
                setSearchQuery('');
              }}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Filter Panel Modal */}
      {showFiltersPanel && (
        <Suspense fallback={null}>
          <ConceptFilterPanel
            isOpen={showFiltersPanel}
            onClose={() => setShowFiltersPanel(false)}
            availableFilters={availableFilters}
            availableSpecialties={availableSpecialties}
            selectedFilters={filterState.customFilters}
            selectedSpecialties={filterState.specialties}
            onFilterChange={(filters) => setFilterState({ customFilters: filters })}
            onSpecialtyChange={(specs) => setFilterState({ specialties: specs })}
          />
        </Suspense>
      )}

      {/* Practice Config Modal */}
      {showPracticeConfig && (
        <Suspense fallback={null}>
          <PracticeConfigModal
            isOpen={showPracticeConfig}
            onClose={() => setShowPracticeConfig(false)}
            onStart={handleStartPractice}
            conceptCount={filteredConcepts.length}
          />
        </Suspense>
      )}
    </div>
  );
}

export default ConceptPracticePageCached;
