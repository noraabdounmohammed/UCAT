import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionAnswer } from './SessionProgressDropdown';

interface PracticeSessionTakeawaysProps {
  answers: SessionAnswer[];
  questions: any[];
  light: boolean;
}

export function PracticeSessionTakeaways({ answers, questions, light }: PracticeSessionTakeawaysProps) {
  const [bullets, setBullets] = useState<string[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!bullets) return;
    navigator.clipboard.writeText(bullets.map((b, i) => `${i + 1}. ${b}`).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let cancelled = false;
    if (answers.length === 0) return;
    setStatus('loading');

    (async () => {
      try {
        const wrong = answers
          .filter(a => !a.isCorrect)
          .map(a => {
            const q = questions[a.questionIndex];
            return {
              stem: (q?.question_stem || q?.question || q?.content || '').slice(0, 300),
              answer: q?.correct_answer || q?.correctAnswer || '',
              topicPath: [q?.title || q?.topic || 'Unknown topic'],
            };
          });

        const right = answers
          .filter(a => a.isCorrect)
          .map(a => {
            const q = questions[a.questionIndex];
            return {
              stem: (q?.question_stem || q?.question || q?.content || '').slice(0, 200),
              topicPath: [q?.title || q?.topic || 'Unknown topic'],
            };
          });

        const r = await fetch('/.netlify/functions/session-takeaways', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wrong, right }),
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

  if (status === 'idle') return null;

  if (status === 'loading') {
    return (
      <div className={cn('rounded-2xl border p-4 mb-4', light ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10')}>
        <p className={cn('text-[11px] uppercase tracking-widest font-semibold mb-3', light ? 'text-zinc-400' : 'text-white/40')}>
          Takeaways
        </p>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={cn('h-3 rounded-full animate-pulse', light ? 'bg-zinc-100' : 'bg-white/10')} style={{ width: `${60 + i * 12}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error' || !bullets || bullets.length === 0) return null;

  return (
    <div className={cn('rounded-2xl border p-4 mb-4', light ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10')}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className={cn('text-[11px] uppercase tracking-widest font-semibold', light ? 'text-zinc-400' : 'text-white/40')}>
          Takeaways
        </p>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
            copied
              ? light ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/15 text-emerald-400'
              : light ? 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600' : 'hover:bg-white/10 text-white/30 hover:text-white/60'
          )}
          aria-label="Copy takeaways"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-baseline gap-2.5">
            <span className={cn('flex-shrink-0 w-1 h-1 rounded-full relative top-[0.4em]', light ? 'bg-zinc-400' : 'bg-white/40')} />
            <span className={cn('text-[13px] font-medium leading-snug', light ? 'text-zinc-700' : 'text-white/80')}>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
