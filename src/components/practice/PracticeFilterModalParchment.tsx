import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import type { ConceptNode, FilterCategory } from '@/types/conceptTypes';
import { isEssentialConcept, isEssentialTag } from '@/utils/essentialCurriculum';

export interface FilterState {
  size: number;
  statuses: string[];
  areas: string[];
  conditions: string[];
  presentations: string[];
  facets: string[];
  essentialsOnly?: boolean;
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
const studentFacetLabel = (id: string) => {
  const text = id.replace(/[-_]/g, ' ').toLowerCase();
  if (/diagnos/.test(text)) return 'Diagnosis';
  if (/investig|test|imaging/.test(text)) return 'Investigations';
  if (/management|treatment|therapy/.test(text)) return 'Management';
  if (/pharmac|drug|medicat|prescrib/.test(text)) return 'Drugs';
  if (/risk factor|risk/.test(text)) return 'Risk factors';
  if (/complication/.test(text)) return 'Complications';
  return labelFor(id);
};
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

const calcCoverage = (concepts: ConceptNode[], filter: string) => {
  const matching = concepts.filter(c => c.custom_filters?.includes(filter));
  const total = matching.length;
  const covered = matching.filter(c => {
    const md = c.mastery_data || ({} as any);
    return Number(md.attempts || 0) > 0 || Number(md.mastery_level || 0) > 0;
  }).length;
  return { total, covered, percent: total ? Math.round((covered / total) * 100) : 0 };
};

interface PillProgress {
  total: number;
  mastered: number;
  weak: number;
  unseen: number;
  masteredPct: number;
  weakPct: number;
}

const calcPillProgress = (concepts: ConceptNode[], filter: string): PillProgress => {
  const matching = concepts.filter(c => c.custom_filters?.includes(filter));
  const total = matching.length;
  let mastered = 0;
  let weak = 0;
  matching.forEach(concept => {
    const md = concept.mastery_data || ({} as any);
    const attempts = Number(md.attempts || 0);
    const level = Number(md.mastery_level || 0);
    if (level === 2) mastered += 1;
    else if (attempts > 0 || level === 1) weak += 1;
  });
  const unseen = Math.max(0, total - mastered - weak);
  return {
    total, mastered, weak, unseen,
    masteredPct: total ? (mastered / total) * 100 : 0,
    weakPct: total ? (weak / total) * 100 : 0,
  };
};

const calcScopeProgress = (concepts: ConceptNode[]) => {
  const total = concepts.length;
  let strong = 0;
  let needsWork = 0;
  concepts.forEach(concept => {
    const md = concept.mastery_data || ({} as any);
    const attempts = Number(md.attempts || 0);
    const level = Number(md.mastery_level || 0);
    if (level === 2) strong += 1;
    else if (attempts > 0 || level === 1) needsWork += 1;
  });
  const unseen = Math.max(0, total - strong - needsWork);
  const covered = strong + needsWork;
  return {
    total, strong, needsWork, unseen, covered,
    coveragePct: total ? Math.round((covered / total) * 100) : 0,
    strongPct: total ? (strong / total) * 100 : 0,
    needsWorkPct: total ? (needsWork / total) * 100 : 0,
  };
};

const formatCompactTime = (minutes: number) => {
  if (minutes < 60) return `${Math.max(5, Math.round(minutes / 5) * 5)} min`;
  const rounded = Math.max(15, Math.round(minutes / 15) * 15);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatFirstPassRange = (minutes: number) => {
  if (minutes <= 0) return '0 min';
  if (minutes < 45) return `~${Math.max(10, Math.round(minutes / 10) * 10)} min`;
  const hours = minutes / 60;
  if (hours < 2) return '~1–2h';
  if (hours < 3) return '~2–3h';
  if (hours < 5) return `~${Math.max(2, Math.floor(hours))}–${Math.ceil(hours)}h`;
  const centre = Math.max(5, Math.round(hours / 5) * 5);
  return `~${Math.max(5, centre - 5)}–${centre + 5}h`;
};

const pickColdBreadthFirst = (
  pool: ConceptNode[], size: number, assignments: Record<string, string>,
  conditionCategoryId?: string, presentationCategoryId?: string,
): ConceptNode[] => {
  if (pool.length <= size) return [...pool];
  const chosen: ConceptNode[] = [];
  const remaining = [...pool];
  const coveredTags = new Set<string>();
  const masteredIds = new Set(pool.filter(c => Number(c.mastery_data?.mastery_level || 0) === 2).map(c => c.concept_id));
  const breadthTags = (concept: ConceptNode) => (concept.custom_filters || []).filter(tag => {
    const categoryId = assignments[tag];
    return categoryId === conditionCategoryId || categoryId === presentationCategoryId;
  });
  while (chosen.length < size && remaining.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    remaining.forEach((concept, index) => {
      const tags = breadthTags(concept);
      const novelTags = tags.filter(tag => !coveredTags.has(tag)).length;
      const unmetPrereqs = (concept.prerequisites || []).filter(id => !masteredIds.has(id)).length;
      const importance = concept.importance || {};
      let score = novelTags * 55;
      if (concept.safety_critical || importance.safety_critical) score += 24;
      if (concept.core || importance.core) score += 18;
      score += Number(concept.exam_weight ?? importance.exam_weight ?? 0) * 4;
      score -= unmetPrereqs * 12;
      score += Math.random() * 0.5;
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    const [best] = remaining.splice(bestIndex, 1);
    chosen.push(best);
    breadthTags(best).forEach(tag => coveredTags.add(tag));
  }
  return chosen;
};

export const PracticeFilterModalParchment: React.FC<Props> = ({ isOpen, onClose, onApplyFilters }) => {
  const { concepts = [], curriculumId, setPracticeSelection } = useConceptStore();
  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [size, setSize] = useState(10);
  const [sStatus, setSStatus] = useState<Set<string>>(new Set(['any']));
  const [essentialsOnly, setEssentialsOnly] = useState(false);
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
  const categoryFor = (needle: string) => categories.find(category => category.name.toLowerCase().includes(needle) || category.id.toLowerCase().includes(needle));

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
  const visibleConditionIds = essentialsOnly ? conditionIds.filter(isEssentialTag) : conditionIds;
  const visiblePresentationIds = essentialsOnly ? presentationIds.filter(isEssentialTag) : presentationIds;

  const scopePool = useMemo(() => essentialsOnly ? concepts.filter(isEssentialConcept) : concepts, [concepts, essentialsOnly]);
  const progressSpecialtyPool = useMemo(() => scopePool.filter(c => matchesAnyTag(c, sAreas)), [scopePool, sAreas]);
  const progressConditionPool = useMemo(() => progressSpecialtyPool.filter(c => matchesAnyTag(c, sConditions)), [progressSpecialtyPool, sConditions]);
  const scopeSpecialtyPool = useMemo(() => scopePool.filter(c => matchesAnyTag(c, sAreas)), [scopePool, sAreas]);
  const scopeConditionPool = useMemo(() => scopeSpecialtyPool.filter(c => matchesAnyTag(c, sConditions)), [scopeSpecialtyPool, sConditions]);
  const scopePresentationPool = useMemo(() => scopeConditionPool.filter(c => matchesAnyTag(c, sPres)), [scopeConditionPool, sPres]);
  const scopeSnapshotPool = useMemo(() => scopePresentationPool.filter(c => matchesAnyTag(c, sFacets)), [scopePresentationPool, sFacets]);
  const statusPool = useMemo(() => scopePool.filter(c => matchesStatus(c, sStatus)), [scopePool, sStatus]);
  const specialtyPool = useMemo(() => statusPool.filter(c => matchesAnyTag(c, sAreas)), [statusPool, sAreas]);
  const conditionPool = useMemo(() => specialtyPool.filter(c => matchesAnyTag(c, sConditions)), [specialtyPool, sConditions]);
  const presentationPool = useMemo(() => conditionPool.filter(c => matchesAnyTag(c, sPres)), [conditionPool, sPres]);
  const filteredPool = useMemo(() => presentationPool.filter(c => matchesAnyTag(c, sFacets)), [presentationPool, sFacets]);
  const scopeStats = useMemo(() => calcScopeProgress(scopeSnapshotPool), [scopeSnapshotPool]);

  const areas = useMemo(() => specialtyIds.map(id => {
    const coverage = calcCoverage(scopePool, id);
    return { id, name: labelFor(id), count: coverage.total, covered: coverage.covered, coveragePercent: coverage.percent, available: statusPool.filter(c => c.custom_filters?.includes(id)).length };
  }).filter(option => option.count > 0 || sAreas.has(option.id)).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)), [specialtyIds, scopePool, statusPool, sAreas]);

  const conditions = useMemo(() => visibleConditionIds.map(id => ({
    id, label: labelFor(id), count: specialtyPool.filter(c => c.custom_filters?.includes(id)).length, progress: calcPillProgress(progressSpecialtyPool, id),
  })).filter(option => option.count > 0 || sConditions.has(option.id)), [visibleConditionIds, specialtyPool, progressSpecialtyPool, sConditions]);

  const presentations = useMemo(() => visiblePresentationIds.map(id => ({
    id, label: labelFor(id), count: conditionPool.filter(c => c.custom_filters?.includes(id)).length, progress: calcPillProgress(progressConditionPool, id),
  })).filter(option => option.count > 0 || sPres.has(option.id)), [visiblePresentationIds, conditionPool, progressConditionPool, sPres]);

  const facets = useMemo(() => facetIds.map(id => ({ id, label: studentFacetLabel(id), count: presentationPool.filter(c => c.custom_filters?.includes(id)).length })).filter(option => option.count > 0 || sFacets.has(option.id)), [facetIds, presentationPool, sFacets]);

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
    { id: 'any', label: 'anything', count: scopePool.length, color: T.ink },
    { id: 'cold', label: 'unseen', count: countStatus(scopePool, 'cold'), color: '#4a3a2c' },
    { id: 'weak', label: 'weak', count: countStatus(scopePool, 'weak'), color: T.blushDeep },
  ], [scopePool]);

  const toggle = (current: Set<string>, value: string, setter: (next: Set<string>) => void, useAny = true) => {
    if (value === 'any') { setter(new Set(['any'])); return; }
    const next = new Set(current); next.delete('any'); next.has(value) ? next.delete(value) : next.add(value);
    if (!next.size && useAny) next.add('any'); setter(next);
  };
  const toggleArea = (id: string) => toggle(sAreas, id, setSAreas, false);
  const reset = () => {
    setSize(10); setSStatus(new Set(['any'])); setEssentialsOnly(false); setSAreas(new Set()); setSConditions(new Set(['any'])); setSPres(new Set(['any'])); setSFacets(new Set(['any'])); setConditionSearch(''); setPresentationSearch(''); setConditionExpanded(false); setPresentationExpanded(false); setFacetExpanded(false);
  };

  const active = useMemo(() => {
    const result: { type: string; value: string; label: string }[] = [];
    if (!hasAny(sStatus)) [...sStatus].forEach(value => result.push({ type: 'status', value, label: value === 'cold' ? 'Unseen' : value === 'weak' ? 'Weak' : labelFor(value) }));
    if (essentialsOnly) result.push({ type: 'essentials', value: 'essential', label: 'Essentials' });
    [...sAreas].forEach(value => result.push({ type: 'area', value, label: labelFor(value) }));
    if (!hasAny(sConditions)) [...sConditions].forEach(value => result.push({ type: 'condition', value, label: labelFor(value) }));
    if (!hasAny(sPres)) [...sPres].forEach(value => result.push({ type: 'presentation', value, label: labelFor(value) }));
    if (!hasAny(sFacets)) [...sFacets].forEach(value => result.push({ type: 'focus', value, label: studentFacetLabel(value) }));
    return result;
  }, [sStatus, essentialsOnly, sAreas, sConditions, sPres, sFacets]);

  const removeActive = (item: { type: string; value: string }) => {
    if (item.type === 'status') toggle(sStatus, item.value, setSStatus);
    else if (item.type === 'essentials') setEssentialsOnly(false);
    else if (item.type === 'area') toggleArea(item.value);
    else if (item.type === 'condition') toggle(sConditions, item.value, setSConditions);
    else if (item.type === 'presentation') toggle(sPres, item.value, setSPres);
    else toggle(sFacets, item.value, setSFacets);
  };

  const available = filteredPool.length;
  const selectedCount = Math.min(size, available);
  const firstPassEstimate = formatFirstPassRange(scopeStats.unseen * 2);
  const sessionEstimate = formatCompactTime(selectedCount * 2);
  const greenEnd = scopeStats.strongPct;
  const blushEnd = Math.min(100, scopeStats.strongPct + scopeStats.needsWorkPct);
  const untouched = scopeStats.covered === 0 && scopeStats.total > 0;

  if (!isOpen) return null;

  const Chip = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-[13px] font-semibold transition duration-150 active:scale-[0.98]" style={{ backgroundColor: selected ? T.espresso : 'rgba(255,253,248,.72)', color: selected ? T.cream : T.ink, borderColor: selected ? T.espresso : T.line, boxShadow: selected ? 'inset 0 1px 0 rgba(255,255,255,.08)' : '0 1px 0 rgba(31,20,12,.02)' }}>{children}</button>
  );

  const ProgressChip = ({ selected, onClick, label, count, progress }: { selected: boolean; onClick: () => void; label: string; count: number; progress: PillProgress }) => {
    const greenEnd = progress.masteredPct;
    const blushEnd = Math.min(100, progress.masteredPct + progress.weakPct);
    const background = progress.total > 0 ? `linear-gradient(90deg, rgba(143,163,121,.34) 0%, rgba(143,163,121,.34) ${greenEnd}%, rgba(229,168,157,.34) ${greenEnd}%, rgba(229,168,157,.34) ${blushEnd}%, rgba(255,253,248,.78) ${blushEnd}%, rgba(255,253,248,.78) 100%)` : 'rgba(255,253,248,.72)';
    return <button type="button" onClick={onClick} aria-label={`${label}: ${progress.mastered} strong, ${progress.weak} needs work, ${progress.unseen} unseen`} title={`${progress.mastered} strong · ${progress.weak} needs work · ${progress.unseen} unseen`} className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-3.5 py-2.5 text-[13px] font-semibold transition duration-150 active:scale-[0.98]" style={{ background, color: T.ink, borderColor: selected ? T.espresso : T.line, boxShadow: selected ? '0 0 0 2px rgba(31,20,12,.08), inset 0 0 0 1px rgba(31,20,12,.08)' : '0 1px 0 rgba(31,20,12,.02)' }}><span className="relative z-[1]">{label}</span><em className="relative z-[1] text-[11.5px] font-normal" style={{ color: T.inkMuted, fontFamily: "'Fraunces', serif" }}>{count}</em></button>;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-5" style={{ backgroundColor: 'rgba(31,20,12,0.24)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} onClick={onClose}>
      <style>{`@keyframes studyedit-sheet-in { from { opacity: 0; transform: translateY(28px) scale(.992); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden rounded-none shadow-[0_-18px_60px_rgba(31,20,12,0.16)] md:h-auto md:max-h-[90vh] md:max-w-[470px] md:rounded-[30px] md:border" style={{ backgroundColor: T.cream, borderColor: 'rgba(217,204,182,.8)', fontFamily: "'Inter', sans-serif", animation: 'studyedit-sheet-in 260ms cubic-bezier(.2,.8,.2,1) both' }} onClick={e => e.stopPropagation()}>
        <div className="shrink-0 px-6 pb-3 pt-[calc(env(safe-area-inset-top)+10px)] md:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><h1 className="text-[31px] leading-[1.03] tracking-[-0.035em]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, color: T.ink }}>Practise <em style={{ color: T.blushDeep }}>your way</em></h1><p className="mt-2 text-[13px] leading-5" style={{ color: T.inkMuted }}>Build a focused session in seconds.</p></div>
            <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-[0.96]" style={{ borderColor: T.line, color: T.inkMuted, backgroundColor: 'rgba(255,253,248,.55)' }} aria-label="Close practice builder"><X className="h-[18px] w-[18px]" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5">
          <section className="py-5">
            <div className="mb-3 text-[19px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>A session of</div>
            <div className="flex items-center justify-between gap-4"><div className="flex items-center rounded-full border p-1.5" style={{ backgroundColor: 'rgba(244,236,223,.72)', borderColor: T.line }}><button onClick={() => setSize(Math.max(5, size - 5))} disabled={size <= 5} className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-white/40 disabled:opacity-25">−</button><span className="min-w-[108px] text-center text-[21px]" style={{ fontFamily: "'Fraunces', serif", color: T.ink }}>{size}<em className="ml-1.5 text-[12px]" style={{ color: T.inkMuted }}>concepts</em></span><button onClick={() => setSize(Math.min(50, size + 5))} disabled={size >= 50} className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-white/40 disabled:opacity-25">+</button></div><span className="shrink-0 text-[13px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>≈ {formatCompactTime(size * 2)}</span></div>
          </section>

          <section className="border-t py-5" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3 text-[19px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>I want to work on</div>
            <div className="flex flex-wrap gap-2">{statusChips.map(option => <Chip key={option.id} selected={sStatus.has(option.id)} onClick={() => toggle(sStatus, option.id, setSStatus)}><span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: option.color }} /><span className="capitalize">{option.label}</span><em className="text-[11.5px] font-normal" style={{ color: sStatus.has(option.id) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{option.count}</em></Chip>)}</div>
            {sStatus.has('cold') && <div className="mt-2 text-[11px] leading-4" style={{ color: T.inkMuted }}>Unseen starts with concepts you have not encountered and spreads you across new conditions and presentations before extra depth.</div>}
          </section>

          <section className="border-t py-5" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3 text-[19px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>prioritise</div>
            <button type="button" aria-pressed={essentialsOnly} onClick={() => setEssentialsOnly(value => !value)} className="flex w-full items-center justify-between rounded-[16px] border px-4 py-4 text-left transition active:scale-[0.995]" style={{ borderColor: essentialsOnly ? T.espresso : T.line, backgroundColor: essentialsOnly ? T.espresso : 'rgba(255,253,248,.52)', color: essentialsOnly ? T.cream : T.ink }}><div className="min-w-0 pr-3"><div className="flex items-center gap-2 text-[15px] font-semibold"><span aria-hidden="true" style={{ color: essentialsOnly ? T.blush : T.blushDeep }}>✦</span><span>Essentials only</span></div><div className="mt-1 text-[11px] leading-4" style={{ color: essentialsOnly ? '#DCCFC0' : T.inkMuted }}>Bread-and-butter conditions and presentations first. Your adaptive ranking still works inside this scope.</div></div><span className="shrink-0 text-[12px] italic" style={{ fontFamily: "'Fraunces', serif", color: essentialsOnly ? T.blush : T.inkMuted }}>{scopePool.length}</span></button>
          </section>

          {!!areas.length && <section className="border-t py-5" style={{ borderColor: T.lineSoft }}><div className="mb-3 text-[19px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>in specialty</div><button onClick={() => setAreaOpen(!areaOpen)} className="flex w-full items-center justify-between rounded-[16px] border px-4 py-4 text-left transition active:scale-[0.995]" style={{ borderColor: T.line, backgroundColor: 'rgba(255,253,248,.52)' }}><span className="text-[15px]" style={{ color: T.ink }}>{sAreas.size ? [...sAreas].map(labelFor).join(', ') : <em style={{ fontFamily: "'Fraunces', serif", color: T.blushDeep }}>Any specialty</em>}</span><ChevronDown className="h-4 w-4 transition-transform" style={{ color: T.inkMuted, transform: areaOpen ? 'rotate(180deg)' : undefined }} /></button>{areaOpen && <div className="mt-2 overflow-hidden rounded-[16px] border" style={{ backgroundColor: T.parchment, borderColor: T.line }}><div className="border-b px-3.5 py-2 text-[10px] font-medium uppercase tracking-[0.12em]" style={{ borderColor: T.lineSoft, color: T.inkMuted }}>Coverage = concepts attempted at least once</div>{areas.map(option => <button key={option.id} onClick={() => toggleArea(option.id)} className="flex w-full items-center gap-2.5 border-b px-3.5 py-3 text-left last:border-b-0" style={{ borderColor: T.lineSoft }}><span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border text-[10px]" style={{ backgroundColor: sAreas.has(option.id) ? T.espresso : T.cream, borderColor: sAreas.has(option.id) ? T.espresso : T.line, color: sAreas.has(option.id) ? T.cream : 'transparent' }}>✓</span><span className="min-w-0 flex-1 text-[13px] font-medium" style={{ color: T.ink }}>{option.name}</span><div className="w-[96px] shrink-0"><div className="h-[5px] w-full overflow-hidden rounded-full" style={{ backgroundColor: T.lineSoft }}><div className="h-full rounded-full transition-[width]" style={{ width: `${option.coveragePercent}%`, backgroundColor: T.sageDeep }} /></div><div className="mt-1 flex items-center justify-between gap-2 text-[10px]" style={{ color: T.inkMuted }}><span>{option.coveragePercent}%</span><span>{option.covered}/{option.count}</span></div></div></button>)}</div>}</section>}

          {!!conditions.length && <section className="border-t py-5" style={{ borderColor: T.lineSoft }}><div className="mb-2 text-[19px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>with condition</div><div className="mb-2 flex items-center gap-3 text-[10.5px]" style={{ color: T.inkMuted }}><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'rgba(143,163,121,.65)' }} />strong</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'rgba(229,168,157,.65)' }} />needs work</span><span>cream = unseen</span></div>{essentialsOnly && <div className="mb-2 text-[11px]" style={{ color: T.inkMuted }}>Showing bread-and-butter conditions only.</div>}{sAreas.size > 0 && <div className="mb-3 text-[11px]" style={{ color: T.inkMuted }}>Only conditions in the selected {sAreas.size === 1 ? 'specialty' : 'specialties'}.</div>}<input value={conditionSearch} onChange={e => setConditionSearch(e.target.value)} placeholder="Search conditions…" className="mb-3 w-full rounded-full border px-4 py-3 text-[13px] outline-none transition focus:border-[#A89582]" style={{ backgroundColor: 'rgba(244,236,223,.62)', borderColor: T.line, color: T.ink }} /><div className="flex flex-wrap gap-2">{(conditionExpanded || conditionSearch ? conditions : conditions.filter((_, i) => i < 10 || [...sConditions].some(id => id === conditions[i]?.id))).filter(option => !conditionSearch || option.label.toLowerCase().includes(conditionSearch.toLowerCase())).map(option => <ProgressChip key={option.id} selected={sConditions.has(option.id)} onClick={() => toggle(sConditions, option.id, setSConditions)} label={option.label} count={option.count} progress={option.progress} />)}<Chip selected={hasAny(sConditions)} onClick={() => toggle(sConditions, 'any', setSConditions)}><span>Any</span><em className="text-[11.5px] font-normal" style={{ color: hasAny(sConditions) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{specialtyPool.length}</em></Chip>{!conditionSearch && conditions.length > 10 && <button onClick={() => setConditionExpanded(!conditionExpanded)} className="px-3 py-2 text-[12.5px] italic" style={{ color: T.inkMuted, fontFamily: "'Fraunces', serif" }}>{conditionExpanded ? 'Show less' : `+${conditions.length - 10} more`}</button>}</div></section>}

          {!!presentations.length && <section className="border-t py-5" style={{ borderColor: T.lineSoft }}><div className="mb-2 text-[19px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>presenting as</div>{essentialsOnly && <div className="mb-2 text-[11px]" style={{ color: T.inkMuted }}>Showing bread-and-butter presentations only.</div>}{(!hasAny(sConditions) || sAreas.size > 0) && <div className="mb-3 text-[11px]" style={{ color: T.inkMuted }}>Only presentations compatible with the choices above.</div>}<input value={presentationSearch} onChange={e => setPresentationSearch(e.target.value)} placeholder="Search presentations…" className="mb-3 w-full rounded-full border px-4 py-3 text-[13px] outline-none transition focus:border-[#A89582]" style={{ backgroundColor: 'rgba(244,236,223,.62)', borderColor: T.line, color: T.ink }} /><div className="flex flex-wrap gap-2">{(presentationExpanded || presentationSearch ? presentations : presentations.filter((_, i) => i < 10 || [...sPres].some(id => id === presentations[i]?.id))).filter(option => !presentationSearch || option.label.toLowerCase().includes(presentationSearch.toLowerCase())).map(option => <ProgressChip key={option.id} selected={sPres.has(option.id)} onClick={() => toggle(sPres, option.id, setSPres)} label={option.label} count={option.count} progress={option.progress} />)}<Chip selected={hasAny(sPres)} onClick={() => toggle(sPres, 'any', setSPres)}><span>Any</span><em className="text-[11.5px] font-normal" style={{ color: hasAny(sPres) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{conditionPool.length}</em></Chip>{!presentationSearch && presentations.length > 10 && <button onClick={() => setPresentationExpanded(!presentationExpanded)} className="px-3 py-2 text-[12.5px] italic" style={{ color: T.inkMuted, fontFamily: "'Fraunces', serif" }}>{presentationExpanded ? 'Show less' : `+${presentations.length - 10} more`}</button>}</div></section>}

          {!!facets.length && <section className="border-t py-5" style={{ borderColor: T.lineSoft }}><div className="mb-2 text-[19px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>Focus</div><div className="mb-3 text-[11px]" style={{ color: T.inkMuted }}>Optional — choose the kind of knowledge you want to practise.</div><div className="flex flex-wrap gap-2">{(facetExpanded ? facets : facets.filter((_, i) => i < 10 || [...sFacets].some(id => id === facets[i]?.id))).map(option => <Chip key={option.id} selected={sFacets.has(option.id)} onClick={() => toggle(sFacets, option.id, setSFacets)}><span>{option.label}</span><em className="text-[11.5px] font-normal" style={{ color: sFacets.has(option.id) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{option.count}</em></Chip>)}<Chip selected={hasAny(sFacets)} onClick={() => toggle(sFacets, 'any', setSFacets)}><span>Any</span><em className="text-[11.5px] font-normal" style={{ color: hasAny(sFacets) ? T.blush : T.inkMuted, fontFamily: "'Fraunces', serif" }}>{presentationPool.length}</em></Chip>{facets.length > 10 && <button onClick={() => setFacetExpanded(!facetExpanded)} className="px-3 py-2 text-[12.5px] italic" style={{ color: T.inkMuted, fontFamily: "'Fraunces', serif" }}>{facetExpanded ? 'Show less' : `+${facets.length - 10} more`}</button>}</div></section>}
        </div>

        <div className="shrink-0 border-t px-6 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2" style={{ borderColor: T.lineSoft, backgroundColor: 'rgba(244,236,223,.98)', boxShadow: '0 -14px 30px rgba(31,20,12,.07)' }}>
          {!!active.length && <div className="-mx-1 mb-2 flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{active.map(item => <button key={`${item.type}-${item.value}`} onClick={() => removeActive(item)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10.5px] font-medium" style={{ borderColor: T.line, backgroundColor: 'rgba(255,253,248,.72)', color: T.ink }}><span>{item.label}</span><span style={{ color: T.inkMuted }}>×</span></button>)}<button onClick={reset} className="shrink-0 rounded-full px-2 py-1.5 text-[10.5px] font-semibold" style={{ color: T.inkMuted }}>Reset</button></div>}
          <div className="mb-2 px-1">
            <div className="text-[8.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: T.inkMuted }}>Your progress</div>
            <div className="mt-0.5 flex items-end justify-between gap-3">
              <div className="min-w-0 text-[10px]" style={{ color: T.inkMuted }}>{untouched ? `Not started · ${scopeStats.total} concepts` : `${scopeStats.covered}/${scopeStats.total} encountered`}</div>
              {!untouched && <div className="shrink-0 text-right"><span className="text-[18px] leading-none" style={{ fontFamily: "'Fraunces', serif", color: T.ink }}>{scopeStats.coveragePct}%</span><span className="ml-1.5 text-[9px] uppercase tracking-[0.08em]" style={{ color: T.inkMuted }}>covered</span></div>}
            </div>

            <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,253,248,.95)' }}><div className="h-full w-full" style={{ background: `linear-gradient(90deg, rgba(143,163,121,.72) 0%, rgba(143,163,121,.72) ${greenEnd}%, rgba(229,168,157,.72) ${greenEnd}%, rgba(229,168,157,.72) ${blushEnd}%, rgba(255,253,248,.95) ${blushEnd}%, rgba(255,253,248,.95) 100%)` }} /></div>

            {untouched ? (
              <div className="mt-1.5 text-[10px]" style={{ color: T.inkMuted }}><strong style={{ color: T.ink }}>{firstPassEstimate}</strong> for a first pass</div>
            ) : (
              <>
                <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[9.8px]" style={{ color: T.inkMuted }}><span><strong style={{ color: T.sageDeep }}>{scopeStats.strong}</strong> strong</span><span><strong style={{ color: T.blushDeep }}>{scopeStats.needsWork}</strong> need work</span><span><strong style={{ color: T.ink }}>{scopeStats.unseen}</strong> unseen</span></div>
                <div className="mt-1 text-[9.8px]" style={{ color: T.inkMuted }}>{scopeStats.unseen > 0 ? `${firstPassEstimate} of unseen content left` : 'First pass complete'}</div>
              </>
            )}

            <div className="mt-1.5 flex items-center justify-between gap-3 border-t pt-1.5 text-[10px]" style={{ borderColor: T.lineSoft, color: T.inkMuted }}>
              <span>This session</span>
              <span className="shrink-0 font-medium" style={{ color: T.ink }}>{selectedCount} concepts · ~{sessionEstimate}</span>
            </div>
          </div>
          {available === 0 && <div className="mb-2 text-center text-[12px]" style={{ color: T.inkMuted }}>Nothing matches this combination yet. Remove one filter.</div>}
          <button onClick={() => { const selectedConcepts = sStatus.has('cold') ? pickColdBreadthFirst(filteredPool, size, assignments, conditionCategory?.id, presentationCategory?.id) : filteredPool; setPracticeSelection(selectedConcepts.map(c => c.concept_id)); onApplyFilters?.({ size, statuses: [...sStatus], areas: [...sAreas], conditions: [...sConditions], presentations: [...sPres], facets: [...sFacets], essentialsOnly }); onClose(); }} disabled={available === 0} className="flex w-full items-center justify-center gap-3 rounded-full py-[16px] text-[15px] font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed" style={{ backgroundColor: available ? T.espresso : T.inkMuted, color: T.cream, boxShadow: available ? '0 8px 22px rgba(31,20,12,.14)' : 'none' }}><span>Begin session</span><span aria-hidden="true" style={{ color: T.blush }}>→</span></button>
        </div>
      </div>
    </div>
  );
};