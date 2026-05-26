import React, { useMemo } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface ConceptBreakdown {
  weak: number;      // mastery_level === 1 or accuracy < 50%
  drifting: number;  // not seen in > 3 weeks
  cold: number;      // never attempted (mastery_level === 0)
  solid: number;     // mastery_level === 2
}

interface SessionOpeningFrameProps {
  concepts: any[];
  onBegin: () => void;
  onCustomize?: () => void;
  greeting?: string;
}

// Get time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

// Estimate session time (roughly 2 min per concept)
const estimateTime = (conceptCount: number): string => {
  const minutes = Math.round(conceptCount * 2);
  if (minutes < 60) return `≈ ${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `≈ ${hours}h ${remainingMins}m`;
};

export const SessionOpeningFrame: React.FC<SessionOpeningFrameProps> = ({
  concepts,
  onBegin,
  onCustomize,
  greeting
}) => {
  const { theme, toggleTheme } = useTheme();
  const light = theme === 'light';
  const useParchment = light;

  // Calculate concept breakdown
  const breakdown = useMemo<ConceptBreakdown>(() => {
    const now = Date.now();
    const threeWeeksMs = 21 * 24 * 60 * 60 * 1000;
    
    let weak = 0, drifting = 0, cold = 0, solid = 0;
    
    concepts.forEach((c: any) => {
      const md = c.mastery_data;
      const attempts = md?.attempts ?? 0;
      const masteryLevel = md?.mastery_level ?? 0;
      const lastPracticed = md?.last_practiced ? new Date(md.last_practiced).getTime() : null;
      
      if (attempts === 0) {
        // Never seen
        cold++;
      } else if (masteryLevel === 1) {
        // Needs review / weak
        weak++;
      } else if (masteryLevel === 2) {
        // Check if drifting (not seen in 3 weeks)
        if (lastPracticed && (now - lastPracticed) > threeWeeksMs) {
          drifting++;
        } else {
          solid++;
        }
      } else {
        // Default to cold if no mastery
        cold++;
      }
    });
    
    return { weak, drifting, cold, solid };
  }, [concepts]);

  // Get unique subjects/topics from concepts
  const subjects = useMemo(() => {
    const subjectSet = new Set<string>();
    concepts.forEach((c: any) => {
      // Try to extract subject from custom_filters or title
      if (c.custom_filters && c.custom_filters.length > 0) {
        // Take first filter as subject hint
        subjectSet.add(c.custom_filters[0].replace(/-/g, ' '));
      }
    });
    return Array.from(subjectSet).slice(0, 4); // Max 4 subjects
  }, [concepts]);

  const totalConcepts = concepts.length;
  const displayGreeting = greeting || getGreeting();

  return (
    <div 
      className={cn(
        "fixed inset-0 flex flex-col overflow-y-auto z-50",
        useParchment ? "bg-[#F4ECDF]" : "bg-[#0A0A0A]"
      )}
      style={useParchment ? {
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0.03 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        backgroundBlendMode: 'multiply'
      } : undefined}
    >
      {/* Theme toggle */}
      <div className="sticky top-0 z-10 flex justify-end px-4 pt-4">
        <button
          onClick={toggleTheme}
          className={cn(
            'p-2 rounded-full transition-colors',
            useParchment ? 'hover:bg-[#EBE1D0] text-[#8A7560]' : 'hover:bg-white/10 text-white/60'
          )}
          aria-label="Toggle theme"
        >
          {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col max-w-[480px] mx-auto w-full px-7 pb-10">
        {/* Top label */}
        <div 
          className={cn(
            "text-[11px] font-medium tracking-[0.24em] uppercase mb-3.5 animate-in slide-in-from-bottom-2 duration-500",
            useParchment ? "text-[#8A7560]" : "text-white/50"
          )}
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
        >
          Tonight's set
        </div>

        {/* Greeting */}
        <div 
          className={cn(
            "text-[18px] font-light italic mb-7 animate-in slide-in-from-bottom-2 duration-500",
            useParchment ? "text-[#8A7560]" : "text-white/50"
          )}
          style={{ fontFamily: "'Fraunces', serif", animationDelay: '0.2s', animationFillMode: 'both' }}
        >
          {displayGreeting}.
        </div>

        {/* Main headline */}
        <h1 
          className={cn(
            "text-[44px] font-light leading-[0.95] tracking-[-0.03em] mb-2 animate-in slide-in-from-bottom-2 duration-500",
            useParchment ? "text-[#2A1E16]" : "text-white"
          )}
          style={{ fontFamily: "'Fraunces', serif", animationDelay: '0.3s', animationFillMode: 'both' }}
        >
          {totalConcepts} concepts.<br />
          The system <em className="italic text-[#E5A89D]">chose</em> them.
        </h1>

        {/* Subtitle */}
        <p 
          className={cn(
            "text-[15px] font-light italic mb-9 animate-in slide-in-from-bottom-2 duration-500",
            useParchment ? "text-[#8A7560]" : "text-white/50"
          )}
          style={{ fontFamily: "'Fraunces', serif", animationDelay: '0.4s', animationFillMode: 'both' }}
        >
          A mix designed for where you are tonight.
        </p>

        {/* Breakdown rows */}
        <div 
          className={cn(
            "flex flex-col rounded-[14px] overflow-hidden border mb-7 animate-in slide-in-from-bottom-2 duration-500",
            useParchment ? "bg-[#E8DCC4] border-[#D9CCB6]" : "bg-white/5 border-white/10"
          )}
          style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
        >
          {breakdown.weak > 0 && (
            <div className={cn(
              "flex items-center gap-3.5 px-[18px] py-4",
              useParchment ? "bg-[#FAF5EC]" : "bg-white/5"
            )}>
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5A89D] flex-shrink-0" />
              <span 
                className={cn(
                  "text-[22px] font-normal tracking-[-0.02em] min-w-[28px]",
                  useParchment ? "text-[#2A1E16]" : "text-white"
                )}
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {breakdown.weak}
              </span>
              <span className={cn(
                "text-[13.5px] leading-[1.4]",
                useParchment ? "text-[#3B2A1E]" : "text-white/70"
              )}>
                <em className="text-[#E5A89D] italic" style={{ fontFamily: "'Fraunces', serif" }}>weak</em>
                <span className={useParchment ? "text-[#8A7560]" : "text-white/50"}> — accuracy below 50%</span>
              </span>
            </div>
          )}
          
          {breakdown.drifting > 0 && (
            <div className={cn(
              "flex items-center gap-3.5 px-[18px] py-4 border-t",
              useParchment ? "bg-[#FAF5EC] border-[#E8DCC4]" : "bg-white/5 border-white/5"
            )}>
              <span className="w-2.5 h-2.5 rounded-full bg-[#c8b89c] flex-shrink-0" />
              <span 
                className={cn(
                  "text-[22px] font-normal tracking-[-0.02em] min-w-[28px]",
                  useParchment ? "text-[#2A1E16]" : "text-white"
                )}
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {breakdown.drifting}
              </span>
              <span className={cn(
                "text-[13.5px] leading-[1.4]",
                useParchment ? "text-[#3B2A1E]" : "text-white/70"
              )}>
                <em className="text-[#c8b89c] italic" style={{ fontFamily: "'Fraunces', serif" }}>drifting</em>
                <span className={useParchment ? "text-[#8A7560]" : "text-white/50"}> — not seen in over three weeks</span>
              </span>
            </div>
          )}
          
          {breakdown.cold > 0 && (
            <div className={cn(
              "flex items-center gap-3.5 px-[18px] py-4 border-t",
              useParchment ? "bg-[#FAF5EC] border-[#E8DCC4]" : "bg-white/5 border-white/5"
            )}>
              <span className="w-2.5 h-2.5 rounded-full bg-[#4a3a2c] flex-shrink-0" />
              <span 
                className={cn(
                  "text-[22px] font-normal tracking-[-0.02em] min-w-[28px]",
                  useParchment ? "text-[#2A1E16]" : "text-white"
                )}
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {breakdown.cold}
              </span>
              <span className={cn(
                "text-[13.5px] leading-[1.4]",
                useParchment ? "text-[#3B2A1E]" : "text-white/70"
              )}>
                <em style={{ fontFamily: "'Fraunces', serif", color: useParchment ? '#4a3a2c' : '#c8b89c' }} className="italic">cold & high-yield</em>
                <span className={useParchment ? "text-[#8A7560]" : "text-white/50"}> — never met, often tested</span>
              </span>
            </div>
          )}
        </div>

        {/* Subject chips */}
        {subjects.length > 0 && (
          <div 
            className="flex flex-wrap gap-1.5 mb-7 animate-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
          >
            <span 
              className={cn(
                "text-[11px] font-medium tracking-[0.18em] uppercase mr-1.5 leading-[28px]",
                useParchment ? "text-[#8A7560]" : "text-white/50"
              )}
            >
              Across
            </span>
            {subjects.map((subject, i) => (
              <span 
                key={i}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[13px] italic border",
                  useParchment 
                    ? "bg-[#F4ECDF] border-[#D9CCB6] text-[#2A1E16]" 
                    : "bg-white/5 border-white/10 text-white/80"
                )}
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {subject}
              </span>
            ))}
          </div>
        )}

        {/* Time estimate */}
        <div 
          className={cn(
            "pt-5 border-t mb-6 animate-in slide-in-from-bottom-2 duration-500",
            useParchment ? "border-[#E8DCC4]" : "border-white/10"
          )}
          style={{ animationDelay: '0.7s', animationFillMode: 'both' }}
        >
          <p 
            className={cn(
              "text-[14px] italic",
              useParchment ? "text-[#8A7560]" : "text-white/50"
            )}
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {estimateTime(totalConcepts)}. <strong className={cn(
              "font-medium not-italic",
              useParchment ? "text-[#2A1E16]" : "text-white"
            )} style={{ fontFamily: "'Inter', sans-serif" }}>No timer</strong> during the session.
          </p>
        </div>

        {/* CTA section - pushed to bottom */}
        <div 
          className="mt-auto animate-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: '0.8s', animationFillMode: 'both' }}
        >
          <button
            onClick={onBegin}
            className={cn(
              "w-full py-5 rounded-full font-medium text-[15px] tracking-[0.01em] transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98]",
              useParchment
                ? "bg-[#1F140C] text-[#FAF5EC] hover:bg-[#3B2A1E] hover:-translate-y-0.5"
                : "bg-white text-[#0A0A0A] hover:bg-white/90 hover:-translate-y-0.5"
            )}
          >
            <span>Begin</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
          
          {onCustomize && (
            <button
              onClick={onCustomize}
              className={cn(
                "w-full mt-3.5 text-center text-[13px] italic transition-colors",
                useParchment 
                  ? "text-[#8A7560] hover:text-[#2A1E16]" 
                  : "text-white/40 hover:text-white/70"
              )}
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              or choose your own slice of the map
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
