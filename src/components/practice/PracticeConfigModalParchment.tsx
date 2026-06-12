import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronRight, Search, BookOpen } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { getCurriculumStorageParsed } from '@/utils/curriculumStorage';
import type { QuestionFormat, PracticeConfig, FilterCategory, ConceptNode } from '@/types/conceptTypes';

interface PracticeConfigModalParchmentProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPractice: (config: PracticeConfig) => void;
  conceptCount: number;
  preselectedFormat?: string;
  preselectedFilter?: string;
  initialConceptIds?: string[];
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
  blushBg: '#F9E4DF',
  sage: '#C8D3B8',
  sageDeep: '#8FA379',
  line: '#D9CCB6',
  lineSoft: '#E8DCC4',
};

const STATUS_CONFIG = [
  { id: 'weak', label: 'weak', color: THEME.blushDeep, masteryLevel: 1 },
  { id: 'drifting', label: 'drifting', color: '#c8b89c', fsrsDue: true },
  { id: 'cold', label: 'cold', color: '#4a3a2c', masteryLevel: 0 },
  { id: 'mastered', label: 'mastered', color: THEME.sageDeep, masteryLevel: 2 },
  { id: 'any', label: 'any', color: THEME.ink, isAny: true },
];

export const PracticeConfigModalParchment: React.FC<PracticeConfigModalParchmentProps> = ({
  isOpen,
  onClose,
  onStartPractice,
  conceptCount: _conceptCount,
  preselectedFormat,
  initialConceptIds
}) => {
  const { concepts, curriculumId, setPracticeSelection } = useConceptStore();
  const [filterCategories, setFilterCategories] = useState<FilterCategory[]>([]);
  
  useEffect(() => {
    const stored = getCurriculumStorageParsed<FilterCategory[]>(curriculumId, 'filter_categories', []);
    setFilterCategories(stored);
  }, [curriculumId]);

  const [sessionSize, setSessionSize] = useState(10);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set(['any']));
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [selectedPresentations, setSelectedPresentations] = useState<Set<string>>(new Set(['any']));
  const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set(['any']));
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filterAssignments = useMemo(() => {
    return getCurriculumStorageParsed<Record<string, string>>(curriculumId, 'filter_assignments', {});
  }, [curriculumId]);

  const filtersByCategory = useMemo(() => {
    const allFilters = new Set<string>();
    concepts.forEach(c => c.custom_filters?.forEach(f => allFilters.add(f)));
    
    const grouped: Record<string, string[]> = {};
    filterCategories.forEach(cat => grouped[cat.id] = []);
    grouped['uncategorized'] = [];
    
    allFilters.forEach(filter => {
      const catId = filterAssignments[filter];
      if (catId && grouped[catId]) grouped[catId].push(filter);
      else grouped['uncategorized'].push(filter);
    });
    
    return grouped;
  }, [concepts, filterCategories, filterAssignments]);

  const getFiltersForCategoryType = (type: 'specialty' | 'system' | 'presentation' | 'facet' | 'topic'): string[] => {
    const cat = filterCategories.find(c => 
      c.name.toLowerCase().includes(type) || c.id.toLowerCase().includes(type)
    );
    if (cat) return filtersByCategory[cat.id] || [];
    return [];
  };

  const areaFilters = useMemo(() => {
    return getFiltersForCategoryType('specialty').length > 0 
      ? getFiltersForCategoryType('specialty')
      : getFiltersForCategoryType('system');
  }, [filterCategories, filtersByCategory]);

  const presentationFilters = useMemo(() => 
    getFiltersForCategoryType('presentation').length > 0 
      ? getFiltersForCategoryType('presentation')
      : ['chest-pain', 'breathlessness', 'abdominal-pain', 'palpitations', 'confusion'],
  [filterCategories, filtersByCategory]);

  const facetFilters = useMemo(() => 
    getFiltersForCategoryType('facet').length > 0 
      ? getFiltersForCategoryType('facet')
      : getFiltersForCategoryType('topic').length > 0
        ? getFiltersForCategoryType('topic')
        : ['recognition', 'investigations', 'management', 'risk-factors', 'complications', 'prognosis'],
  [filterCategories, filtersByCategory]);

  const filterPool = (pool: ConceptNode[]) => {
    if (!selectedStatuses.has('any')) {
      pool = pool.filter(c => {
        const md = c.mastery_data;
        if (selectedStatuses.has('cold') && (md?.mastery_level || 0) === 0) return true;
        if (selectedStatuses.has('weak') && md?.mastery_level === 1) return true;
        if (selectedStatuses.has('mastered') && md?.mastery_level === 2) return true;
        if (selectedStatuses.has('drifting') && md?.fsrs_due_at && new Date(md.fsrs_due_at) <= new Date()) return true;
        return false;
      });
    }
    
    if (selectedAreas.size > 0) {
      pool = pool.filter(c => c.custom_filters?.some(f => selectedAreas.has(f)));
    }
    
    if (!selectedPresentations.has('any')) {
      pool = pool.filter(c => c.custom_filters?.some(f => selectedPresentations.has(f)));
    }
    
    if (!selectedFacets.has('any')) {
      pool = pool.filter(c => c.custom_filters?.some(f => selectedFacets.has(f)));
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pool = pool.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.content?.toLowerCase().includes(q) ||
        c.custom_filters?.some(f => f.toLowerCase().includes(q))
      );
    }
    
    return pool;
  };

  const availableCount = useMemo(() => filterPool([...concepts]).length, 
    [concepts, selectedStatuses, selectedAreas, selectedPresentations, selectedFacets, searchQuery]);

  const getFilterCount = (filterValue: string) => 
    concepts.filter(c => c.custom_filters?.includes(filterValue)).length;

  const getMasteryStats = (filterValue: string) => {
    const filterConcepts = concepts.filter(c => c.custom_filters?.includes(filterValue));
    const byMastery = { 0: 0, 1: 0, 2: 0 };
    filterConcepts.forEach(c => {
      const level = c.mastery_data?.mastery_level || 0;
      byMastery[level as 0|1|2]++;
    });
    return { total: filterConcepts.length, ...byMastery };
  };

  const toggleSingle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string, isAny = false) => {
    setter(prev => {
      const newSet = new Set(prev);
      if (isAny || value === 'any') {
        return new Set(['any']);
      }
      newSet.delete('any');
      if (newSet.has(value)) newSet.delete(value);
      else newSet.add(value);
      return newSet.size === 0 ? new Set(['any']) : newSet;
    });
  };

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(area)) newSet.delete(area);
      else newSet.add(area);
      return newSet;
    });
  };

  const activeFilters = useMemo(() => {
    const filters: { axis: string; value: string; label: string }[] = [];
    
    if (!selectedStatuses.has('any')) {
      Array.from(selectedStatuses).forEach(s => {
        const cfg = STATUS_CONFIG.find(c => c.id === s);
        if (cfg) filters.push({ axis: 'status', value: s, label: cfg.label });
      });
    }
    
    Array.from(selectedAreas).forEach(a => {
      filters.push({ axis: 'area', value: a, label: a.replace(/-/g, ' ') });
    });
    
    if (!selectedPresentations.has('any')) {
      Array.from(selectedPresentations).forEach(p => {
        filters.push({ axis: 'presentation', value: p, label: p.replace(/-/g, ' ') });
      });
    }
    
    if (!selectedFacets.has('any')) {
      Array.from(selectedFacets).forEach(f => {
        filters.push({ axis: 'facet', value: f, label: f.replace(/-/g, ' ') });
      });
    }
    
    return filters;
  }, [selectedStatuses, selectedAreas, selectedPresentations, selectedFacets]);

  const removeFilter = (axis: string, value: string) => {
    if (axis === 'status') toggleSingle(setSelectedStatuses, value);
    if (axis === 'area') toggleArea(value);
    if (axis === 'presentation') toggleSingle(setSelectedPresentations, value);
    if (axis === 'facet') toggleSingle(setSelectedFacets, value);
  };

  const resetAll = () => {
    setSelectedStatuses(new Set(['any']));
    setSelectedAreas(new Set());
    setSelectedPresentations(new Set(['any']));
    setSelectedFacets(new Set(['any']));
    setSessionSize(10);
    setSearchQuery('');
  };

  const previewSentence = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${Math.min(sessionSize, availableCount)} concepts`);
    
    if (!selectedStatuses.has('any')) {
      const labels = Array.from(selectedStatuses).map(s => 
        STATUS_CONFIG.find(cfg => cfg.id === s)?.label || s
      );
      parts.push(`${labels.join(', ')} status`);
    } else {
      parts.push('any status');
    }
    
    if (selectedAreas.size > 0) {
      const labels = Array.from(selectedAreas).slice(0, 2);
      parts.push(selectedAreas.size > 2 
        ? `in ${labels.join(', ')} and ${selectedAreas.size - 2} more areas`
        : `in ${labels.join(', ')}`
      );
    } else {
      parts.push('anywhere on the map');
    }
    
    return parts.join(' — ');
  }, [sessionSize, availableCount, selectedStatuses, selectedAreas]);

  const handleStart = () => {
    const pool = filterPool([...concepts]);
    const selectedIds = initialConceptIds?.length 
      ? initialConceptIds.filter(id => pool.some(c => c.concept_id === id)).slice(0, sessionSize)
      : pool.slice(0, sessionSize).map(c => c.concept_id);
    
    setPracticeSelection(selectedIds);

    onStartPractice({
      target_formats: preselectedFormat ? [preselectedFormat as QuestionFormat] : ['ukmla_sba'],
      question_count: selectedIds.length,
      study_mode: 'custom',
    });
    
    onClose();
  };

  if (!isOpen) return null;

  const Chip = ({ 
    label, 
    count, 
    selected, 
    onClick, 
    color = THEME.blushDeep,
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
      {showDot && (
        <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: color }} />
      )}
      <span>{label}</span>
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
              Practise <em style={{ color: THEME.blushDeep, fontStyle: 'italic' }}>your way</em>
            </h1>
            <p 
              className="text-[12px]"
              style={{ 
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                color: THEME.inkMuted
              }}
            >
              Stack filters to sculpt exactly the slice you want.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetAll}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border"
              style={{ borderColor: THEME.line, color: THEME.inkMuted }}
            >
              Reset
            </button>
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
        {activeFilters.length > 0 && (
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            <span className="text-[9px] uppercase tracking-[0.2em] font-medium py-2" style={{ color: THEME.inkMuted }}>
              Stacked
            </span>
            {activeFilters.map((filter) => (
              <button
                key={`${filter.axis}-${filter.value}`}
                onClick={() => removeFilter(filter.axis, filter.value)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all"
                style={{ backgroundColor: THEME.espresso, color: THEME.cream }}
              >
                <span style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.blush }}>
                  {filter.axis}
                </span>
                <span>{filter.label}</span>
                <span className="ml-0.5 opacity-60">×</span>
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          
          {/* SIZE */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[17px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}>
                A session of
              </span>
            </div>
            <div className="flex items-center justify-between pl-1">
              <div className="flex items-center rounded-full p-1" style={{ backgroundColor: THEME.parchment, border: `1px solid ${THEME.line}` }}>
                <button
                  onClick={() => setSessionSize(Math.max(5, sessionSize - 1))}
                  disabled={sessionSize <= 5}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-light disabled:opacity-30 hover:bg-cream/50 transition-all"
                  style={{ color: THEME.ink }}
                >
                  −
                </button>
                <div className="min-w-[80px] text-center px-2">
                  <span className="text-lg font-medium" style={{ color: THEME.ink, fontFamily: "'Fraunces', serif" }}>
                    {sessionSize}
                  </span>
                  <span className="text-xs italic ml-1" style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}>
                    concepts
                  </span>
                </div>
                <button
                  onClick={() => setSessionSize(Math.min(30, sessionSize + 1))}
                  disabled={sessionSize >= 30}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-light disabled:opacity-30 hover:bg-cream/50 transition-all"
                  style={{ color: THEME.ink }}
                >
                  +
                </button>
              </div>
              <span className="text-xs italic" style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}>
                ≈ {Math.round(sessionSize * 2)} min
              </span>
            </div>
          </div>

          {/* STATUS */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span className="text-[17px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}>
                that are
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pl-1">
              {STATUS_CONFIG.map((status) => {
                const isSelected = selectedStatuses.has(status.id);
                const count = status.isAny 
                  ? concepts.length 
                  : concepts.filter(c => {
                      if (status.masteryLevel !== undefined) return c.mastery_data?.mastery_level === status.masteryLevel;
                      if (status.fsrsDue) return c.mastery_data?.fsrs_due_at && new Date(c.mastery_data.fsrs_due_at) <= new Date();
                      return false;
                    }).length;
                
                return (
                  <Chip
                    key={status.id}
                    label={status.label}
                    count={count}
                    selected={isSelected}
                    onClick={() => toggleSingle(setSelectedStatuses, status.id, status.isAny)}
                    color={status.color}
                  />
                );
              })}
            </div>
          </div>

          {/* AREA */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span className="text-[17px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}>
                in
              </span>
            </div>
            <div className="pl-1">
              <button
                onClick={() => setAreaDropdownOpen(!areaDropdownOpen)}
                className="w-full flex items-center justify-between p-3 rounded-[14px] border text-left transition-all hover:border-ink/30"
                style={{ backgroundColor: THEME.cream, borderColor: THEME.line }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-[0.18em] font-medium" style={{ color: THEME.inkMuted }}>
                    Area of the map
                  </span>
                  <span className="text-sm" style={{ fontFamily: "'Fraunces', serif", color: THEME.ink }}>
                    {selectedAreas.size === 0 ? (
                      <em style={{ color: THEME.blushDeep }}>anywhere</em>
                    ) : selectedAreas.size === 1 ? (
                      <em style={{ color: THEME.blushDeep }}>{Array.from(selectedAreas)[0].replace(/-/g, ' ')}</em>
                    ) : (
                      <><em style={{ color: THEME.blushDeep }}>{selectedAreas.size}</em> areas</>
                    )} on the map
                  </span>
                </div>
                <ChevronRight 
                  className="w-5 h-5 transition-transform"
                  style={{ color: THEME.inkMuted, transform: areaDropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
              </button>

              {areaDropdownOpen && (
                <div className="mt-2 rounded-[14px] overflow-hidden border" style={{ backgroundColor: THEME.parchment, borderColor: THEME.line }}>
                  {(areaFilters.length > 0 ? areaFilters : ['cardiology', 'respiratory', 'endocrinology', 'neurology']).map((area) => {
                    const isSelected = selectedAreas.has(area);
                    const stats = getMasteryStats(area);
                    const total = stats.total || getFilterCount(area);
                    
                    return (
                      <button
                        key={area}
                        onClick={() => toggleArea(area)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 border-b last:border-b-0 transition-all hover:bg-cream/50 text-left"
                        style={{ borderColor: THEME.lineSoft }}
                      >
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
                        <span className="flex-1 text-[13px] capitalize" style={{ color: THEME.ink }}>
                          {area.replace(/-/g, ' ')}
                        </span>
                        {total > 0 && (
                          <div className="flex items-center gap-1.5">
                            {stats[2] > 0 && (
                              <div className="h-1.5 rounded-full" style={{ width: `${(stats[2]/total)*30}px`, backgroundColor: THEME.sageDeep }} />
                            )}
                            {stats[1] > 0 && (
                              <div className="h-1.5 rounded-full" style={{ width: `${(stats[1]/total)*20}px`, backgroundColor: THEME.blushDeep }} />
                            )}
                            <span className="text-[11px] italic w-6 text-right" style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}>
                              {total}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-2.5 text-center">
                <button className="text-xs italic transition-colors hover:opacity-70" style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}>
                  narrow further by condition →
                </button>
              </div>
            </div>
          </div>

          {/* PRESENTATIONS */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span className="text-[17px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}>
                presenting as
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pl-1">
              <Chip label="any" count={concepts.length} selected={selectedPresentations.has('any')} onClick={() => toggleSingle(setSelectedPresentations, 'any', true)} showDot={false} />
              {presentationFilters.slice(0, 8).map((pres) => (
                <Chip
                  key={pres}
                  label={pres.replace(/-/g, ' ')}
                  count={getFilterCount(pres)}
                  selected={selectedPresentations.has(pres)}
                  onClick={() => toggleSingle(setSelectedPresentations, pres)}
                  showDot={false}
                />
              ))}
            </div>
          </div>

          {/* FACETS */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span className="text-[17px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}>
                about
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pl-1">
              <Chip label="any" count={concepts.length} selected={selectedFacets.has('any')} onClick={() => toggleSingle(setSelectedFacets, 'any', true)} showDot={false} />
              {facetFilters.slice(0, 8).map((facet) => (
                <Chip
                  key={facet}
                  label={facet.replace(/-/g, ' ')}
                  count={getFilterCount(facet)}
                  selected={selectedFacets.has(facet)}
                  onClick={() => toggleSingle(setSelectedFacets, facet)}
                  showDot={false}
                />
              ))}
            </div>
          </div>

          {/* SEARCH */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span className="text-[17px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}>
                or jump to
              </span>
            </div>
            <div className="relative pl-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: THEME.inkMuted }} />
              <input
                type="text"
                placeholder="A concept, condition, or presentation…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm border outline-none focus:border-ink/40 transition-all"
                style={{ backgroundColor: THEME.parchment, borderColor: THEME.line, color: THEME.ink }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t" style={{ borderColor: THEME.lineSoft, backgroundColor: THEME.cream }}>
          <p 
            className="text-sm text-center mb-3"
            style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}
          >
            You'll practise <strong style={{ color: THEME.ink }}>{Math.min(sessionSize, availableCount)} concepts</strong> — <em>{previewSentence.split(' — ').slice(1).join(' — ')}</em>
          </p>
          
          <button
            onClick={handleStart}
            disabled={availableCount === 0}
            className="w-full py-3.5 rounded-full text-[15px] font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ 
              backgroundColor: THEME.espresso, 
              color: THEME.cream,
              fontFamily: "'Inter', sans-serif"
            }}
          >
            <BookOpen className="w-4 h-4" />
            Start Practice
          </button>
        </div>
      </div>
    </div>
  );
};
