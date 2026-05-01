import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame, Heart, Brain, Activity, Beaker, Stethoscope, Bandage,
  Bone, Baby, FlaskConical, ListChecks, Calculator, FileText,
  ScrollText, Mic, Trophy, ArrowRight, Sparkles, Target,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { QuestionKind } from '@/atom/types';

/**
 * Discovery dashboard shown on /study before a session starts.
 *
 * Modernised for student audience — every section is icon-led, content
 * counts are live (queried at mount), and microcopy leans energetic
 * rather than corporate.
 */
interface TopicTile {
  key: string;
  label: string;
  Icon: typeof Heart;
  // Tailwind classes for the icon background tint.
  tint: string;
}

const TOPICS: TopicTile[] = [
  { key: 'cardiology',       label: 'Cardiology',       Icon: Heart,         tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  { key: 'neurology',        label: 'Neurology',        Icon: Brain,         tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  { key: 'respiratory',      label: 'Respiratory',      Icon: Activity,      tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  { key: 'gastroenterology', label: 'GI',               Icon: Beaker,        tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  { key: 'renal',            label: 'Renal',            Icon: FlaskConical,  tint: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' },
  { key: 'haematology',      label: 'Haematology',      Icon: Activity,      tint: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  { key: 'infection',        label: 'Infection',        Icon: Stethoscope,   tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { key: 'surgery',          label: 'Surgery',          Icon: Bandage,       tint: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  { key: 'psychiatry',       label: 'Psychiatry',       Icon: Brain,         tint: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300' },
  { key: 'dermatology',      label: 'Dermatology',      Icon: Sparkles,      tint: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' },
  { key: 'obstetrics',       label: 'Obstetrics',       Icon: Baby,          tint: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' },
  { key: 'endocrinology',    label: 'Endocrinology',    Icon: FlaskConical,  tint: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
  { key: 'paediatrics',      label: 'Paediatrics',      Icon: Baby,          tint: 'bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300' },
  { key: 'orthopaedics',     label: 'Orthopaedics',     Icon: Bone,          tint: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
];

interface FormatTile {
  kind: QuestionKind | 'case';
  label: string;
  blurb: string;
  Icon: typeof ListChecks;
  /** Linear-gradient classes for the card background. */
  bg: string;
}

const FORMATS: FormatTile[] = [
  {
    kind: 'sba',
    label: 'SBA',
    blurb: 'Pick the single best answer',
    Icon: ListChecks,
    bg: 'from-indigo-500 to-blue-600',
  },
  {
    kind: 'emq',
    label: 'EMQ',
    blurb: 'Match from 11 options',
    Icon: FileText,
    bg: 'from-fuchsia-500 to-pink-600',
  },
  {
    kind: 'calc',
    label: 'Drug calc',
    blurb: 'Type the number',
    Icon: Calculator,
    bg: 'from-emerald-500 to-teal-600',
  },
  {
    kind: 'case',
    label: 'Chained case',
    blurb: 'Vignette + linked Qs',
    Icon: ScrollText,
    bg: 'from-amber-500 to-orange-600',
  },
];

interface DashboardCounts {
  total: number;
  byTopic: Record<string, number>;
  byKind: { sba: number; emq: number; calc: number; case: number };
}

const TOPIC_SYNONYMS: Record<string, string[]> = {
  cardiology:       ['cardiology', 'cardiovascular'],
  infection:        ['infection', 'immunology'],
  surgery:          ['surgery', 'orthopaedics'],
  orthopaedics:     ['orthopaedics'],
};

function streakLabel(days: number): string {
  if (days === 0) return 'Start a streak today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function StudyDashboard({
  onStartDailyFive,
  streakDays,
}: {
  onStartDailyFive: () => void;
  streakDays: number;
}) {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);

  // Live atom-count badges so chips reflect what's actually in the bank.
  // One round-trip on mount; cached at the page level by React Query
  // would be even nicer but the cost is fine for now.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Match listAvailableForExam's predicate: approved + doctor_seed pending.
        const { data, error } = await supabase
          .from('atoms')
          .select('topic_path,question_kind,case_id')
          .eq('exam', 'UKMLA')
          .or('status.eq.approved,and(status.eq.pending_review,source_type.eq.doctor_seed)');
        if (cancelled || error || !data) return;

        const byTopic: Record<string, number> = {};
        const byKind = { sba: 0, emq: 0, calc: 0, case: 0 };
        for (const row of data as Array<{ topic_path: string[] | null; question_kind: string | null; case_id: string | null }>) {
          const t0 = (row.topic_path?.[0] ?? '').toLowerCase();
          if (t0) byTopic[t0] = (byTopic[t0] ?? 0) + 1;
          const k = (row.question_kind ?? 'sba') as 'sba' | 'emq' | 'calc' | 'cloze';
          if (k === 'sba' || k === 'emq' || k === 'calc') byKind[k]++;
          if (row.case_id) byKind.case++;
        }
        setCounts({ total: data.length, byTopic, byKind });
      } catch { /* swallow — dashboard works without counts */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const topicCount = (key: string): number => {
    if (!counts) return 0;
    const synonyms = TOPIC_SYNONYMS[key] ?? [key];
    return synonyms.reduce((sum, s) => sum + (counts.byTopic[s] ?? 0), 0);
  };

  const formatCount = (kind: 'sba' | 'emq' | 'calc' | 'case'): number =>
    counts?.byKind[kind] ?? 0;

  // Topics with at least 1 atom, sorted by count descending.
  const visibleTopics = TOPICS
    .map(t => ({ ...t, n: topicCount(t.key) }))
    .filter(t => t.n > 0)
    .sort((a, b) => b.n - a.n);

  return (
    <div className="space-y-6">
      {/* Hero — gradient, big streak treatment, bolder CTA */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 dark:from-stone-100 dark:via-white dark:to-stone-100">
        {/* Decorative blob */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-amber-300 dark:text-amber-700">
              <Target className="w-3 h-3" />
              Today's mission
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 dark:text-stone-700">
              <Flame className={`w-4 h-4 ${streakDays > 0 ? 'text-orange-400' : 'text-stone-500'}`} />
              {streakLabel(streakDays)}
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white dark:text-stone-900 mb-1">
            Daily 5
          </h2>
          <p className="text-sm text-white/70 dark:text-stone-600 mb-5 max-w-sm">
            Spaced-repetition pick — mixes due reviews with fresh cases, calcs and EMQs.
          </p>
          <button
            type="button"
            onClick={onStartDailyFive}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-amber-400 text-stone-900 text-sm font-semibold hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/20"
          >
            Let's go
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Topics — icon tiles with live atom counts */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Pick a system
          </h3>
          {counts && (
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {counts.total} questions in the bank
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {visibleTopics.map((t) => (
            <Link
              key={t.key}
              to={`/study?topic=${t.key}`}
              className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-sm transition-all"
            >
              <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${t.tint}`}>
                <t.Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-tight">
                  {t.label}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  {t.n} {t.n === 1 ? 'question' : 'questions'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Formats — bold gradient cards */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 px-1">
          Pick your format
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {FORMATS.map((f) => {
            const n = formatCount(f.kind === 'cloze' ? 'sba' : f.kind);
            return (
              <Link
                key={f.kind}
                to={`/study?type=${f.kind}`}
                className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${f.bg} text-white shadow-md hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <f.Icon className="w-6 h-6" />
                  {n > 0 && (
                    <span className="text-[10px] font-semibold tracking-wide bg-white/20 px-1.5 py-0.5 rounded">
                      {n}
                    </span>
                  )}
                </div>
                <div className="text-base font-semibold">{f.label}</div>
                <div className="text-[11px] text-white/80 mt-0.5">{f.blurb}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick links */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 px-1">
          Other ways to drill
        </h3>
        <div className="space-y-2">
          <QuickLink to="/cases" Icon={ScrollText} label="Browse clinical cases" sub="14 chained vignettes by specialty" />
          <QuickLink to="/mock" Icon={Trophy} label="Mock exam" sub="Timed paper, no spoilers until the end" />
          <QuickLink to="/mistakes" Icon={Target} label="Mistake review" sub="Drill what you got wrong recently" />
          <QuickLink to="/voice" Icon={Mic} label="Voice mode" sub="Hands-free — questions read aloud" />
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  to, Icon, label, sub,
}: {
  to: string; Icon: typeof Trophy; label: string; sub: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-900 dark:text-stone-100">{label}</div>
        <div className="text-[11px] text-stone-500 dark:text-stone-400">{sub}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
    </Link>
  );
}
