import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Flame, Target, Plus, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionAnswer } from './SessionProgressDropdown';
import { useTheme } from '@/contexts/ThemeContext';
import { PracticeSessionTakeaways } from './PracticeSessionTakeaways';

interface SessionReviewScreenProps {
  answers: SessionAnswer[];
  questions: any[];
  onRetryIncorrect: () => void;
  onDone: () => void;
  onAnotherFive?: (filter?: string) => void;
}

// Behavioral science: variable reward messaging based on score
const getSessionMessage = (accuracy: number, streak: number) => {
  if (accuracy === 100) return { headline: 'Perfect session.', sub: 'Every single one. That\'s rare — remember this feeling.', color: 'text-emerald-400' };
  if (accuracy >= 90) return { headline: 'Outstanding.', sub: `${accuracy}% — you\'re in the top tier. One more push and it's perfect.`, color: 'text-emerald-400' };
  if (accuracy >= 75) return { headline: 'Strong session.', sub: `${accuracy}% accuracy. You\'re building real clinical reasoning.`, color: 'text-emerald-400' };
  if (accuracy >= 60) return { headline: 'Solid progress.', sub: `${accuracy}% — the gaps you have are fixable. Review the ones below.`, color: 'text-amber-400' };
  if (accuracy >= 40) return { headline: 'Keep going.', sub: `${accuracy}% — this is exactly where improvement happens. Review every incorrect one.`, color: 'text-amber-400' };
  return { headline: 'Rough session — good.', sub: 'You found your weak spots. That\'s the point. Review them now while they\'re fresh.', color: 'text-rose-400' };
};

// Calculate longest correct streak
const getLongestStreak = (answers: SessionAnswer[]): number => {
  let max = 0, curr = 0;
  const sorted = [...answers].sort((a, b) => a.questionIndex - b.questionIndex);
  for (const a of sorted) {
    if (a.isCorrect) { curr++; max = Math.max(max, curr); }
    else curr = 0;
  }
  return max;
};

export const SessionReviewScreen: React.FC<SessionReviewScreenProps> = ({
  answers,
  questions,
  onRetryIncorrect,
  onDone,
  onAnotherFive,
}) => {
  const [visible, setVisible] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const light = theme === 'light';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const total = questions.length;
  const correct = answers.filter(a => a.isCorrect).length;
  const incorrect = answers.filter(a => !a.isCorrect).length;
  const unanswered = total - answers.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const streak = getLongestStreak(answers);
  const { headline, sub, color } = getSessionMessage(accuracy, streak);
  const incorrectQuestions = answers.filter(a => !a.isCorrect);

  // Behavioral science: frame unanswered as potential, not failure
  const attempted = answers.length;

  return (
    <div className={cn(
      'fixed inset-0 flex flex-col overflow-y-auto transition-opacity duration-500',
      light ? 'bg-zinc-50' : 'bg-[#0A0A0A]',
      visible ? 'opacity-100' : 'opacity-0'
    )}>
      {/* Theme toggle */}
      <div className="sticky top-0 z-10 flex justify-end px-4 pt-4">
        <button
          onClick={toggleTheme}
          className={cn('p-2 rounded-full transition-colors', light ? 'hover:bg-zinc-200 text-zinc-600' : 'hover:bg-white/10 text-white/60')}
          aria-label="Toggle theme"
        >
          {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
      <div className="max-w-2xl mx-auto w-full px-4 pb-10 sm:pb-16">

        {/* Score circle */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center w-28 h-28 mb-6">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke={light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'} strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={accuracy >= 75 ? '#34d399' : accuracy >= 50 ? '#fbbf24' : '#f87171'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - accuracy / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute text-center">
              <p className={cn('text-3xl font-bold', light ? 'text-zinc-900' : 'text-white')}>{accuracy}%</p>
            </div>
          </div>

          <h1 className={cn('text-2xl sm:text-3xl font-bold mb-2', light ? 'text-zinc-900' : 'text-white')} style={{ fontFamily: "'Unbounded', cursive" }}>
            {headline}
          </h1>
          <p className={cn('text-sm max-w-sm mx-auto', light ? 'text-zinc-500' : 'text-white/50')} style={{ fontFamily: "'Manrope', sans-serif" }}>
            {sub}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Correct', value: correct, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { icon: <XCircle className="w-4 h-4" />, label: 'Incorrect', value: incorrect, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
            { icon: <Flame className="w-4 h-4" />, label: 'Best streak', value: streak, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          ].map(({ icon, label, value, color, bg }) => (
            <div key={label} className={cn('rounded-2xl border p-4 text-center', bg)}>
              <div className={cn('flex justify-center mb-1', color)}>{icon}</div>
              <p className={cn('text-xl font-bold', color)}>{value}</p>
              <p className={cn('text-xs mt-0.5', light ? 'text-zinc-500' : 'text-white/40')}>{label}</p>
            </div>
          ))}
        </div>

        {incorrectQuestions.length > 0 && (
          <div className="mb-4">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Target className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={cn('text-sm font-semibold', light ? 'text-zinc-800' : 'text-white/90')}>
                    {incorrectQuestions.length} question{incorrectQuestions.length > 1 ? 's' : ''} to review
                  </p>
                  <p className={cn('text-xs mt-0.5', light ? 'text-zinc-500' : 'text-white/40')}>
                    Retrying incorrect questions now is 3× more effective than moving on.
                  </p>
                </div>
              </div>
            </div>
            <div className={cn('flex gap-2', onAnotherFive ? 'flex-row' : 'flex-col')}>
              {onAnotherFive && (
                <button
                  onClick={() => onAnotherFive(undefined)}
                  className={cn('flex-1 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all', light ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'bg-white text-stone-900 hover:bg-stone-100')}
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  <Plus className="w-4 h-4" />
                  Another 5
                </button>
              )}
              <button
                onClick={onRetryIncorrect}
                className={cn('flex-1 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all border', light ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' : 'bg-white/10 border-white/20 text-white hover:bg-white/20')}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                <RotateCcw className="w-4 h-4" />
                Retry {incorrectQuestions.length}
              </button>
            </div>
          </div>
        )}

        {/* AI Takeaways */}
        <PracticeSessionTakeaways answers={answers} questions={questions} light={light} />

        {/* Question breakdown */}
        <div className={cn('border rounded-2xl overflow-hidden mb-4', light ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10')}>
          <div className={cn('px-4 py-3 border-b', light ? 'border-zinc-200' : 'border-white/10')}>
            <p className={cn('text-xs font-semibold uppercase tracking-widest', light ? 'text-zinc-400' : 'text-white/40')}>Question Breakdown</p>
          </div>
          <div className={cn('divide-y', light ? 'divide-zinc-100' : 'divide-white/5')}>
            {questions.map((q, i) => {
              const answer = answers.find(a => a.questionIndex === i);
              const topic = q.title || q.topic || `Question ${i + 1}`;
              const questionPreview = (q.question_stem || q.question || q.content || '').slice(0, 80);

              return (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {answer?.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : answer && !answer.isCorrect ? (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <div className={cn('w-4 h-4 rounded-full border', light ? 'border-zinc-300' : 'border-white/20')} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-xs font-medium truncate', light ? 'text-zinc-700' : 'text-white/70')}>{topic}</p>
                    {questionPreview && (
                      <p className={cn('text-xs truncate mt-0.5', light ? 'text-zinc-400' : 'text-white/30')}>{questionPreview}…</p>
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                    answer?.isCorrect ? 'bg-emerald-500/15 text-emerald-600' :
                    answer ? 'bg-rose-500/15 text-rose-600' :
                    light ? 'bg-zinc-100 text-zinc-400' : 'bg-white/5 text-white/20'
                  )}>
                    {answer?.isCorrect ? 'Correct' : answer ? 'Wrong' : 'Skipped'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Done button */}
        <button
          onClick={onDone}
          className={cn('w-full py-3.5 rounded-full border font-semibold text-sm flex items-center justify-center gap-2 transition-all', light ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200' : 'bg-white/10 border-white/15 text-white/70 hover:bg-white/15')}
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Back to dashboard
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
