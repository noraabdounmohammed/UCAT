import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SessionAnswer {
  questionIndex: number;
  isCorrect: boolean;
  topic?: string;
}

interface SessionProgressDropdownProps {
  answers: SessionAnswer[];
  total: number;
  currentIndex: number;
  isLightMode: boolean;
  onJumpTo?: (index: number) => void;
}

export const SessionProgressDropdown: React.FC<SessionProgressDropdownProps> = ({
  answers,
  total,
  currentIndex,
  isLightMode,
  onJumpTo,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const answered = answers.length;
  const correct = answers.filter(a => a.isCorrect).length;

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;

  const getAccuracyColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-400';
    if (pct >= 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div ref={ref} className="relative">
      {/* Pill trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
          isLightMode
            ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
            : 'bg-white/10 hover:bg-white/15 text-white/80 border border-white/10'
        )}
      >
        {/* Live score */}
        <span className={cn(accuracy !== null ? getAccuracyColor(accuracy) : '')}>
          {correct}
        </span>
        <span className={isLightMode ? 'text-zinc-400' : 'text-white/30'}>/</span>
        <span>{total}</span>
        {accuracy !== null && (
          <span className={cn('ml-0.5', getAccuracyColor(accuracy))}>
            ({accuracy}%)
          </span>
        )}
        <ChevronDown className={cn(
          'w-3 h-3 transition-transform',
          isOpen ? 'rotate-180' : '',
          isLightMode ? 'text-zinc-400' : 'text-white/40'
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          'absolute top-full right-0 mt-2 w-64 rounded-2xl border shadow-2xl z-50 overflow-hidden',
          isLightMode
            ? 'bg-white border-zinc-200'
            : 'bg-[#1E1E1E] border-white/10'
        )}>
          {/* Header */}
          <div className={cn(
            'px-4 py-3 border-b',
            isLightMode ? 'border-zinc-100' : 'border-white/10'
          )}>
            <p className={cn('text-xs font-semibold uppercase tracking-widest', isLightMode ? 'text-zinc-400' : 'text-white/40')}>
              Session Progress
            </p>
            {accuracy !== null && (
              <p className={cn('text-lg font-bold mt-0.5', getAccuracyColor(accuracy))}>
                {accuracy}% accuracy
              </p>
            )}
          </div>

          {/* Question dots grid */}
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: total }).map((_, i) => {
                const answer = answers.find(a => a.questionIndex === i);
                const isCurrent = i === currentIndex;

                return (
                  <button
                    key={i}
                    onClick={() => { onJumpTo?.(i); setIsOpen(false); }}
                    title={answer ? (answer.isCorrect ? 'Correct' : 'Incorrect') : `Question ${i + 1}`}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                      isCurrent && !answer ? 'ring-2 ring-offset-1 ring-blue-400' : '',
                      answer?.isCorrect
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : answer && !answer.isCorrect
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : isLightMode
                        ? 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                        : 'bg-white/5 text-white/30 border border-white/10'
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className={cn('flex items-center gap-4 mt-4 pt-3 border-t text-xs', isLightMode ? 'border-zinc-100 text-zinc-400' : 'border-white/10 text-white/40')}>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Correct
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Incorrect
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
                Unseen
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
