import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface GenerationLoadingScreenProps {
  conceptCount?: number;
  isReady?: boolean;
  onComplete?: () => void;
}

export const GenerationLoadingScreen: React.FC<GenerationLoadingScreenProps> = ({
  conceptCount = 1,
  isReady = false,
  onComplete
}) => {
  const { theme } = useTheme();
  const isLightMode = theme === 'light';
  const useParchmentTheme = isLightMode;

  const [currentPhase, setCurrentPhase] = useState(0);
  const [showBrief, setShowBrief] = useState(false);
  const [showMixRows, setShowMixRows] = useState([false, false, false]);
  const [showSystems, setShowSystems] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [hideProgress, setHideProgress] = useState(false);

  // Phased messages
  const phases = [
    "Reading where you are on the map…",
    `Selecting from ${Math.floor(Math.random() * 30) + 40} candidate concepts…`,
    "Choosing across your weakest areas…",
    "Dressing each as an AKT vignette…",
    "Calibrating to the MLA format…",
    "Ready."
  ];

  // Simulated concept mix data
  const mixData = [
    { type: 'weak', count: Math.max(1, Math.floor(conceptCount * 0.5)), label: 'weak — accuracy below 50%' },
    { type: 'drifting', count: Math.max(1, Math.floor(conceptCount * 0.3)), label: 'drifting — not seen in three weeks' },
    { type: 'cold', count: Math.max(1, Math.floor(conceptCount * 0.2)), label: 'cold & high-yield — never met' }
  ];

  // Simulated systems
  const systems = ['cardiology', 'psychiatry', 'renal', 'respiratory', 'gastroenterology'].slice(0, Math.min(5, Math.ceil(conceptCount / 3)));

  // Animation sequence - stops at ready state
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Phase sequence
    timers.push(setTimeout(() => setCurrentPhase(0), 300));
    timers.push(setTimeout(() => setCurrentPhase(1), 2400));
    timers.push(setTimeout(() => setCurrentPhase(2), 4400));
    
    // Start revealing brief
    timers.push(setTimeout(() => setShowBrief(true), 4600));
    timers.push(setTimeout(() => setShowMixRows(prev => [true, prev[1], prev[2]]), 5000));
    timers.push(setTimeout(() => setCurrentPhase(3), 6400));
    timers.push(setTimeout(() => setShowMixRows(prev => [prev[0], true, prev[2]]), 6600));
    timers.push(setTimeout(() => setShowMixRows(prev => [prev[0], prev[1], true]), 7400));
    timers.push(setTimeout(() => setCurrentPhase(4), 8200));
    timers.push(setTimeout(() => setShowSystems(true), 8400));
    
    // Ready state - show when isReady or after 10 seconds
    const showReadyState = () => {
      setCurrentPhase(5);
      setHideProgress(true);
      setShowReady(true);
    };
    
    timers.push(setTimeout(showReadyState, 10000));

    return () => timers.forEach(t => clearTimeout(t));
  }, [conceptCount]);

  // If questions become ready early, jump to ready state
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
      <div className="w-full max-w-[440px] px-7 py-10 flex flex-col items-center">
        {/* Star Mark */}
        <div className="text-center mb-9" style={{ animation: 'fadeUp 0.7s 0.1s both ease-out' }}>
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
            animation: 'fadeUp 0.7s 0.25s both ease-out'
          }}
        >
          Choosing tonight's<br />
          <em style={{ color: useParchmentTheme ? '#E5A89D' : '#f87171' }}>concepts</em>
        </h1>

        {/* Subhead */}
        <p 
          className="text-[14.5px] text-center mb-11"
          style={{ 
            fontFamily: "'Fraunces', serif",
            fontStyle: 'italic',
            color: useParchmentTheme ? '#8A7560' : 'rgba(255,255,255,0.5)',
            animation: 'fadeUp 0.7s 0.35s both ease-out'
          }}
        >
          A set tuned to where you are on the map
        </p>

        {/* Phase Zone */}
        <div 
          className="h-8 text-center mb-[18px] relative"
          style={{ animation: 'fadeUp 0.7s 0.5s both ease-out' }}
        >
          {phases.map((phase, idx) => (
            <span
              key={idx}
              className="absolute inset-0 flex items-center justify-center px-2 transition-opacity duration-450 whitespace-nowrap"
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                fontSize: '15px',
                color: useParchmentTheme ? '#3B2A1E' : 'rgba(255,255,255,0.7)',
                opacity: idx === currentPhase ? 1 : idx < currentPhase ? 0 : 0,
                lineHeight: 1.4
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
              animation: 'fadeUp 0.7s 0.6s both ease-out'
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
          className="w-full max-w-[320px] pt-[22px] border-t transition-opacity duration-600"
          style={{
            borderColor: useParchmentTheme ? '#E8DCC4' : 'rgba(255,255,255,0.1)',
            opacity: showBrief ? 1 : 0
          }}
        >
          <div 
            className="text-center mb-[18px]"
            style={{ 
              fontSize: '10px',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: useParchmentTheme ? '#8A7560' : 'rgba(255,255,255,0.5)',
              fontWeight: 500
            }}
          >
            Tonight's set
          </div>

          {/* Mix Rows */}
          <div className="flex flex-col gap-[10px] mb-[18px]">
            {mixData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 text-[14px] transition-all duration-500"
                style={{
                  color: useParchmentTheme ? '#2A1E16' : 'white',
                  opacity: showMixRows[idx] ? 1 : 0,
                  transform: showMixRows[idx] ? 'translateY(0)' : 'translateY(6px)'
                }}
              >
                <span 
                  className="w-[9px] h-[9px] rounded-full flex-shrink-0"
                  style={{
                    background: item.type === 'weak' 
                      ? (useParchmentTheme ? '#E5A89D' : '#f87171')
                      : item.type === 'drifting'
                      ? (useParchmentTheme ? '#c8b89c' : '#a89f91')
                      : (useParchmentTheme ? '#4a3a2c' : '#6b5d52')
                  }}
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
                  {item.count}
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
                  <em style={{ color: useParchmentTheme ? '#E5A89D' : '#f87171' }}>{item.type}</em> — {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Systems Strip */}
          <div 
            className="flex flex-wrap justify-center gap-[6px] mt-[14px] transition-opacity duration-600"
            style={{ opacity: showSystems ? 1 : 0 }}
          >
            {systems.map((sys, idx) => (
              <span
                key={idx}
                className="px-[11px] py-1 rounded-full"
                style={{
                  background: useParchmentTheme ? '#F4ECDF' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${useParchmentTheme ? '#D9CCB6' : 'rgba(255,255,255,0.1)'}`,
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
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8">
          {!showReady && (
            <p 
              className="text-center mb-[18px]"
              style={{ 
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                fontSize: '12.5px',
                color: useParchmentTheme ? '#8A7560' : 'rgba(255,255,255,0.5)'
              }}
            >
              Usually 10–30 seconds
            </p>
          )}

          {showReady && (
            <button
              onClick={handleBegin}
              className="w-full py-[18px] rounded-full flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5"
              style={{
                background: useParchmentTheme ? '#1F140C' : 'white',
                color: useParchmentTheme ? '#FAF5EC' : '#0A0A0A',
                border: 'none',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: '15px',
                animation: 'fadeUp 0.6s both ease-out'
              }}
            >
              <span>Begin · </span>
              <span 
                style={{ 
                  fontFamily: "'Fraunces', serif",
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: useParchmentTheme ? '#F2C9C1' : '#E5A89D',
                  marginRight: '4px'
                }}
              >
                {conceptCount} concepts
              </span>
              <span style={{ transition: 'transform 0.2s' }}>→</span>
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
