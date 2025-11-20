import React, { useState } from 'react';
import { X, Filter, Search, Settings, Folder, Brain, BarChart3, Play } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { FilterCategoryManager } from './FilterCategoryManager';
import { FilterCategory } from '@/types/conceptTypes';


interface MasteryFilterSectionProps {
  masteryLevels: Array<{level: number; name: string}>;
  selected: number[];
  onChange: (selected: number[]) => void;
  counts?: Record<number, number>;
}

const MasteryFilterSection: React.FC<MasteryFilterSectionProps> = ({
  masteryLevels,
  selected,
  onChange,
  counts
}) => {
  const handleToggle = (level: number) => {
    const newSelected = selected.includes(level)
      ? selected.filter(item => item !== level)
      : [...selected, level];
    onChange(newSelected);
  };
  
  const handleSelectAll = () => {
    onChange(selected.length === masteryLevels.length 
      ? [] 
      : masteryLevels.map(ml => ml.level));
  };
  
  // Colors for mastery levels (3-level system)
  const getMasteryColor = (level: number) => {
    switch(level) {
      case 0: return 'bg-gray-400 dark:bg-gray-500'; // Unseen
      case 1: return 'bg-red-500 dark:bg-red-600';   // Incorrect
      case 2: return 'bg-green-500 dark:bg-green-600'; // Correct
      default: return 'bg-gray-400 dark:bg-gray-500';
    }
  };
  
  return (
    <div className="mb-8">
      <div className="h-[1px] w-16 bg-stone-300 mb-4"></div>
      <h3 className="text-[11px] uppercase tracking-widest text-stone-600 mb-4" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>Mastery Level</h3>
      
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-black/[0.06] overflow-hidden">
        {masteryLevels.map(({ level, name }, index) => {
          const isSelected = selected.includes(level);
          const count = counts?.[level];
          
          return (
            <button
              key={level}
              onClick={() => handleToggle(level)}
              className={`w-full flex items-center justify-between px-5 py-4 text-sm transition-all ${
                index !== masteryLevels.length - 1 ? 'border-b border-black/[0.04]' : ''
              } hover:bg-black/[0.02] active:bg-black/[0.04]`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getMasteryColor(level)}`} />
                <span className="text-stone-900 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>{name}</span>
              </div>
              <div className="flex items-center gap-2">
                {count !== undefined && (
                  <span className="text-xs text-stone-400" style={{ fontFamily: "'Unbounded', sans-serif" }}>{count}</span>
                )}
                {isSelected && (
                  <svg className="w-5 h-5 text-stone-900" fill="currentColor" viewBox="0 0 20 20">
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
};

interface CategorizedCustomFiltersProps {
  filterCategories: FilterCategory[];
  filterOptions: any; // ConceptFilterOptions
  selectedFilters: string[];
  onChange: (selected: string[]) => void;
  counts?: Record<string, number>;
  onManageCategories: () => void;
  refreshKey?: number;
  cascadingMode?: boolean;
  concepts?: any[]; // For calculating compatible filters
  searchQuery?: string; // For filtering displayed filters
  curriculumId: string; // ACTIVE CURRICULUM ID
}

const CategorizedCustomFilters: React.FC<CategorizedCustomFiltersProps> = ({
  filterCategories,
  filterOptions,
  selectedFilters,
  onChange,
  counts,
  onManageCategories,
  refreshKey,
  cascadingMode = false,
  concepts = [],
  searchQuery = '',
  curriculumId
}) => {

  // Calculate compatible filters in cascading mode
  const compatibleFilters = React.useMemo(() => {
    if (!cascadingMode || selectedFilters.length === 0 || !concepts.length) {
      console.log('🔍 Cascading mode OFF or no filters selected:', { cascadingMode, selectedFiltersCount: selectedFilters.length, conceptsCount: concepts.length });
      return new Set(filterOptions.custom_filters || []);
    }

    // Find concepts that have ALL currently selected filters
    const conceptsWithSelectedFilters = concepts.filter((concept: any) =>
      selectedFilters.every(filter => concept.custom_filters?.includes(filter))
    );

    // Get all filters from those concepts
    const compatible = new Set<string>();
    conceptsWithSelectedFilters.forEach((concept: any) => {
      concept.custom_filters?.forEach((filter: string) => compatible.add(filter));
    });

    console.log('🔍 Cascading mode ON - Compatible filters:', {
      cascadingMode,
      selectedFilters,
      conceptsWithSelectedFilters: conceptsWithSelectedFilters.length,
      compatibleFiltersCount: compatible.size,
      compatibleFilters: Array.from(compatible)
    });

    return compatible;
  }, [cascadingMode, selectedFilters, concepts, filterOptions.custom_filters]);

  const filterAssignments = React.useMemo(() => {
    const primaryKey = `${curriculumId}_filter_assignments`;
    let stored = localStorage.getItem(primaryKey);
    let usedKey = primaryKey;
    
    // If no assignments found with current curriculum ID, try to find alternative keys
    if (!stored) {
      // Extract base curriculum ID (remove import prefixes and suffixes)
      const baseCurriculumId = curriculumId.replace(/^imported-pub-/, '').split('-')[0];
      
      // Look for any assignment keys that contain the base curriculum ID
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('filter_assignments') && key.includes(baseCurriculumId)) {
          stored = localStorage.getItem(key);
          usedKey = key;
          break;
        }
      }
    }
    
    const assignments = stored ? JSON.parse(stored) : {};
    
    // Debug logging to help troubleshoot
    if (process.env.NODE_ENV === 'development') {
      console.log('🏷️ Filter Assignments Debug:', {
        curriculumId,
        primaryKey,
        usedKey,
        foundAssignments: !!stored,
        assignments,
        filterCategories: filterCategories.length,
        availableFilters: filterOptions.custom_filters?.length || 0
      });
    }
    
    return assignments;
  }, [curriculumId, refreshKey, filterCategories, filterOptions.custom_filters]); // Re-read when refreshKey changes

  // Calculate progress for each filter
  const filterProgress = React.useMemo(() => {
    const progress: Record<string, { completed: number; total: number; percentage: number }> = {};
    
    filterOptions.custom_filters?.forEach((filterName: string) => {
      const conceptsWithFilter = concepts.filter((c: any) => 
        c.custom_filters?.includes(filterName)
      );
      const completed = conceptsWithFilter.filter((c: any) => 
        c.mastery_data?.mastery_level >= 3
      ).length;
      const total = conceptsWithFilter.length;
      
      progress[filterName] = {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });
    
    return progress;
  }, [concepts, filterOptions.custom_filters]);

  const handleToggle = (filterName: string) => {
    const newSelected = selectedFilters.includes(filterName)
      ? selectedFilters.filter(item => item !== filterName)
      : [...selectedFilters, filterName];
    onChange(newSelected);
  };


  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="h-[1px] w-16 bg-stone-300 mb-4"></div>
          <h3 className="text-[11px] uppercase tracking-widest text-stone-600" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
            Custom Filters
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {selectedFilters.length > 0 && (
            <span className="text-[10px] font-medium bg-stone-900/10 text-stone-900 px-2.5 py-1 rounded-full" style={{ fontFamily: "'Unbounded', sans-serif" }}>
              {selectedFilters.length}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onManageCategories();
            }}
            className="p-2 text-stone-400 hover:text-stone-900 hover:bg-black/[0.04] rounded-full transition-colors"
            title="Manage Categories"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {(
        <div className="mt-2 space-y-3">
          {/* Show Categories with Assigned Filters */}
          {filterCategories.length > 0 && (
            <div className="space-y-3">
              {filterCategories.map(category => {
                // Get filters assigned to this category, filtered by compatibility and search query, sorted alphabetically
                const assignedFilters = (filterOptions.custom_filters?.filter((filterName: string) => {
                  // Must be assigned to this category
                  if (filterAssignments[filterName] !== category.id) return false;
                  
                  // Must match search query if provided
                  if (searchQuery && !filterName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                  
                  // In cascading mode, apply compatibility filter
                  if (cascadingMode && selectedFilters.length > 0) {
                    // If this filter is already selected, always show it
                    if (selectedFilters.includes(filterName)) return true;
                    
                    // Otherwise, only show if it's compatible (exists on concepts with selected filters)
                    return compatibleFilters.has(filterName);
                  }
                  
                  return true;
                }) || []).sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase()));

                // Only show categories that have assigned filters or show empty state
                if (assignedFilters.length === 0) {
                  return (
                    <div key={category.id} className="space-y-1">
                      <div className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400">
                        <div
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: category.color || '#3B82F6' }}
                        />
                        {category.name} (0)
                      </div>
                      <div className="ml-4 text-xs text-gray-500 dark:text-gray-400 italic">
                        No filters assigned to this category yet
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-medium text-stone-500" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      />
                      <span className="uppercase tracking-widest">{category.name}</span>
                      <span className="text-stone-400">({assignedFilters.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignedFilters.map((filterName: string) => {
                        const isSelected = selectedFilters.includes(filterName);
                        const count = counts?.[filterName];
                        const progress = filterProgress[filterName];
                        
                        return (
                          <button
                            key={filterName}
                            onClick={() => handleToggle(filterName)}
                            className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-light transition-all ${
                              isSelected
                                ? 'bg-stone-900 text-white shadow-sm hover:bg-stone-800'
                                : 'bg-white/60 backdrop-blur-xl text-stone-900 border border-black/[0.06] hover:border-black/[0.12]'
                            }`}
                            style={{ fontFamily: "'Manrope', sans-serif" }}
                          >
                            {/* Progress bar background */}
                            <div 
                              className={`absolute inset-0 transition-all duration-500 ${
                                isSelected ? 'bg-white/10' : 'bg-green-500/20'
                              }`}
                              style={{ width: `${progress?.percentage || 0}%` }}
                            />
                            <span className="relative z-10">{filterName.replace(/-/g, ' ')}</span>
                            {count !== undefined && (
                              <span className={`relative z-10 text-[10px] font-medium ${
                                isSelected
                                  ? 'text-white/60'
                                  : 'text-stone-400'
                              }`} style={{ fontFamily: "'Unbounded', sans-serif" }}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unassigned Filters */}
          {filterOptions.custom_filters && filterOptions.custom_filters.length > 0 && (
            <div className="space-y-1">
              {(() => {
                // Get filters that are not assigned to any category, sorted alphabetically
                const unassignedFilters = filterOptions.custom_filters
                  .filter((filterName: string) => 
                    !filterAssignments[filterName] && 
                    (!searchQuery || filterName.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase()));

                if (unassignedFilters.length === 0) {
                  return null;
                }

                return (
                  <>
                    {filterCategories.length > 0 && (
                      <div className="flex items-center gap-2 text-[10px] font-medium text-stone-500" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                        <div className="w-2 h-2 rounded-full bg-stone-400" />
                        <span className="uppercase tracking-widest">Unassigned</span>
                        <span className="text-stone-400">({unassignedFilters.length})</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {unassignedFilters.map((filterName: string) => {
                        const isSelected = selectedFilters.includes(filterName);
                        const count = counts?.[filterName];
                        const progress = filterProgress[filterName];
                        return (
                          <button
                            key={filterName}
                            onClick={() => handleToggle(filterName)}
                            className={`relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-light transition-all ${
                              isSelected
                                ? 'bg-stone-900 text-white shadow-sm hover:bg-stone-800'
                                : 'bg-white/60 backdrop-blur-xl text-stone-900 border border-black/[0.06] hover:border-black/[0.12]'
                            }`}
                            style={{ fontFamily: "'Manrope', sans-serif" }}
                          >
                            {/* Progress bar background */}
                            <div 
                              className={`absolute inset-0 transition-all duration-500 ${
                                isSelected ? 'bg-white/10' : 'bg-green-500/20'
                              }`}
                              style={{ width: `${progress?.percentage || 0}%` }}
                            />
                            <span className="relative z-10">{filterName.replace(/-/g, ' ')}</span>
                            {count !== undefined && (
                              <span className={`relative z-10 text-[10px] font-medium ${
                                isSelected
                                  ? 'text-white/60'
                                  : 'text-stone-400'
                              }`} style={{ fontFamily: "'Unbounded', sans-serif" }}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {(!filterOptions.custom_filters || filterOptions.custom_filters.length === 0) && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <Folder className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No custom filters yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ConceptFilterPanelProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onStartPractice?: () => void;
  selectedCategory?: string;
}

export const ConceptFilterPanel: React.FC<ConceptFilterPanelProps> = ({ activeView, onViewChange, onStartPractice = () => {}, selectedCategory = 'all' }) => {
  const { 
    filterState, 
    updateFilterState,
    resetFilters,
    stats,
    filterCategories,
    concepts,
    filteredConcepts,
    filterOptions,
    curriculumId
  } = useConceptStore();
  
  // Calculate filtered stats using the store's filteredConcepts (which includes ALL active filters)
  const filteredStats = React.useMemo(() => {
    return {
      total: filteredConcepts.length,
      // Add other stats if needed
    };
  }, [filteredConcepts]);

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilterHint, setShowFilterHint] = useState(() => {
    // Check localStorage to see if user dismissed the hint permanently
    return localStorage.getItem('hideFilterHint') !== 'true';
  });
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilterState({ searchQuery: e.target.value });
  };
  
  const handleClearSearch = () => {
    updateFilterState({ searchQuery: '' });
  };

  
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 space-y-6">

      {/* Filter Hint - Show on both Concepts and Progress pages */}
      {showFilterHint && !filterState.mastery_levels.length && !filterState.custom_filters.length && (
        <div className="mb-4 p-4 bg-stone-50 dark:bg-stone-900/20 border border-stone-200 dark:border-stone-800 rounded-xl relative animate-in slide-in-from-top-2 duration-300">
          <button
            onClick={() => {
              setShowFilterHint(false);
              localStorage.setItem('hideFilterHint', 'true');
            }}
            className="absolute top-2 right-2 p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"
          >
            <X className="h-4 w-4 text-stone-600 dark:text-stone-400" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-500/10 dark:bg-stone-500/20 flex items-center justify-center">
              <Filter className="h-4 w-4 text-stone-600 dark:text-stone-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                {activeView === 'mastery' ? 'Filter Your Progress Data' : 'Filter Your Concepts'}
              </h4>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                {activeView === 'mastery' 
                  ? 'Use these filters below to focus your progress visualizations by mastery level or custom tags.'
                  : 'Use these filters below to find specific concepts by mastery level or custom tags.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Mode */}
      <div className="mb-8 p-5 bg-white/60 backdrop-blur-xl rounded-2xl border border-black/[0.06]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-[11px] font-medium text-stone-900 mb-2 flex items-center gap-2 uppercase tracking-widest" style={{ fontFamily: "'Unbounded', sans-serif" }}>
              <Filter className="h-4 w-4 text-stone-600" strokeWidth={2} />
              Filter Mode
            </h3>
            <p className="text-[13px] text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {filterState.cascading_mode ? 'Match ALL selected' : 'Match ANY selected'}
            </p>
          </div>
          <button
            onClick={() => updateFilterState({ cascading_mode: !filterState.cascading_mode })}
            className={`px-5 py-2.5 rounded-full text-[11px] font-medium transition-all uppercase tracking-widest ${
              filterState.cascading_mode
                ? 'bg-stone-900 text-white'
                : 'bg-white/60 text-stone-900 border border-black/[0.06]'
            }`}
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            {filterState.cascading_mode ? 'AND' : 'OR'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="search"
          placeholder="Search filters..."
          className="w-full pl-11 pr-10 py-3 text-[13px] bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-2xl text-stone-900 placeholder-stone-400 focus:outline-none focus:border-black/[0.12] transition-all font-light"
          style={{ fontFamily: "'Manrope', sans-serif" }}
          value={filterState.searchQuery}
          onChange={handleSearchChange}
        />
        {filterState.searchQuery && (
          <button
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-black/[0.04] rounded-full transition-colors"
            onClick={handleClearSearch}
          >
            <X className="h-4 w-4 text-stone-400" />
          </button>
        )}
      </div>

      {/* Clear All Button */}
      <div className="flex items-center justify-end mb-8">
        <button
          onClick={resetFilters}
          className="text-[11px] font-medium text-stone-900 hover:text-stone-600 transition-colors uppercase tracking-widest"
          style={{ fontFamily: "'Unbounded', sans-serif" }}
        >
          Clear All
        </button>
      </div>
      
      <div className="space-y-6">
        <div className="space-y-8">
          <div>
            <MasteryFilterSection
              masteryLevels={filterOptions.mastery_levels}
              selected={filterState.mastery_levels}
              onChange={(selected) => updateFilterState({ mastery_levels: selected })}
              counts={stats.by_mastery}
            />
          </div>
          
          <div>
            <CategorizedCustomFilters
              filterCategories={filterCategories}
              filterOptions={filterOptions}
              selectedFilters={filterState.custom_filters || []}
              onChange={(selected: string[]) => updateFilterState({ custom_filters: selected })}
              counts={stats.by_custom_filter}
              onManageCategories={() => setShowCategoryManager(true)}
              refreshKey={refreshKey}
              cascadingMode={filterState.cascading_mode}
              concepts={concepts}
              searchQuery={filterState.searchQuery}
              curriculumId={curriculumId}
            />
          </div>
        </div>
        
      </div>
      
      {showCategoryManager && (
        <FilterCategoryManager 
          onClose={() => {
            setShowCategoryManager(false);
            setRefreshKey(prev => prev + 1); // Trigger refresh
          }} 
        />
      )}
      </div>
    </div>
  );
};
