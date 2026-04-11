import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Flame, Trophy, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionAnswer } from './SessionProgressDropdown';

interface SessionReviewScreenProps {
  answers: SessionAnswer[];
  questions: any[];
  onRetryIncorrect: () => void;
  onDone: () => void;
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
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay for entrance animation
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
      'fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-y-auto transition-opacity duration-500',
      visible ? 'opacity-100' : 'opacity-0'
    )}>
      <div className="max-w-2xl mx-auto w-full px-4 py-10 sm:py-16">

        {/* Score circle */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center w-28 h-28 mb-6">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
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
              <p className="text-3xl font-bold text-white">{accuracy}%</p>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Unbounded', cursive" }}>
            {headline}
          </h1>
          <p className="text-sm text-white/50 max-w-sm mx-auto" style={{ fontFamily: "'Manrope', sans-serif" }}>
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
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Behavioral science: "Retry incorrect" is primary CTA when there are mistakes */}
        {incorrectQuestions.length > 0 && (
          <div className="mb-4">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Target className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white/90">
                    {incorrectQuestions.length} question{incorrectQuestions.length > 1 ? 's' : ''} to review
                  </p>
                  {/* Loss aversion: show what's being left behind */}
                  <p className="text-xs text-white/40 mt-0.5">
                    Retrying incorrect questions now is 3× more effective than moving on.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onRetryIncorrect}
              className="w-full py-3.5 rounded-full bg-white text-stone-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-100 transition-all"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              <RotateCcw className="w-4 h-4" />
              Retry {incorrectQuestions.length} incorrect question{incorrectQuestions.length > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Question breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Question Breakdown</p>
          </div>
          <div className="divide-y divide-white/5">
            {questions.map((q, i) => {
              const answer = answers.find(a => a.questionIndex === i);
              const topic = q.title || q.topic || `Question ${i + 1}`;
              const questionPreview = (q.question_stem || q.question || q.content || '').slice(0, 80);

              return (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {answer?.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : answer && !answer.isCorrect ? (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/20" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white/70 truncate">{topic}</p>
                    {questionPreview && (
                      <p className="text-xs text-white/30 truncate mt-0.5">{questionPreview}…</p>
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                    answer?.isCorrect ? 'bg-emerald-500/15 text-emerald-400' :
                    answer ? 'bg-rose-500/15 text-rose-400' :
                    'bg-white/5 text-white/20'
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
          className="w-full py-3.5 rounded-full bg-white/10 border border-white/15 text-white/70 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/15 transition-all"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Back to dashboard
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
