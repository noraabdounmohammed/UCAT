import { useEffect, useState } from 'react';
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
      <div 
        className="rounded-[18px] border p-[22px] mb-4"
        style={{ 
          background: light ? '#F4ECDF' : 'rgba(255,255,255,0.05)',
          borderColor: light ? '#D9CCB6' : 'rgba(255,255,255,0.1)'
        }}
      >
        <p 
          className="text-[11px] font-semibold tracking-[0.22em] uppercase mb-3"
          style={{ color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
        >
          The links
        </p>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 rounded-full animate-pulse" style={{ width: `${60 + i * 12}%`, background: light ? '#D9CCB6' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error' || !bullets || bullets.length === 0) return null;

  const romanNumerals = ['i.', 'ii.', 'iii.', 'iv.', 'v.'];

  return (
    <div 
      className="rounded-[18px] border p-[22px] mb-4"
      style={{ 
        background: light ? '#F4ECDF' : 'rgba(255,255,255,0.05)',
        borderColor: light ? '#D9CCB6' : 'rgba(255,255,255,0.1)'
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-[14px]">
        <p 
          className="text-[11px] font-semibold tracking-[0.22em] uppercase"
          style={{ color: light ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
        >
          The links
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all border"
          style={{
            background: 'none',
            borderColor: light ? '#D9CCB6' : 'rgba(255,255,255,0.2)',
            color: light ? '#3B2A1E' : 'rgba(255,255,255,0.7)',
            fontFamily: 'Inter, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = light ? '#FAF5EC' : 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = light ? '#3B2A1E' : 'rgba(255,255,255,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.borderColor = light ? '#D9CCB6' : 'rgba(255,255,255,0.2)';
          }}
          aria-label="Copy takeaways"
        >
          {copied ? 'Copied' : '⧉ Copy'}
        </button>
      </div>
      <div className="flex flex-col">
        {bullets.map((b, i) => (
          <div 
            key={i} 
            className="flex gap-3 items-start py-[10px]"
            style={{ 
              borderTop: i === 0 ? 'none' : '1px dashed #D9CCB6',
              paddingTop: i === 0 ? '4px' : '10px'
            }}
          >
            <span 
              className="flex-shrink-0 min-w-[18px]"
              style={{ 
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                color: '#E5A89D',
                fontSize: '14px',
                lineHeight: '1.55'
              }}
            >
              {romanNumerals[i] || `${i + 1}.`}
            </span>
            <span 
              className="text-[17px] font-light leading-[1.45]"
              style={{ 
                fontFamily: "'Fraunces', serif",
                color: light ? '#2A1E16' : 'white'
              }}
              dangerouslySetInnerHTML={{ 
                __html: b.replace(/→/g, '<span style="color: #8A7560; margin: 0 2px; font-size: 14px;">→</span>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, `<em style="color: #E5A89D; font-weight: 400;">$1</em>`)
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
