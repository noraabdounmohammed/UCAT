import React, { useMemo } from 'react';
import { ArrowRight, Home, RotateCcw } from 'lucide-react';
import { SessionAnswer } from './SessionProgressDropdown';

interface SessionReviewScreenProps {
  answers: SessionAnswer[];
  questions: any[];
  onRetryIncorrect: () => void;
  onDone: () => void;
  onAnotherFive?: (filter?: string) => void;
  onViewQuestion?: (questionIndex: number) => void;
  sessionDuration?: number;
}

const T = {
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  blushDeep: '#E5A89D',
  blushSoft: '#F9E4DF',
  sage: '#8FA379',
  sageSoft: '#E7ECD9',
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export const SessionReviewScreen: React.FC<SessionReviewScreenProps> = ({
  answers,
  questions,
  onRetryIncorrect,
  onDone,
  onAnotherFive,
  onViewQuestion,
  sessionDuration,
}) => {
  const total = questions.length;
  const correct = answers.filter(answer => answer.isCorrect).length;

  const cases = useMemo(() => questions.map((question, index) => {
    const answer = answers.find(item => item.questionIndex === index);
    const title = question?.concept_title || question?.title || question?.topic || `Question ${index + 1}`;
    return {
      index,
      title,
      isCorrect: answer?.isCorrect ?? false,
    };
  }), [answers, questions]);

  const misses = cases.filter(item => !item.isCorrect);
  const missedTitles = Array.from(new Set(misses.map(item => item.title)));

  const repeatedMiss = useMemo(() => {
    const counts = new Map<string, number>();
    misses.forEach(item => counts.set(item.title, (counts.get(item.title) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).find(([, count]) => count >= 2) || null;
  }, [misses]);

  const observation = useMemo(() => {
    if (misses.length === 0) {
      return 'Nothing obvious needs chasing from this session. I’d let spacing do the work rather than force more of the same now.';
    }
    if (repeatedMiss) {
      return `${repeatedMiss[0]} needed support more than once. That is the clearest thing I’d bring back.`;
    }
    if (misses.length === 1) {
      return `${misses[0].title} needed another look. I wouldn’t call that a broader weakness from one case.`;
    }
    if (missedTitles.length <= 3) {
      return `The misses were spread across ${missedTitles.join(', ')}. I wouldn’t overread one session; I’d revisit them separately.`;
    }
    return 'The misses were spread across different areas, so I wouldn’t call a broader pattern yet.';
  }, [missedTitles, misses, repeatedMiss]);

  const nextStep = useMemo(() => {
    if (misses.length === 0) return 'I’ll keep these concepts in rotation and bring them back after some spacing.';
    if (repeatedMiss) return `I’ll bring ${repeatedMiss[0]} back first in a different case, then space the other misses.`;
    if (misses.length === 1) return `I’ll bring ${misses[0].title} back later from a different angle.`;
    return 'I’ll bring the missed concepts back in different cases rather than repeating the same questions now.';
  }, [misses, repeatedMiss]);

  return (
    <main className="fixed inset-0 overflow-y-auto" style={{ backgroundColor: T.cream, color: T.ink }}>
      <div className="mx-auto min-h-full w-full max-w-[620px] px-5 pb-10 pt-5 sm:px-7 sm:pt-7">
        <header className="flex items-center justify-between">
          <div className="text-[18px] font-extrabold tracking-[-0.03em]" style={{ color: T.espresso }}>studyedit.</div>
          <button onClick={onDone} className="inline-flex items-center gap-2 text-[12px] font-semibold" style={{ color: T.muted }}>
            <Home className="h-3.5 w-3.5" /> Home
          </button>
        </header>

        <section className="pt-14 sm:pt-20">
          <h1 className="text-[38px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[46px]" style={{ color: T.espresso }}>
            Good place to stop.
          </h1>

          <p className="mt-6 text-[19px] font-semibold leading-[1.6] tracking-[-0.015em]" style={{ color: T.ink }}>
            {observation}
          </p>

          <section className="mt-7 rounded-[19px] border p-5" style={{ borderColor: '#D7DEC8', backgroundColor: T.sageSoft }}>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: '#667555' }}>Next time</div>
            <p className="mt-2 text-[16px] font-semibold leading-6" style={{ color: T.espresso }}>{nextStep}</p>
          </section>

          <div className="mt-4 text-[12px] font-medium" style={{ color: T.muted }}>
            {total} case{total === 1 ? '' : 's'} · {correct} retrieved first time{sessionDuration ? ` · ${formatDuration(sessionDuration)}` : ''}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button onClick={onDone} className="rounded-[14px] px-5 py-3.5 text-[14px] font-bold" style={{ backgroundColor: T.espresso, color: T.cream }}>
              Done for now
            </button>
            {onAnotherFive && (
              <button onClick={() => onAnotherFive()} className="text-[13px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: T.muted }}>
                Another session →
              </button>
            )}
          </div>
        </section>

        <section className="mt-10 border-t pt-5" style={{ borderColor: T.line }}>
          <details>
            <summary className="cursor-pointer list-none text-[13px] font-bold" style={{ color: T.espresso }}>
              Review this session <span className="ml-1" style={{ color: T.muted }}>↓</span>
            </summary>

            <div className="mt-4 overflow-hidden rounded-[18px] border" style={{ borderColor: T.line, backgroundColor: T.paper }}>
              {cases.map((item, position) => (
                <button
                  key={`${item.index}-${item.title}`}
                  type="button"
                  onClick={() => onViewQuestion?.(item.index)}
                  disabled={!onViewQuestion}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left disabled:cursor-default"
                  style={{ borderTop: position ? `1px solid ${T.line}` : 'none' }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                    style={{
                      backgroundColor: item.isCorrect ? T.sageSoft : T.blushSoft,
                      color: item.isCorrect ? '#667555' : '#9C655D',
                    }}
                  >
                    {item.isCorrect ? '✓' : '×'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold" style={{ color: T.espresso }}>{item.title}</span>
                  {onViewQuestion && <ArrowRight className="h-4 w-4 shrink-0" style={{ color: T.muted }} />}
                </button>
              ))}
            </div>

            {misses.length > 0 && (
              <button onClick={onRetryIncorrect} className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: T.muted }}>
                <RotateCcw className="h-3.5 w-3.5" /> Revisit the misses now
              </button>
            )}
          </details>
        </section>
      </div>
    </main>
  );
};
