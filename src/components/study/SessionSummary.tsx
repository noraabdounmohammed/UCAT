import { useMemo } from 'react';
import { Flame, Trophy, Target, ArrowRight, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Atom, FsrsRatingValue } from '@/atom/types';
import { SessionTakeaways } from './SessionTakeaways';

interface SessionSummaryProps {
  totalAtoms: number;
  ratings: FsrsRatingValue[];
  rated?: { atom: Atom; rating: FsrsRatingValue; correct: boolean }[];
  streakDays: number;
}

interface BandConfig {
  label: string;
  blurb: string;
  gradient: string;
  emoji: string;
}

function bandFor(percentage: number, total: number): BandConfig {
  if (total === 0) {
    return {
      label: 'Done',
      blurb: 'Session complete.',
      gradient: 'from-stone-500 to-stone-700',
      emoji: '✨',
    };
  }
  if (percentage === 100) {
    return {
      label: 'Perfect run',
      blurb: 'Every one nailed. Take the win.',
      gradient: 'from-emerald-500 to-teal-600',
      emoji: '🏆',
    };
  }
  if (percentage >= 80) {
    return {
      label: 'Strong session',
      blurb: 'Most of these sticking. Quick review of the misses.',
      gradient: 'from-emerald-500 to-sky-600',
      emoji: '🎯',
    };
  }
  if (percentage >= 60) {
    return {
      label: 'Solid effort',
      blurb: 'Mid-range — exactly what spaced repetition is for.',
      gradient: 'from-sky-500 to-indigo-600',
      emoji: '💪',
    };
  }
  if (percentage >= 40) {
    return {
      label: 'Tough one',
      blurb: 'Half-and-half today. The misses come back tomorrow stronger.',
      gradient: 'from-amber-500 to-orange-600',
      emoji: '📈',
    };
  }
  return {
    label: 'Worth doing',
    blurb: 'Spotting the gaps is the whole game. Mistake deck has these queued up.',
    gradient: 'from-rose-500 to-red-600',
    emoji: '🌱',
  };
}

/**
 * Post-session celebration card. Replaces the bare "X / Y" with a banded
 * gradient hero, contextual copy, an actionable next-step row, and the
 * existing AI takeaways panel below.
 */
export function SessionSummary({ totalAtoms, ratings, rated, streakDays }: SessionSummaryProps) {
  const right = ratings.filter((r) => r >= 3).length;
  const total = totalAtoms;
  const percentage = total > 0 ? (right / total) * 100 : 0;
  const band = bandFor(percentage, total);

  // Topic breakdown — count correct/wrong per topic_path[0] from the rated
  // list. Helps the user spot patterns ("4/4 Cardio, 0/2 Renal").
  const topicBreakdown = useMemo(() => {
    if (!rated || rated.length === 0) return [];
    const map = new Map<string, { correct: number; total: number }>();
    for (const r of rated) {
      const t = (r.atom.topicPath?.[0] ?? 'Other').trim() || 'Other';
      if (!map.has(t)) map.set(t, { correct: 0, total: 0 });
      const e = map.get(t)!;
      e.total++;
      if (r.correct) e.correct++;
    }
    return Array.from(map.entries())
      .map(([topic, stats]) => ({ topic, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [rated]);

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Hero — gradient celebration */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br ${band.gradient} text-white shadow-lg`}
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-white/80">
              <span className="text-base">{band.emoji}</span>
              {band.label}
            </span>
            {streakDays > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90">
                <Flame className="w-3.5 h-3.5 text-orange-200" />
                day {streakDays}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-5xl font-bold tracking-tight tabular-nums">
              {right}
            </span>
            <span className="text-2xl font-medium opacity-80">/ {total}</span>
          </div>
          <div className="text-sm text-white/90 mb-2">
            {percentage.toFixed(0)}% correct
          </div>
          <p className="text-sm text-white/85 max-w-sm">{band.blurb}</p>
        </div>
      </div>

      {/* Topic breakdown — helps spot weak areas */}
      {topicBreakdown.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Target className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            <span className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-semibold">
              By topic
            </span>
          </div>
          <ul className="space-y-2">
            {topicBreakdown.map((row) => {
              const pct = row.total > 0 ? (row.correct / row.total) * 100 : 0;
              return (
                <li key={row.topic} className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {row.topic}
                    </span>
                    <span className="text-xs text-stone-600 dark:text-stone-400 tabular-nums">
                      {row.correct} / {row.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className={[
                        'h-full transition-all',
                        pct === 100
                          ? 'bg-emerald-500'
                          : pct >= 60
                            ? 'bg-sky-500'
                            : pct >= 40
                              ? 'bg-amber-500'
                              : 'bg-rose-500',
                      ].join(' ')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* CTA row */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/study"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Another 5
        </Link>
        <Link
          to="/mistakes"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          <Trophy className="w-4 h-4" />
          Mistakes
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Existing AI takeaways panel */}
      {rated && rated.length > 0 && <SessionTakeaways results={rated} />}
    </div>
  );
}
