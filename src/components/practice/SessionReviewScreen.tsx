import React, { useMemo } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { learnerEvidenceSummary, readEvidenceLedger } from '@/lib/learningEvidence';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';

interface SessionReviewScreenProps {
  answers: SessionAnswer[];
  questions: QuestionData[];
  onRetryIncorrect: () => void;
  onDone: () => void;
  onAnotherFive?: (filter?: string) => void;
  onViewQuestion?: (questionIndex: number) => void;
  sessionDuration?: number;
}

type HistoricalAttempt = {
  status?: string;
  topic?: string;
  timestamp?: string;
};

const T = {
  cream: '#F4ECDF',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#DCCDBA',
  sage: '#667555',
  sageSoft: '#E7ECD9',
  blushSoft: '#F9E4DF',
};

const pct = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;

const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins ? `${mins}m ${secs}s` : `${secs}s`;
};

const Bar = ({ value, previous }: { value: number; previous?: number }) => (
  <div className="relative mt-2 h-[7px] w-full overflow-visible rounded-full bg-[#E5D9C8]">
    <div
      className="absolute inset-y-0 left-0 rounded-full bg-[#667555]"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
    {typeof previous === 'number' && (
      <div
        className="absolute -top-[3px] h-[13px] w-px bg-[#1F140C]/60"
        style={{ left: `${Math.max(0, Math.min(100, previous))}%` }}
      />
    )}
  </div>
);

const StateBar = ({ label, value, total }: { label: string; value: number; total: number }) => (
  <div>
    <div className="flex items-baseline justify-between">
      <span className="text-[12px] font-semibold" style={{ color: T.ink }}>{label}</span>
      <span className="text-[12px] font-bold" style={{ color: T.muted }}>{value}</span>
    </div>
    <Bar value={pct(value, total)} />
  </div>
);

export const SessionReviewScreen: React.FC<SessionReviewScreenProps> = ({
  answers,
  questions,
  onRetryIncorrect,
  onDone,
  onAnotherFive,
  onViewQuestion,
  sessionDuration,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const analytics = useMemo(() => {
    const total = answers.length;
    const correct = answers.filter(answer => answer.isCorrect).length;
    const accuracy = pct(correct, total);
    const currentIds = new Set(questions.map(question => String(question.id || '')).filter(Boolean));
    const history: HistoricalAttempt[] = [];

    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith('question_progress_')) continue;

        const belongsToCurrentSession = Array.from(currentIds).some(
          id => key === `question_progress_${id}` || key.endsWith(`_${id}`),
        );
        if (belongsToCurrentSession) continue;

        try {
          history.push(JSON.parse(localStorage.getItem(key) || '{}'));
        } catch {
          // Ignore malformed historical records and keep the review usable.
        }
      }
    } catch {
      // localStorage may be unavailable in strict privacy modes.
    }

    const priorTotal = history.length;
    const priorCorrect = history.filter(attempt => attempt.status === 'correct').length;
    const priorAccuracy = priorTotal ? pct(priorCorrect, priorTotal) : null;
    const combinedTotal = priorTotal + total;
    const combinedAccuracy = pct(priorCorrect + correct, combinedTotal);
    const rows = questions
      .map((question, questionIndex) => ({
        topic: String(question.concept_title || question.title || question.topic || 'Other'),
        answer: answers.find(answer => answer.questionIndex === questionIndex),
      }))
      .filter(row => row.answer);

    const topicMap = new Map<string, { total: number; correct: number }>();
    rows.forEach(({ topic, answer }) => {
      const row = topicMap.get(topic) || { total: 0, correct: 0 };
      row.total += 1;
      if (answer?.isCorrect) row.correct += 1;
      topicMap.set(topic, row);
    });
    const topics = Array.from(topicMap.entries())
      .map(([topic, row]) => ({ topic, ...row, pct: pct(row.correct, row.total) }))
      .slice(0, 5);

    const priorTopics = new Set(history.map(attempt => attempt.topic).filter(Boolean));
    const newAreas = new Set(rows.map(row => row.topic).filter(topic => !priorTopics.has(topic))).size;
    const evidence = learnerEvidenceSummary(readEvidenceLedger());
    const evidenced = evidence.evidencedConcepts || 0;

    return {
      total,
      correct,
      accuracy,
      priorAccuracy,
      combinedTotal,
      combinedAccuracy,
      topics,
      newAreas,
      evidence,
      evidenced,
    };
  }, [answers, questions]);

  const cases = useMemo(() => questions.map((question, questionIndex) => {
    const answer = answers.find(item => item.questionIndex === questionIndex);
    const title = String(question.concept_title || question.title || question.topic || `Question ${questionIndex + 1}`);
    const options = (question.options || []).map((option, optionIndex) => (
      typeof option === 'string'
        ? { id: String.fromCharCode(65 + optionIndex), text: option }
        : option
    ));
    const rawCorrect = question.correctAnswer ?? question.correct_answer ?? 'A';
    const correctOption = typeof rawCorrect === 'number'
      ? String.fromCharCode(65 + rawCorrect)
      : String(rawCorrect);

    return {
      questionIndex,
      title,
      isCorrect: answer?.isCorrect ?? false,
      selectedOption: answer?.selectedOption,
      selectedText: options.find(option => option.id === answer?.selectedOption)?.text || '',
      correctOption,
      confidence: answer?.confidence,
    };
  }), [answers, questions]);

  const misses = cases.filter(item => !item.isCorrect);
  const delta = analytics.priorAccuracy == null
    ? null
    : analytics.combinedAccuracy - analytics.priorAccuracy;
  const stateTotal = Math.max(analytics.evidenced, 1);

  return (
    <main
      className="min-h-screen overflow-y-auto"
      style={{ backgroundColor: T.cream, color: T.ink }}
      aria-label="Learning analytics"
    >
      <div className="mx-auto w-full max-w-[720px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10">
        <section className="border-t pt-7" style={{ borderColor: T.line }}>
          <div className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: T.muted }}>
            Session complete
          </div>
          <p className="mt-3 text-[20px] font-medium leading-[1.55]" style={{ color: T.espresso }}>
            {analytics.total
              ? `You answered ${analytics.correct} of ${analytics.total} correctly first time. Here’s what that changed.`
              : 'No answered cases were added this time.'}
          </p>

          <div className="mt-7 grid grid-cols-3 border-y py-5" style={{ borderColor: T.line }}>
            {[
              [`${analytics.accuracy}%`, 'first-pass accuracy'],
              [String(analytics.total), sessionDuration ? formatDuration(sessionDuration) : 'cases answered'],
              [String(analytics.newAreas), 'new areas sampled'],
            ].map(([value, label], index) => (
              <div key={label} className={index ? 'border-l pl-3' : 'pr-3'} style={{ borderColor: T.line }}>
                <div className="text-[28px] font-semibold tracking-[-.04em]" style={{ color: T.espresso }}>{value}</div>
                <div className="mt-1 text-[11px] font-semibold" style={{ color: T.muted }}>{label}</div>
              </div>
            ))}
          </div>

          {analytics.topics.length > 0 && (
            <div className="mt-7">
              <div className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: T.muted }}>This session</div>
              <div className="mt-4 space-y-4">
                {analytics.topics.map(row => (
                  <div key={row.topic}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="truncate text-[13px] font-semibold">{row.topic}</span>
                      <span className="text-[12px] font-bold" style={{ color: T.muted }}>{row.correct}/{row.total}</span>
                    </div>
                    <Bar value={row.pct} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 border-t pt-7" style={{ borderColor: T.line }}>
            <div className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: T.muted }}>Your UKMLA picture</div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <div className="text-[30px] font-semibold tracking-[-.04em]" style={{ color: T.espresso }}>{analytics.combinedAccuracy}%</div>
                <div className="text-[11px] font-semibold" style={{ color: T.muted }}>observed first-pass performance</div>
              </div>
              <div className="pb-1 text-right text-[12px] font-bold" style={{ color: delta && delta !== 0 ? T.sage : T.muted }}>
                {delta == null ? 'baseline building' : `${delta > 0 ? '+' : ''}${delta} pts this session`}
              </div>
            </div>
            <Bar value={analytics.combinedAccuracy} previous={analytics.priorAccuracy ?? undefined} />
            <div className="mt-2 flex justify-between text-[11px]" style={{ color: T.muted }}>
              <span>{analytics.combinedTotal} recorded attempts</span>
              {analytics.priorAccuracy != null && <span>marker = before session</span>}
            </div>
          </div>

          <div className="mt-8 border-y py-6" style={{ borderColor: T.line }}>
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: T.muted }}>Evidence map</div>
                <div className="mt-1 text-[22px] font-semibold tracking-[-.03em]" style={{ color: T.espresso }}>
                  {analytics.evidenced} concepts evidenced
                </div>
              </div>
              <div className="text-right text-[11px] font-semibold" style={{ color: T.muted }}>not a readiness score</div>
            </div>
            {analytics.evidenced > 0 ? (
              <div className="mt-5 space-y-4">
                <StateBar label="Demonstrated" value={analytics.evidence.demonstrated} total={stateTotal} />
                <StateBar label="Developing" value={analytics.evidence.developing} total={stateTotal} />
                <StateBar label="Due for retrieval" value={analytics.evidence.dueForRetrieval} total={stateTotal} />
              </div>
            ) : (
              <p className="mt-4 text-[13px] leading-6" style={{ color: T.muted }}>
                Your evidence map will appear as StudyEdit gathers independent retrieval and tutor evidence.
              </p>
            )}
          </div>

          <p className="mt-5 text-[12px] font-medium leading-5" style={{ color: T.muted }}>
            Accuracy shows what happened. The evidence map shows what StudyEdit can actually support about your knowledge.
            A concept only moves toward demonstrated or retained when the evidence justifies it.
          </p>

          <details className="mt-8 border-t pt-6" style={{ borderColor: T.line }}>
            <summary className="cursor-pointer list-none text-[13px] font-bold" style={{ color: T.espresso }}>
              Review this session <span className="ml-1" style={{ color: T.muted }}>↓</span>
            </summary>
            <div className="mt-4 overflow-hidden rounded-[18px] border" style={{ borderColor: T.line, backgroundColor: T.paper }}>
              {cases.map((item, position) => (
                <button
                  key={`${item.questionIndex}-${item.title}`}
                  type="button"
                  onClick={() => onViewQuestion?.(item.questionIndex)}
                  disabled={!onViewQuestion}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left disabled:cursor-default"
                  style={{ borderTop: position ? `1px solid ${T.line}` : 'none' }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                    style={{
                      backgroundColor: item.isCorrect ? T.sageSoft : T.blushSoft,
                      color: item.isCorrect ? T.sage : '#9C655D',
                    }}
                  >
                    {item.isCorrect ? '✓' : '×'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold" style={{ color: T.espresso }}>{item.title}</span>
                    <span className="mt-1 block truncate text-[11px] font-medium" style={{ color: T.muted }}>
                      {item.isCorrect
                        ? `${item.selectedOption || 'Correct'}${item.confidence ? ` · ${item.confidence === 'know' ? 'knew it' : item.confidence === 'guess' ? 'guessed' : 'unsure'}` : ''}`
                        : `You chose ${item.selectedOption || 'another answer'}${item.selectedText ? ` — ${item.selectedText}` : ''} · Correct answer ${item.correctOption}`}
                    </span>
                  </span>
                  {onViewQuestion && <ArrowRight className="h-4 w-4 shrink-0" style={{ color: T.muted }} />}
                </button>
              ))}
            </div>
            {misses.length > 0 && (
              <button
                type="button"
                onClick={onRetryIncorrect}
                className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold underline underline-offset-4"
                style={{ color: T.muted }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Revisit the misses now
              </button>
            )}
          </details>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-4">
            {onAnotherFive && (
              <button type="button" onClick={() => onAnotherFive()} className="text-[15px] font-bold underline underline-offset-4">
                Keep going →
              </button>
            )}
            <button type="button" onClick={onDone} className="text-[13px] font-semibold underline underline-offset-4" style={{ color: T.muted }}>
              Done for now
            </button>
          </div>

          {!user && (
            <div className="mt-8 border-t pt-5" style={{ borderColor: T.line }}>
              <p className="text-[13px]" style={{ color: T.muted }}>
                Sign in to carry this learning picture into future sessions.
              </p>
              <button
                type="button"
                onClick={() => navigate('/signin?mode=signup&reason=save&next=/?resume=1')}
                className="mt-3 text-[13px] font-bold underline underline-offset-4"
              >
                Save my progress →
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
