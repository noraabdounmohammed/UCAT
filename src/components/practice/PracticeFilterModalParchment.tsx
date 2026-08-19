import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import type { ConceptNode, FilterCategory } from '@/types/conceptTypes';

export interface FilterState {
  size: number;
  statuses: string[];
  areas: string[];
  conditions: string[];
  presentations: string[];
  facets: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters?: (filters: FilterState) => void;
}

const T = {
  parchment: '#F4ECDF', cream: '#FAF5EC', espresso: '#1F140C', ink: '#2A1E16',
  inkMuted: '#8A7560', blush: '#F2C9C1', blushDeep: '#E5A89D', blushSoft: '#FBEDE7',
  sageDeep: '#8FA379', line: '#D9CCB6', lineSoft: '#E8DCC4',
};

const getStorage = <T,>(cid: string, key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(`${cid}_${key}`) || localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const labelFor = (id: string) => id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const hasAny = (values: Set<string>) => values.has('any');
const matchesAnyTag = (concept: ConceptNode, values: Set<string>) =>
  values.size === 0 || hasAny(values) || [...values].some(value => concept.custom_filters?.includes(value));

const matchesStatus = (concept: ConceptNode, values: Set<string>) => {
  if (hasAny(values)) return true;
  const md = concept.mastery_data || ({} as any);
  return [...values].some(status =>
    (status === 'mastered' && md.mastery_level === 2) ||
    (status === 'weak' && md.mastery_level === 1) ||
    (status === 'cold' && !md.attempts && !md.mastery_level) ||
    (status === 'drifting' && !!md.attempts && !md.mastery_level)
  );
};

const countStatus = (concepts: ConceptNode[], status: string) => {
  if (status === 'any') return concepts.length;
  return concepts.filter(concept => matchesStatus(concept, new Set([status]))).length;
};

const calcSegments = (concepts: ConceptNode[], filter: string) => {
  const matching = concepts.filter(c => c.custom_filters?.includes(filter));
  const total = matching.length;
  if (!total) return { m: 0, w: 0, a: 0, c: 0 };
  return {
    m: Math.round((matching.filter(c => c.mastery_data?.mastery_level === 2).length / total) * 100),
    w: Math.round((matching.filter(c => c.mastery_data?.mastery_level === 1).length / total) * 100),
    a: Math.round((matching.filter(c => c.mastery_data?.attempts && !c.mastery_data?.mastery_level).length / total) * 100),
    c: Math.round((matching.filter(c => !c.mastery_data?.attempts && !c.mastery_data?.mastery_level).length / total) * 100),
  };
};

export const PracticeFilterModalParchment: React.FC<Props> = ({ isOpen, onClose, onApplyFilters }) => {
  const { concepts = [], curriculumId, setPracticeSelection } = useConceptStore();
  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [size, setSize] = useState(10);
  const [sStatus, setSStatus] = useState<Set<string>>(new Set(['any']));
  const [sAreas, setSAreas] = useState<Set<string>>(new Set());
  const [sConditions, setSConditions] = useState<Set<string>>(new Set(['any']));
  const [sPres, setSPres] = useState<Set<string>>(new Set(['any']));
  const [sFacets, setSFacets] = useState<Set<string>>(new Set(['any']));
  const [conditionSearch, setConditionSearch] = useState('');
  const [presentationSearch, setPresentationSearch] = useState('');
  const [conditionExpanded, setConditionExpanded] = useState(false);
  const [presentationExpanded, setPresentationExpanded] = useState(false);
  const [facetExpanded, setFacetExpanded] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  const cid = curriculumId || 'default';
  useEffect(() => setCategories(getStorage(cid, 'filter_categories', [])), [cid]);
  const assignments = useMemo<Record<string, string>>(() => getStorage(cid, 'filter_assignments', {}), [cid]);

  const categoryFor = (needle: string) => categories.find(category =>
    category.name.toLowerCase().includes(needle) || category.id.toLowerCase().includes(needle)
  );

  const tagsByCategory = useMemo(() => {
    const result: Record<string, string[]> = {};
    categories.forEach(category => { result[category.id] = []; });
    concepts.forEach(concept => concept.custom_filters?.forEach(tag => {
      const categoryId = assignments[tag];
      if (categoryId && result[categoryId] && !result[categoryId].includes(tag)) result[categoryId].push(tag);
    }));
    Object.values(result).forEach(tags => tags.sort((a, b) => labelFor(a).localeCompare(labelFor(b))));
    return result;
  }, [concepts, categories, assignments]);

  const specialtyCategory = categoryFor('specialty') || categoryFor('system');
  const conditionCategory = categoryFor('condition');
  const presentationCategory = categoryFor('presentation');
  const facetCategory = categoryFor('other') || categoryFor('skill') || categoryFor('facet') || categoryFor('topic');

  const specialtyIds = specialtyCategory ? tagsByCategory[specialtyCategory.id] || [] : [];
  const conditionIds = conditionCategory ? tagsByCategory[conditionCategory.id] || [] : [];
  const presentationIds = presentationCategory ? tagsByCategory[presentationCategory.id] || [] : [];
  const facetIds = facetCategory ? tagsByCategory[facetCategory.id] || [] : [];

  // Cascade rule: OR within one dimension, AND between dimensions.
  const statusPool = useMemo(() => concepts.filter(c => matchesStatus(c, sStatus)), [concepts, sStatus]);
  const specialtyPool = useMemo(() => statusPool.filter(c => matchesAnyTag(c, sAreas)), [statusPool, sAreas]);
  const conditionPool = useMemo(() => specialtyPool.filter(c => matchesAnyTag(c, sConditions)), [specialtyPool, sConditions]);
  const presentationPool = useMemo(() => conditionPool.filter(c => matchesAnyTag(c, sPres)), [conditionPool, sPres]);
  const filteredPool = useMemo(() => presentationPool.filter(c => matchesAnyTag(c, sFacets)), [presentationPool, sFacets]);

  const areas = useMemo(() => specialtyIds.map(id => ({
    id,
    name: labelFor(id),
    count: statusPool.filter(c => c.custom_filters?.includes(id)).length,
    seg: calcSegments(statusPool, id),
  })).filter(option => option.count > 0 || sAreas.has(option.id)), [specialtyIds, statusPool, sAreas]);

  const conditions = useMemo(() => conditionIds.map(id => ({
    id,
    label: labelFor(id),
    count: specialtyPool.filter(c => c.custom_filters?.includes(id)).length,
  })).filter(option => option.count > 0 || sConditions.has(option.id)), [conditionIds, specialtyPool, sConditions]);

  const presentations = useMemo(() => presentationIds.map(id => ({
    id,
    label: labelFor(id),
    count: conditionPool.filter(c => c.custom_filters?.includes(id)).length,
  })).filter(option => option.count > 0 || sPres.has(option.id)), [presentationIds, conditionPool, sPres]);

  const facets = useMemo(() => facetIds.map(id => ({
    id,
    label: labelFor(id),
    count: presentationPool.filter(c => c.custom_filters?.includes(id)).length,
  })).filter(option => option.count > 0 || sFacets.has(option.id)), [facetIds, presentationPool, sFacets]);

  // If an upstream choice makes an old downstream choice impossible, remove it automatically.
  useEffect(() => {
    if (hasAny(sConditions)) return;
    const valid = new Set(conditions.filter(o => o.count > 0).map(o => o.id));
    const next = new Set([...sConditions].filter(id => valid.has(id)));
    if (next.size !== sConditions.size) setSConditions(next.size ? next : new Set(['any']));
  }, [conditions, sConditions]);

  useEffect(() => {
    if (hasAny(sPres)) return;
    const valid = new Set(presentations.filter(o => o.count > 0).map(o => o.id));
    const next = new Set([...sPres].filter(id => valid.has(id)));
    if (next.size !== sPres.size) setSPres(next.size ? next : new Set(['any']));
  }, [presentations, sPres]);

  useEffect(() => {
    if (hasAny(sFacets)) return;
    const valid = new Set(facets.filter(o => o.count > 0).map(o => o.id));
    const next = new Set([...sFacets].filter(id => valid.has(id)));
    if (next.size !== sFacets.size) setSFacets(next.size ? next : new Set(['any']));
  }, [facets, sFacets]);

  const statusChips = useMemo(() => [
    { id: 'weak', label: 'weak', count: countStatus(concepts, 'weak'), color: T.blushDeep },
    { id: 'drifting', label: 'drifting', count: countStatus(concepts, 'drifting'), color: '#c8b89c' },
    { id: 'cold', label: 'cold', count: countStatus(concepts, 'cold'), color: '#4a3a2c' },
    { id: 'mastered', label: 'mastered', count: countStatus(concepts, 'mastered'), color: T.sageDeep },
    { id: 'any', label: 'any', count: concepts.length, color: T.ink },
  ], [concepts]);

  const toggle = (current: Set<string>, value: string, setter: (next: Set<string>) => void, useAny = true) => {
    if (value === 'any') { setter(new Set(['any'])); return; }
    const next = new Set(current);
    next.delete('any');
    next.has(value) ? next.delete(value) : next.add(value);
    if (!next.size && useAny) next.add('any');
    setter(next);
  };

  const toggleArea = (id: string) => toggle(sAreas, id, setSAreas, false);
  const reset = () => {
    setSize(10);
    setSStatus(new Set(['any']));
    setSAreas(new Set());
    setSConditions(new Set(['any']));
    setSPres(new Set(['any']));
    setSFacets(new Set(['any']));
    setConditionSearch('');
    setPresentationSearch('');
    setConditionExpanded(false);
    setPresentationExpanded(false);
    setFacetExpanded(false);
  };

  const active = useMemo(() => {
    const result: { type: string; value: string; label: string }[] = [];
    if (!hasAny(sStatus)) [...sStatus].forEach(value => result.push({ type: 'status', value, label: value }));
    [...sAreas].forEach(value => result.push({ type: 'area', value, label: labelFor(value) }));
    if (!hasAny(sConditions)) [...sConditions].forEach(value => result.push({ type: 'condition', value, label: labelFor(value) }));
    if (!hasAny(sPres)) [...sPres].forEach(value => result.push({ type: 'presentation', value, label: labelFor(value) }));
    if (!hasAny(sFacets)) [...sFacets].forEach(value => result.push({ type: 'about', value, label: labelFor(value) }));
    return result;
  }, [sStatus, sAreas, sConditions, sPres, sFacets]);

  const removeActive = (item: { type: string; value: string }) => {
    if (item.type === 'status') toggle(sStatus, item.value, setSStatus);
    else if (item.type === 'area') toggleArea(item.value);
    else if (item.type === 'condition') toggle(sConditions, item.value, setSConditions);
    else if (item.type === 'presentation') toggle(sPres, item.value, setSPres);
    else toggle(sFacets, item.value, setSFacets);
  };

  const available = filteredPool.length;
  const preview = `${Math.min(size, available)} concepts${sAreas.size ? ` in ${[...sAreas].map(labelFor).join(', ')}` : ''}${!hasAny(sConditions) ? ` · ${[...sConditions].map(labelFor).join(', ')}` : ''}${!hasAny(sPres) ? ` · ${[...sPres].map(labelFor).join(', ')}` : ''}`;

  if (!isOpen) return null;

  const Chip = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium border transition-all" style={{ backgroundColor: selected ? T.espresso : T.cream, color: selected ? T.cream : T.ink, borderColor: selected ? T.espresso : T.line }}>
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4" style={{ backgroundColor: 'rgba(31,20,12,0.4)' }} onClick={onClose}>
      <div className="flex h-full w-full flex-col overflow-hidden shadow-2xl md:h-auto md:max-w-[460px]" style={{ backgroundColor: T.cream, borderRadius: '38px', maxHeight: '95vh', fontFamily: "'Inter', sans-serif" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
          <div>
            <h1 className="mb-1.5 text-[28px] leading-[1.05]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, color: T.ink }}>Practise <em style={{ color: T.blushDeep }}>your way</em></h1>
            <p className="text-[13px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>Start broad. Each choice narrows what comes next.</p>
          </div>
          <div className="flex gap-2">
            {!!active.length && <button onClick={reset} className="rounded-full border px-3 py-1.5 text-[11px]" style={{ borderColor: T.line, color: T.inkMuted }}>Reset</button>}
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full border" style={{ borderColor: T.line, color: T.inkMuted }}><X className="h-4 w-4" /></button>
          </div>
        </div>

        {!!active.length && <div className="flex flex-wrap items-center gap-1.5 px-6 pb-4">
          <span className="mr-1 text-[9.5px] font-medium uppercase tracking-[0.22em]" style={{ color: T.inkMuted }}>Stacked</span>
          {active.map(item => <button key={`${item.type}-${item.value}`} onClick={() => removeActive(item)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px]" style={{ backgroundColor: T.espresso, color: T.cream }}>
            <em style={{ color: T.blush, fontFamily: "'Fraunces', serif" }}>{item.type}</em><span>{item.label}</span><span>×</span>
          </button>)}
        </div>}

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <section className="border-t py-4" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3 text-[18px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>A session of</div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center rounded-full border p-1" style={{ backgroundColor: T.parchment, borderColor: T.line }}>
                <button onClick={() => setSize(Math.max(5, size - 5))} disabled={size <= 5} className="h-[30px] w-[30px] disabled:opacity-30">−</button>
                <span className="min-w-[92px] text-center text-[19px]" style={{ fontFamily: "'Fraunces', serif" }}>{size}<em className="ml-1 text-[12px]" style={{ color: T.inkMuted }}>concepts</em></span>
                <button onClick={() => setSize(Math.min(50, size + 5))} disabled={size >= 50} className="h-[30px] w-[30px] disabled:opacity-30">+</button>
              </div>
              <span className="text-[12.5px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>≈ {Math.round(size * 2)} min</span>
            </div>
          </section>

          <section className="border-t py-4" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3 text-[18px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>that are</div>
            <div className="flex flex-wrap gap-2">
              {statusChips.map(option => <Chip key={option.id} selected={sStatus.has(option.id)} onClick={() => toggle(sStatus, option.id, setSStatus)}>
                <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: option.color }} /><span className="capitalize">{option.label}</span><em className="text-[11.5px]" style={{ color: sStatus.has(option.id) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{option.count}</em>
              </Chip>)}
            </div>
          </section>

          {!!areas.length && <section className="border-t py-4" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3 text-[18px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>in specialty</div>
            <button onClick={() => setAreaOpen(!areaOpen)} className="flex w-full items-center justify-between rounded-[14px] border p-3 text-left" style={{ borderColor: T.line }}>
              <span style={{ fontFamily: "'Fraunces', serif", color: T.ink }}>{sAreas.size ? [...sAreas].map(labelFor).join(', ') : <em style={{ color: T.blushDeep }}>any specialty</em>}</span>
              <ChevronDown className="h-4 w-4" style={{ color: T.inkMuted, transform: areaOpen ? 'rotate(180deg)' : undefined }} />
            </button>
            {areaOpen && <div className="mt-2 overflow-hidden rounded-[14px] border" style={{ backgroundColor: T.parchment, borderColor: T.line }}>
              {areas.map(option => <button key={option.id} onClick={() => toggleArea(option.id)} className="flex w-full items-center gap-2.5 border-b px-3.5 py-2.5 text-left last:border-b-0" style={{ borderColor: T.lineSoft }}>
                <span className="flex h-[17px] w-[17px] items-center justify-center rounded border text-[10px]" style={{ backgroundColor: sAreas.has(option.id) ? T.espresso : T.cream, borderColor: sAreas.has(option.id) ? T.espresso : T.line, color: sAreas.has(option.id) ? T.cream : 'transparent' }}>✓</span>
                <span className="flex-1 text-[13px]" style={{ color: T.ink }}>{option.name}</span>
                <div className="flex h-1 w-11 overflow-hidden rounded-sm" style={{ backgroundColor: T.lineSoft }}><span style={{ width: `${option.seg.m}%`, backgroundColor: T.sageDeep }} /><span style={{ width: `${option.seg.w}%`, backgroundColor: T.blushDeep }} /><span style={{ width: `${option.seg.a}%`, backgroundColor: '#c8b89c' }} /><span style={{ width: `${option.seg.c}%`, backgroundColor: '#4a3a2c' }} /></div>
                <em className="min-w-[38px] text-right text-[12px]" style={{ color: T.inkMuted, fontFamily: "'Fraunces', serif" }}>{option.count}</em>
              </button>)}
            </div>}
          </section>}

          {!!conditions.length && <section className="border-t py-4" style={{ borderColor: T.lineSoft }}>
            <div className="mb-1 text-[18px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>with condition</div>
            {sAreas.size > 0 && <div className="mb-3 text-[11px]" style={{ color: T.inkMuted }}>Only conditions found in your selected {sAreas.size === 1 ? 'specialty' : 'specialties'}.</div>}
            <input value={conditionSearch} onChange={e => setConditionSearch(e.target.value)} placeholder="Search conditions…" className="mb-3 w-full rounded-full border px-4 py-2 text-[12px] outline-none" style={{ backgroundColor: T.parchment, borderColor: T.line }} />
            <div className="flex flex-wrap gap-2">
              {(conditionExpanded || conditionSearch ? conditions : conditions.filter((_, i) => i < 10 || [...sConditions].some(id => id === conditions[i]?.id))).filter(option => !conditionSearch || option.label.toLowerCase().includes(conditionSearch.toLowerCase())).map(option => <Chip key={option.id} selected={sConditions.has(option.id)} onClick={() => toggle(sConditions, option.id, setSConditions)}><span>{option.label}</span><em className="text-[11.5px]" style={{ color: sConditions.has(option.id) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{option.count}</em></Chip>)}
              <Chip selected={hasAny(sConditions)} onClick={() => toggle(sConditions, 'any', setSConditions)}><span>any</span><em style={{ color: hasAny(sConditions) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{specialtyPool.length}</em></Chip>
              {!conditionSearch && conditions.length > 10 && <button onClick={() => setConditionExpanded(!conditionExpanded)} className="px-3 py-2 text-[12.5px] italic" style={{ color: T.inkMuted, fontFamily: "'Fraunces', serif" }}>{conditionExpanded ? 'show less' : `+${conditions.length - 10} more`}</button>}
            </div>
          </section>}

          {!!presentations.length && <section className="border-t py-4" style={{ borderColor: T.lineSoft }}>
            <div className="mb-1 text-[18px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>presenting as</div>
            {(!hasAny(sConditions) || sAreas.size > 0) && <div className="mb-3 text-[11px]" style={{ color: T.inkMuted }}>Only presentations compatible with the choices above.</div>}
            <input value={presentationSearch} onChange={e => setPresentationSearch(e.target.value)} placeholder="Search presentations…" className="mb-3 w-full rounded-full border px-4 py-2 text-[12px] outline-none" style={{ backgroundColor: T.parchment, borderColor: T.line }} />
            <div className="flex flex-wrap gap-2">
              {(presentationExpanded || presentationSearch ? presentations : presentations.filter((_, i) => i < 10 || [...sPres].some(id => id === presentations[i]?.id))).filter(option => !presentationSearch || option.label.toLowerCase().includes(presentationSearch.toLowerCase())).map(option => <Chip key={option.id} selected={sPres.has(option.id)} onClick={() => toggle(sPres, option.id, setSPres)}><span>{option.label}</span><em className="text-[11.5px]" style={{ color: sPres.has(option.id) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{option.count}</em></Chip>)}
              <Chip selected={hasAny(sPres)} onClick={() => toggle(sPres, 'any', setSPres)}><span>any</span><em style={{ color: hasAny(sPres) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{conditionPool.length}</em></Chip>
              {!presentationSearch && presentations.length > 10 && <button onClick={() => setPresentationExpanded(!presentationExpanded)} className="px-3 py-2 text-[12.5px] italic" style={{ color: T.inkMuted, fontFamily: "'Fraunces', serif" }}>{presentationExpanded ? 'show less' : `+${presentations.length - 10} more`}</button>}
            </div>
          </section>}

          {!!facets.length && <section className="border-t py-4" style={{ borderColor: T.lineSoft }}>
            <div className="mb-1 text-[18px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>about</div>
            <div className="mb-3 text-[11px]" style={{ color: T.inkMuted }}>This narrows the knowledge facet within the clinical slice above.</div>
            <div className="flex flex-wrap gap-2">
              {(facetExpanded ? facets : facets.filter((_, i) => i < 10 || [...sFacets].some(id => id === facets[i]?.id))).map(option => <Chip key={option.id} selected={sFacets.has(option.id)} onClick={() => toggle(sFacets, option.id, setSFacets)}><span>{option.label}</span><em className="text-[11.5px]" style={{ color: sFacets.has(option.id) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{option.count}</em></Chip>)}
              <Chip selected={hasAny(sFacets)} onClick={() => toggle(sFacets, 'any', setSFacets)}><span>any</span><em style={{ color: hasAny(sFacets) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{presentationPool.length}</em></Chip>
              {facets.length > 10 && <button onClick={() => setFacetExpanded(!facetExpanded)} className="px-3 py-2 text-[12.5px] italic" style={{ color: T.inkMuted, fontFamily: "'Fraunces', serif" }}>{facetExpanded ? 'show less' : `+${facets.length - 10} more`}</button>}
            </div>
          </section>}
        </div>

        <div className="px-6 pb-5 pt-3" style={{ background: `linear-gradient(to top, ${T.cream} 70%, rgba(250,245,236,0))` }}>
          <div className="relative mb-2.5 rounded-2xl p-4" style={{ backgroundColor: T.blushSoft }}>
            <div className="absolute bottom-3.5 left-0 top-3.5 w-0.5 rounded-full" style={{ backgroundColor: T.blushDeep }} />
            <div className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.22em]" style={{ color: T.blushDeep }}>You'll practise</div>
            <div className="text-[14.5px] leading-[1.5]" style={{ fontFamily: "'Fraunces', serif", color: T.ink }}>{preview}</div>
          </div>
          {available === 0 && <div className="mb-2 text-center text-[12.5px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>No concepts match this combination. Try removing one choice.</div>}
          <button onClick={() => {
            const selectedIds = filteredPool.slice(0, size).map(c => c.concept_id);
            setPracticeSelection(selectedIds);
            onApplyFilters?.({ size, statuses: [...sStatus], areas: [...sAreas], conditions: [...sConditions], presentations: [...sPres], facets: [...sFacets] });
            onClose();
          }} disabled={available === 0} className="flex w-full items-center justify-center gap-3 rounded-full py-4 text-[14px] font-medium disabled:cursor-not-allowed" style={{ backgroundColor: available ? T.espresso : T.inkMuted, color: T.cream }}>
            <span>Begin</span><em className="text-[14.5px]" style={{ fontFamily: "'Fraunces', serif", color: T.blush }}>{Math.min(size, available)} concepts</em><span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
