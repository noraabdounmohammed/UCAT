import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Brain, Activity, Beaker, Stethoscope, Bandage, Bone, Baby,
  FlaskConical, Sparkles, ScrollText, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import type { ClinicalCase } from '@/atom/types';

interface CaseWithMeta extends ClinicalCase {
  /** Number of atoms attached to this case in the bank. */
  atomCount: number;
  /** First topic from a representative atom — drives the icon + tint. */
  topic: string;
}

interface IconMapEntry {
  Icon: typeof Heart;
  tint: string;
}

const TOPIC_ICONS: Record<string, IconMapEntry> = {
  cardiology:       { Icon: Heart,        tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  cardiovascular:   { Icon: Heart,        tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  neurology:        { Icon: Brain,        tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  respiratory:      { Icon: Activity,     tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  gastroenterology: { Icon: Beaker,       tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  renal:            { Icon: FlaskConical, tint: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' },
  haematology:      { Icon: Activity,     tint: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  infection:        { Icon: Stethoscope,  tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  immunology:       { Icon: Stethoscope,  tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  surgery:          { Icon: Bandage,      tint: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  orthopaedics:     { Icon: Bone,         tint: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
  psychiatry:       { Icon: Brain,        tint: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300' },
  dermatology:      { Icon: Sparkles,     tint: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' },
  obstetrics:       { Icon: Baby,         tint: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' },
  endocrinology:    { Icon: FlaskConical, tint: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
  paediatrics:      { Icon: Baby,         tint: 'bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300' },
};

function iconFor(topic: string): IconMapEntry {
  return TOPIC_ICONS[topic.toLowerCase()] ?? {
    Icon: ScrollText,
    tint: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  };
}

/**
 * Browse-by-clinical-case landing.
 *
 * Modernised to match the dashboard aesthetic — each case becomes a
 * topic-coloured tile with an icon, vignette preview, and atom-count
 * badge. Clicking it kicks off a focused drill of just that case's
 * atoms via the new `/study?case=<id>` route (state model already
 * supports filterCase via the queueLoader).
 *
 * Cases are grouped by their dominant topic so neurology cases sit
 * together, GI cases sit together, etc.
 */
export function CasesPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseWithMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        // Fetch cases + a sampling of atoms per case to derive topic + count.
        const { data: cs, error: caseErr } = await supabase
          .from('clinical_cases')
          .select('*')
          .in('status', ['approved', 'pending_review'])
          .order('created_at', { ascending: true });
        if (cancelled) return;
        if (caseErr) throw caseErr;

        const { data: atoms, error: atomErr } = await supabase
          .from('atoms')
          .select('case_id,topic_path')
          .not('case_id', 'is', null);
        if (atomErr) throw atomErr;

        const byCaseId: Record<string, { count: number; topic: string }> = {};
        for (const row of (atoms ?? []) as Array<{ case_id: string; topic_path: string[] | null }>) {
          if (!row.case_id) continue;
          const t = (row.topic_path?.[0] ?? '').toLowerCase();
          if (!byCaseId[row.case_id]) byCaseId[row.case_id] = { count: 0, topic: t };
          byCaseId[row.case_id].count++;
          // First topic wins; subsequent atoms in the same case may share or differ.
        }

        const enriched: CaseWithMeta[] = (cs ?? []).map((row: Record<string, unknown>) => {
          const meta = byCaseId[row.id as string] ?? { count: 0, topic: '' };
          return {
            id: row.id as string,
            exam: row.exam as string,
            title: row.title as string,
            vignetteMd: ((row.vignette_md as string | null) ?? '') as string,
            citationUrl: (row.citation_url as string | null) ?? null,
            citationLabel: (row.citation_label as string | null) ?? null,
            status: row.status as ClinicalCase['status'],
            createdAt: (row.created_at as string) ?? '',
            atomCount: meta.count,
            topic: meta.topic,
          };
        });
        setCases(enriched);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load cases');
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Group cases by topic for visual organisation.
  const grouped = useMemo(() => {
    if (!cases) return null;
    const m = new Map<string, CaseWithMeta[]>();
    for (const c of cases) {
      const key = c.topic || 'other';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    // Sort topics alphabetically, but float biggest first.
    return Array.from(m.entries()).sort(
      ([, a], [, b]) => b.length - a.length,
    );
  }, [cases]);

  if (!user) {
    return (
      <MainLayout currentPage="cases">
        <AuthGate
          title="Sign in to browse clinical cases"
          subtitle="Chained vignettes — diagnose, manage, recognise. Real exam-style scenarios."
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPage="cases">
      <div className="max-w-md mx-auto py-6 px-4 space-y-5">
        <header className="space-y-1">
          <Link to="/study" className="text-xs text-stone-600 dark:text-stone-400 hover:underline">
            ← back to study
          </Link>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            Clinical cases
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Each case is a real-feel vignette plus 3 linked questions: typical Dx → Mx → finer detail. NICE/BNF-cited.
          </p>
          {cases && (
            <div className="text-[11px] text-stone-500 dark:text-stone-400 pt-1">
              {cases.length} cases · {cases.reduce((s, c) => s + c.atomCount, 0)} questions total
            </div>
          )}
        </header>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        {cases === null && !error && (
          <div className="text-xs text-stone-500 dark:text-stone-400">Loading cases…</div>
        )}

        {cases && cases.length === 0 && (
          <div className="text-xs text-stone-500 dark:text-stone-400">No clinical cases yet.</div>
        )}

        {grouped &&
          grouped.map(([topic, list]) => {
            const { Icon, tint } = iconFor(topic);
            const topicLabel = topic
              ? topic[0].toUpperCase() + topic.slice(1)
              : 'Other';
            return (
              <section key={topic} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${tint}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {topicLabel}
                  </h3>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    · {list.length} case{list.length === 1 ? '' : 's'}
                  </span>
                </div>
                <ul className="space-y-2">
                  {list.map((c) => {
                    const previewLine = c.vignetteMd
                      .split('\n')
                      .find((l) => l.trim().length > 0);
                    return (
                      <li key={c.id}>
                        <Link
                          to="/study?type=case"
                          className="group flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-sm transition-all"
                        >
                          <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${tint} flex items-center justify-center`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-tight">
                                {c.title}
                              </div>
                              {c.atomCount > 0 && (
                                <span className="flex-shrink-0 text-[10px] font-semibold tracking-wide bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded">
                                  {c.atomCount}q
                                </span>
                              )}
                            </div>
                            {previewLine && (
                              <div className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 leading-snug">
                                {previewLine}
                              </div>
                            )}
                            {c.citationLabel && (
                              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1.5 italic">
                                {c.citationLabel}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
      </div>
    </MainLayout>
  );
}
