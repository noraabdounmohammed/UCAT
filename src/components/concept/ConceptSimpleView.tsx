import { useState, useMemo } from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { Check, BookOpen, Target, Play, Grid, Plus, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConceptSimpleViewProps {
  onSwitchToGrid: () => void;
  onStartPractice: () => void;
  onAddConcepts?: () => void;
}

type MasteryLevel = 0 | 1 | 2;
type MasteryFilter = 'unseen' | 'incorrect' | 'correct';

const MASTERY_DETAILS: Record<MasteryFilter, { 
  name: string; 
  level: MasteryLevel; 
  color: string;
  bgColor: string;
  description: string;
}> = {
  'unseen': { 
    name: 'Unseen', 
    level: 0, 
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: 'Concepts you haven\'t practiced yet'
  },
  'incorrect': { 
    name: 'Incorrect', 
    level: 1, 
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    description: 'Concepts you got wrong - needs review'
  },
  'correct': { 
    name: 'Correct', 
    level: 2, 
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    description: 'Concepts you got right - well done!'
  }
};

export function ConceptSimpleView({ onSwitchToGrid, onStartPractice, onAddConcepts }: ConceptSimpleViewProps) {
  const { concepts, filterCategories } = useConceptStore();
  
  // Filter states - similar to practice setup
  const [selectedMasteryLevels, setSelectedMasteryLevels] = useState<MasteryFilter[]>([
    'unseen', 'incorrect', 'correct'
  ]);
  const [selectedCustomFilters, setSelectedCustomFilters] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isCascadingMode, setIsCascadingMode] = useState(false); // Toggle for AND vs OR logic

  // Get curriculum ID from localStorage keys (same approach as FilterCategoryManager)
  const curriculumId = useMemo(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('filter_categories')) {
        return key.replace('_filter_categories', '');
      }
    }
    return 'default-curriculum';
  }, []);

  // Get filter assignments from localStorage
  const filterAssignments = useMemo(() => {
    const primaryKey = `${curriculumId}_filter_assignments`;
    let stored = localStorage.getItem(primaryKey);
    
    if (!stored) {
      // Try to find alternative keys if primary key doesn't exist
      const baseCurriculumId = curriculumId.replace(/^imported-pub-/, '').split('-')[0];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('filter_assignments') && key.includes(baseCurriculumId)) {
          stored = localStorage.getItem(key);
          break;
        }
      }
    }
    
    return stored ? JSON.parse(stored) : {};
  }, [curriculumId])

  // Get unique custom filters from concepts
  const availableCustomFilters = useMemo(() => {
    const filters = new Set<string>();
    concepts.forEach(concept => {
      concept.custom_filters.forEach(filter => filters.add(filter));
    });
    return Array.from(filters).sort();
  }, [concepts]);

  // Filter concepts based on selected criteria
  const filteredConcepts = useMemo(() => {
    return concepts.filter(concept => {
      // Check mastery level
      const masteryMatch = selectedMasteryLevels.some(filter =>
        MASTERY_DETAILS[filter].level === concept.mastery_data.mastery_level
      );

      // Check custom filters based on mode
      let customFilterMatch = true;
      if (selectedCustomFilters.length > 0) {
        if (isCascadingMode) {
          // AND logic: concept must have ALL selected filters
          customFilterMatch = selectedCustomFilters.every(filter => 
            concept.custom_filters.includes(filter)
          );
        } else {
          // OR logic: concept must have AT LEAST ONE selected filter
          customFilterMatch = concept.custom_filters.some(filter => 
            selectedCustomFilters.includes(filter)
          );
        }
      }

      return masteryMatch && customFilterMatch;
    });
  }, [concepts, selectedMasteryLevels, selectedCustomFilters, isCascadingMode]);

  // Count concepts by mastery level
  const masteryLevelCounts = useMemo(() => {
    const counts: Record<MasteryFilter, number> = {
      unseen: 0,
      incorrect: 0,
      correct: 0
    };
    
    concepts.forEach(concept => {
      // Ensure mastery_data exists and has a valid level (default to 0 if missing/invalid)
      const level = concept.mastery_data?.mastery_level ?? 0;
      
      // Normalize level to 0-2 range (in case old data has levels 3-4)
      const normalizedLevel = level > 2 ? 0 : level;
      
      Object.entries(MASTERY_DETAILS).forEach(([key, details]) => {
        if (details.level === normalizedLevel) {
          counts[key as MasteryFilter]++;
        }
      });
    });
    
    return counts;
  }, [concepts]);

  // Get filters that can be combined with currently selected filters (for AND mode)
  const compatibleFilters = useMemo(() => {
    if (!isCascadingMode || selectedCustomFilters.length === 0) {
      return new Set(availableCustomFilters);
    }

    // Find concepts that have ALL currently selected filters
    const conceptsWithSelectedFilters = concepts.filter(concept =>
      selectedCustomFilters.every(filter => concept.custom_filters.includes(filter))
    );

    // Get all filters from those concepts
    const compatible = new Set<string>();
    conceptsWithSelectedFilters.forEach(concept => {
      concept.custom_filters.forEach(filter => compatible.add(filter));
    });

    return compatible;
  }, [isCascadingMode, selectedCustomFilters, concepts, availableCustomFilters]);

  // Organize filters by categories with consistent ordering
  const organizedFilters = useMemo(() => {
    const categorizedFilters: Record<string, string[]> = {};
    const uncategorizedFilters: string[] = [];

    // Only show compatible filters in AND mode
    const filtersToShow = isCascadingMode 
      ? availableCustomFilters.filter(f => compatibleFilters.has(f))
      : availableCustomFilters;

    // Initialize all categories in their original order to maintain consistency
    filterCategories.forEach(category => {
      categorizedFilters[category.name] = [];
    });

    // Group filters by their assigned categories
    filtersToShow.forEach(filter => {
      const categoryId = filterAssignments[filter];
      if (categoryId) {
        const category = filterCategories.find(cat => cat.id === categoryId);
        if (category) {
          categorizedFilters[category.name].push(filter);
        } else {
          uncategorizedFilters.push(filter);
        }
      } else {
        uncategorizedFilters.push(filter);
      }
    });

    // Remove empty categories to keep UI clean
    Object.keys(categorizedFilters).forEach(categoryName => {
      if (categorizedFilters[categoryName].length === 0) {
        delete categorizedFilters[categoryName];
      }
    });

    return { categorizedFilters, uncategorizedFilters };
  }, [availableCustomFilters, filterAssignments, filterCategories, isCascadingMode, compatibleFilters]);

  // Count concepts by custom filter with mastery breakdown
  const customFilterCounts = useMemo(() => {
    const counts: Record<string, { total: number; unseen: number; incorrect: number; correct: number }> = {};
    availableCustomFilters.forEach(filter => {
      const filterConcepts = concepts.filter(concept => 
        concept.custom_filters.includes(filter)
      );
      counts[filter] = {
        total: filterConcepts.length,
        unseen: filterConcepts.filter(c => (c.mastery_data?.mastery_level ?? 0) === 0).length,
        incorrect: filterConcepts.filter(c => (c.mastery_data?.mastery_level ?? 0) === 1).length,
        correct: filterConcepts.filter(c => (c.mastery_data?.mastery_level ?? 0) === 2).length
      };
    });
    return counts;
  }, [concepts, availableCustomFilters]);

  const toggleMasteryLevel = (level: MasteryFilter) => {
    setSelectedMasteryLevels(prev => {
      const isSelected = prev.includes(level);
      if (isSelected && prev.length > 1) {
        return prev.filter(l => l !== level);
      } else if (!isSelected) {
        return [...prev, level];
      }
      return prev; // Don't allow deselecting if it's the only one selected
    });
  };

  const toggleCustomFilter = (filter: string) => {
    setSelectedCustomFilters(prev => {
      const isSelected = prev.includes(filter);
      if (isSelected) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  };

  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  return (
    <div className="w-full space-y-8">
      {/* Filter Mode Toggle - Minimal Apple Style */}
      <div className="flex items-center justify-between py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Filter Mode
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isCascadingMode 
              ? 'Match ALL filters' 
              : 'Match ANY filter'}
          </p>
        </div>
        <button
          onClick={() => setIsCascadingMode(!isCascadingMode)}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 ${
            isCascadingMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <Filter className="h-4 w-4" />
          <span>{isCascadingMode ? 'AND' : 'OR'}</span>
        </button>
      </div>

      {/* Info Banner - Minimal */}
      {isCascadingMode && selectedCustomFilters.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4 border-l-4 border-blue-500">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            Showing only compatible filters
          </p>
        </div>
      )}

      {/* Categorized Filters - Each category as its own section */}
      {Object.entries(organizedFilters.categorizedFilters).map(([categoryName, filters]) => {
        const isExpanded = expandedCategories[categoryName] ?? true; // Default to expanded
        const categoryFiltersCount = filters.reduce((sum, filter) => sum + (customFilterCounts[filter]?.total || 0), 0);
        
        return (
          <div key={categoryName} className="space-y-4">
            {/* Category Header - Clean & Minimal */}
            <div 
              className="flex items-center justify-between py-3 cursor-pointer group"
              onClick={() => toggleCategoryExpansion(categoryName)}
            >
              <div className="flex items-center gap-3">
                <ChevronRight 
                  className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                    isExpanded ? 'rotate-90' : ''
                  }`} 
                />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {categoryName}
                </h2>
                <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                  {categoryFiltersCount}
                </span>
              </div>
            </div>
            
            {/* Category Filters - Chip Style */}
            {isExpanded && (
              <div className="flex flex-wrap gap-2">
                        {filters.map(filter => {
                          const isSelected = selectedCustomFilters.includes(filter);
                          const stats = customFilterCounts[filter];
                          
                          return (
                            <button
                              key={filter}
                              onClick={() => toggleCustomFilter(filter)}
                              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95' 
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 active:scale-95'
                              }`}
                              title={stats ? `${stats.unseen} unseen, ${stats.incorrect} incorrect, ${stats.correct} correct` : ''}
                            >
                              <span className="capitalize">
                                {filter.replace(/-/g, ' ')}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                isSelected 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}>
                                {stats?.total || 0}
                              </span>
                            </button>
                          );
                        })}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Uncategorized Filters - "Other Filters" Section */}
      {organizedFilters.uncategorizedFilters.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Other Filters
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {organizedFilters.uncategorizedFilters.map(filter => {
              const isSelected = selectedCustomFilters.includes(filter);
              const stats = customFilterCounts[filter];
              
              return (
                <button
                  key={filter}
                  onClick={() => toggleCustomFilter(filter)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 active:scale-95'
                  }`}
                  title={stats ? `${stats.unseen} unseen, ${stats.incorrect} incorrect, ${stats.correct} correct` : ''}
                >
                  <span className="capitalize">
                    {filter.replace(/-/g, ' ')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isSelected 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {stats?.total || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question History - Minimal */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-3 py-3">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Question History
          </h2>
        </div>
        
        <div className="space-y-3">
          {Object.entries(MASTERY_DETAILS).map(([key, details]) => {
            const isSelected = selectedMasteryLevels.includes(key as MasteryFilter);
            const count = masteryLevelCounts[key as MasteryFilter];
            
            return (
              <button
                key={key}
                onClick={() => toggleMasteryLevel(key as MasteryFilter)}
                className={`w-full p-5 rounded-2xl transition-all duration-200 text-left ${
                  isSelected 
                    ? 'bg-blue-600 shadow-lg scale-[1.02]' 
                    : 'bg-white dark:bg-gray-800 shadow-md hover:shadow-xl hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div 
                      className={`w-6 h-6 md:w-5 md:h-5 rounded-md flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                        isSelected 
                          ? 'bg-blue-500 text-white dark:bg-blue-600' 
                          : 'border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 md:h-3 md:w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-base ${
                        isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                      }`}>
                        {details.name}
                      </h3>
                      <p className={`text-sm ${
                        isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {details.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-2xl font-bold ${
                      isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                    }`}>
                      {count}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Summary - Mobile Optimized */}
      <div className="text-center py-6 md:py-8">
        <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {filteredConcepts.length}
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-6">
          concept{filteredConcepts.length !== 1 ? 's' : ''} match your filters
        </p>
        
        <Button
          onClick={onStartPractice}
          disabled={filteredConcepts.length === 0}
          className="w-full sm:w-auto px-8 py-4 text-base md:text-lg font-semibold min-h-[52px] rounded-xl"
        >
          <Play className="h-5 w-5 mr-2" />
          Start Practice
        </Button>
      </div>
    </div>
  );
}
