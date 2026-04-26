import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface TopicPrimerProps {
  supabase: SupabaseClient;
  /** Top-level topic (e.g. atom.topicPath[0]). Lowercased before lookup. */
  topicKey: string | null;
}

interface PrimerRow {
  topic_name: string;
  body: string;
  source: string;
}

/**
 * Read-before-drilling primer card. Pulls from `topic_primers` keyed off
 * the user's current topic. Renders nothing if no primer exists for the
 * topic, or while loading.
 *
 * The primer is a 200-300-word AI-paraphrased overview grounded in NICE/
 * NHS guidance — copyright-safe (Open Government Licence). Generated
 * once via `npm run primers:ai`.
 *
 * Collapsible — defaults to expanded the first time the user lands on
 * a topic (per-topic localStorage flag). They can collapse it and we
 * remember.
 */
export function TopicPrimer({ supabase, topicKey }: TopicPrimerProps) {
  const [row, setRow] = useState<PrimerRow | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (!topicKey) {
      setRow(null);
      return;
    }
    const k = topicKey.toLowerCase();
    // Per-topic collapsed pref.
    try {
      const saved = typeof localStorage !== 'undefined'
        ? localStorage.getItem(`primer-collapsed:${k}`)
        : null;
      setCollapsed(saved === 'true');
    } catch { /* ignore */ }

    supabase
      .from('topic_primers')
      .select('topic_name, body, source')
      .eq('topic_key', k)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setRow(null);
          return;
        }
        setRow(data as PrimerRow);
      });
    return () => { cancelled = true; };
  }, [topicKey, supabase]);

  if (!row) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(`primer-collapsed:${(topicKey ?? '').toLowerCase()}`, String(next));
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-4 py-3">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2">
          <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Primer
          </div>
          <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
            {row.topic_name}
          </div>
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-400">
          {collapsed ? 'show' : 'hide'}
        </div>
      </button>
      {!collapsed && (
        <>
          <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed mt-2">
            {row.body}
          </p>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-2 italic">
            Paraphrased from {row.source}
          </div>
        </>
      )}
    </div>
  );
}
