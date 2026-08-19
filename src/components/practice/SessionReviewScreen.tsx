import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Home, Plus, RotateCcw } from 'lucide-react';
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
  blush: '#F2C9C1',
  blushDeep: '#E5A89D',
  blushSoft: '#F9E4DF',
  sage: '#8FA379',
  sageSoft: '#E2EAD6',
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  const total = questions.length;
  const correct = answers.filter(answer => answer.isCorrect).length;
  const needsReview = answers.filter(answer => !answer.isCorrect).length;

  const concepts = useMemo(() => {
    return questions.map((question, index) => {
      const answer = answers.find(a => a.questionIndex === index);
      const title = question?.concept_title || question?.title || question?.topic || `Concept ${index + 1}`;
      const stem = question?.vignette || question?.question_stem || question?.question || question?.content || '';
      const preview = stem.length > 90 ? `${stem.slice(0, 90)}…` : stem;
      return {
        index,
        title,
        preview,
        isCorrect: answer?.isCorrect ?? false,
      };
    });
  }, [questions, answers]);

  const weakConcepts = concepts.filter(concept => !concept.isCorrect);

  return (
    <main
      className={`fixed inset-0 overflow-y-auto transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: T.cream, color: T.ink }}
    >
      <div className="mx-auto min-h-full w-full max-w-[520px] px-5 pb-10 pt-5 sm:px-7">
        <header className="flex items-center justify-between border-b pb-4" style={{ borderColor: T.line }}>
          <div>
            <div className="text-[17px] font-semibold tracking-tight" style={{ color: T.espresso }}>StudyEdit</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em]" style={{ color: T.muted }}>Session review</div>
          </div>
          <button
            onClick={onDone}
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium"
            style={{ borderColor: T.line, color: T.ink, backgroundColor: T.paper }}
          >
            <Home className="h-3.5 w-3.5" /> Home
          </button>
        </header>

        <section className="pt-9">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: T.muted }}>
            Session complete · {total} concept{total === 1 ? '' : 's'}{sessionDuration ? ` · ${formatDuration(sessionDuration)}` : ''}
          </div>
          <h1
            className="mt-3 text-[38px] font-light leading-[1.04] tracking-[-0.035em]"
            style={{ fontFamily: "'Fraunces', serif", color: T.espresso }}
          >
            You tested the map.<br />
            <em className="font-light" style={{ color: T.blushDeep }}>Now we know more.</em>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6" style={{ color: T.muted }}>
            This session is evidence, not a grade. StudyEdit will use it to decide what deserves attention next.
          </p>
        </section>

        <section className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border p-5" style={{ backgroundColor: T.paper, borderColor: T.line }}>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: T.muted }}>Retrieved</div>
            <div className="mt-2 text-4xl font-light" style={{ fontFamily: "'Fraunces', serif", color: T.espresso }}>{correct}</div>
            <div className="mt-1 text-xs" style={{ color: T.muted }}>correct this session</div>
          </div>
          <div className="rounded-[22px] border p-5" style={{ backgroundColor: needsReview ? T.blushSoft : T.paper, borderColor: needsReview ? T.blushDeep : T.line }}>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: needsReview ? '#9C655D' : T.muted }}>Needs another pass</div>
            <div className="mt-2 text-4xl font-light" style={{ fontFamily: "'Fraunces', serif", color: T.espresso }}>{needsReview}</div>
            <div className="mt-1 text-xs" style={{ color: T.muted }}>missed this session</div>
          </div>
        </section>

        {weakConcepts.length > 0 ? (
          <section className="mt-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: T.muted }}>Worth another look</div>
                <h2 className="mt-1.5 text-2xl font-light" style={{ fontFamily: "'Fraunces', serif", color: T.espresso }}>
                  The concepts that didn’t retrieve cleanly
                </h2>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[22px] border" style={{ backgroundColor: T.paper, borderColor: T.line }}>
              {weakConcepts.map((concept, position) => (
                <button
                  key={concept.index}
                  onClick={() => onViewQuestion?.(concept.index)}
                  disabled={!onViewQuestion}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left disabled:cursor-default"
                  style={{ borderTop: position ? `1px solid ${T.line}` : 'none' }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs"
                    style={{ backgroundColor: T.blushSoft, border: `1px solid ${T.blushDeep}`, color: '#9C655D' }}
                  >
                    ×
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-medium" style={{ fontFamily: "'Fraunces', serif", color: T.espresso }}>{concept.title}</div>
                    {concept.preview && <div className="mt-1 truncate text-xs" style={{ color: T.muted }}>{concept.preview}</div>}
                  </div>
                  {onViewQuestion && <ArrowRight className="h-4 w-4 shrink-0" style={{ color: T.muted }} />}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="mt-7 rounded-[22px] border p-5" style={{ backgroundColor: T.sageSoft, borderColor: T.sage }}>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: '#647452' }}>This session</div>
            <h2 className="mt-2 text-2xl font-light" style={{ fontFamily: "'Fraunces', serif", color: T.espresso }}>Everything retrieved this time.</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: T.muted }}>That’s useful evidence. It doesn’t retire the concepts forever; their next review can still be scheduled as memory decays.</p>
          </section>
        )}

        <section className="mt-8 border-t pt-6" style={{ borderColor: T.line }}>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: T.muted }}>What next?</div>
          <div className="mt-3 space-y-2.5">
            <button
              onClick={onDone}
              className="flex w-full items-center justify-between rounded-full px-5 py-4 text-sm font-medium"
              style={{ backgroundColor: T.espresso, color: T.cream }}
            >
              <span>Back to Home</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {needsReview > 0 && (
              <button
                onClick={onRetryIncorrect}
                className="flex w-full items-center justify-center gap-2 rounded-full border px-5 py-4 text-sm font-medium"
                style={{ backgroundColor: T.paper, borderColor: T.line, color: T.ink }}
              >
                <RotateCcw className="h-4 w-4" /> Retry the {needsReview}
              </button>
            )}

            {onAnotherFive && (
              <button
                onClick={() => onAnotherFive(undefined)}
                className="flex w-full items-center justify-center gap-2 px-5 py-3 text-sm"
                style={{ color: T.muted }}
              >
                <Plus className="h-4 w-4" /> Another 5
              </button>
            )}
          </div>
        </section>

        <section className="mt-8">
          <details>
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.18em]" style={{ color: T.muted }}>
              All concepts visited
            </summary>
            <div className="mt-3 overflow-hidden rounded-[20px] border" style={{ backgroundColor: T.paper, borderColor: T.line }}>
              {concepts.map((concept, position) => (
                <button
                  key={concept.index}
                  onClick={() => onViewQuestion?.(concept.index)}
                  disabled={!onViewQuestion}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-default"
                  style={{ borderTop: position ? `1px solid ${T.line}` : 'none' }}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]"
                    style={{
                      backgroundColor: concept.isCorrect ? T.sageSoft : T.blushSoft,
                      border: `1px solid ${concept.isCorrect ? T.sage : T.blushDeep}`,
                      color: concept.isCorrect ? '#647452' : '#9C655D',
                    }}
                  >
                    {concept.isCorrect ? '✓' : '×'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm" style={{ color: T.ink }}>{concept.title}</span>
                  {onViewQuestion && <ArrowRight className="h-3.5 w-3.5" style={{ color: T.muted }} />}
                </button>
              ))}
            </div>
          </details>
        </section>
      </div>
    </main>
  );
};
