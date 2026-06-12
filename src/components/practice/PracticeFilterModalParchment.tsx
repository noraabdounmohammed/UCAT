import React, { useState, useMemo, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import type { FilterCategory, ConceptNode } from '@/types/conceptTypes';

interface Props { isOpen: boolean; onClose: () => void; onApplyFilters?: () => void; }

const T = {
  parchment: '#F4ECDF', cream: '#FAF5EC', espresso: '#1F140C', ink: '#2A1E16',
  inkMuted: '#8A7560', blush: '#F2C9C1', blushDeep: '#E5A89D', blushSoft: '#FBEDE7',
  sageDeep: '#8FA379', line: '#D9CCB6', lineSoft: '#E8DCC4',
};

const getStorage = <T,>(cid: string, key: string, def: T): T => {
  const s = localStorage.getItem(`${cid}_${key}`) || localStorage.getItem(key);
  return s ? JSON.parse(s) : def;
};

const calcSegments = (concepts: ConceptNode[], filter: string) => {
  const m = concepts.filter(c => c.custom_filters?.includes(filter));
  const t = m.length;
  if (!t) return { m: 0, w: 0, a: 0, c: 0 };
  return {
    m: Math.round((m.filter(c => c.mastery_data?.mastery_level === 2).length / t) * 100),
    w: Math.round((m.filter(c => c.mastery_data?.mastery_level === 1).length / t) * 100),
    a: Math.round((m.filter(c => c.mastery_data?.attempts && !c.mastery_data?.mastery_level).length / t) * 100),
    c: Math.round((m.filter(c => !c.mastery_data?.attempts && !c.mastery_data?.mastery_level).length / t) * 100),
  };
};

export const PracticeFilterModalParchment: React.FC<Props> = ({ isOpen, onClose, onApplyFilters }) => {
  const { concepts, curriculumId, stats } = useConceptStore();
  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [size, setSize] = useState(10);
  const [sStatus, setSStatus] = useState<Set<string>>(new Set(['any']));
  const [sAreas, setSAreas] = useState<Set<string>>(new Set());
  const [sPres, setSPres] = useState<Set<string>>(new Set(['any']));
  const [sFacets, setSFacets] = useState<Set<string>>(new Set(['any']));
  const [areaOpen, setAreaOpen] = useState(false);
  const cid = curriculumId || 'default';

  useEffect(() => { setCategories(getStorage(cid, 'filter_categories', [])); }, [cid]);
  const assignments = useMemo<Record<string, string>>(() => getStorage(cid, 'filter_assignments', {}), [cid]);

  const byCat = useMemo(() => {
    const all = new Set<string>();
    concepts?.forEach(c => c.custom_filters?.forEach(f => all.add(f)));
    const g: Record<string, string[]> = {};
    categories.forEach(c => g[c.id] = []);
    g['uncat'] = [];
    all.forEach(f => (assignments[f] && g[assignments[f]]) ? g[assignments[f]].push(f) : g['uncat'].push(f));
    return g;
  }, [concepts, categories, assignments]);

  const findCat = (t: string) => categories.find(c => c.name.toLowerCase().includes(t) || c.id.toLowerCase().includes(t));

  const areas = useMemo(() => {
    const cat = findCat('specialty') || findCat('system');
    const f = cat ? byCat[cat.id] || [] : [];
    return f.map(id => ({ id, name: id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: stats?.by_custom_filter?.[id] || concepts?.filter(c => c.custom_filters?.includes(id)).length || 0,
      seg: calcSegments(concepts || [], id) }));
  }, [categories, byCat, stats, concepts]);

  const presentations = useMemo(() => {
    const cat = findCat('presentation');
    const f = cat ? byCat[cat.id] || [] : ['chest-pain','breathlessness','abdominal-pain','headache','palpitations','confusion','weight-loss'];
    return f.map(id => ({ id, label: id.replace(/-/g, ' '), count: stats?.by_custom_filter?.[id] || concepts?.filter(c => c.custom_filters?.includes(id)).length || 0 }));
  }, [categories, byCat, stats, concepts]);

  // Facets from "other" category (Diagnosis, Investigations, Management, etc.)
  const facets = useMemo(() => {
    // Look for "other" category first, then fallback to facet/topic/demo
    const cat = findCat('other') || findCat('facet') || findCat('topic');
    const f = cat ? byCat[cat.id] || [] : ['diagnosis','investigations','management','risk-factors','complications','prognosis'];
    return f.map(id => ({ id, label: id.replace(/-/g, ' '), count: stats?.by_custom_filter?.[id] || concepts?.filter(c => c.custom_filters?.includes(id)).length || 0 }));
  }, [categories, byCat, stats, concepts]);

  const statusChips = useMemo(() => [
    { id: 'weak', l: 'weak', c: stats?.by_mastery?.[1] || 0, col: T.blushDeep },
    { id: 'drifting', l: 'drifting', c: Math.floor((stats?.by_mastery?.[1] || 0) * 0.3), col: '#c8b89c' },
    { id: 'cold', l: 'cold', c: stats?.by_mastery?.[0] || 0, col: '#4a3a2c' },
    { id: 'mastered', l: 'mastered', c: stats?.by_mastery?.[2] || 0, col: T.sageDeep },
    { id: 'any', l: 'any', c: concepts?.length || 0, col: T.ink, def: true },
  ], [stats, concepts]);

  const available = useMemo(() => {
    let f = concepts || [];
    if (!sStatus.has('any')) f = f.filter(c => [...sStatus].some(s => 
      (s === 'mastered' && c.mastery_data?.mastery_level === 2) ||
      (s === 'weak' && c.mastery_data?.mastery_level === 1) ||
      (s === 'cold' && !c.mastery_data?.mastery_level && !c.mastery_data?.attempts) ||
      (s === 'drifting' && !c.mastery_data?.mastery_level && c.mastery_data?.attempts)
    ));
    if (sAreas.size) f = f.filter(c => [...sAreas].some(a => c.custom_filters?.includes(a)));
    if (!sPres.has('any')) f = f.filter(c => [...sPres].some(p => c.custom_filters?.includes(p)));
    if (!sFacets.has('any')) f = f.filter(c => [...sFacets].some(facet => c.custom_filters?.includes(facet)));
    return f.length;
  }, [concepts, sStatus, sAreas, sPres, sFacets]);

  const toggle = (set: Set<string>, v: string, fn: (s: Set<string>) => void, hasAny = true) => {
    const n = new Set(set);
    if (v === 'any') { fn(new Set(['any'])); return; }
    n.has(v) ? n.delete(v) : (n.delete('any'), n.add(v));
    if (!n.size && hasAny) n.add('any');
    fn(n);
  };
  const toggleArea = (id: string) => toggle(sAreas, id, setSAreas, false);
  const reset = () => { setSize(10); setSStatus(new Set(['any'])); setSAreas(new Set()); setSPres(new Set(['any'])); setSFacets(new Set(['any'])); };

  const active = useMemo(() => {
    const a: {t: string, v: string, l: string}[] = [];
    if (!sStatus.has('any')) [...sStatus].forEach(v => { const found = statusChips.find(s => s.id === v); if (found) a.push({t: 'status', v, l: found.l}); });
    if (sAreas.size) [...sAreas].forEach(v => { const found = areas.find(ar => ar.id === v); if (found) a.push({t: 'area', v, l: found.name}); });
    if (!sPres.has('any')) [...sPres].forEach(v => { const found = presentations.find(p => p.id === v); if (found) a.push({t: 'presentation', v, l: found.label}); });
    if (!sFacets.has('any')) [...sFacets].forEach(v => { const found = facets.find(facet => facet.id === v); if (found) a.push({t: 'facet', v, l: found.label}); });
    return a;
  }, [sStatus, sAreas, sPres, sFacets, statusChips, areas, presentations, facets]);

  const preview = useMemo(() => {
    const st = !sStatus.has('any') ? [...sStatus].map(s => `<em>${s}</em>`).join(', ') : '<em>any</em> status';
    const ar = sAreas.size ? [...sAreas].map(a => `<em>${areas.find(x => x.id === a)?.name.toLowerCase() || a}</em>`).join(', ') : '<em>anywhere</em> on the map';
    return `<strong>${Math.min(size, available)} concepts</strong> — ${st}, ${ar}.`;
  }, [size, available, sStatus, sAreas, areas]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-0 md:p-4" style={{ backgroundColor: 'rgba(31, 20, 12, 0.4)' }} onClick={onClose}>
      <div className="w-full h-full md:h-auto md:max-w-[460px] flex flex-col overflow-hidden shadow-2xl" style={{ backgroundColor: T.cream, borderRadius: '38px', maxHeight: '95vh', fontFamily: "'Inter', sans-serif" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-center pt-3"><div style={{ width: '38px', height: '4px', backgroundColor: T.line, borderRadius: '2px' }} /></div>
        <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-[28px] leading-[1.05] mb-1.5" style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, color: T.ink, letterSpacing: '-0.025em' }}>Practise <em style={{ color: T.blushDeep, fontStyle: 'italic' }}>your way</em></h1>
            <p className="text-[13px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: T.inkMuted }}>Stack filters to sculpt exactly the slice you want.</p>
          </div>
          <div className="flex gap-2">
            {active.length > 0 && <button onClick={reset} className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border" style={{ borderColor: T.line, color: T.inkMuted }}>Reset</button>}
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center transition-all border" style={{ borderColor: T.line, color: T.inkMuted }}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Active */}
        {active.length > 0 && (
          <div className="px-6 pb-4 flex flex-wrap gap-1.5 items-center">
            <span className="text-[9.5px] uppercase tracking-[0.22em] font-medium mr-1" style={{ color: T.inkMuted }}>Stacked</span>
            {active.map(f => (
              <button key={`${f.t}-${f.v}`} onClick={() => f.t === 'status' ? toggle(sStatus, f.v, setSStatus) : f.t === 'area' ? toggleArea(f.v) : f.t === 'presentation' ? toggle(sPres, f.v, setSPres) : toggle(sFacets, f.v, setSFacets)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] transition-all" style={{ backgroundColor: T.espresso, color: T.cream }}>
                <span className="text-[11px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: T.blush }}>{f.t}</span>
                <span>{f.l}</span>
                <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] ml-0.5" style={{ backgroundColor: 'rgba(245,239,227,0.18)' }}>×</span>
              </button>
            ))}
          </div>
        )}

        {/* Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          
          {/* Size */}
          <div className="py-4 border-t" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3"><span className="text-[18px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: T.inkMuted }}>A session of</span></div>
            <div className="flex items-center justify-between gap-4 pl-1">
              <div className="flex items-center rounded-full p-1" style={{ backgroundColor: T.parchment, border: `1px solid ${T.line}` }}>
                <button onClick={() => setSize(Math.max(5, size - 5))} disabled={size <= 5} className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[17px] font-light disabled:opacity-35" style={{ color: T.ink }}>−</button>
                <span className="min-w-[88px] text-center text-[19px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, color: T.ink, letterSpacing: '-0.02em' }}>{size}<span className="text-[12.5px] italic ml-1" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>concepts</span></span>
                <button onClick={() => setSize(Math.min(50, size + 5))} disabled={size >= 50} className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[17px] font-light disabled:opacity-35" style={{ color: T.ink }}>+</button>
              </div>
              <span className="text-[12.5px] italic text-right" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>≈ {Math.round(size * 2)} min</span>
            </div>
          </div>

          {/* Status */}
          <div className="py-4 border-t" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3"><span className="text-[18px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: T.inkMuted }}>that are</span></div>
            <div className="flex flex-wrap gap-2 pl-1">
              {statusChips.map(ch => {
                const sel = sStatus.has(ch.id);
                return <button key={ch.id} onClick={() => toggle(sStatus, ch.id, setSStatus)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium transition-all border" style={{ backgroundColor: sel ? T.espresso : T.cream, color: sel ? T.cream : T.ink, borderColor: sel ? T.espresso : T.line, whiteSpace: 'nowrap' }}>
                  <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: ch.col }} /><span className="capitalize">{ch.l}</span><span className="text-[11.5px] italic ml-0.5" style={{ fontFamily: "'Fraunces', serif", color: sel ? T.blush : T.inkMuted }}>{ch.c}</span>
                </button>;
              })}
            </div>
          </div>

          {/* Areas */}
          {areas.length > 0 && <div className="py-4 border-t" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3"><span className="text-[18px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: T.inkMuted }}>in</span></div>
            <div className="pl-1">
              <button onClick={() => setAreaOpen(!areaOpen)} className="w-full flex items-center justify-between gap-3 p-3 rounded-[14px] text-left transition-all" style={{ backgroundColor: T.cream, border: `1px solid ${T.line}` }}>
                <div className="flex flex-col gap-0.5 flex-1">
                  <span className="text-[9.5px] uppercase tracking-[0.2em] font-medium" style={{ color: T.inkMuted }}>Area of the map</span>
                  <span className="text-[15px]" style={{ fontFamily: "'Fraunces', serif", color: T.ink }}>{sAreas.size === 0 ? <em style={{ color: T.blushDeep }}>anywhere</em> : [...sAreas].map(a => areas.find(ar => ar.id === a)?.name).join(', ')} on the map</span>
                </div>
                <ChevronDown className="w-4 h-4 transition-transform" style={{ color: T.inkMuted, transform: areaOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {areaOpen && <div className="mt-2 rounded-[14px] overflow-hidden" style={{ backgroundColor: T.parchment, border: `1px solid ${T.line}` }}>
                {areas.map(ar => {
                  const sel = sAreas.has(ar.id);
                  return <button key={ar.id} onClick={() => toggleArea(ar.id)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-all border-b last:border-b-0" style={{ borderColor: T.lineSoft, backgroundColor: sel ? 'rgba(250,245,236,0.5)' : 'transparent' }}>
                    <span className="w-[17px] h-[17px] rounded flex items-center justify-center text-[10px] border transition-all" style={{ backgroundColor: sel ? T.espresso : T.cream, borderColor: sel ? T.espresso : T.line, color: sel ? T.cream : 'transparent' }}>{sel && '✓'}</span>
                    <span className="text-[13px] flex-1" style={{ color: T.ink }}>{ar.name}</span>
                    <div className="w-11 h-1 rounded-sm overflow-hidden flex" style={{ backgroundColor: T.lineSoft }}>
                      <span className="h-full" style={{ width: `${ar.seg.m}%`, backgroundColor: T.sageDeep }} />
                      <span className="h-full" style={{ width: `${ar.seg.w}%`, backgroundColor: T.blushDeep }} />
                      <span className="h-full" style={{ width: `${ar.seg.a}%`, backgroundColor: '#c8b89c' }} />
                      <span className="h-full" style={{ width: `${ar.seg.c}%`, backgroundColor: '#4a3a2c' }} />
                    </div>
                    <span className="text-[12px] italic min-w-[42px] text-right" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>{ar.count.toLocaleString()}</span>
                  </button>;
                })}
              </div>}
              <div className="mt-2.5 text-center"><button className="text-[13px] transition-all hover:text-ink" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: T.inkMuted }}>narrow further by condition<span className="not-italic ml-1">→</span></button></div>
            </div>
          </div>}

          {/* Presentations */}
          <div className="py-4 border-t" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3"><span className="text-[18px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: T.inkMuted }}>presenting as</span></div>
            <div className="flex flex-wrap gap-2 pl-1">
              {presentations.map(p => {
                const sel = sPres.has(p.id);
                return <button key={p.id} onClick={() => toggle(sPres, p.id, setSPres)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium transition-all border" style={{ backgroundColor: sel ? T.espresso : T.cream, color: sel ? T.cream : T.ink, borderColor: sel ? T.espresso : T.line, whiteSpace: 'nowrap' }}>
                  <span>{p.label}</span><span className="text-[11.5px] italic ml-0.5" style={{ fontFamily: "'Fraunces', serif", color: sel ? T.blush : T.inkMuted }}>{p.count}</span>
                </button>;
              })}
              <button onClick={() => toggle(sPres, 'any', setSPres)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium transition-all border" style={{ backgroundColor: sPres.has('any') ? T.espresso : T.cream, color: sPres.has('any') ? T.cream : T.ink, borderColor: sPres.has('any') ? T.espresso : T.line, whiteSpace: 'nowrap' }}>
                <span>any</span><span className="text-[11.5px] italic ml-0.5" style={{ fontFamily: "'Fraunces', serif", color: sPres.has('any') ? T.blush : T.inkMuted }}>{concepts?.length || 0}</span>
              </button>
            </div>
          </div>

          {/* Facets */}
          <div className="py-4 border-t" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3"><span className="text-[18px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: T.inkMuted }}>about</span></div>
            <div className="flex flex-wrap gap-2 pl-1">
              {facets.map(f => {
                const sel = sFacets.has(f.id);
                return <button key={f.id} onClick={() => toggle(sFacets, f.id, setSFacets)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium transition-all border" style={{ backgroundColor: sel ? T.espresso : T.cream, color: sel ? T.cream : T.ink, borderColor: sel ? T.espresso : T.line, whiteSpace: 'nowrap' }}>
                  <span>{f.label}</span><span className="text-[11.5px] italic ml-0.5" style={{ fontFamily: "'Fraunces', serif", color: sel ? T.blush : T.inkMuted }}>{f.count}</span>
                </button>;
              })}
              <button onClick={() => toggle(sFacets, 'any', setSFacets)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-medium transition-all border" style={{ backgroundColor: sFacets.has('any') ? T.espresso : T.cream, color: sFacets.has('any') ? T.cream : T.ink, borderColor: sFacets.has('any') ? T.espresso : T.line, whiteSpace: 'nowrap' }}>
                <span>any</span><span className="text-[11.5px] italic ml-0.5" style={{ fontFamily: "'Fraunces', serif", color: sFacets.has('any') ? T.blush : T.inkMuted }}>{concepts?.length || 0}</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="py-4 border-t" style={{ borderColor: T.lineSoft }}>
            <div className="mb-3"><span className="text-[18px]" style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: T.inkMuted }}>or jump to</span></div>
            <div className="relative pl-1"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px]" style={{ color: T.inkMuted }}>⌕</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pt-3 pb-5" style={{ background: `linear-gradient(to top, ${T.cream} 70%, rgba(250,245,236,0))` }}>
          <div className="relative rounded-2xl p-4 mb-2.5" style={{ backgroundColor: T.blushSoft }}>
            <div className="absolute left-0 top-3.5 bottom-3.5 w-0.5 rounded-full" style={{ backgroundColor: T.blushDeep }} />
            <div className="text-[9.5px] uppercase tracking-[0.22em] font-medium mb-1.5" style={{ color: T.blushDeep }}>You'll practise</div>
            <div className="text-[14.5px] leading-[1.5]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 300, color: T.ink }} dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
          {available === 0 && <div className="text-[12.5px] italic text-center mb-2" style={{ fontFamily: "'Fraunces', serif", color: T.inkMuted }}>No concepts match your filters. <em style={{ color: T.blushDeep }}>Try removing some</em>.</div>}
          <button onClick={() => { onApplyFilters?.(); onClose(); }} disabled={available === 0} className="w-full py-4 rounded-full text-[14px] font-medium transition-all flex items-center justify-center gap-3 disabled:cursor-not-allowed" style={{ backgroundColor: available === 0 ? T.inkMuted : T.espresso, color: T.cream, fontFamily: "'Inter', sans-serif" }}>
            <span>Begin</span><span className="text-[14.5px] italic" style={{ fontFamily: "'Fraunces', serif", color: T.blush }}>{Math.min(size, available)} concepts</span><span className="transition-transform">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
