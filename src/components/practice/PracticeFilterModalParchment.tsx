import React, { useState, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';

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
  blushSoft: '#FBEDE7',
  blushBg: '#F9E4DF',
  sage: '#C8D3B8',
  sageDeep: '#8FA379',
  sageBg: '#E2EAD6',
  line: '#D9CCB6',
  lineSoft: '#E8DCC4',
};

// Status chips config (matches HTML: weak, drifting, cold, mastered, any)
const STATUS_CHIPS = [
  { id: 'weak', label: 'weak', count: 420, color: THEME.blushDeep },
  { id: 'drifting', label: 'drifting', count: 186, color: '#c8b89c' },
  { id: 'cold', label: 'cold', count: 4259, color: '#4a3a2c' },
  { id: 'mastered', label: 'mastered', count: 1427, color: THEME.sageDeep },
  { id: 'any', label: 'any', count: 7099, color: THEME.ink, isDefault: true },
];

// Areas config with mini-bar segments (matches HTML)
const AREAS = [
  { id: 'cardio', name: 'Cardiology', count: 1265, segments: { mastered: 48, weak: 10, attempted: 30, cold: 12 } },
  { id: 'resp', name: 'Respiratory', count: 948, segments: { mastered: 45, weak: 12, attempted: 28, cold: 15 } },
  { id: 'gi', name: 'Gastroenterology', count: 813, segments: { mastered: 27, weak: 10, attempted: 38, cold: 25 } },
  { id: 'renal', name: 'Renal', count: 562, segments: { mastered: 10, weak: 8, attempted: 32, cold: 50 } },
  { id: 'psych', name: 'Psychiatry', count: 524, segments: { mastered: 9, weak: 18, attempted: 28, cold: 45 } },
  { id: 'neuro', name: 'Neurology', count: 887, segments: { mastered: 20, weak: 12, attempted: 40, cold: 28 } },
  { id: 'paeds', name: 'Paediatrics', count: 643, segments: { mastered: 15, weak: 10, attempted: 35, cold: 40 } },
];

// Presentation chips (matches HTML)
const PRESENTATIONS = [
  { id: 'chest_pain', label: 'chest pain', count: 284 },
  { id: 'breathlessness', label: 'breathlessness', count: 312 },
  { id: 'abdo_pain', label: 'abdominal pain', count: 267 },
  { id: 'headache', label: 'headache', count: 183 },
  { id: 'palpitations', label: 'palpitations', count: 92 },
  { id: 'confusion', label: 'confusion', count: 148 },
  { id: 'weight_loss', label: 'weight loss', count: 104 },
  { id: 'any', label: 'any', count: 7099, isDefault: true },
];

// Facet chips (matches HTML)
const FACETS = [
  { id: 'recognition', label: 'recognition', count: 1420 },
  { id: 'investigations', label: 'investigations', count: 1240 },
  { id: 'management', label: 'management', count: 1582 },
  { id: 'risk_factors', label: 'risk factors', count: 860 },
  { id: 'complications', label: 'complications', count: 774 },
  { id: 'prognosis', label: 'prognosis', count: 421 },
  { id: 'any', label: 'any', count: 7099, isDefault: true },
];

export const PracticeFilterModalParchment: React.FC<PracticeFilterModalParchmentProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
}) => {
  const { concepts } = useConceptStore();
  
  // Session size state
  const [sessionSize, setSessionSize] = useState(10);
  
  // Selected filters
  const [selectedStatus, setSelectedStatus] = useState<Set<string>>(new Set(['any']));
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [selectedPresentations, setSelectedPresentations] = useState<Set<string>>(new Set(['any']));
  const [selectedFacets, setSelectedFacets] = useState<Set<string>>(new Set(['any']));
  const [searchQuery, setSearchQuery] = useState('');
  const [areaListOpen, setAreaListOpen] = useState(false);

  // Calculate available concepts based on filters
  const availableCount = useMemo(() => {
    let count = 7099;
    
    if (!selectedStatus.has('any')) {
      const sum = [...selectedStatus].reduce((acc, s) => {
        const found = STATUS_CHIPS.find(st => st.id === s);
        return acc + (found?.count || 0);
      }, 0);
      count = Math.min(count, sum);
    }
    
    if (selectedAreas.size > 0) {
      const sum = [...selectedAreas].reduce((acc, a) => {
        const found = AREAS.find(ar => ar.id === a);
        return acc + (found?.count || 0);
      }, 0);
      count = Math.round(count * (sum / 7099));
    }
    
    if (!selectedPresentations.has('any')) {
      count = Math.round(count * 0.18 * selectedPresentations.size);
    }
    
    if (!selectedFacets.has('any')) {
      count = Math.round(count * 0.16 * selectedFacets.size);
    }
    
    return Math.max(0, Math.min(count, concepts?.length || count));
  }, [selectedStatus, selectedAreas, selectedPresentations, selectedFacets, concepts?.length]);

  // Toggle chip helper
  const toggleChip = (set: Set<string>, value: string, setFn: (s: Set<string>) => void, hasAny: boolean = true) => {
    const next = new Set(set);
    if (value === 'any') {
      setFn(new Set(['any']));
      return;
    }
    if (next.has(value)) {
      next.delete(value);
      if (next.size === 0 && hasAny) next.add('any');
    } else {
      next.delete('any');
      next.add(value);
    }
    setFn(next);
  };

  // Toggle area
  const toggleArea = (areaId: string) => {
    const next = new Set(selectedAreas);
    if (next.has(areaId)) next.delete(areaId);
    else next.add(areaId);
    setSelectedAreas(next);
  };

  // Reset all
  const resetAll = () => {
    setSessionSize(10);
    setSelectedStatus(new Set(['any']));
    setSelectedAreas(new Set());
    setSelectedPresentations(new Set(['any']));
    setSelectedFacets(new Set(['any']));
    setSearchQuery('');
  };

  // Generate preview sentence
  const previewSentence = useMemo(() => {
    const sizeText = `<strong>${sessionSize} concepts</strong>`;
    
    let statusText = '<em>any</em> status';
    if (!selectedStatus.has('any')) {
      const statuses = [...selectedStatus].map(s => `<em>${s}</em>`);
      statusText = statuses.join(', ');
    }
    
    let areaText = '<em>anywhere</em> on the map';
    if (selectedAreas.size > 0) {
      const areaNames = [...selectedAreas].map(a => {
        const found = AREAS.find(ar => ar.id === a);
        return `<em>${found?.name.toLowerCase() || a}</em>`;
      });
      areaText = areaNames.join(', ');
    }
    
    return `${sizeText} — ${statusText}, ${areaText}.`;
  }, [sessionSize, selectedStatus, selectedAreas]);

  // Active filters for the stacked bar
  const activeFilters = useMemo(() => {
    const filters: { type: string; value: string; label: string }[] = [];
    if (!selectedStatus.has('any')) {
      [...selectedStatus].forEach(s => {
        const found = STATUS_CHIPS.find(st => st.id === s);
        if (found) filters.push({ type: 'status', value: s, label: found.label });
      });
    }
    if (selectedAreas.size > 0) {
      [...selectedAreas].forEach(a => {
        const found = AREAS.find(ar => ar.id === a);
        if (found) filters.push({ type: 'area', value: a, label: found.name });
      });
    }
    if (!selectedPresentations.has('any')) {
      [...selectedPresentations].forEach(p => {
        const found = PRESENTATIONS.find(pr => pr.id === p);
        if (found) filters.push({ type: 'presentation', value: p, label: found.label });
      });
    }
    if (!selectedFacets.has('any')) {
      [...selectedFacets].forEach(f => {
        const found = FACETS.find(fa => fa.id === f);
        if (found) filters.push({ type: 'facet', value: f, label: found.label });
      });
    }
    return filters;
  }, [selectedStatus, selectedAreas, selectedPresentations, selectedFacets]);

  // Remove active filter
  const removeFilter = (type: string, value: string) => {
    if (type === 'status') toggleChip(selectedStatus, value, setSelectedStatus);
    else if (type === 'area') toggleArea(value);
    else if (type === 'presentation') toggleChip(selectedPresentations, value, setSelectedPresentations);
    else if (type === 'facet') toggleChip(selectedFacets, value, setSelectedFacets);
  };

  const handleBegin = () => {
    onApplyFilters?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[100] p-0 md:p-4"
      style={{ backgroundColor: 'rgba(31, 20, 12, 0.4)' }}
      onClick={onClose}
    >
      <div 
        className="w-full h-full md:h-auto md:max-w-[460px] flex flex-col overflow-hidden shadow-2xl"
        style={{ 
          backgroundColor: THEME.cream,
          borderRadius: '38px',
          maxHeight: '95vh',
          fontFamily: "'Inter', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet Grabber */}
        <div className="flex justify-center pt-3">
          <div style={{ width: '38px', height: '4px', backgroundColor: THEME.line, borderRadius: '2px' }} />
        </div>
        
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 
              className="text-[28px] leading-[1.05] mb-1.5"
              style={{ 
                fontFamily: "'Fraunces', serif",
                fontWeight: 300,
                color: THEME.ink,
                letterSpacing: '-0.025em'
              }}
            >
              Practise <em style={{ color: THEME.blushDeep, fontStyle: 'italic' }}>your way</em>
            </h1>
            <p 
              className="text-[13px]"
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
            {activeFilters.length > 0 && (
              <button
                onClick={resetAll}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border"
                style={{ borderColor: THEME.line, color: THEME.inkMuted }}
              >
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all border"
              style={{ borderColor: THEME.line, color: THEME.inkMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Filters Bar */}
        {activeFilters.length > 0 && (
          <div className="px-6 pb-4 flex flex-wrap gap-1.5 items-center">
            <span 
              className="text-[9.5px] uppercase tracking-[0.22em] font-medium mr-1"
              style={{ color: THEME.inkMuted }}
            >
              Stacked
            </span>
            {activeFilters.map((filter) => (
              <button
                key={`${filter.type}-${filter.value}`}
                onClick={() => removeFilter(filter.type, filter.value)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] transition-all"
                style={{ backgroundColor: THEME.espresso, color: THEME.cream }}
              >
                <span 
                  className="text-[11px]"
                  style={{ 
                    fontFamily: "'Fraunces', serif",
                    fontStyle: 'italic',
                    color: THEME.blush 
                  }}
                >
                  {filter.type}
                </span>
                <span>{filter.label}</span>
                <span 
                  className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] ml-0.5"
                  style={{ backgroundColor: 'rgba(245,239,227,0.18)' }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          
          {/* SIZE BLOCK */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span 
                className="text-[18px]"
                style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}
              >
                A session of
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pl-1">
              <div 
                className="flex items-center rounded-full p-1"
                style={{ backgroundColor: THEME.parchment, border: `1px solid ${THEME.line}` }}
              >
                <button
                  onClick={() => setSessionSize(Math.max(5, sessionSize - 5))}
                  disabled={sessionSize <= 5}
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[17px] font-light transition-all disabled:opacity-35"
                  style={{ color: THEME.ink }}
                >
                  −
                </button>
                <span 
                  className="min-w-[88px] text-center text-[19px]"
                  style={{ 
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 400,
                    color: THEME.ink,
                    letterSpacing: '-0.02em'
                  }}
                >
                  {sessionSize}
                  <span 
                    className="text-[12.5px] italic ml-1"
                    style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}
                  >
                    concepts
                  </span>
                </span>
                <button
                  onClick={() => setSessionSize(Math.min(50, sessionSize + 5))}
                  disabled={sessionSize >= 50}
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[17px] font-light transition-all disabled:opacity-35"
                  style={{ color: THEME.ink }}
                >
                  +
                </button>
              </div>
              <span 
                className="text-[12.5px] italic text-right"
                style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}
              >
                ≈ {Math.round(sessionSize * 2)} min
              </span>
            </div>
          </div>

          {/* STATUS BLOCK */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span 
                className="text-[18px]"
                style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}
              >
                that are
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pl-1">
              {STATUS_CHIPS.map((chip) => {
                const isSelected = selectedStatus.has(chip.id);
                return (
                  <button
                    key={chip.id}
                    onClick={() => toggleChip(selectedStatus, chip.id, setSelectedStatus)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium transition-all border"
                    style={{
                      backgroundColor: isSelected ? THEME.espresso : THEME.cream,
                      color: isSelected ? THEME.cream : THEME.ink,
                      borderColor: isSelected ? THEME.espresso : THEME.line,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span 
                      className="w-[7px] h-[7px] rounded-full"
                      style={{ backgroundColor: chip.color }}
                    />
                    <span className="capitalize">{chip.label}</span>
                    <span 
                      className="text-[11.5px] italic ml-0.5"
                      style={{ 
                        fontFamily: "'Fraunces', serif",
                        color: isSelected ? THEME.blush : THEME.inkMuted
                      }}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AREA BLOCK */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span 
                className="text-[18px]"
                style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}
              >
                in
              </span>
            </div>
            <div className="pl-1">
              {/* Area Current */}
              <button
                onClick={() => setAreaListOpen(!areaListOpen)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-[14px] text-left transition-all"
                style={{ 
                  backgroundColor: THEME.cream, 
                  border: `1px solid ${THEME.line}` 
                }}
              >
                <div className="flex flex-col gap-0.5 flex-1">
                  <span 
                    className="text-[9.5px] uppercase tracking-[0.2em] font-medium"
                    style={{ color: THEME.inkMuted }}
                  >
                    Area of the map
                  </span>
                  <span 
                    className="text-[15px]"
                    style={{ fontFamily: "'Fraunces', serif", color: THEME.ink }}
                  >
                    {selectedAreas.size === 0 ? (
                      <em style={{ color: THEME.blushDeep }}>anywhere</em>
                    ) : (
                      [...selectedAreas].map(a => {
                        const found = AREAS.find(ar => ar.id === a);
                        return found?.name;
                      }).join(', ')
                    )} on the map
                  </span>
                </div>
                <ChevronDown 
                  className="w-4 h-4 transition-transform"
                  style={{ 
                    color: THEME.inkMuted,
                    transform: areaListOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                />
              </button>

              {/* Area List */}
              {areaListOpen && (
                <div 
                  className="mt-2 rounded-[14px] overflow-hidden"
                  style={{ 
                    backgroundColor: THEME.parchment, 
                    border: `1px solid ${THEME.line}` 
                  }}
                >
                  {AREAS.map((area) => {
                    const isSelected = selectedAreas.has(area.id);
                    return (
                      <button
                        key={area.id}
                        onClick={() => toggleArea(area.id)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-all border-b last:border-b-0"
                        style={{ 
                          borderColor: THEME.lineSoft,
                          backgroundColor: isSelected ? 'rgba(250,245,236,0.5)' : 'transparent'
                        }}
                      >
                        <span 
                          className="w-[17px] h-[17px] rounded flex items-center justify-center text-[10px] border transition-all"
                          style={{
                            backgroundColor: isSelected ? THEME.espresso : THEME.cream,
                            borderColor: isSelected ? THEME.espresso : THEME.line,
                            color: isSelected ? THEME.cream : 'transparent'
                          }}
                        >
                          {isSelected && '✓'}
                        </span>
                        <span className="text-[13px] flex-1" style={{ color: THEME.ink }}>
                          {area.name}
                        </span>
                        {/* Mini bar */}
                        <div 
                          className="w-11 h-1 rounded-sm overflow-hidden flex"
                          style={{ backgroundColor: THEME.lineSoft }}
                        >
                          <span 
                            className="h-full"
                            style={{ width: `${area.segments.mastered}%`, backgroundColor: THEME.sageDeep }}
                          />
                          <span 
                            className="h-full"
                            style={{ width: `${area.segments.weak}%`, backgroundColor: THEME.blushDeep }}
                          />
                          <span 
                            className="h-full"
                            style={{ width: `${area.segments.attempted}%`, backgroundColor: '#c8b89c' }}
                          />
                          <span 
                            className="h-full"
                            style={{ width: `${area.segments.cold}%`, backgroundColor: '#4a3a2c' }}
                          />
                        </div>
                        <span 
                          className="text-[12px] italic min-w-[42px] text-right"
                          style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}
                        >
                          {area.count.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Narrow Further */}
              <div className="mt-2.5 text-center">
                <button
                  className="text-[13px] transition-all hover:text-ink"
                  style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}
                >
                  narrow further by condition
                  <span className="not-italic ml-1">→</span>
                </button>
              </div>
            </div>
          </div>

          {/* PRESENTATION BLOCK */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span 
                className="text-[18px]"
                style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}
              >
                presenting as
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pl-1">
              {PRESENTATIONS.map((chip) => {
                const isSelected = selectedPresentations.has(chip.id);
                return (
                  <button
                    key={chip.id}
                    onClick={() => toggleChip(selectedPresentations, chip.id, setSelectedPresentations)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium transition-all border"
                    style={{
                      backgroundColor: isSelected ? THEME.espresso : THEME.cream,
                      color: isSelected ? THEME.cream : THEME.ink,
                      borderColor: isSelected ? THEME.espresso : THEME.line,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{chip.label}</span>
                    <span 
                      className="text-[11.5px] italic ml-0.5"
                      style={{ 
                        fontFamily: "'Fraunces', serif",
                        color: isSelected ? THEME.blush : THEME.inkMuted
                      }}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FACET BLOCK */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span 
                className="text-[18px]"
                style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}
              >
                about
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pl-1">
              {FACETS.map((chip) => {
                const isSelected = selectedFacets.has(chip.id);
                return (
                  <button
                    key={chip.id}
                    onClick={() => toggleChip(selectedFacets, chip.id, setSelectedFacets)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium transition-all border"
                    style={{
                      backgroundColor: isSelected ? THEME.espresso : THEME.cream,
                      color: isSelected ? THEME.cream : THEME.ink,
                      borderColor: isSelected ? THEME.espresso : THEME.line,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{chip.label}</span>
                    <span 
                      className="text-[11.5px] italic ml-0.5"
                      style={{ 
                        fontFamily: "'Fraunces', serif",
                        color: isSelected ? THEME.blush : THEME.inkMuted
                      }}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEARCH BLOCK */}
          <div className="py-4 border-t" style={{ borderColor: THEME.lineSoft }}>
            <div className="mb-3">
              <span 
                className="text-[18px]"
                style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: THEME.inkMuted }}
              >
                or jump to
              </span>
            </div>
            <div className="relative pl-1">
              <span 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px]"
                style={{ color: THEME.inkMuted }}
              >
                ⌕
              </span>
              <input
                type="text"
                placeholder="A concept, condition, or presentation…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-full text-[13px] border outline-none transition-all"
                style={{ 
                  backgroundColor: THEME.parchment, 
                  borderColor: THEME.line, 
                  color: THEME.ink 
                }}
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div 
          className="px-6 pt-3 pb-5"
          style={{ 
            background: `linear-gradient(to top, ${THEME.cream} 70%, rgba(250,245,236,0))` 
          }}
        >
          {/* Preview Box */}
          <div 
            className="relative rounded-2xl p-4 mb-2.5"
            style={{ backgroundColor: THEME.blushSoft }}
          >
            <div 
              className="absolute left-0 top-3.5 bottom-3.5 w-0.5 rounded-full"
              style={{ backgroundColor: THEME.blushDeep }}
            />
            <div 
              className="text-[9.5px] uppercase tracking-[0.22em] font-medium mb-1.5"
              style={{ color: THEME.blushDeep }}
            >
              You'll practise
            </div>
            <div 
              className="text-[14.5px] leading-[1.5]"
              style={{ 
                fontFamily: "'Fraunces', serif",
                fontWeight: 300,
                color: THEME.ink
              }}
              dangerouslySetInnerHTML={{ __html: previewSentence }}
            />
          </div>

          {/* Warning note if no concepts */}
          {availableCount === 0 && (
            <div 
              className="text-[12.5px] italic text-center mb-2"
              style={{ fontFamily: "'Fraunces', serif", color: THEME.inkMuted }}
            >
              No concepts match your filters. <em style={{ color: THEME.blushDeep }}>Try removing some</em>.
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleBegin}
            disabled={availableCount === 0}
            className="w-full py-4 rounded-full text-[14px] font-medium transition-all flex items-center justify-center gap-3 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: availableCount === 0 ? THEME.inkMuted : THEME.espresso, 
              color: THEME.cream,
              fontFamily: "'Inter', sans-serif"
            }}
          >
            <span>Begin</span>
            <span className="text-[14.5px] italic" style={{ fontFamily: "'Fraunces', serif", color: THEME.blush }}>
              {Math.min(availableCount, sessionSize)} concepts
            </span>
            <span className="transition-transform">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
