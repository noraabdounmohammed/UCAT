import React, { useState, useEffect, useMemo } from 'react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { SimpleMasteryRing } from './SimpleMasteryRing';
import { NextSessionCard } from './NextSessionCard';
import { QuestionFormatSelector } from '@/components/dashboard/QuestionFormatSelector';
import { PracticeByCategorySelector } from '@/components/dashboard/PracticeByCategorySelector';
import { Skeleton } from '@/components/ui/skeleton';

// ── STREAK HOOK ───────────────────────────────────────────────────────────────
// Tracks daily study streak in localStorage.
// A day counts as "studied" if the user has any answered concepts when the
// dashboard loads. Stored as an array of ISO date strings (YYYY-MM-DD).
function useStudyStreak(hasActivity: boolean) {
  const toDateStr = (d: Date) => d.toISOString().split('T')[0];

  const [streakCount, setStreakCount] = useState(0);
  const [weekDays, setWeekDays] = useState<('done' | 'today' | 'empty')[]>([]);

  useEffect(() => {
    const today = toDateStr(new Date());
    const raw = localStorage.getItem('study_streak_dates');
    const dates: string[] = raw ? JSON.parse(raw) : [];

    // Mark today if there's activity and it's not already recorded
    if (hasActivity && !dates.includes(today)) {
      dates.push(today);
      localStorage.setItem('study_streak_dates', JSON.stringify(dates));
    }

    // Calculate current streak (consecutive days ending today or yesterday)
    let streak = 0;
    const cursor = new Date();
    // If today isn't studied yet, start counting from yesterday
    if (!dates.includes(toDateStr(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (dates.includes(toDateStr(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Build Mon–Sun status for the current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // roll back to Monday
    monday.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = toDateStr(d);
      const todayStr = toDateStr(new Date());
      if (ds === todayStr) return 'today' as const;
      if (dates.includes(ds)) return 'done' as const;
      return 'empty' as const;
    });

    setStreakCount(streak);
    setWeekDays(days);
  }, [hasActivity]);

  return { streakCount, weekDays };
}

// ── STREAK BANNER ─────────────────────────────────────────────────────────────
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const StreakBanner: React.FC<{ streak: number; weekDays: ('done' | 'today' | 'empty')[] }> = ({
  streak,
  weekDays,
}) => (
  <div
    role="region"
    aria-label="Weekly study streak"
    style={{
      backgroundColor: '#1C1814',
      borderRadius: '20px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      marginBottom: '28px',
    }}
  >
    {/* Left: streak count */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: '10px',
        fontWeight: 300,
        color: '#5A4A3A',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        This week
      </span>
      <span style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: '44px',
        fontWeight: 300,
        color: '#F4EFE8',
        lineHeight: 1,
      }}>
        {streak}
      </span>
      <span style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: '11px',
        fontWeight: 300,
        color: '#6A5A4A',
        marginTop: '1px',
      }}>
        day streak
      </span>
    </div>

    {/* Right: Mon–Sun circles */}
    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
      {weekDays.map((state, i) => {
        const base: React.CSSProperties = {
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 400,
          flexShrink: 0,
        };
        const styles: Record<string, React.CSSProperties> = {
          done:  { ...base, backgroundColor: '#E8B4A0', color: '#6A2E1E' },
          today: { ...base, backgroundColor: 'transparent', color: '#E8B4A0', border: '1px solid #E8B4A0' },
          empty: { ...base, backgroundColor: '#2A2420', color: '#4A3A2A' },
        };
        return (
          <div key={i} style={styles[state]} aria-label={`${DAY_LABELS[i]}: ${state}`}>
            {DAY_LABELS[i]}
          </div>
        );
      })}
    </div>
  </div>
);

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
}

export const CurriculumDashboard: React.FC<CurriculumDashboardProps> = ({
  curriculum,
  onStartPractice,
  onOpenFilters,
  onDirectPracticeStart,
  onPreloadModal
}) => {
  const {
    concepts,
    stats,
    setPracticeSelection,
    filterCategories,
    isLoading
  } = useConceptStore();

  const [selectedFormat, setSelectedFormat] = useState<string>('');

  // Day of week greeting — computed once
  const dayName = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    []
  );

  // True if the user has answered at least one concept in this curriculum
  const hasActivity = (stats.by_mastery[1] || 0) + (stats.by_mastery[2] || 0) > 0;
  const { streakCount, weekDays } = useStudyStreak(hasActivity);

  // Parse filter assignments ONCE — not inside render map
  const filterAssignments = useMemo(
    () => JSON.parse(localStorage.getItem(`${curriculum?.id}_filter_assignments`) || '{}'),
    [curriculum?.id]
  );

  // Categories to hide from the dashboard (noise/catch-all buckets)
  const HIDDEN_CATEGORIES = new Set(['other', 'investigation', 'investigations', 'other conditions']);

  // Build category+filters list once
  const categoryRows = useMemo(() => {
    if (!filterCategories) return [];
    return filterCategories
      .map(category => ({
        category,
        filters: Object.entries(filterAssignments)
          .filter(([_, catId]) => catId === category.id)
          .map(([filter]) => filter),
      }))
      .filter(row =>
        row.filters.length > 0 &&
        !HIDDEN_CATEGORIES.has(row.category.name.toLowerCase().trim())
      );
  }, [filterCategories, filterAssignments]);

  useEffect(() => {
    const savedFormat = localStorage.getItem('preferredQuestionFormat');
    if (savedFormat) setSelectedFormat(savedFormat);
  }, []);

  const handleFormatChange = (formatId: string) => {
    setSelectedFormat(formatId);
    localStorage.setItem('preferredQuestionFormat', formatId);
  };

  // Show skeleton while loading (but only if we have no concepts yet)
  if (isLoading && concepts.length === 0) {
    return (
      <div className="flex-1 pb-20 md:pb-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-4 md:pt-0">
          <Skeleton className="h-3 w-20 mb-4 bg-stone-200" />
          <Skeleton className="h-10 w-48 mb-2 bg-stone-200" />
          <Skeleton className="h-10 w-32 mb-6 bg-stone-200" />
          <Skeleton className="h-20 w-full rounded-2xl mb-8 bg-stone-200" />
          <div className="flex gap-4 mb-8">
            <Skeleton className="h-48 w-52 rounded-2xl bg-stone-200" />
            <Skeleton className="h-48 w-52 rounded-2xl bg-stone-200" />
            <Skeleton className="h-48 w-52 rounded-2xl bg-stone-200" />
          </div>
          <Skeleton className="h-px w-full mb-8 bg-stone-200" />
          <Skeleton className="h-6 w-32 mb-4 bg-stone-200" />
          <div className="flex gap-3 flex-wrap">
            {[1,2,3,4,5,6].map(i => (
              <Skeleton key={i} className="h-10 w-24 rounded-full bg-stone-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-20 md:pb-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-4 md:pt-0">

        {/* ── TOP BAR ──────────────────────────────────────── */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 300,
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: '#A89880',
          }}>
            {dayName}
          </span>
        </div>

        {/* ── HERO ─────────────────────────────────────────── */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 300,
            fontSize: '38px',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#1C1814',
            margin: 0,
          }}>
            Study with<br />
            <em style={{ fontStyle: 'italic', color: '#C47A62' }}>intention.</em>
          </h1>
        </div>

        {/* ── STREAK BANNER ────────────────────────────────── */}
        <StreakBanner streak={streakCount} weekDays={weekDays} />

        {/* ── BY FORMAT ────────────────────────────────────── */}
        <QuestionFormatSelector
          selectedFormat={selectedFormat}
          onFormatChange={handleFormatChange}
          onOpenFilters={onOpenFilters}
          onPreload={onPreloadModal}
          concepts={concepts}
        />

        {/* ── DIVIDER ──────────────────────────────────────── */}
        <div style={{ height: '0.5px', backgroundColor: '#E4DDD4', margin: '0 0 32px' }} />

        {/* ── BY CATEGORY (one row per category, divider between each) ── */}
        {categoryRows.map(({ category, filters }, idx) => (
          <React.Fragment key={category.id}>
            <PracticeByCategorySelector
              category={category}
              filters={filters}
              curriculumId={curriculum?.id || ''}
              concepts={concepts}
              onFilterClick={(filter) => {
                if (onOpenFilters) onOpenFilters(undefined, filter);
              }}
              onPreload={onPreloadModal}
            />
            {idx < categoryRows.length - 1 && (
              <div style={{ height: '0.5px', backgroundColor: '#E4DDD4', margin: '4px 0 28px' }} />
            )}
          </React.Fragment>
        ))}

      </div>
    </div>
  );
};
