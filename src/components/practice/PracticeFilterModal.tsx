import React, { useState, useMemo } from 'react';
import { X, Search, Filter, BookOpen, ClipboardList, Stethoscope, Brain, Sparkles, RefreshCw, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConceptStore } from '@/contexts/ConceptStoreContext';

type StudyMode = 'smart' | 'new_only' | 'review_weak' | 'custom';

interface PracticeFilterModalProps {
  isLightMode: boolean;
  onClose: () => void;
  currentFormat?: string;
  onChangeFormat?: (format: string) => void;
}

const FORMATS = [
  { id: 'flashcard', name: 'Flashcards', icon: BookOpen, description: 'Self-paced recall' },
  { id: 'sba', name: 'Quick SBA', icon: ClipboardList, description: 'Timed multiple choice' },
  { id: 'ukmla_sba', name: 'UKMLA AKT', icon: Stethoscope, description: 'Clinical scenarios' },
];

export function PracticeFilterModal({ isLightMode, onClose, currentFormat, onChangeFormat }: PracticeFilterModalProps) {
  const {
    filterState,
    updateFilterState,
    filterOptions,
    filterCategories,
    concepts,
    curriculumId,
    stats,
  } = useConceptStore() as any;

  const [searchQuery, setSearchQuery] = useState('');
  const [pendingFormat, setPendingFormat] = useState(currentFormat);
  const [studyMode, setStudyMode] = useState<StudyMode>('smart');

  // Toggle cascading mode (AND vs OR)
  const toggleCascadingMode = () => {
    updateFilterState({ cascading_mode: !filterState.cascading_mode });
  };

  // Handle study mode change
  const handleStudyModeChange = (mode: StudyMode) => {
    setStudyMode(mode);
    // Update mastery levels based on mode
    let newMasteryLevels: number[] = [];
    if (mode === 'new_only') newMasteryLevels = [0];
    else if (mode === 'review_weak') newMasteryLevels = [1];
    // smart and custom: empty (smart uses algorithm, custom lets user pick)
    updateFilterState({ mastery_levels: newMasteryLevels });
  };

  // Toggle mastery level
  const toggleMastery = (level: number) => {
    const current: number[] = filterState.mastery_levels ?? [];
    const next = current.includes(level) 
      ? current.filter(l => l !== level) 
      : [...current, level];
    updateFilterState({ mastery_levels: next });
  };

  // Toggle custom filter
  const toggleFilter = (filter: string) => {
    const current: string[] = filterState.custom_filters ?? [];
    const next = current.includes(filter)
      ? current.filter(f => f !== filter)
      : [...current, filter];
    updateFilterState({ custom_filters: next });
  };

  const clearAll = () => {
    updateFilterState({ custom_filters: [], mastery_levels: [] });
  };

  // Get filter assignments from localStorage
  const filterAssignments = useMemo(() => {
    const primaryKey = `${curriculumId}_filter_assignments`;
    let stored = localStorage.getItem(primaryKey);
    if (!stored) {
      const base = (curriculumId ?? '').replace(/^imported-pub-/, '').split('-')[0];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('filter_assignments') && (base.length >= 3 ? key.includes(base) : true)) {
          stored = localStorage.getItem(key);
          break;
        }
      }
    }
    return stored ? JSON.parse(stored) : {};
  }, [curriculumId]);

  // Calculate filter counts with correct/incorrect stats
  const filterCounts = useMemo(() => {
    const counts: Record<string, { total: number; correct: number; incorrect: number }> = {};
    filterOptions?.custom_filters?.forEach((filter: string) => {
      const filterConcepts = concepts?.filter((c: any) => 
        c.custom_filters?.includes(filter)
      ) || [];
      const correct = filterConcepts.filter((c: any) => c.mastery_data?.mastery_level === 2).length;
      const incorrect = filterConcepts.filter((c: any) => c.mastery_data?.mastery_level === 1).length;
      
      counts[filter] = {
        total: filterConcepts.length,
        correct,
        incorrect
      };
    });
    return counts;
  }, [concepts, filterOptions?.custom_filters]);

  // Calculate compatible filters for cascading mode
  const compatibleFilters = useMemo(() => {
    if (!filterState.cascading_mode || (filterState.custom_filters?.length || 0) === 0 || !concepts?.length) {
      return new Set(filterOptions?.custom_filters || []);
    }

    // Find concepts that have ALL currently selected filters
    const conceptsWithSelectedFilters = concepts.filter((concept: any) =>
      filterState.custom_filters.every((filter: string) => concept.custom_filters?.includes(filter))
    );

    // Get all filters from those concepts
    const compatible = new Set<string>();
    conceptsWithSelectedFilters.forEach((concept: any) => {
      concept.custom_filters?.forEach((filter: string) => compatible.add(filter));
    });

    return compatible;
  }, [filterState.cascading_mode, filterState.custom_filters, concepts, filterOptions?.custom_filters]);

  // Group compatible filters by category
  const compatibleFiltersByCategory = useMemo(() => {
    const byCategory: Record<string, Set<string>> = {};
    
    filterCategories?.forEach((category: any) => {
      byCategory[category.id] = new Set();
    });

    // For each compatible filter, find its category
    compatibleFilters.forEach((filter: string) => {
      const categoryId = filterAssignments[filter];
      if (categoryId && byCategory[categoryId]) {
        byCategory[categoryId].add(filter);
      }
    });

    return byCategory;
  }, [compatibleFilters, filterCategories, filterAssignments]);

  // Filter categories with search
  const filteredCategories = useMemo(() => {
    return filterCategories?.map((category: any) => {
      // Get all filters for this category
      const allCategoryFilters = Object.entries(filterAssignments)
        .filter(([_, catId]) => catId === category.id)
        .map(([filter]) => filter);

      // Get filters for this category based on mode
      const selectedInThisCategory = (filterState.custom_filters || [])
        .filter((f: string) => filterAssignments[f] === category.id);

      let categoryFilters: string[] = [];
      if (filterState.cascading_mode && (filterState.custom_filters?.length || 0) > 0) {
        if (selectedInThisCategory.length > 0) {
          categoryFilters = selectedInThisCategory
            .filter(filter => filter.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        } else {
          categoryFilters = allCategoryFilters
            .filter(filter => compatibleFiltersByCategory[category.id]?.has(filter))
            .filter(filter => filter.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        }
      } else {
        categoryFilters = allCategoryFilters
          .filter(filter => filter.toLowerCase().includes(searchQuery.toLowerCase()))
          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      }

      return {
        ...category,
        filters: categoryFilters
      };
    }).filter((cat: any) => cat.filters.length > 0) || [];
  }, [filterCategories, filterAssignments, filterState, compatibleFiltersByCategory, searchQuery]);

  const activeCount = (filterState.custom_filters?.length || 0) + (filterState.mastery_levels?.length || 0);
  const light = isLightMode;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Modal — full screen mobile, centered overlay desktop */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6">
        <div
          className={cn(
            'w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]',
            light ? 'bg-white' : 'bg-[#0a0a0a]'
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            'flex items-center justify-between px-6 py-4 border-b flex-shrink-0',
            light ? 'border-black/[0.06]' : 'border-white/10'
          )}>
            <div>
              <h2 className={cn('text-xl font-medium tracking-tight', light ? 'text-stone-900' : 'text-white')}
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Configure Practice
              </h2>
              <p className={cn('text-sm font-light mt-0.5', light ? 'text-stone-600' : 'text-white/60')}
                style={{ fontFamily: "'Manrope', sans-serif" }}>
                Ready to practice {concepts?.length || 0} concepts
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className={cn('text-xs font-medium transition-colors px-3 py-1.5 rounded-full',
                    light ? 'text-stone-600 hover:bg-stone-100' : 'text-white/60 hover:bg-white/10')}
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  Clear
                </button>
              )}
              <button 
                onClick={onClose} 
                className={cn('p-2 rounded-full transition-colors', light ? 'hover:bg-stone-100 text-stone-400' : 'hover:bg-white/10 text-white/50')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Active Filters Banner */}
          {((filterState.custom_filters?.length || 0) > 0 || (filterState.mastery_levels?.length || 0) > 0) && (
            <div className={cn('px-6 py-4 border-b', light ? 'bg-stone-100/80 border-black/[0.06]' : 'bg-white/5 border-white/10')}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-[10px] uppercase tracking-widest font-medium', light ? 'text-stone-500' : 'text-white/50')}
                  style={{ fontFamily: "'Unbounded', sans-serif" }}>
                  Active Filters ({concepts?.length || 0} concepts)
                </span>
                <button
                  onClick={clearAll}
                  className={cn('text-[10px] uppercase tracking-widest transition-colors', light ? 'text-stone-500 hover:text-stone-700' : 'text-white/50 hover:text-white/70')}
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(filterState.mastery_levels || []).map((level: number) => {
                  const levelName = level === 0 ? 'New' : level === 1 ? 'Needs Review' : 'Mastered';
                  const levelColor = level === 0 ? 'bg-gray-400' : level === 1 ? 'bg-red-500' : 'bg-green-500';
                  return (
                    <span
                      key={`mastery-${level}`}
                      className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs', 
                        light ? 'bg-white text-stone-700 border border-stone-200' : 'bg-white/10 text-white border border-white/20')}
                      style={{ fontFamily: "'Manrope', sans-serif" }}
                    >
                      <div className={cn('w-2 h-2 rounded-full', levelColor)} />
                      {levelName}
                      <button
                        onClick={() => toggleMastery(level)}
                        className={cn('ml-1', light ? 'text-stone-400 hover:text-stone-600' : 'text-white/40 hover:text-white/70')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                {(filterState.custom_filters || []).map((filter: string) => (
                  <span
                    key={filter}
                    className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
                      light ? 'bg-stone-900 text-white' : 'bg-white text-stone-900')}
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    {filter.replace(/-/g, ' ')}
                    <button
                      onClick={() => toggleFilter(filter)}
                      className={cn('ml-1', light ? 'text-white/60 hover:text-white' : 'text-stone-400 hover:text-stone-600')}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            
            {/* Study Mode Selector */}
            <div>
              <h4 className={cn('text-[11px] uppercase tracking-widest mb-3', light ? 'text-stone-600' : 'text-white/60')}
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Study Mode
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'smart' as const, name: 'Smart Study', description: 'Algorithm picks', icon: Brain, recommended: true },
                  { mode: 'new_only' as const, name: 'New Only', description: 'Fresh concepts', icon: Sparkles, recommended: false },
                  { mode: 'review_weak' as const, name: 'Review Weak', description: 'Focus on mistakes', icon: RefreshCw, recommended: false },
                  { mode: 'custom' as const, name: 'Custom', description: 'You choose', icon: Settings2, recommended: false }
                ].map(({ mode, name, description, icon: Icon, recommended }) => {
                  const isSelected = studyMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => handleStudyModeChange(mode)}
                      className={cn(
                        'relative p-3 rounded-xl text-left transition-all',
                        isSelected
                          ? light ? 'bg-stone-900 text-white shadow-lg' : 'bg-white text-stone-900 shadow-lg'
                          : light ? 'bg-white/60 backdrop-blur-xl text-stone-900 border border-black/[0.06] hover:border-black/[0.12]' 
                                  : 'bg-white/5 backdrop-blur-xl text-white border border-white/10 hover:border-white/20'
                      )}
                    >
                      {recommended && (
                        <span className={cn(
                          'absolute top-1.5 right-1.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                          isSelected 
                            ? light ? 'bg-white/20 text-white' : 'bg-stone-900/20 text-stone-900'
                            : 'bg-emerald-100 text-emerald-700'
                        )}>
                          Best
                        </span>
                      )}
                      <Icon className={cn('h-4 w-4 mb-1.5', isSelected ? (light ? 'text-white' : 'text-stone-900') : (light ? 'text-stone-600' : 'text-white/60'))} />
                      <div className={cn('text-xs font-medium mb-0.5', isSelected ? (light ? 'text-white' : 'text-stone-900') : (light ? 'text-stone-900' : 'text-white'))}
                        style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {name}
                      </div>
                      <div className={cn('text-[10px]', isSelected ? (light ? 'text-white/70' : 'text-stone-500') : (light ? 'text-stone-500' : 'text-white/50'))}
                        style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format Selection */}
            {onChangeFormat && (
              <div>
                <h4 className={cn('text-[11px] uppercase tracking-widest mb-3', light ? 'text-stone-600' : 'text-white/60')}
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                  Format
                </h4>
                <div className={cn(
                  'rounded-xl border overflow-hidden backdrop-blur-xl',
                  light ? 'bg-white/60 border-black/[0.06]' : 'bg-white/5 border-white/10'
                )}>
                  {FORMATS.map(({ id, name, icon: Icon, description }, index) => {
                    const isSelected = pendingFormat === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setPendingFormat(id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-all',
                          index !== 2 ? (light ? 'border-b border-black/[0.04]' : 'border-b border-white/5') : '',
                          light ? 'hover:bg-black/[0.02]' : 'hover:bg-white/5',
                          isSelected && (light ? 'bg-stone-100' : 'bg-white/10')
                        )}
                      >
                        <div className={cn(
                          'p-2 rounded-lg',
                          isSelected
                            ? light ? 'bg-stone-900 text-white' : 'bg-white text-stone-900'
                            : light ? 'bg-stone-100 text-stone-600' : 'bg-white/10 text-white/60'
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className={cn('font-medium text-[13px]', light ? 'text-stone-900' : 'text-white')}
                            style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {name}
                          </div>
                          <div className={cn('text-[11px]', light ? 'text-stone-500' : 'text-white/50')}
                            style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {description}
                          </div>
                        </div>
                        {isSelected && (
                          <svg className={cn('w-5 h-5', light ? 'text-stone-900' : 'text-white')} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Mode Toggle */}
            <div className={cn(
              'p-5 rounded-2xl border backdrop-blur-xl',
              light ? 'bg-white/60 border-black/[0.06]' : 'bg-white/5 border-white/10'
            )}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className={cn('text-[11px] font-medium mb-1 flex items-center gap-2 uppercase tracking-widest',
                    light ? 'text-stone-900' : 'text-white')}
                    style={{ fontFamily: "'Unbounded', sans-serif" }}>
                    <Filter className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
                    Filter Mode
                  </h4>
                  <p className={cn('text-xs font-light', light ? 'text-stone-600' : 'text-white/60')}
                    style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {filterState.cascading_mode ? 'Match ALL selected' : 'Match ANY selected'}
                  </p>
                </div>
                <button
                  onClick={toggleCascadingMode}
                  className={cn(
                    'px-4 py-2 rounded-full text-[10px] font-medium transition-all uppercase tracking-widest',
                    filterState.cascading_mode
                      ? light ? 'bg-stone-900 text-white' : 'bg-white text-stone-900'
                      : light ? 'bg-white/60 text-stone-900 border border-black/[0.06]' : 'bg-white/10 text-white border border-white/20'
                  )}
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  {filterState.cascading_mode ? 'AND' : 'OR'}
                </button>
              </div>
            </div>

            {/* Mastery Level Filters - Only show in Custom mode */}
            {studyMode === 'custom' && (
            <div>
              <h4 className={cn('text-[11px] uppercase tracking-widest mb-3', light ? 'text-stone-600' : 'text-white/60')}
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Mastery Level
              </h4>
              <div className={cn(
                'rounded-xl border overflow-hidden backdrop-blur-xl',
                light ? 'bg-white/60 border-black/[0.06]' : 'bg-white/5 border-white/10'
              )}>
                {[
                  { level: 0, name: 'Not Started', color: 'bg-gray-400' },
                  { level: 1, name: 'Needs Review', color: 'bg-red-500' },
                  { level: 2, name: 'Mastered', color: 'bg-green-500' }
                ].map(({ level, name, color }, index) => {
                  const isSelected = (filterState.mastery_levels || []).includes(level);
                  const count = stats?.by_mastery?.[level] || 0;
                  
                  return (
                    <button
                      key={level}
                      onClick={() => toggleMastery(level)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3.5 text-sm transition-all',
                        index !== 2 ? (light ? 'border-b border-black/[0.04]' : 'border-b border-white/5') : '',
                        light ? 'hover:bg-black/[0.02]' : 'hover:bg-white/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('w-3 h-3 rounded-full', color)} />
                        <span className={cn('font-light', light ? 'text-stone-900' : 'text-white')}
                          style={{ fontFamily: "'Manrope', sans-serif" }}>
                          {name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs', light ? 'text-stone-400' : 'text-white/50')}
                          style={{ fontFamily: "'Unbounded', sans-serif" }}>
                          {count}
                        </span>
                        {isSelected && (
                          <svg className={cn('w-4 h-4', light ? 'text-stone-900' : 'text-white')} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4', light ? 'text-stone-400' : 'text-white/40')} />
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-10 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all',
                  light 
                    ? 'bg-white/60 border-black/[0.06] text-stone-900 placeholder-stone-400 focus:ring-stone-900/10'
                    : 'bg-white/5 border-white/10 text-white placeholder-white/40 focus:ring-white/20'
                )}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={cn('absolute right-3 top-1/2 -translate-y-1/2', light ? 'text-stone-400 hover:text-stone-600' : 'text-white/40 hover:text-white/70')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Custom Filters - Categorized */}
            {filteredCategories.length > 0 ? (
              <div className="space-y-6">
                {filteredCategories.map((category: any) => (
                  <div key={category.id}>
                    <h4 className={cn('text-[11px] uppercase tracking-widest mb-3', light ? 'text-stone-600' : 'text-white/60')}
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                      {category.name}
                    </h4>
                    <div className={cn(
                      'rounded-xl border overflow-hidden backdrop-blur-xl',
                      light ? 'bg-white/60 border-black/[0.06]' : 'bg-white/5 border-white/10'
                    )}>
                      {category.filters.map((filter: string, index: number) => {
                        const isSelected = (filterState.custom_filters || []).includes(filter);
                        const stats = filterCounts[filter] || { total: 0, correct: 0, incorrect: 0 };
                        const correctPercent = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
                        const incorrectPercent = stats.total > 0 ? (stats.incorrect / stats.total) * 100 : 0;
                        
                        return (
                          <button
                            key={filter}
                            onClick={() => toggleFilter(filter)}
                            className={cn(
                              'relative w-full flex items-center justify-between px-4 py-3.5 text-sm transition-all overflow-hidden',
                              index !== category.filters.length - 1 
                                ? (light ? 'border-b border-black/[0.04]' : 'border-b border-white/5') 
                                : '',
                              light ? 'hover:bg-black/[0.02]' : 'hover:bg-white/5'
                            )}
                          >
                            {/* Progress bar background */}
                            <div className="absolute inset-0 flex">
                              <div 
                                className="bg-green-500/20 transition-all duration-300"
                                style={{ width: `${correctPercent}%` }}
                              />
                              <div 
                                className="bg-red-500/20 transition-all duration-300"
                                style={{ width: `${incorrectPercent}%` }}
                              />
                            </div>
                            
                            <span className={cn('relative font-light', light ? 'text-stone-900' : 'text-white')}
                              style={{ fontFamily: "'Manrope', sans-serif" }}>
                              {filter}
                            </span>
                            <div className="relative flex items-center gap-2">
                              <span className={cn('text-xs', light ? 'text-stone-400' : 'text-white/50')}
                                style={{ fontFamily: "'Unbounded', sans-serif" }}>
                                {stats.total}
                              </span>
                              {isSelected && (
                                <svg className={cn('w-4 h-4', light ? 'text-stone-900' : 'text-white')} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {/* Unassigned Filters */}
                {(() => {
                  const unassignedFilters = (filterOptions?.custom_filters || [])
                    .filter((f: string) => !filterAssignments[f])
                    .filter((f: string) => f.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase()));
                  
                  if (unassignedFilters.length === 0) return null;
                  
                  return (
                    <div>
                      <h4 className={cn('text-[11px] uppercase tracking-widest mb-3', light ? 'text-stone-600' : 'text-white/60')}
                        style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                        Unassigned
                      </h4>
                      <div className={cn(
                        'rounded-xl border overflow-hidden backdrop-blur-xl',
                        light ? 'bg-white/60 border-black/[0.06]' : 'bg-white/5 border-white/10'
                      )}>
                        {unassignedFilters.map((filter: string, index: number) => {
                          const isSelected = (filterState.custom_filters || []).includes(filter);
                          const stats = filterCounts[filter] || { total: 0, correct: 0, incorrect: 0 };
                          const correctPercent = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
                          const incorrectPercent = stats.total > 0 ? (stats.incorrect / stats.total) * 100 : 0;
                          
                          return (
                            <button
                              key={filter}
                              onClick={() => toggleFilter(filter)}
                              className={cn(
                                'relative w-full flex items-center justify-between px-4 py-3.5 text-sm transition-all overflow-hidden',
                                index !== unassignedFilters.length - 1 
                                  ? (light ? 'border-b border-black/[0.04]' : 'border-b border-white/5') 
                                  : '',
                                light ? 'hover:bg-black/[0.02]' : 'hover:bg-white/5'
                              )}
                            >
                              <div className="absolute inset-0 flex">
                                <div className="bg-green-500/20 transition-all duration-300" style={{ width: `${correctPercent}%` }} />
                                <div className="bg-red-500/20 transition-all duration-300" style={{ width: `${incorrectPercent}%` }} />
                              </div>
                              <span className={cn('relative font-light', light ? 'text-stone-900' : 'text-white')}
                                style={{ fontFamily: "'Manrope', sans-serif" }}>
                                {filter}
                              </span>
                              <div className="relative flex items-center gap-2">
                                <span className={cn('text-xs', light ? 'text-stone-400' : 'text-white/50')}
                                  style={{ fontFamily: "'Unbounded', sans-serif" }}>
                                  {stats.total}
                                </span>
                                {isSelected && (
                                  <svg className={cn('w-4 h-4', light ? 'text-stone-900' : 'text-white')} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className={cn('text-sm text-center py-8 font-light', light ? 'text-stone-400' : 'text-white/40')}
                style={{ fontFamily: "'Manrope', sans-serif" }}>
                {searchQuery ? 'No tags match your search' : 'No tags available'}
              </p>
            )}
          </div>

          {/* Footer with Set button */}
          <div className={cn(
            'px-6 py-4 border-t flex-shrink-0',
            light ? 'border-black/[0.06]' : 'border-white/10'
          )}>
            <button
              onClick={() => {
                if (pendingFormat && pendingFormat !== currentFormat) {
                  onChangeFormat?.(pendingFormat);
                }
                onClose();
              }}
              className={cn(
                'w-full py-3 rounded-xl text-sm font-medium transition-all',
                light 
                  ? 'bg-stone-900 text-white hover:bg-stone-800' 
                  : 'bg-white text-stone-900 hover:bg-white/90'
              )}
              style={{ fontFamily: "'Unbounded', sans-serif" }}
            >
              Set Practice
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
