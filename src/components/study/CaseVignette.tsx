import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createCaseRepository } from '@/atom/caseRepository';
import type { ClinicalCase } from '@/atom/types';

interface CaseVignetteProps {
  supabase: SupabaseClient;
  /** caseId on the current atom — null/undefined means render nothing. */
  caseId: string | null | undefined;
}

/**
 * Chained-case vignette card. When the current atom's `caseId` is set,
 * we fetch the case and render its title + clinical scenario (vignette_md)
 * above the question.
 *
 * Collapsible — defaults to expanded the first time the user sees the case
 * in this session, but can be hidden if they want to focus on the question.
 *
 * The vignette is markdown-light — newlines preserved, no rendering of
 * actual MD syntax. Vignettes are author-controlled prose, ~80-150 words.
 */
export function CaseVignette({ supabase, caseId }: CaseVignetteProps) {
  const [c, setC] = useState<ClinicalCase | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!caseId) {
      setC(null);
      return;
    }
    // Per-case collapsed pref.
    try {
      const saved = typeof localStorage !== 'undefined'
        ? localStorage.getItem(`case-collapsed:${caseId}`)
        : null;
      setCollapsed(saved === 'true');
    } catch { /* ignore */ }
    const repo = createCaseRepository(supabase);
    repo.getById(caseId).then((data) => {
      if (cancelled) return;
      setC(data);
    }).catch(() => {
      if (cancelled) return;
      setC(null);
    });
    return () => { cancelled = true; };
  }, [caseId, supabase]);

  if (!c) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(`case-collapsed:${c.id}`, String(next));
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 px-4 py-3">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2">
          <div className="text-[11px] uppercase tracking-widest text-amber-700 dark:text-amber-400">
            Clinical case
          </div>
          <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
            {c.title}
          </div>
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-400">
          {collapsed ? 'show' : 'hide'}
        </div>
      </button>
      {!collapsed && (
        <div className="mt-3 space-y-2">
          {c.vignetteMd.split('\n').map((line, i) => (
            line.trim() === ''
              ? <div key={i} className="h-2" />
              : <p key={i} className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
                  {line}
                </p>
          ))}
          {c.citationLabel && c.citationUrl && (
            <a
              href={c.citationUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline mt-1 inline-block"
            >
              Source: {c.citationLabel} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
