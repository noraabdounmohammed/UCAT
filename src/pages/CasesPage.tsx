import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { createCaseRepository } from '@/atom/caseRepository';
import type { ClinicalCase } from '@/atom/types';

/**
 * Browse-by-case landing. Lists every approved/pending clinical_case row
 * with its title + first 1-2 lines of the vignette. Tap → /study?case=<id>
 * starts a chained-case drill (atoms whose case_id matches).
 *
 * The /study route doesn't yet honour ?case=<id> — for now the link
 * navigates to /study?type=case which surfaces ALL chained-case atoms.
 * Per-case drill is a follow-up.
 */
export function CasesPage() {
  const { user } = useAuth();
  const repo = useMemo(() => createCaseRepository(supabase), []);
  const [cases, setCases] = useState<ClinicalCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from('clinical_cases')
          .select('*')
          .in('status', ['approved', 'pending_review'])
          .order('created_at', { ascending: true });
        if (cancelled) return;
        if (err) throw err;
        const rows = (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          exam: row.exam as string,
          title: row.title as string,
          vignetteMd: ((row.vignette_md as string | null) ?? '') as string,
          citationUrl: (row.citation_url as string | null) ?? null,
          citationLabel: (row.citation_label as string | null) ?? null,
          status: row.status as ClinicalCase['status'],
          createdAt: (row.created_at as string) ?? '',
        }));
        setCases(rows);
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load cases');
      }
    })();
    return () => {
      cancelled = true;
    };
    // we read repo via supabase directly above so this single dep is fine
  }, [user, repo]);

  if (!user) {
    return (
      <MainLayout currentPage="cases">
        <AuthGate
          title="Sign in to browse clinical cases"
          subtitle="Chained vignettes — diagnose, manage, and recognise common UKMLA presentations."
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPage="cases">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <header className="space-y-1">
          <Link
            to="/study"
            className="text-xs text-stone-600 dark:text-stone-400 hover:underline"
          >
            ← back to study
          </Link>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Clinical cases
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Each case is a vignette plus 3 linked questions: typical Dx → Mx → finer detail. NICE/BNF-cited.
          </p>
        </header>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        {cases === null && !error && (
          <div className="text-xs text-stone-500 dark:text-stone-400">Loading…</div>
        )}

        {cases && cases.length === 0 && (
          <div className="text-xs text-stone-500 dark:text-stone-400">
            No clinical cases yet.
          </div>
        )}

        <ul className="space-y-2">
          {(cases ?? []).map((c) => {
            const previewLines = c.vignetteMd.split('\n').filter((l) => l.trim().length > 0).slice(0, 1);
            return (
              <li key={c.id}>
                <Link
                  to="/study?type=case"
                  className="block rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3 hover:border-stone-400 dark:hover:border-stone-600"
                >
                  <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {c.title}
                  </div>
                  {previewLines[0] && (
                    <div className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">
                      {previewLines[0]}
                    </div>
                  )}
                  {c.citationLabel && (
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 italic">
                      {c.citationLabel}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </MainLayout>
  );
}
