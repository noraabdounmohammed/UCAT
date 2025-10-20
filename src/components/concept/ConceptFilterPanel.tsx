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
    <div className="mb-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Mastery Level</h3>
      
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden">
        {masteryLevels.map(({ level, name }, index) => {
          const isSelected = selected.includes(level);
          const count = counts?.[level];
          
          return (
            <button
              key={level}
              onClick={() => handleToggle(level)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                index !== masteryLevels.length - 1 ? 'border-b border-zinc-200/60 dark:border-zinc-800/60' : ''
              } hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:bg-zinc-100 dark:active:bg-zinc-800`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getMasteryColor(level)}`} />
                <span className="text-zinc-900 dark:text-white font-medium">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                {count !== undefined && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{count}</span>
                )}
                {isSelected && (
                  <svg className="w-5 h-5 text-[#007AFF]" fill="currentColor" viewBox="0 0 20 20">
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

  const handleToggle = (filterName: string) => {
    const newSelected = selectedFilters.includes(filterName)
      ? selectedFilters.filter(item => item !== filterName)
      : [...selectedFilters, filterName];
    onChange(newSelected);
  };


  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white whitespace-nowrap">
          Custom Filters
        </h3>
        <div className="flex items-center gap-2">
          {selectedFilters.length > 0 && (
            <span className="text-xs font-semibold bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              {selectedFilters.length}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onManageCategories();
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                // Get filters assigned to this category, filtered by compatibility and search query
                const assignedFilters = filterOptions.custom_filters?.filter((filterName: string) => 
                  filterAssignments[filterName] === category.id && 
                  compatibleFilters.has(filterName) &&
                  (!searchQuery || filterName.toLowerCase().includes(searchQuery.toLowerCase()))
                ) || [];

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
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400">
                      <div
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      />
                      {category.name} ({assignedFilters.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedFilters.map((filterName: string) => {
                        const isSelected = selectedFilters.includes(filterName);
                        const count = counts?.[filterName];
                        
                        return (
                          <button
                            key={filterName}
                            onClick={() => handleToggle(filterName)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span className="capitalize">{filterName}</span>
                            {count && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}>
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
                // Get filters that are not assigned to any category
                const unassignedFilters = filterOptions.custom_filters.filter((filterName: string) => 
                  !filterAssignments[filterName] && 
                  (!searchQuery || filterName.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                if (unassignedFilters.length === 0) {
                  return null;
                }

                return (
                  <>
                    {filterCategories.length > 0 && (
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Unassigned Filters ({unassignedFilters.length})
                      </div>
                    )}
                    <div className={filterCategories.length > 0 ? "ml-4 space-y-1" : "space-y-1"}>
                      {unassignedFilters.map((filterName: string) => (
                        <label key={filterName} className="flex items-center text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={selectedFilters.includes(filterName)}
                            onChange={() => handleToggle(filterName)}
                            className="mr-2 h-3 w-3 text-blue-600 rounded"
                          />
                          <span className="flex-1">{filterName}</span>
                          {counts && counts[filterName] && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              ({counts[filterName]})
                            </span>
                          )}
                        </label>
                      ))}
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
      {/* Sticky Results Summary - Liquid Glass */}
      <div className="sticky top-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl border-b border-black/[0.08] dark:border-white/[0.08] z-10 p-6 -m-6 mb-0">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08]">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {filteredStats.total}
            </span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {filteredStats.total === 1 ? 'concept found' : 'concepts found'}
            </span>
          </div>
          
          {/* Practice Button - Liquid Glass */}
          {filteredStats.total > 0 && (
            <button
              onClick={onStartPractice}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#007AFF] hover:opacity-90 text-white rounded-xl text-[15px] font-semibold transition-opacity shadow-sm"
            >
              <Play className="h-[18px] w-[18px]" strokeWidth={2.5} />
              <span>Start Practice</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 space-y-6 pt-6">

      {/* Filter Hint - Show on both Concepts and Progress pages */}
      {showFilterHint && !filterState.mastery_levels.length && !filterState.custom_filters.length && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl relative animate-in slide-in-from-top-2 duration-300">
          <button
            onClick={() => {
              setShowFilterHint(false);
              localStorage.setItem('hideFilterHint', 'true');
            }}
            className="absolute top-2 right-2 p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-md transition-colors"
          >
            <X className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
              <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                {activeView === 'mastery' ? 'Filter Your Progress Data' : 'Filter Your Concepts'}
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {activeView === 'mastery' 
                  ? 'Use these filters below to focus your progress visualizations by mastery level or custom tags.'
                  : 'Use these filters below to find specific concepts by mastery level or custom tags.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Mode - Liquid Glass */}
      <div className="mb-6 p-4 bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
              <Filter className="h-[18px] w-[18px] text-[#007AFF]" strokeWidth={2} />
              Filter Mode
            </h3>
            <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
              {filterState.cascading_mode ? 'Match ALL selected' : 'Match ANY selected'}
            </p>
          </div>
          <button
            onClick={() => updateFilterState({ cascading_mode: !filterState.cascading_mode })}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              filterState.cascading_mode
                ? 'bg-[#007AFF] text-white'
                : 'bg-white/80 dark:bg-zinc-700/80 text-zinc-900 dark:text-white border border-black/[0.08] dark:border-white/[0.08]'
            }`}
          >
            {filterState.cascading_mode ? 'AND' : 'OR'}
          </button>
        </div>
      </div>

      {/* Search - Liquid Glass */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-[18px] w-[18px] text-zinc-400" />
        <input
          type="search"
          placeholder="Search filters..."
          className="w-full pl-10 pr-10 py-2.5 text-[15px] bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 transition-all"
          value={filterState.searchQuery}
          onChange={handleSearchChange}
        />
        {filterState.searchQuery && (
          <button
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            onClick={handleClearSearch}
          >
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        )}
      </div>

      {/* Clear All Button */}
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={resetFilters}
          className="text-sm font-medium text-[#007AFF] hover:opacity-70 transition-opacity"
        >
          Clear All
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
