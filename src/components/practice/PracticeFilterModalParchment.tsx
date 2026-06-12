import React, { useState, useMemo } from 'react';
import { X, Search, Filter, RefreshCw, Settings2, ChevronDown, BookOpen, Sliders } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import type { FilterCategory } from '@/types/conceptTypes';

type StudyMode = 'smart' | 'new_only' | 'review_weak' | 'custom';

interface PracticeFilterModalParchmentProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters?: () => void;
}

const THEME = {
  parchment: '#F4ECDF',
  parchmentDeep: '#EBE1D0',
  cream: '#FAF5EC',
  espresso: '#1F140C',
  espressoSoft: '#3B2A1E',
  ink: '#2A1E16',
  inkMuted: '#8A7560',
  blush: '#F2C9C1',
  blushDeep: '#E5A89D',
  sage: '#C8D3B8',
  sageDeep: '#8FA379',
  line: '#D9CCB6',
  lineSoft: '#E8DCC4',
};

const STATUS_CONFIG = [
  { id: 0, label: 'cold', name: 'Not Started', color: '#4a3a2c' },
  { id: 1, label: 'weak', name: 'Needs Review', color: THEME.blushDeep },
  { id: 2, label: 'mastered', name: 'Mastered', color: THEME.sageDeep },
];

const STUDY_MODES = [
  { mode: 'smart' as const, name: 'Smart Study', description: 'Algorithm picks', recommended: true },
  { mode: 'new_only' as const, name: 'New Only', description: 'Fresh concepts' },
  { mode: 'review_weak' as const, name: 'Review Weak', description: 'Focus on mistakes' },
  { mode: 'custom' as const, name: 'Custom', description: 'You choose' },
];

export const PracticeFilterModalParchment: React.FC<PracticeFilterModalParchmentProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
}) => {
  const {
    filterState,
    updateFilterState,
    filterOptions,
    filterCategories,
    concepts,
    curriculumId,
    stats,
  } = useConceptStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [studyMode, setStudyMode] = useState<StudyMode>('smart');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, { total: number; correct: number; incorrect: number }> = {};
    filterOptions?.custom_filters?.forEach((filter: string) => {
      const filterConcepts = concepts?.filter((c: any) => c.custom_filters?.includes(filter)) || [];
      const correct = filterConcepts.filter((c: any) => c.mastery_data?.mastery_level === 2).length;
      const incorrect = filterConcepts.filter((c: any) => c.mastery_data?.mastery_level === 1).length;
      counts[filter] = { total: filterConcepts.length, correct, incorrect };
    });
    return counts;
  }, [concepts, filterOptions?.custom_filters]);

  // Toggle study mode
  const handleStudyModeChange = (mode: StudyMode) => {
    setStudyMode(mode);
    let newMasteryLevels: number[] = [];
    if (mode === 'new_only') newMasteryLevels = [0];
    else if (mode === 'review_weak') newMasteryLevels = [1];
    updateFilterState({ mastery_levels: newMasteryLevels });
  };

  // Toggle mastery level
  const toggleMastery = (level: number) => {
    const current: number[] = filterState.mastery_levels ?? [];
    const next = current.includes(level) ? current.filter(l => l !== level) : [...current, level];
    updateFilterState({ mastery_levels: next });
  };

  // Toggle filter
  const toggleFilter = (filter: string) => {
    const current: string[] = filterState.custom_filters ?? [];
    const next = current.includes(filter) ? current.filter(f => f !== filter) : [...current, filter];
    updateFilterState({ custom_filters: next });
  };

  // Toggle cascading mode
  const toggleCascadingMode = () => {
    updateFilterState({ cascading_mode: !filterState.cascading_mode });
  };

  // Toggle category expansion
  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const clearAll = () => {
    updateFilterState({ custom_filters: [], mastery_levels: [] });
  };

  // Group filters by category
  const filtersByCategory = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    
    filterCategories?.forEach((cat: FilterCategory) => {
      grouped[cat.id] = [];
    });
    grouped['uncategorized'] = [];
    
    filterOptions?.custom_filters?.forEach((filter: string) => {
      const catId = filterAssignments[filter];
      if (catId && grouped[catId]) {
        grouped[catId].push(filter);
      } else {
        grouped['uncategorized'].push(filter);
      }
    });
    
    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      Object.keys(grouped).forEach(key => {
        grouped[key] = grouped[key].filter(f => f.toLowerCase().includes(q));
      });
    }
    
    return grouped;
  }, [filterCategories, filterOptions?.custom_filters, filterAssignments, searchQuery]);

  const activeCount = (filterState.custom_filters?.length || 0) + (filterState.mastery_levels?.length || 0);

  const handleApply = () => {
    onApplyFilters?.();
    onClose();
  };

  if (!isOpen) return null;

  const Chip = ({ 
    label, 
    count, 
    selected, 
    onClick, 
    color,
    showDot = true 
  }: { 
    label: string; 
    count?: number; 
    selected: boolean; 
    onClick: () => void;
    color?: string;
    showDot?: boolean;
  }) => (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium transition-all border"
      style={{
        backgroundColor: selected ? THEME.espresso : THEME.cream,
        color: selected ? THEME.cream : THEME.ink,
        borderColor: selected ? THEME.espresso : THEME.line,
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {showDot && color && (
        <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: color }} />
      )}
      <span className="capitalize">{label}</span>
      {count !== undefined && (
        <span 
          className="text-[11.5px] italic ml-0.5"
          style={{ 
            fontFamily: "'Fraunces', serif",
            color: selected ? THEME.blush : THEME.inkMuted
          }}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[100] p-0 md:p-4"
      style={{ backgroundColor: 'rgba(31, 20, 12, 0.4)' }}
      onClick={onClose}
    >
      <div 
        className="w-full h-full md:h-auto md:max-w-[480px] flex flex-col overflow-hidden shadow-2xl"
        style={{ 
          backgroundColor: THEME.cream,
          borderRadius: '28px',
          maxHeight: '95vh',
          fontFamily: "'Inter', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet Grabber */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: '36px', height: '4px', backgroundColor: THEME.line, borderRadius: '2px' }} />
        </div>
        
        {/* Header */}
        <div className="px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 
              className="text-[26px] leading-[1.1] mb-1"
              style={{ 
                fontFamily: "'Fraunces', serif",
                fontWeight: 300,
                color: THEME.ink,
                letterSpacing: '-0.02em'
              }}
            >
              Configure <em style={{ color: THEME.blushDeep, fontStyle: 'italic' }}>practice</em>
            </h1>
            <p 
              className="text-[12px]"
              style={{ 
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                color: THEME.inkMuted
              }}
            >
              Adjust your session filters
            </p>
          </div>
          <div className="flex gap-2">
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border"
                style={{ borderColor: THEME.line, color: THEME.inkMuted }}
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all border"
              style={{ borderColor: THEME.line, color: THEME.inkMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Filters */}
        {activeCount > 0 && (
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            <span className="text-[9px] uppercase tracking-[0.2em] font-medium py-2" style={{ color: THEME.inkMuted }}>
              Active
            </span>
            {(filterState.mastery_levels || []).map((level: number) => {
              const status = STATUS_CONFIG.find(s => s.id === level);
              if (!status) return null;
              return (
                <button
                  key={level}
                  onClick={() => toggleMastery(level)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all"
                  style={{ backgroundColor: THEME.espresso, color: THEME.cream }}
                >
                  <span style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.blush }}>
                    status
                  </span>
                  <span>{status.label}</span>
                  <span className="ml-0.5 opacity-60">×</span>
                </button>
              );
            })}
            {(filterState.custom_filters || []).map((filter: string) => (
              <button
                key={filter}
                onClick={() => toggleFilter(filter)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all"
                style={{ backgroundColor: THEME.espresso, color: THEME.cream }}
              >
                <span style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.blush }}>
                  filter
                </span>
                <span>{filter.replace(/-/g, ' ')}</span>
                <span className="ml-0.5 opacity-60">×</span>
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          
          {/* STUDY MODE */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span className="text-[17px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}>
                Study mode
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-1">
              {STUDY_MODES.map(({ mode, name, description, recommended }) => {
                const isSelected = studyMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => handleStudyModeChange(mode)}
                    className="relative p-3 rounded-[14px] text-left transition-all border"
                    style={{
                      backgroundColor: isSelected ? THEME.espresso : THEME.cream,
                      borderColor: isSelected ? THEME.espresso : THEME.line,
                      color: isSelected ? THEME.cream : THEME.ink,
                    }}
                  >
                    {recommended && (
                      <span 
                        className="absolute top-1.5 right-1.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: isSelected ? THEME.blush : THEME.sage, color: THEME.espresso }}
                      >
                        Best
                      </span>
                    )}
                    <div className="text-xs font-medium mb-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {name}
                    </div>
                    <div 
                      className="text-[10px]"
                      style={{ 
                        fontFamily: "'Inter', sans-serif",
                        color: isSelected ? THEME.blush : THEME.inkMuted
                      }}
                    >
                      {description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FILTER MODE */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="flex items-center justify-between pl-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4" style={{ color: THEME.inkMuted }} />
                <span className="text-[15px]" style={{ fontFamily: "'Fraunces', serif", color: THEME.ink }}>
                  Filter mode
                </span>
              </div>
              <button
                onClick={toggleCascadingMode}
                className="px-4 py-2 rounded-full text-[11px] font-medium transition-all border"
                style={{
                  backgroundColor: filterState.cascading_mode ? THEME.espresso : THEME.cream,
                  color: filterState.cascading_mode ? THEME.cream : THEME.ink,
                  borderColor: THEME.line,
                }}
              >
                {filterState.cascading_mode ? 'Match ALL (AND)' : 'Match ANY (OR)'}
              </button>
            </div>
          </div>

          {/* MASTERY STATUS - Only in custom mode */}
          {studyMode === 'custom' && (
            <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
              <div className="mb-3">
                <span className="text-[17px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}>
                  Mastery status
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pl-1">
                {STATUS_CONFIG.map((status) => {
                  const isSelected = (filterState.mastery_levels || []).includes(status.id);
                  const count = stats?.by_mastery?.[status.id] || 0;
                  return (
                    <Chip
                      key={status.id}
                      label={status.label}
                      count={count}
                      selected={isSelected}
                      onClick={() => toggleMastery(status.id)}
                      color={status.color}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* SEARCH */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="relative pl-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: THEME.inkMuted }} />
              <input
                type="text"
                placeholder="Search filters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-full text-sm border outline-none transition-all focus:border-ink/40"
                style={{ backgroundColor: THEME.parchment, borderColor: THEME.line, color: THEME.ink }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: THEME.inkMuted }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* FILTER CATEGORIES */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span className="text-[17px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}>
                Categories
              </span>
            </div>
            
            <div className="space-y-3 pl-1">
              {filterCategories?.map((category: FilterCategory) => {
                const filters = filtersByCategory[category.id] || [];
                if (filters.length === 0 && !searchQuery) return null;
                
                const isExpanded = expandedCategories.has(category.id) || searchQuery.length > 0;
                const displayFilters = isExpanded ? filters : filters.slice(0, 4);
                
                return (
                  <div key={category.id} className="rounded-[14px] border overflow-hidden" style={{ borderColor: THEME.line }}>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center justify-between p-3 transition-all hover:bg-parchment/50"
                      style={{ backgroundColor: THEME.parchment }}
                    >
                      <span className="text-[13px] font-medium" style={{ color: THEME.ink }}>
                        {category.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] italic" style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}>
                          {filters.length}
                        </span>
                        <ChevronDown 
                          className="w-4 h-4 transition-transform"
                          style={{ 
                            color: THEME.inkMuted,
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}
                        />
                      </div>
                    </button>
                    
                    {displayFilters.length > 0 && (
                      <div style={{ backgroundColor: THEME.cream }}>
                        {displayFilters.map((filter: string, index: number) => {
                          const isSelected = (filterState.custom_filters || []).includes(filter);
                          const stats = filterCounts[filter] || { total: 0, correct: 0, incorrect: 0 };
                          const correctPercent = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
                          
                          return (
                            <button
                              key={filter}
                              onClick={() => toggleFilter(filter)}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-all hover:bg-parchment/30"
                              style={{ 
                                borderTop: index === 0 ? `1px solid ${THEME.lineSoft}` : undefined,
                                borderBottom: index < displayFilters.length - 1 ? `1px solid ${THEME.lineSoft}` : undefined,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-4 h-4 rounded flex items-center justify-center text-[10px] border transition-all"
                                  style={{
                                    backgroundColor: isSelected ? THEME.espresso : THEME.cream,
                                    borderColor: isSelected ? THEME.espresso : THEME.line,
                                    color: isSelected ? THEME.cream : 'transparent'
                                  }}
                                >
                                  {isSelected && '✓'}
                                </span>
                                <span className="text-[12px] capitalize" style={{ color: THEME.ink }}>
                                  {filter.replace(/-/g, ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {stats.total > 0 && (
                                  <div className="flex items-center gap-1">
                                    {stats.correct > 0 && (
                                      <div 
                                        className="h-1 rounded-full"
                                        style={{ width: `${Math.max(correctPercent / 3, 3)}px`, backgroundColor: THEME.sageDeep }}
                                      />
                                    )}
                                    {stats.incorrect > 0 && (
                                      <div 
                                        className="h-1 rounded-full"
                                        style={{ width: `${Math.max((stats.incorrect / stats.total) * 30 / 3, 3)}px`, backgroundColor: THEME.blushDeep }}
                                      />
                                    )}
                                  </div>
                                )}
                                <span className="text-[11px] italic w-6 text-right" style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}>
                                  {stats.total}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Uncategorized filters */}
              {filtersByCategory['uncategorized']?.length > 0 && (
                <div className="rounded-[14px] border overflow-hidden" style={{ borderColor: THEME.line }}>
                  <div className="p-3" style={{ backgroundColor: THEME.parchment }}>
                    <span className="text-[13px] font-medium" style={{ color: THEME.ink }}>
                      Other filters
                    </span>
                  </div>
                  <div style={{ backgroundColor: THEME.cream }}>
                    {filtersByCategory['uncategorized'].map((filter: string, index: number) => {
                      const isSelected = (filterState.custom_filters || []).includes(filter);
                      const stats = filterCounts[filter] || { total: 0 };
                      
                      return (
                        <button
                          key={filter}
                          onClick={() => toggleFilter(filter)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-all hover:bg-parchment/30"
                          style={{ 
                            borderBottom: index < filtersByCategory['uncategorized'].length - 1 ? `1px solid ${THEME.lineSoft}` : undefined,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-4 h-4 rounded flex items-center justify-center text-[10px] border transition-all"
                              style={{
                                backgroundColor: isSelected ? THEME.espresso : THEME.cream,
                                borderColor: isSelected ? THEME.espresso : THEME.line,
                                color: isSelected ? THEME.cream : 'transparent'
                              }}
                            >
                              {isSelected && '✓'}
                            </span>
                            <span className="text-[12px] capitalize" style={{ color: THEME.ink }}>
                              {filter.replace(/-/g, ' ')}
                            </span>
                          </div>
                          <span className="text-[11px] italic" style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}>
                            {stats.total}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: THEME.lineSoft, backgroundColor: THEME.cream }}>
          <button
            onClick={handleApply}
            className="w-full py-3.5 rounded-full text-[15px] font-medium transition-all flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: THEME.espresso, 
              color: THEME.cream,
              fontFamily: "'Inter', sans-serif"
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Restart with {concepts?.filter((c: any) => {
              // Calculate filtered count
              let match = true;
              if ((filterState.mastery_levels?.length || 0) > 0) {
                match = filterState.mastery_levels.includes(c.mastery_data?.mastery_level || 0);
              }
              if (match && (filterState.custom_filters?.length || 0) > 0) {
                if (filterState.cascading_mode) {
                  match = filterState.custom_filters.every((f: string) => c.custom_filters?.includes(f));
                } else {
                  match = filterState.custom_filters.some((f: string) => c.custom_filters?.includes(f));
                }
              }
              return match;
            }).length} concepts
          </button>
        </div>
      </div>
    </div>
  );
};
