import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface GenerationLoadingScreenProps {
  conceptCount?: number;
  isReady?: boolean;
  onComplete?: () => void;
  concepts?: any[];
  /** Full curriculum concepts list — used to resolve question.concept_id → concept for system extraction */
  allConcepts?: any[];
  practiceQuestions?: any[];
}

// Returns the time-aware headline phrase fragment that follows "Choosing ".
// Grammar-correct: needs the leading article "this" for morning/afternoon/evening,
// but "tonight's" already reads correctly without one.
const getHeadlineFragment = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "this morning's";
  if (hour >= 12 && hour < 17) return "this afternoon's";
  if (hour >= 17 && hour < 21) return "this evening's";
  return "tonight's";
};

// Returns time-aware set label (already prefixed with "This" for non-night times).
const getSetLabel = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "This morning's set";
  if (hour >= 12 && hour < 17) return "This afternoon's set";
  if (hour >= 17 && hour < 21) return "This evening's set";
  return "Tonight's set";
};

// Whitelist of clinical systems / specialties we'll display in the strip.
// Anything outside this list (e.g. specific condition names) is intentionally hidden
// so we never spoil the answer to a question.
const SYSTEM_ALIASES: Record<string, string> = {
  cardiology: 'cardiology', cardiovascular: 'cardiology', cardio: 'cardiology', heart: 'cardiology',
  respiratory: 'respiratory', pulmonary: 'respiratory', lungs: 'respiratory',
  neurology: 'neurology', neurological: 'neurology', neuro: 'neurology', neuroscience: 'neurology', 'nervous-system': 'neurology',
  gastroenterology: 'gastroenterology', gastro: 'gastroenterology', gi: 'gastroenterology', 'gastro-intestinal': 'gastroenterology', gastrointestinal: 'gastroenterology', digestive: 'gastroenterology',
  renal: 'renal', nephrology: 'renal', kidney: 'renal', urology: 'urology',
  endocrine: 'endocrine', endocrinology: 'endocrine', metabolic: 'endocrine',
  haematology: 'haematology', hematology: 'haematology', blood: 'haematology',
  musculoskeletal: 'musculoskeletal', msk: 'musculoskeletal', orthopaedics: 'musculoskeletal', orthopedics: 'musculoskeletal', rheumatology: 'rheumatology',
  dermatology: 'dermatology', skin: 'dermatology',
  psychiatry: 'psychiatry', psychiatric: 'psychiatry', 'mental-health': 'psychiatry',
  obstetrics: 'obstetrics & gynaecology', gynaecology: 'obstetrics & gynaecology', gynecology: 'obstetrics & gynaecology', 'obs-gyn': 'obstetrics & gynaecology', reproductive: 'obstetrics & gynaecology',
  paediatrics: 'paediatrics', pediatrics: 'paediatrics', 'child-health': 'paediatrics',
  ophthalmology: 'ophthalmology', eyes: 'ophthalmology',
  ent: 'ENT', otolaryngology: 'ENT', 'ear-nose-throat': 'ENT',
  oncology: 'oncology', cancer: 'oncology',
  infectious: 'infectious disease', 'infectious-disease': 'infectious disease', microbiology: 'infectious disease', 'id': 'infectious disease',
  immunology: 'immunology',
  emergency: 'emergency medicine', 'acute-care': 'emergency medicine',
  surgery: 'surgery', 'general-surgery': 'surgery',
  pharmacology: 'pharmacology'
};

const toSystem = (raw: string): string | null => {
  const key = String(raw || '').toLowerCase().trim().replace(/\s+/g, '-');
  return SYSTEM_ALIASES[key] || null;
};

export const GenerationLoadingScreen: React.FC<GenerationLoadingScreenProps> = ({
  conceptCount = 5,
  isReady = false,
  onComplete,
  concepts = [],
  allConcepts = [],
  practiceQuestions = []
}) => {
  // Always promise the user at least 5 concepts; never display 0.
  const safeConceptCount = Math.max(5, conceptCount || 5);
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const useParchmentTheme = isLightMode;

  const [currentPhase, setCurrentPhase] = useState(-1);
  const [showBrief, setShowBrief] = useState(false);
  const [showMixRows, setShowMixRows] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [showSystems, setShowSystems] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [hideProgress, setHideProgress] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const headlineFragment = useMemo(() => getHeadlineFragment(), []);
  const setLabel = useMemo(() => getSetLabel(), []);

  // Limit concepts to the actual session size
  const sessionConcepts = useMemo(() => {
    if (!concepts || concepts.length === 0) return [];
    return concepts.slice(0, safeConceptCount);
  }, [concepts, safeConceptCount]);

  // Compute candidate pool size (rough estimate of total concepts to draw from)
  const candidateCount = useMemo(() => {
    return concepts && concepts.length > 0 ? concepts.length : Math.max(40, safeConceptCount * 8);
  }, [concepts, safeConceptCount]);

  // Compute weak / drifting / cold breakdown from this session's concepts
  const mixData = useMemo(() => {
    const now = Date.now();
    const threeWeeksMs = 21 * 24 * 60 * 60 * 1000;
    let weak = 0;
    let drifting = 0;
    let cold = 0;

    sessionConcepts.forEach((c: any) => {
      const m = c?.mastery_data || {};
      const attempts = m.attempts || 0;
      const correct = m.correct || 0;
      const lastPracticed = m.last_practiced ? new Date(m.last_practiced).getTime() : null;

      if (attempts === 0) {
        cold++;
      } else if (correct / attempts < 0.5) {
        weak++;
      } else if (lastPracticed && now - lastPracticed > threeWeeksMs) {
        drifting++;
      } else {
        // Default unattributed concepts to cold (likely fresh / lightly seen)
        cold++;
      }
    });

    // If we have no real data, fall back to a sensible split that ALWAYS sums to safeConceptCount
    if (weak === 0 && drifting === 0 && cold === 0) {
      weak = Math.max(1, Math.round(safeConceptCount * 0.5));
      drifting = Math.max(1, Math.round(safeConceptCount * 0.3));
      cold = Math.max(1, safeConceptCount - weak - drifting);
    }

    return { weak, drifting, cold };
  }, [sessionConcepts, safeConceptCount]);

  // Derive systems from the actual questions when available. Each question carries a
  // `concept_id` — we resolve it back to the full concept (which has rich `custom_filters`)
  // so we never miss a system just because a question's own metadata is sparse.
  // Only known clinical systems pass through the whitelist; specific condition names
  // are intentionally filtered out so they can't spoil answers.
  const systems = useMemo(() => {
    const found = new Set<string>();

    const conceptById = new Map<string, any>();
    const conceptByTitle = new Map<string, any>();
    (allConcepts || []).forEach((c: any) => {
      if (c?.concept_id) conceptById.set(c.concept_id, c);
      if (c?.id) conceptById.set(c.id, c);
      if (c?.title) conceptByTitle.set(String(c.title).toLowerCase(), c);
    });

    const collectFromItem = (item: any) => {
      const sources: string[] = [];
      if (Array.isArray(item?.custom_filters)) sources.push(...item.custom_filters);
      if (Array.isArray(item?.tags)) sources.push(...item.tags);
      if (item?.system) sources.push(item.system);
      if (item?.specialty) sources.push(item.specialty);
      if (item?.body_system) sources.push(item.body_system);
      if (item?.category) sources.push(item.category);
      sources.forEach((raw: string) => {
        const sys = toSystem(raw);
        if (sys) found.add(sys);
      });
    };

    if (practiceQuestions && practiceQuestions.length > 0) {
      practiceQuestions.forEach((q: any) => {
        // Pull anything carried directly on the question
        collectFromItem(q);
        // Resolve the underlying concept (which usually has the richest filters)
        const concept =
          (q?.concept_id && conceptById.get(q.concept_id)) ||
          (q?.concept_title && conceptByTitle.get(String(q.concept_title).toLowerCase())) ||
          (q?.title && conceptByTitle.get(String(q.title).toLowerCase()));
        if (concept) collectFromItem(concept);
      });
    }
    if (found.size === 0) sessionConcepts.forEach(collectFromItem);
    return Array.from(found).slice(0, 6);
  }, [practiceQuestions, sessionConcepts, allConcepts]);

  // Phased messages with optional emphasized fragments — matches the HTML
  const phases: Array<{ before: string; em?: string; after?: string }> = [
    { before: 'Reading where you are on the map…' },
    { before: 'Selecting from ', em: `${candidateCount} candidate`, after: ' concepts…' },
    { before: 'Choosing across ', em: 'your weakest', after: ' areas…' },
    { before: 'Dressing each as an ', em: 'AKT vignette', after: '…' },
    { before: 'Calibrating to the ', em: 'MLA format', after: '…' },
    { before: 'Ready.' }
  ];

  // Animation sequence — timings match the reference HTML script exactly.
  // Progress percent advances in lock-step with each phase so the bar visibly fills.
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Kick the bar off so the CSS transition has something to animate to.
    timers.push(setTimeout(() => setProgressPercent(8), 50));
    timers.push(setTimeout(() => { setCurrentPhase(0); setProgressPercent(15); }, 300));
    timers.push(setTimeout(() => { setCurrentPhase(1); setProgressPercent(32); }, 2400));
    timers.push(setTimeout(() => { setCurrentPhase(2); setProgressPercent(48); }, 4400));
    timers.push(setTimeout(() => setShowBrief(true), 4600));
    timers.push(setTimeout(() => setShowMixRows(prev => [true, prev[1], prev[2]]), 5000));
    timers.push(setTimeout(() => { setCurrentPhase(3); setProgressPercent(64); }, 6400));
    timers.push(setTimeout(() => setShowMixRows(prev => [prev[0], true, prev[2]]), 6600));
    timers.push(setTimeout(() => setShowMixRows(prev => [prev[0], prev[1], true]), 7400));
    timers.push(setTimeout(() => { setCurrentPhase(4); setProgressPercent(82); }, 8200));
    timers.push(setTimeout(() => setShowSystems(true), 8400));
    timers.push(setTimeout(() => {
      setCurrentPhase(5);
      setProgressPercent(100);
      setHideProgress(true);
      setShowReady(true);
    }, 10000));

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  // Jump to ready state if questions become available early
  useEffect(() => {
    if (isReady && !showReady) {
      setCurrentPhase(5);
      setProgressPercent(100);
      setHideProgress(true);
      setShowReady(true);
      setShowBrief(true);
      setShowMixRows([true, true, true]);
      setShowSystems(true);
    }
  }, [isReady, showReady]);

  const handleBegin = () => {
    onComplete?.();
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: useParchmentTheme ? '#F4ECDF' : '#0A0A0A',
        backgroundImage: useParchmentTheme 
          ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0.045 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`
          : undefined,
        backgroundBlendMode: useParchmentTheme ? 'multiply' : undefined
      }}
    >
      <div className="w-full max-w-[440px] px-7 py-8 flex flex-col items-center" style={{ paddingTop: '40px', paddingBottom: '32px' }}>
        {/* Star Mark */}
        <div className="text-center mt-2 mb-9" style={{ animation: 'fadeUp 0.7s 0.1s both ease-out' }}>
          <span 
            className="text-[44px] leading-none inline-block"
            style={{ 
              fontFamily: "'Fraunces', serif",
              fontStyle: 'italic',
              fontWeight: 300,
              color: useParchmentTheme ? '#E5A89D' : '#f87171',
              animation: 'gentlePulse 3.4s ease-in-out infinite'
            }}
          >
            ✦
          </span>
        </div>

        {/* Headline */}
        <h1 
          className="text-[34px] leading-[1.05] text-center mb-3"
          style={{ 
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            letterSpacing: '-0.025em',
            color: useParchmentTheme ? '#2A1E16' : 'white',
            animation: 'fadeUp 0.7s 0.25s both ease-out',
            marginBottom: '12px'
          }}
        >
          Choosing {headlineFragment}<br />
          <em style={{ color: useParchmentTheme ? '#E5A89D' : '#f87171' }}>concepts</em>
        </h1>

        {/* Subhead */}
        <p 
          className="text-[14.5px] text-center mb-11"
          style={{ 
            fontFamily: "'Fraunces', serif",
            fontStyle: 'italic',
            color: useParchmentTheme ? '#8A7560' : 'rgba(255,255,255,0.5)',
            animation: 'fadeUp 0.7s 0.35s both ease-out',
            marginBottom: '44px'
          }}
        >
          A set tuned to where you are on the map
        </p>

        {/* Phase Zone */}
        <div 
          className="min-h-[28px] text-center mb-[18px] relative w-full"
          style={{ animation: 'fadeUp 0.7s 0.5s both ease-out' }}
        >
          {phases.map((phase, idx) => (
            <span
              key={idx}
              className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                fontSize: '15px',
                color: useParchmentTheme ? '#3B2A1E' : 'rgba(255,255,255,0.7)',
                opacity: idx === currentPhase ? 1 : 0,
                lineHeight: 1.4,
                transition: 'opacity 0.45s ease-out',
                padding: '0 8px'
              }}
            >
              {phase.before}
              {phase.em && (
                <em style={{ color: useParchmentTheme ? '#E5A89D' : '#f87171', fontStyle: 'italic', fontWeight: 400 }}>
                  {phase.em}
                </em>
              )}
              {phase.after}
            </span>
          ))}
        </div>

        {/* Progress Bar — determinate, fills as phases advance */}
        {!hideProgress && (
          <div
            className="h-[2px] rounded-2 overflow-hidden relative w-full max-w-[280px]"
            style={{
              background: useParchmentTheme ? '#E8DCC4' : 'rgba(255,255,255,0.1)',
              animation: 'fadeUp 0.7s 0.6s both ease-out',
              margin: '0 auto 56px'
            }}
          >
            <div
              className="absolute top-0 bottom-0 left-0 rounded-2"
              style={{
                background: useParchmentTheme ? '#1F140C' : 'white',
                width: `${progressPercent}%`,
                transition: 'width 0.6s ease-out'
              }}
            />
          </div>
        )}

        {/* Brief Zone */}
        <div 
          className="w-full max-w-[320px] pt-[22px] border-t"
          style={{
            borderColor: useParchmentTheme ? '#E8DCC4' : 'rgba(255,255,255,0.1)',
            opacity: showBrief ? 1 : 0,
            transition: 'opacity 0.6s ease-out',
            paddingTop: '22px'
          }}
        >
          <div 
            className="text-center mb-[18px]"
            style={{ 
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: useParchmentTheme ? '#8A7560' : 'rgba(255,255,255,0.5)',
              fontWeight: 500,
              marginBottom: '18px'
            }}
          >
            {setLabel}
          </div>

          {/* Mix rows — weak / drifting / cold counts from this session */}
          <div className="flex flex-col gap-[10px] mb-[18px]">
            {([
              { type: 'weak', count: mixData.weak, em: 'weak', tail: '— accuracy below 50%', pip: useParchmentTheme ? '#E5A89D' : '#f87171' },
              { type: 'drifting', count: mixData.drifting, em: 'drifting', tail: '— not seen in three weeks', pip: '#c8b89c' },
              { type: 'cold', count: mixData.cold, em: 'cold & high-yield', tail: '— never met', pip: useParchmentTheme ? '#4a3a2c' : '#6b5d52' }
            ]).map((row, idx) => (
              <div
                key={row.type}
                className="flex items-center gap-3"
                style={{
                  fontSize: '14px',
                  color: useParchmentTheme ? '#2A1E16' : 'white',
                  opacity: showMixRows[idx] ? 1 : 0,
                  transform: showMixRows[idx] ? 'translateY(0)' : 'translateY(6px)',
                  transition: 'opacity 0.5s ease-out, transform 0.5s ease-out'
                }}
              >
                <span
                  className="w-[9px] h-[9px] rounded-full flex-shrink-0"
                  style={{ background: row.pip }}
                />
                <span
                  className="min-w-[18px]"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 400,
                    fontSize: '18px',
                    letterSpacing: '-0.02em',
                    color: useParchmentTheme ? '#2A1E16' : 'white'
                  }}
                >
                  {row.count}
                </span>
                <span
                  className="flex-1"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontStyle: 'italic',
                    color: useParchmentTheme ? '#3B2A1E' : 'rgba(255,255,255,0.7)',
                    fontSize: '13.5px'
                  }}
                >
                  <em style={{ color: useParchmentTheme ? '#E5A89D' : '#f87171', fontStyle: 'italic' }}>{row.em}</em> {row.tail}
                </span>
              </div>
            ))}
          </div>

          {/* Systems strip */}
          {systems.length > 0 && (
            <div
              className="flex flex-wrap justify-center gap-[6px] mt-[14px]"
              style={{
                opacity: showSystems ? 1 : 0,
                transition: 'opacity 0.6s ease-out'
              }}
            >
              {systems.map((sys: string, idx: number) => (
                <span
                  key={idx}
                  style={{
                    background: useParchmentTheme ? '#F4ECDF' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${useParchmentTheme ? '#D9CCB6' : 'rgba(255,255,255,0.1)'}`,
                    padding: '4px 11px',
                    borderRadius: '100px',
                    fontFamily: "'Fraunces', serif",
                    fontStyle: 'italic',
                    fontSize: '12.5px',
                    color: useParchmentTheme ? '#2A1E16' : 'white'
                  }}
                >
                  {sys}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto" style={{ paddingTop: '32px' }}>
          {!showReady && (
            <p 
              className="text-center mb-[18px]"
              style={{ 
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                fontSize: '12.5px',
                color: useParchmentTheme ? '#8A7560' : 'rgba(255,255,255,0.5)',
                marginBottom: '18px'
              }}
            >
              Usually 10–30 seconds
            </p>
          )}

          {showReady && (
            <button
              onClick={handleBegin}
              className="w-full flex items-center justify-center gap-3 transition-all"
              style={{
                background: useParchmentTheme ? '#1F140C' : 'white',
                color: useParchmentTheme ? '#FAF5EC' : '#0A0A0A',
                border: 'none',
                borderRadius: '100px',
                padding: '18px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontSize: '15px',
                lineHeight: 1,
                cursor: 'pointer',
                animation: 'fadeUp 0.6s both ease-out'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = useParchmentTheme ? '#3B2A1E' : '#e5e5e5'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = useParchmentTheme ? '#1F140C' : 'white'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span>Begin ·</span>
              <span 
                style={{ 
                  fontFamily: 'Fraunces, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: useParchmentTheme ? '#F2C9C1' : '#E5A89D'
                }}
              >
                {safeConceptCount} concept{safeConceptCount !== 1 ? 's' : ''}
              </span>
              <span className="arrow" style={{ transition: 'transform 0.2s' }}>→</span>
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes gentlePulse {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};
