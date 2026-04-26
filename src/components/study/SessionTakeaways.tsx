import { useEffect, useState } from 'react';
import type { Atom } from '@/atom/types';

export interface SessionTakeawaysProps {
  /** All atoms the user just answered, plus whether they got it right.
      The component focuses on the wrong picks for the takeaways. */
  results: { atom: Atom; correct: boolean }[];
}

/**
 * AI-generated 2-4 bullet takeaways from a finished session.
 *
 * For sessions with at least one wrong answer, asks DeepSeek to spot the
 * common pattern across the misses ("you keep mixing up first-line
 * antihypertensives", "consider the link between AF and stroke risk").
 * For all-correct sessions, surfaces a brief congrats with one suggested
 * next-topic prompt.
 *
 * Cost: 1 LLM call per session end. ~$0.001 each. Falls silently to a
 * static message if the call fails — never blocks the summary screen.
 */
export function SessionTakeaways({ results }: SessionTakeawaysProps) {
  const [bullets, setBullets] = useState<string[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    if (results.length === 0) return;
    setStatus('loading');
    (async () => {
      try {
        const wrong = results.filter(r => !r.correct);
        const right = results.filter(r => r.correct);
        const r = await fetch('/.netlify/functions/session-takeaways', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wrong: wrong.map(w => ({
              stem: w.atom.canonicalStem,
              answer: w.atom.answer,
              topicPath: w.atom.topicPath,
            })),
            right: right.map(w => ({
              stem: w.atom.canonicalStem,
              topicPath: w.atom.topicPath,
            })),
          }),
        });
        if (!r.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const j: { bullets?: string[] } = await r.json();
        if (cancelled) return;
        if (Array.isArray(j.bullets) && j.bullets.length > 0) {
          setBullets(j.bullets.slice(0, 5));
          setStatus('ready');
        } else {
          setStatus('error');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'idle' || status === 'loading') return null;
  if (status === 'error' || !bullets || bullets.length === 0) return null;

  return (
    <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4">
      <div className="text-[11px] uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-2">
        Takeaways
      </div>
      <ul className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-stone-400 dark:text-stone-500" aria-hidden="true">·</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
