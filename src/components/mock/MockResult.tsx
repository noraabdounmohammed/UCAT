import { Link } from 'react-router-dom';
import { Trophy, Clock, Target, ArrowRight, RotateCcw, Timer, Zap } from 'lucide-react';
import type { Atom } from '@/atom/types';

export interface MockResultProps {
  correct: number;
  total: number;
  percentage: number;
  timeUsedSec: number;
  /**
   * Per-question results — when provided, MockResult also renders a
   * topic breakdown so the user knows where to focus next.
   */
  rated?: { atom: Atom; correct: boolean; answered: boolean }[];
  /**
   * Time stats from `computeScore()` — when provided, MockResult adds
   * a "Pacing" card with avg time per question, time on correct vs
   * wrong, and a count of <30s "fast answers".
   */
  timeStats?: {
    avgTimePerQSec: number;
    avgTimeCorrectSec: number;
    avgTimeWrongSec: number;
    fastAnswers: number;
  };
}

/**
 * UKMLA AKT pass mark is set per cohort by the GMC, typically in the
 * 60-65% range. We use 63% as a working approximation — students should
 * obviously check the official guidance, but giving them a concrete
 * target turns a percentage into something more meaningful.
 */
const UKMLA_AKT_PASS_MARK = 63;

interface BandConfig {
  label: string;
  blurb: string;
  gradient: string;
  ring: string;
  textTint: string;
  emoji: string;
}

function bandFor(percentage: number): BandConfig {
  if (percentage >= 80) {
    return {
      label: 'Crushing it',
      blurb: 'Comfortable pass territory — keep the streak.',
      gradient: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-300/40',
      textTint: 'text-emerald-700 dark:text-emerald-300',
      emoji: '🏆',
    };
  }
  if (percentage >= UKMLA_AKT_PASS_MARK) {
    return {
      label: 'On track',
      blurb: 'Above the rough UKMLA cutoff. Polish the gaps.',
      gradient: 'from-sky-500 to-blue-600',
      ring: 'ring-sky-300/40',
      textTint: 'text-sky-700 dark:text-sky-300',
      emoji: '🎯',
    };
  }
  if (percentage >= 50) {
    return {
      label: 'Building',
      blurb: 'Below the cutoff but within reach — review your misses.',
      gradient: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-300/40',
      textTint: 'text-amber-700 dark:text-amber-300',
      emoji: '📈',
    };
  }
  return {
    label: 'Plenty to learn',
    blurb: "First mocks are rough — that's the whole point.",
    gradient: 'from-rose-500 to-red-600',
    ring: 'ring-rose-300/40',
    textTint: 'text-rose-700 dark:text-rose-300',
    emoji: '💪',
  };
}

export function MockResult({ correct, total, percentage, timeUsedSec, rated, timeStats }: MockResultProps) {
  const m = Math.floor(timeUsedSec / 60);
  const s = timeUsedSec % 60;
  const avgSecPerQ = total > 0 ? Math.round(timeUsedSec / total) : 0;
  const passed = percentage >= UKMLA_AKT_PASS_MARK;
  const band = bandFor(percentage);

  // Topic breakdown — only when caller supplied per-question rated data.
  const topicBreakdown = (() => {
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
  })();

  return (
    <div className="space-y-4">
      {/* Hero — gradient celebration card */}
      <div className={`relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br ${band.gradient} text-white shadow-lg ${band.ring} ring-4`}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2 text-white/80">
            <span className="text-2xl">{band.emoji}</span>
            <span className="text-[11px] uppercase tracking-widest font-semibold">
              {band.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-6xl font-bold tracking-tight tabular-nums">
              {percentage.toFixed(0)}
            </span>
            <span className="text-2xl font-medium opacity-80">%</span>
          </div>
          <div className="text-sm opacity-90 mb-3">
            {correct} of {total} correct
          </div>
          <p className="text-sm text-white/90 max-w-xs">
            {band.blurb}
          </p>
        </div>
      </div>

      {/* Pass-mark callout */}
      <div className={`rounded-2xl p-4 border-2 ${
        passed
          ? 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30'
          : 'border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
            passed
              ? 'bg-emerald-500 text-white'
              : 'bg-amber-500 text-white'
          }`}>
            <Target className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {passed
                ? `Above the rough UKMLA cutoff (~${UKMLA_AKT_PASS_MARK}%)`
                : `Below the rough UKMLA cutoff (~${UKMLA_AKT_PASS_MARK}%)`}
            </div>
            <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
              The official pass mark is calibrated each cohort by the GMC and varies year-to-year — treat ~{UKMLA_AKT_PASS_MARK}% as a working target, not a guarantee.
            </div>
          </div>
        </div>
      </div>

      {/* Topic breakdown — only when per-question rated data was passed */}
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
                        pct === 100 ? 'bg-emerald-500'
                          : pct >= 60 ? 'bg-sky-500'
                          : pct >= 40 ? 'bg-amber-500'
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

      {/* Pacing card — only when time-stats provided */}
      {timeStats && timeStats.avgTimePerQSec > 0 && (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Timer className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            <span className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 font-semibold">
              Pacing
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-0.5">
                Avg / Q
              </div>
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                {timeStats.avgTimePerQSec}s
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-0.5 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                &lt;30s answers
              </div>
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                {timeStats.fastAnswers}
              </div>
            </div>
            {timeStats.avgTimeCorrectSec > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">
                  When right
                </div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {timeStats.avgTimeCorrectSec}s
                </div>
              </div>
            )}
            {timeStats.avgTimeWrongSec > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-0.5">
                  When wrong
                </div>
                <div className="text-lg font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                  {timeStats.avgTimeWrongSec}s
                </div>
              </div>
            )}
          </div>
          {timeStats.avgTimeWrongSec > 0 && timeStats.avgTimeCorrectSec > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
              {timeStats.avgTimeWrongSec < timeStats.avgTimeCorrectSec
                ? "You're answering wrong questions faster than right ones — slow down on the unfamiliar."
                : "You're spending more time on wrong questions — overthinking past your first instinct?"}
            </div>
          )}
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-widest font-semibold">Time used</span>
          </div>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
            {m}m {s.toString().padStart(2, '0')}s
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-widest font-semibold">Per question</span>
          </div>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
            {avgSecPerQ}s
          </div>
        </div>
      </div>

      {/* CTA row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          New mock
        </button>
        <Link
          to="/mistakes"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          Review mistakes
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
