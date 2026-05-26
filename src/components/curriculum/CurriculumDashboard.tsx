import React, { useState, useEffect, useMemo } from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ── STREAK HOOK ───────────────────────────────────────────────────────────────
function useStudyStreak(hasActivity: boolean) {
  const toDateStr = (d: Date) => d.toISOString().split('T')[0];
  const [streakCount, setStreakCount] = useState(0);
  const [weekDays, setWeekDays] = useState<('done' | 'today' | 'empty')[]>([]);

  useEffect(() => {
    const today = toDateStr(new Date());
    const raw = localStorage.getItem('study_streak_dates');
    const dates: string[] = raw ? JSON.parse(raw) : [];

    if (hasActivity && !dates.includes(today)) {
      dates.push(today);
      localStorage.setItem('study_streak_dates', JSON.stringify(dates));
    }

    let streak = 0;
    const cursor = new Date();
    if (!dates.includes(toDateStr(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dates.includes(toDateStr(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = toDateStr(d);
      if (ds === toDateStr(new Date())) return 'today' as const;
      if (dates.includes(ds)) return 'done' as const;
      return 'empty' as const;
    });

    setStreakCount(streak);
    setWeekDays(days);
  }, [hasActivity]);

  return { streakCount, weekDays };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const getGreeting = (): { time: string; message: string } => {
  const now = new Date();
  const hour = now.getHours();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  let period = 'morning';
  if (hour >= 12 && hour < 17) period = 'afternoon';
  else if (hour >= 17) period = 'evening';
  return { time: `${dayName} ${period} · ${timeStr}`, message: period === 'morning' ? 'Good morning' : period === 'afternoon' ? 'Good afternoon' : 'Good evening' };
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
interface CurriculumDashboardProps {
  curriculum?: {
    id: string;
    name: string;
    description: string;
    conceptCount: number;
    lastAccessed: Date;
    color: string;
    category: string;
    progress: number;
  };
  onStartPractice: () => void;
  onOpenFilters?: (format?: string, filter?: string) => void;
  onDirectPracticeStart?: (config: any) => void;
  onPreloadModal?: () => void;
  examDate?: Date;
  userName?: string;
}

export const CurriculumDashboard: React.FC<CurriculumDashboardProps> = ({
  onStartPractice,
  onOpenFilters,
  onPreloadModal,
  examDate,
  userName = 'there'
}) => {
  const { theme, toggleTheme } = useTheme();
  const light = theme === 'light';
  
  const {
    concepts,
    stats,
    isLoading
  } = useConceptStore() as any;

  const [mode, setMode] = useState<'default' | 'calm'>('default');

  // True if the user has answered at least one concept
  const hasActivity = (stats.by_mastery[1] || 0) + (stats.by_mastery[2] || 0) > 0;
  useStudyStreak(hasActivity); // Track streak in localStorage

  // Calculate concept breakdown
  const breakdown = useMemo(() => {
    const now = Date.now();
    const threeWeeksMs = 21 * 24 * 60 * 60 * 1000;
    let weak = 0, drifting = 0, cold = 0, mastered = 0;
    
    concepts.forEach((c: any) => {
      const md = c.mastery_data;
      const attempts = md?.attempts ?? 0;
      const masteryLevel = md?.mastery_level ?? 0;
      const lastPracticed = md?.last_practiced ? new Date(md.last_practiced).getTime() : null;
      
      if (attempts === 0) cold++;
      else if (masteryLevel === 1) weak++;
      else if (masteryLevel === 2) {
        if (lastPracticed && (now - lastPracticed) > threeWeeksMs) drifting++;
        else mastered++;
      } else cold++;
    });
    
    return { weak, drifting, cold, mastered, total: concepts.length };
  }, [concepts]);

  // Calculate readiness percentage
  const readiness = useMemo(() => {
    if (breakdown.total === 0) return 0;
    return Math.round((breakdown.mastered / breakdown.total) * 100);
  }, [breakdown]);

  // Get blind spots (cold concepts grouped by filter)
  const blindSpots = useMemo(() => {
    const coldConcepts = concepts.filter((c: any) => !c.mastery_data?.attempts || c.mastery_data.attempts === 0);
    const groups: Record<string, { count: number }> = {};
    coldConcepts.forEach((c: any) => {
      const filter = c.custom_filters?.[0] || 'uncategorized';
      if (!groups[filter]) groups[filter] = { count: 0 };
      groups[filter].count++;
    });
    return Object.entries(groups)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([filter, data], idx) => ({
        idx: idx + 1,
        name: filter.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        count: data.count,
        yield: idx === 0 ? 'High' : idx === 1 ? 'Med' : 'High'
      }));
  }, [concepts]);

  // Session concepts (smart selection)
  const sessionConcepts = useMemo(() => {
    const weakCount = Math.min(breakdown.weak, 7);
    const driftingCount = Math.min(breakdown.drifting, 3);
    const coldCount = Math.min(breakdown.cold, 2);
    return { weak: weakCount, drifting: driftingCount, cold: coldCount, total: Math.max(weakCount + driftingCount + coldCount, 12) };
  }, [breakdown]);

  const greeting = getGreeting();
  const daysUntil = examDate ? Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const estimatedMinutes = Math.round(sessionConcepts.total * 2);
  const isCalm = mode === 'calm';

  // Show skeleton while loading
  if (isLoading && concepts.length === 0) {
    return (
      <div className="flex-1 pb-20 md:pb-4">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-14">
          <Skeleton className="h-3 w-32 mb-4 bg-stone-200" />
          <Skeleton className="h-14 w-80 mb-2 bg-stone-200" />
          <Skeleton className="h-14 w-48 mb-10 bg-stone-200" />
          <Skeleton className="h-64 w-full rounded-[22px] mb-5 bg-stone-200" />
          <Skeleton className="h-48 w-full rounded-[22px] mb-5 bg-stone-200" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{ 
        backgroundColor: light ? '#F4ECDF' : '#0A0A0A',
        backgroundImage: light ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0.045 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")` : undefined,
        backgroundBlendMode: light ? 'multiply' : undefined
      }}
    >
      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div 
        className="sticky top-0 z-50 px-6 md:px-10 py-5 flex justify-between items-center border-b backdrop-blur-xl"
        style={{
          backgroundColor: light ? 'rgba(244, 236, 223, 0.85)' : 'rgba(10, 10, 10, 0.85)',
          borderColor: light ? 'rgba(217, 204, 182, 0.5)' : 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <span 
          className="text-[22px] font-medium tracking-[-0.02em]"
          style={{ fontFamily: "'Fraunces', serif", color: light ? '#1F140C' : '#fff' }}
        >
          StudyEdit<span style={{ color: '#E5A89D' }}>.</span>
        </span>
        
        <div className="flex items-center gap-6">
          {/* Mode Toggle */}
          <div 
            className="hidden md:inline-flex rounded-full p-[3px] text-[11px] tracking-[0.04em] border"
            style={{
              backgroundColor: light ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.05)',
              borderColor: light ? '#D9CCB6' : 'rgba(255,255,255,0.1)'
            }}
          >
            <button
              onClick={() => setMode('default')}
              className="px-3.5 py-1.5 rounded-full transition-all"
              style={{
                fontFamily: "'Inter', sans-serif",
                backgroundColor: mode === 'default' ? (light ? '#1F140C' : '#fff') : 'transparent',
                color: mode === 'default' ? (light ? '#FAF5EC' : '#0A0A0A') : (light ? '#8A7560' : 'rgba(255,255,255,0.5)')
              }}
            >
              Six weeks out
            </button>
            <button
              onClick={() => setMode('calm')}
              className="px-3.5 py-1.5 rounded-full transition-all"
              style={{
                fontFamily: "'Inter', sans-serif",
                backgroundColor: mode === 'calm' ? (light ? '#1F140C' : '#fff') : 'transparent',
                color: mode === 'calm' ? (light ? '#FAF5EC' : '#0A0A0A') : (light ? '#8A7560' : 'rgba(255,255,255,0.5)')
              }}
            >
              Ready
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition-colors"
            style={{ color: light ? '#8A7560' : 'rgba(255,255,255,0.6)' }}
          >
            {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* User Avatar */}
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
            style={{
              fontFamily: "'Fraunces', serif",
              backgroundColor: light ? '#1F140C' : '#fff',
              color: light ? '#FAF5EC' : '#0A0A0A'
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-14 relative z-[2]">
        
        {/* ── GREETING ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-between items-end gap-10 mb-9">
          <div>
            <span 
              className="block text-[10.5px] font-medium tracking-[0.22em] uppercase mb-3.5"
              style={{ fontFamily: "'Inter', sans-serif", color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
            >
              {greeting.time}
            </span>
            <h1 
              className="text-[clamp(36px,5vw,56px)] font-light leading-none tracking-[-0.025em] max-w-[22ch]"
              style={{ fontFamily: "'Fraunces', serif", color: light ? '#1F140C' : '#fff' }}
            >
              {greeting.message}, {userName}. <em className="italic" style={{ color: '#E5A89D' }}>
                {readiness >= 85 ? 'You\'re ready.' : 'Steady as she goes.'}
              </em>
            </h1>
          </div>
          
          {daysUntil !== null && (
            <div className="text-right flex flex-col gap-1.5">
              <div 
                className="text-5xl font-light leading-none tracking-[-0.03em]"
                style={{ fontFamily: "'Fraunces', serif", color: light ? '#1F140C' : '#fff' }}
              >
                {daysUntil}<span className="text-lg italic" style={{ color: '#8A7560' }}>d</span>
              </div>
              <div 
                className="text-[10px] tracking-[0.18em] uppercase"
                style={{ color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
              >
                until exam
              </div>
            </div>
          )}
        </div>

        {/* ── CALM MODE MESSAGE ─────────────────────────────────────────────── */}
        {isCalm && (
          <div 
            className="rounded-[22px] p-9 text-center mb-5 border"
            style={{
              backgroundColor: light ? '#FAF5EC' : 'rgba(255,255,255,0.05)',
              borderColor: light ? '#D9CCB6' : 'rgba(255,255,255,0.1)'
            }}
          >
            <h3 
              className="text-[32px] font-light tracking-[-0.02em] mb-2.5"
              style={{ fontFamily: "'Fraunces', serif", color: light ? '#1F140C' : '#fff' }}
            >
              You're at <em className="italic" style={{ color: '#8FA379' }}>{readiness}%</em> readiness.
            </h3>
            <p 
              className="text-[15px] italic leading-relaxed max-w-[42ch] mx-auto"
              style={{ fontFamily: "'Fraunces', serif", color: light ? '#3B2A1E' : 'rgba(255,255,255,0.7)' }}
            >
              The dashboard gets quieter when you don't need it. {sessionConcepts.total} concepts to refresh today. Everything else can rest.
            </p>
          </div>
        )}

        {/* ── TODAY'S SESSION WIDGET ────────────────────────────────────────── */}
        <div 
          className="rounded-[22px] p-10 md:p-11 mb-5"
          style={{
            backgroundColor: '#1F140C',
            border: '1px solid #1F140C',
            boxShadow: '0 30px 60px -25px rgba(31, 20, 12, 0.35)'
          }}
        >
          {/* Widget Header */}
          <div className="flex flex-wrap justify-between items-baseline gap-5 mb-5">
            <div className="flex flex-col gap-1.5">
              <span 
                className="text-[10.5px] font-medium tracking-[0.22em] uppercase"
                style={{ fontFamily: "'Inter', sans-serif", color: '#F2C9C1' }}
              >
                Today's session
              </span>
              <h2 
                className="text-[26px] font-normal tracking-[-0.015em] leading-tight"
                style={{ fontFamily: "'Fraunces', serif", color: '#FAF5EC' }}
              >
                The system has chosen <em className="italic" style={{ color: '#F2C9C1' }}>{sessionConcepts.total} concepts</em> for you.
              </h2>
            </div>
            <span 
              className="text-[13px] italic"
              style={{ fontFamily: "'Fraunces', serif", color: 'rgba(250, 245, 236, 0.6)' }}
            >
              ≈ {estimatedMinutes} minutes
            </span>
          </div>

          {/* Session Summary */}
          <p 
            className="text-[30px] font-light leading-[1.25] tracking-[-0.02em] max-w-[26ch] my-6"
            style={{ fontFamily: "'Fraunces', serif", color: '#FAF5EC' }}
          >
            A mix of <em className="italic" style={{ color: '#F2C9C1' }}>weak</em>, <em className="italic" style={{ color: '#F2C9C1' }}>drifting</em>, and <em className="italic" style={{ color: '#F2C9C1' }}>high-yield cold</em>. The medicine you'll get most return on practising tonight.
          </p>

          {/* Reasoning Grid */}
          {!isCalm && (
            <div 
              className="grid grid-cols-1 md:grid-cols-3 gap-0 my-8"
              style={{ borderTop: '1px solid rgba(245, 239, 227, 0.12)', borderBottom: '1px solid rgba(245, 239, 227, 0.12)' }}
            >
              {sessionConcepts.weak > 0 && (
                <div className="py-5 md:pr-5" style={{ borderRight: '1px solid rgba(245, 239, 227, 0.08)' }}>
                  <div 
                    className="text-[38px] font-light leading-none tracking-[-0.03em] mb-1.5"
                    style={{ fontFamily: "'Fraunces', serif", color: '#FAF5EC' }}
                  >
                    {sessionConcepts.weak}<em className="italic text-[22px]" style={{ color: '#F2C9C1' }}>/{sessionConcepts.total}</em>
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: '#c8b89c' }}>
                    because your accuracy on these has fallen below 50%.
                  </div>
                </div>
              )}
              {sessionConcepts.drifting > 0 && (
                <div className="py-5 md:px-5" style={{ borderRight: '1px solid rgba(245, 239, 227, 0.08)' }}>
                  <div 
                    className="text-[38px] font-light leading-none tracking-[-0.03em] mb-1.5"
                    style={{ fontFamily: "'Fraunces', serif", color: '#FAF5EC' }}
                  >
                    {sessionConcepts.drifting}<em className="italic text-[22px]" style={{ color: '#F2C9C1' }}>/{sessionConcepts.total}</em>
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: '#c8b89c' }}>
                    because you haven't seen them in over three weeks. Decay is setting in.
                  </div>
                </div>
              )}
              {sessionConcepts.cold > 0 && (
                <div className="py-5 md:pl-5">
                  <div 
                    className="text-[38px] font-light leading-none tracking-[-0.03em] mb-1.5"
                    style={{ fontFamily: "'Fraunces', serif", color: '#FAF5EC' }}
                  >
                    {sessionConcepts.cold}<em className="italic text-[22px]" style={{ color: '#F2C9C1' }}>/{sessionConcepts.total}</em>
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: '#c8b89c' }}>
                    because they're the highest-yield concepts you haven't met yet.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-wrap items-center justify-between gap-5">
            <button
              onClick={onStartPractice}
              onMouseEnter={onPreloadModal}
              className="px-8 py-4 rounded-full text-sm font-medium tracking-[0.02em] inline-flex items-center gap-3 transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ fontFamily: "'Inter', sans-serif", backgroundColor: '#FAF5EC', color: '#1F140C' }}
            >
              Begin the session <span>→</span>
            </button>
            {onOpenFilters && (
              <button
                onClick={() => onOpenFilters()}
                className="text-sm italic pb-0.5 hover:text-[#FAF5EC] transition-colors"
                style={{ fontFamily: "'Fraunces', serif", color: '#c8b89c', borderBottom: '1px solid rgba(200, 184, 156, 0.4)' }}
              >
                or choose your own slice of the map
              </button>
            )}
          </div>

          {/* Facet Strip */}
          {!isCalm && (
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span className="text-[10px] tracking-[0.16em] uppercase mr-1" style={{ color: 'rgba(250, 245, 236, 0.5)' }}>
                Tonight's facets:
              </span>
              <span 
                className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: 'rgba(229, 168, 157, 0.14)', color: '#F2C9C1', border: '1px solid rgba(229, 168, 157, 0.25)' }}
              >
                Management <span className="italic ml-1" style={{ fontFamily: "'Fraunces', serif" }}>38%</span>
              </span>
              <span 
                className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: 'rgba(229, 168, 157, 0.14)', color: '#F2C9C1', border: '1px solid rgba(229, 168, 157, 0.25)' }}
              >
                Investigations <span className="italic ml-1" style={{ fontFamily: "'Fraunces', serif" }}>45%</span>
              </span>
              <span 
                className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: 'rgba(250, 245, 236, 0.06)', color: '#c8b89c', border: '1px solid rgba(250, 245, 236, 0.12)' }}
              >
                Features <span className="italic ml-1" style={{ fontFamily: "'Fraunces', serif" }}>62%</span>
              </span>
              <span 
                className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: 'rgba(143, 163, 121, 0.14)', color: '#B5C49D', border: '1px solid rgba(143, 163, 121, 0.3)' }}
              >
                Definitions <span className="italic ml-1" style={{ fontFamily: "'Fraunces', serif" }}>81%</span>
              </span>
            </div>
          )}
        </div>

        {/* ── TRAJECTORY WIDGET ─────────────────────────────────────────────── */}
        {!isCalm && (
          <div 
            className="rounded-[22px] p-9 mb-5 border"
            style={{
              backgroundColor: light ? '#FAF5EC' : 'rgba(255,255,255,0.05)',
              borderColor: light ? '#D9CCB6' : 'rgba(255,255,255,0.1)'
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-end mb-5">
              <div className="flex flex-col gap-1.5">
                <span 
                  className="text-[10.5px] font-medium tracking-[0.22em] uppercase"
                  style={{ color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
                >
                  Your trajectory
                </span>
                <h2 
                  className="text-[26px] font-normal tracking-[-0.015em] leading-tight"
                  style={{ fontFamily: "'Fraunces', serif", color: light ? '#1F140C' : '#fff' }}
                >
                  You're <em className="italic" style={{ color: '#E5A89D' }}>close</em>, with intent.
                </h2>
                <span 
                  className="text-[13px] italic mt-2"
                  style={{ fontFamily: "'Fraunces', serif", color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
                >
                  Projecting to {Math.min(readiness + 27, 100)}% by exam day. Target is 85%.
                </span>
              </div>
              
              <div className="text-right">
                <div 
                  className="text-[64px] font-light leading-none tracking-[-0.035em]"
                  style={{ fontFamily: "'Fraunces', serif", color: light ? '#1F140C' : '#fff' }}
                >
                  {readiness}<span className="text-2xl italic" style={{ color: '#8A7560' }}>%</span>
                </div>
                <div 
                  className="text-[10px] tracking-[0.22em] uppercase mt-1"
                  style={{ color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
                >
                  readiness today
                </div>
              </div>
            </div>

            {/* Honest Read */}
            <p 
              className="text-[15px] italic leading-relaxed max-w-[56ch] pt-5"
              style={{ 
                fontFamily: "'Fraunces', serif", 
                color: light ? '#3B2A1E' : 'rgba(255,255,255,0.7)',
                borderTop: `1px solid ${light ? '#D9CCB6' : 'rgba(255,255,255,0.1)'}`
              }}
            >
              Honest read: at your current pace you'll land close to target. <em style={{ color: '#E5A89D' }}>One extra 20-minute session a week</em> closes any gap. Not more — that.
            </p>
          </div>
        )}

        {/* ── BLIND SPOTS WIDGET ────────────────────────────────────────────── */}
        {!isCalm && blindSpots.length > 0 && (
          <div 
            className="rounded-[22px] p-9 border"
            style={{
              backgroundColor: light ? '#FAF5EC' : 'rgba(255,255,255,0.05)',
              borderColor: light ? '#D9CCB6' : 'rgba(255,255,255,0.1)'
            }}
          >
            <div className="flex flex-wrap justify-between items-baseline gap-5 mb-5">
              <div className="flex flex-col gap-1.5">
                <span 
                  className="text-[10.5px] font-medium tracking-[0.22em] uppercase"
                  style={{ color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
                >
                  Where you're cold
                </span>
                <h2 
                  className="text-[26px] font-normal tracking-[-0.015em] leading-tight"
                  style={{ fontFamily: "'Fraunces', serif", color: light ? '#1F140C' : '#fff' }}
                >
                  {blindSpots.length} regions you haven't <em className="italic" style={{ color: '#E5A89D' }}>touched</em>.
                </h2>
              </div>
              <span 
                className="text-[13px] italic"
                style={{ fontFamily: "'Fraunces', serif", color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
              >
                Ranked by exam yield
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {blindSpots.map((spot) => (
                <div 
                  key={spot.name}
                  onClick={() => onOpenFilters?.(undefined, spot.name.toLowerCase().replace(/\s+/g, '-'))}
                  className="grid grid-cols-[28px_1fr_auto] items-center gap-4 p-4 rounded-xl border transition-all hover:translate-x-1 cursor-pointer"
                  style={{
                    backgroundColor: light ? '#F4ECDF' : 'rgba(255,255,255,0.05)',
                    borderColor: light ? '#D9CCB6' : 'rgba(255,255,255,0.1)'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = '#E5A89D')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = light ? '#D9CCB6' : 'rgba(255,255,255,0.1)')}
                >
                  <span 
                    className="text-base italic"
                    style={{ fontFamily: "'Fraunces', serif", color: '#E5A89D' }}
                  >
                    {['i', 'ii', 'iii'][spot.idx - 1]}.
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span 
                      className="text-[17px] font-normal tracking-[-0.01em]"
                      style={{ fontFamily: "'Fraunces', serif", color: light ? '#1F140C' : '#fff' }}
                    >
                      {spot.name}
                    </span>
                    <span className="text-xs" style={{ color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}>
                      {spot.count} concepts · 0 attempted
                    </span>
                  </div>
                  <div 
                    className="text-xs italic text-right leading-tight"
                    style={{ fontFamily: "'Fraunces', serif", color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
                  >
                    <span className="block text-sm italic" style={{ color: '#E5A89D' }}>{spot.yield}</span>
                    often tested
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <button 
                onClick={onStartPractice}
                className="text-[13px] font-medium pb-0.5 inline-flex items-center gap-1.5"
                style={{ 
                  color: light ? '#1F140C' : '#fff', 
                  borderBottom: `1px solid ${light ? '#1F140C' : '#fff'}` 
                }}
              >
                Start with {blindSpots[0]?.name.toLowerCase()} →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
