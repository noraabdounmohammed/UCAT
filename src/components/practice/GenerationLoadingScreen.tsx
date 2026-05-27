import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface GenerationLoadingScreenProps {
  conceptCount?: number;
  isReady?: boolean;
  onComplete?: () => void;
  concepts?: any[];
}

// Returns time-aware greeting word
const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning's";
  if (hour >= 12 && hour < 17) return "afternoon's";
  if (hour >= 17 && hour < 21) return "evening's";
  return "tonight's";
};

// Returns time-aware set label
const getSetLabel = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "This morning's set";
  if (hour >= 12 && hour < 17) return "This afternoon's set";
  if (hour >= 17 && hour < 21) return "This evening's set";
  return "Tonight's set";
};

export const GenerationLoadingScreen: React.FC<GenerationLoadingScreenProps> = ({
  conceptCount = 1,
  isReady = false,
  onComplete,
  concepts = []
}) => {
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const useParchmentTheme = isLightMode;

  const [currentPhase, setCurrentPhase] = useState(-1);
  const [showBrief, setShowBrief] = useState(false);
  const [showMixRows, setShowMixRows] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [showSystems, setShowSystems] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [hideProgress, setHideProgress] = useState(false);

  const greeting = useMemo(() => getTimeGreeting(), []);
  const setLabel = useMemo(() => getSetLabel(), []);

  // Limit concepts to the actual session size
  const sessionConcepts = useMemo(() => {
    if (!concepts || concepts.length === 0) return [];
    return concepts.slice(0, conceptCount);
  }, [concepts, conceptCount]);

  // Compute candidate pool size (rough estimate of total concepts to draw from)
  const candidateCount = useMemo(() => {
    return concepts && concepts.length > 0 ? concepts.length : Math.max(40, conceptCount * 8);
  }, [concepts, conceptCount]);

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

    // If we have no real data, fall back to a sensible split
    if (weak === 0 && drifting === 0 && cold === 0 && conceptCount > 0) {
      weak = Math.max(1, Math.round(conceptCount * 0.5));
      drifting = Math.max(1, Math.round(conceptCount * 0.2));
      cold = Math.max(0, conceptCount - weak - drifting);
    }

    return { weak, drifting, cold };
  }, [sessionConcepts, conceptCount]);

  // Filter out non-system filters (e.g. format tags)
  const systems = useMemo(() => {
    const set = new Set<string>();
    sessionConcepts.forEach((c: any) => {
      (c?.custom_filters || []).forEach((f: string) => {
        const s = String(f || '').toLowerCase().trim();
        if (s.length > 2 && s.length < 24 && !s.includes('format')) set.add(s);
      });
    });
    return Array.from(set).slice(0, 5);
  }, [sessionConcepts]);

  // Phased messages with optional emphasized fragments — matches the HTML
  const phases: Array<{ before: string; em?: string; after?: string }> = [
    { before: 'Reading where you are on the map…' },
    { before: 'Selecting from ', em: `${candidateCount} candidate`, after: ' concepts…' },
    { before: 'Choosing across ', em: 'your weakest', after: ' areas…' },
    { before: 'Dressing each as an ', em: 'AKT vignette', after: '…' },
    { before: 'Calibrating to the ', em: 'MLA format', after: '…' },
    { before: 'Ready.' }
  ];

  // Animation sequence — timings match the reference HTML script exactly
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setCurrentPhase(0), 300));
    timers.push(setTimeout(() => setCurrentPhase(1), 2400));
    timers.push(setTimeout(() => setCurrentPhase(2), 4400));
    timers.push(setTimeout(() => setShowBrief(true), 4600));
    timers.push(setTimeout(() => setShowMixRows(prev => [true, prev[1], prev[2]]), 5000));
    timers.push(setTimeout(() => setCurrentPhase(3), 6400));
    timers.push(setTimeout(() => setShowMixRows(prev => [prev[0], true, prev[2]]), 6600));
    timers.push(setTimeout(() => setShowMixRows(prev => [prev[0], prev[1], true]), 7400));
    timers.push(setTimeout(() => setCurrentPhase(4), 8200));
    timers.push(setTimeout(() => setShowSystems(true), 8400));
    timers.push(setTimeout(() => {
      setCurrentPhase(5);
      setHideProgress(true);
      setShowReady(true);
    }, 10000));

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  // Jump to ready state if questions become available early
  useEffect(() => {
    if (isReady && !showReady) {
      setCurrentPhase(5);
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
          Choosing {greeting}<br />
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

        {/* Progress Bar */}
        {!hideProgress && (
          <div 
            className="h-[2px] mx-6 mb-14 rounded-2 overflow-hidden relative"
            style={{ 
              background: useParchmentTheme ? '#E8DCC4' : 'rgba(255,255,255,0.1)',
              animation: 'fadeUp 0.7s 0.6s both ease-out',
              margin: '0 24px 56px'
            }}
          >
            <div 
              className="absolute top-0 bottom-0 left-0 w-[35%] rounded-2"
              style={{ 
                background: useParchmentTheme ? '#1F140C' : 'white',
                animation: 'indeterminate 1.8s ease-in-out infinite'
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
                {conceptCount} concept{conceptCount !== 1 ? 's' : ''}
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
