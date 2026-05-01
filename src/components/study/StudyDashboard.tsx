import { Link } from 'react-router-dom';
import type { QuestionKind } from '@/atom/types';

/**
 * Discovery dashboard shown on /study before the user starts a session.
 *
 * Replaces the old "drop straight into FSRS" behaviour, which made the
 * site feel like only flashcards exist. Surfaces every practice mode the
 * user actually has access to:
 *
 *   - Today's daily 5 (FSRS auto-pick — the historical default)
 *   - Drill by topic (Cardio, Endo, Resp, GI, Renal, Neuro, Haem, Calcs)
 *   - Drill by format (SBA, EMQ, Drug calc, Chained case)
 *   - Mock exam (timed paper)
 *   - Review mistakes
 *   - Browse clinical cases
 *
 * Picking a topic / format triggers a filtered FSRS session by passing
 * `?topic=<key>` or `?type=<kind>` to /study; StudyPage reads those and
 * the queue loader honours them.
 */
interface TopicChip {
  key: string;            // matches lowercased topic_path[0] via TOPIC_SYNONYMS
  label: string;
}

// Order: roughly by atom count in the live bank — most-populated topics first.
// Synonyms (e.g. cardiology + cardiovascular) are merged via the queueLoader
// TOPIC_SYNONYMS map so clicking one chip surfaces all related atoms.
const TOPICS: TopicChip[] = [
  { key: 'cardiology',       label: 'Cardiology' },          // + Cardiovascular
  { key: 'neurology',         label: 'Neurology' },
  { key: 'gastroenterology', label: 'GI' },
  { key: 'renal',            label: 'Renal' },
  { key: 'haematology',      label: 'Haematology' },
  { key: 'infection',         label: 'Infection' },           // + Immunology
  { key: 'surgery',          label: 'Surgery' },              // + Orthopaedics
  { key: 'respiratory',      label: 'Respiratory' },
  { key: 'psychiatry',       label: 'Psychiatry' },
  { key: 'dermatology',      label: 'Dermatology' },
  { key: 'obstetrics',       label: 'Obstetrics' },
  { key: 'endocrinology',    label: 'Endocrinology' },
  { key: 'paediatrics',      label: 'Paediatrics' },
];

interface FormatChip {
  kind: QuestionKind | 'case';   // 'case' is virtual — atoms with case_id
  label: string;
  blurb: string;
}

const FORMATS: FormatChip[] = [
  { kind: 'sba',  label: 'SBA',           blurb: 'Single-best-answer MCQ' },
  { kind: 'emq',  label: 'EMQ',           blurb: 'Extended matching, 11 options' },
  { kind: 'calc', label: 'Drug calc',     blurb: 'Numeric input, ±5 % tolerance' },
  { kind: 'case', label: 'Chained case',  blurb: 'Clinical vignette + linked Q\'s' },
];

export function StudyDashboard({
  onStartDailyFive,
  streakDays,
}: {
  onStartDailyFive: () => void;
  streakDays: number;
}) {
  return (
    <div className="space-y-5">
      {/* Hero card: today's daily 5 — the primary CTA */}
      <div className="rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-widest opacity-70">Today</div>
          {streakDays > 0 && (
            <div className="text-[11px] tracking-wide opacity-80">streak day {streakDays} 🔥</div>
          )}
        </div>
        <div className="text-2xl font-semibold leading-tight">Your daily 5</div>
        <p className="text-sm opacity-80">
          Spaced-repetition pick — mixes due reviews with 2 fresh questions of varying formats.
        </p>
        <button
          type="button"
          onClick={onStartDailyFive}
          className="w-full px-4 py-3 rounded-full bg-white dark:bg-stone-900 text-stone-900 dark:text-white text-sm font-medium hover:opacity-90"
        >
          Start session
        </button>
      </div>

      {/* Drill by topic */}
      <section className="space-y-2">
        <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 px-1">
          Drill by topic
        </div>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <Link
              key={t.key}
              to={`/study?topic=${t.key}`}
              className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 hover:border-stone-400 dark:hover:border-stone-600"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Drill by format */}
      <section className="space-y-2">
        <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 px-1">
          Drill by format
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FORMATS.map((f) => (
            <Link
              key={f.kind}
              to={`/study?type=${f.kind}`}
              className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3 hover:border-stone-400 dark:hover:border-stone-600"
            >
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100">{f.label}</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{f.blurb}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="space-y-2">
        <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 px-1">
          More
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Link
            to="/cases"
            className="flex items-center justify-between rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3 hover:border-stone-400 dark:hover:border-stone-600"
          >
            <div>
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100">Clinical cases</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Browse 14 chained vignettes by specialty</div>
            </div>
            <span className="text-stone-400">›</span>
          </Link>
          <Link
            to="/mock"
            className="flex items-center justify-between rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3 hover:border-stone-400 dark:hover:border-stone-600"
          >
            <div>
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100">Mock exam</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Timed paper, end-of-paper review</div>
            </div>
            <span className="text-stone-400">›</span>
          </Link>
          <Link
            to="/mistakes"
            className="flex items-center justify-between rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3 hover:border-stone-400 dark:hover:border-stone-600"
          >
            <div>
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100">Mistake review</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Drill what you got wrong recently</div>
            </div>
            <span className="text-stone-400">›</span>
          </Link>
          <Link
            to="/voice"
            className="flex items-center justify-between rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3 hover:border-stone-400 dark:hover:border-stone-600"
          >
            <div>
              <div className="text-sm font-medium text-stone-900 dark:text-stone-100">Voice mode</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Hands-free retrieval — questions read aloud</div>
            </div>
            <span className="text-stone-400">›</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
