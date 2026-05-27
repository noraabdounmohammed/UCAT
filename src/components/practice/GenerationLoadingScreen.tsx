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

  const [currentPhase, setCurrentPhase] = useState(0);
  const [showBrief, setShowBrief] = useState(false);
  const [showConceptRows, setShowConceptRows] = useState<boolean[]>([]);
  const [showReady, setShowReady] = useState(false);
  const [hideProgress, setHideProgress] = useState(false);

  const greeting = useMemo(() => getTimeGreeting(), []);
  const setLabel = useMemo(() => getSetLabel(), []);

  // Phased messages
  const phases = [
    "Reading where you are on the map…",
    `Selecting from candidate concepts…`,
    "Choosing across your weakest areas…",
    "Dressing each as an AKT vignette…",
    "Calibrating to the MLA format…",
    "Ready."
  ];

  // Get actual concept titles for this session (limit to conceptCount)
  const sessionConceptTitles = useMemo(() => {
    if (!concepts || concepts.length === 0) return [];
    return concepts
      .slice(0, conceptCount)
      .map((c: any) => c.title || c.concept_title || '')
      .filter(Boolean);
  }, [concepts, conceptCount]);

  // Animation sequence
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    const numConcepts = sessionConceptTitles.length || conceptCount;

    timers.push(setTimeout(() => setCurrentPhase(0), 300));
    timers.push(setTimeout(() => setCurrentPhase(1), 2400));
    timers.push(setTimeout(() => setCurrentPhase(2), 4400));

    // Start revealing brief and concept rows one-by-one
    timers.push(setTimeout(() => setShowBrief(true), 4600));
    for (let i = 0; i < Math.max(numConcepts, 1); i++) {
      const delay = 5000 + i * 400;
      timers.push(setTimeout(() => {
        setShowConceptRows(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, delay));
    }

    timers.push(setTimeout(() => setCurrentPhase(3), 6400));
    timers.push(setTimeout(() => setCurrentPhase(4), 8200));

    // Ready state after 10 seconds or when isReady
    timers.push(setTimeout(() => {
      setCurrentPhase(5);
      setHideProgress(true);
      setShowReady(true);
    }, 10000));

    return () => timers.forEach(t => clearTimeout(t));
  }, [conceptCount, sessionConceptTitles.length]);

  // Jump to ready state if questions become available early
  useEffect(() => {
    if (isReady && !showReady) {
      setCurrentPhase(5);
      setHideProgress(true);
      setShowReady(true);
      setShowBrief(true);
      const all = sessionConceptTitles.map(() => true);
      setShowConceptRows(all.length > 0 ? all : [true]);
    }
  }, [isReady, showReady, sessionConceptTitles]);

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
          className="min-h-[28px] text-center mb-[18px] relative"
          style={{ animation: 'fadeUp 0.7s 0.5s both ease-out' }}
        >
          {phases.map((phase, idx) => (
            <span
              key={idx}
              className="absolute inset-0 flex items-center justify-center px-2 whitespace-nowrap"
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                fontSize: '15px',
                color: useParchmentTheme ? '#3B2A1E' : 'rgba(255,255,255,0.7)',
                opacity: idx === currentPhase ? 1 : idx < currentPhase ? 0 : 0,
                lineHeight: 1.4,
                transition: 'opacity 0.45s ease-out',
                padding: '0 8px'
              }}
            >
              {phase}
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

          {/* Concept rows — actual session concepts revealed one by one */}
          <div className="flex flex-col gap-[10px] mb-[18px]">
            {sessionConceptTitles.length > 0 ? sessionConceptTitles.map((title: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-3 text-[14px]"
                style={{
                  opacity: showConceptRows[idx] ? 1 : 0,
                  transform: showConceptRows[idx] ? 'translateY(0)' : 'translateY(6px)',
                  transition: 'opacity 0.5s ease-out, transform 0.5s ease-out'
                }}
              >
                <span 
                  className="w-[9px] h-[9px] rounded-full flex-shrink-0"
                  style={{ background: useParchmentTheme ? '#E5A89D' : '#f87171' }}
                />
                <span 
                  style={{ 
                    fontFamily: "'Fraunces', serif",
                    fontStyle: 'italic',
                    color: useParchmentTheme ? '#3B2A1E' : 'rgba(255,255,255,0.85)',
                    fontSize: '13.5px',
                    lineHeight: 1.35
                  }}
                >
                  {title}
                </span>
              </div>
            )) : (
              // Fallback placeholder rows if no concept data yet
              Array.from({ length: conceptCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3"
                  style={{
                    opacity: showConceptRows[idx] ? 1 : 0,
                    transform: showConceptRows[idx] ? 'translateY(0)' : 'translateY(6px)',
                    transition: 'opacity 0.5s ease-out, transform 0.5s ease-out'
                  }}
                >
                  <span 
                    className="w-[9px] h-[9px] rounded-full flex-shrink-0"
                    style={{ background: useParchmentTheme ? '#E5A89D' : '#f87171' }}
                  />
                  <div 
                    className="h-3 rounded-full animate-pulse"
                    style={{ 
                      width: `${120 + (idx * 30) % 80}px`,
                      background: useParchmentTheme ? '#D9CCB6' : 'rgba(255,255,255,0.15)'
                    }}
                  />
                </div>
              ))
            )}
          </div>
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
