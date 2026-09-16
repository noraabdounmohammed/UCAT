import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

type HistoricalAttempt = { status?: string; topic?: string; skill?: string; section?: string; timestamp?: string };

const T = { cream: '#F4ECDF', espresso: '#1F140C', ink: '#2A1E16', muted: '#8A7560', line: '#DCCDBA', sage: '#667555', paleSage: '#DDE2D5' };

const Bar = ({ value, previous }: { value: number; previous?: number }) => (
  <div className="relative mt-2 h-[7px] w-full overflow-hidden rounded-full bg-[#E5D9C8]">
    <div className="absolute inset-y-0 left-0 rounded-full bg-[#667555] transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    {typeof previous === 'number' && <div className="absolute -top-[3px] h-[13px] w-px bg-[#1F140C]/50" style={{ left: `${Math.max(0, Math.min(100, previous))}%` }} title="Before this session" />}
  </div>
);

export const SessionReviewScreen: React.FC<SessionReviewScreenProps> = ({ answers, questions, onDone, onAnotherFive }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const analytics = useMemo(() => {
    const total = answers.length;
    const correct = answers.filter(a => a.isCorrect).length;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const currentIds = new Set(questions.map(q => String(q?.id || '')).filter(Boolean));
    const history: HistoricalAttempt[] = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key?.startsWith('question_progress_')) continue;
        const questionId = key.replace('question_progress_', '');
        if (currentIds.has(questionId)) continue;
        try { history.push(JSON.parse(localStorage.getItem(key) || '{}')); } catch { /* ignore malformed legacy evidence */ }
      }
    } catch { /* storage can be unavailable */ }

    const priorTotal = history.length;
    const priorCorrect = history.filter(h => h.status === 'correct').length;
    const priorAccuracy = priorTotal ? Math.round((priorCorrect / priorTotal) * 100) : null;
    const combinedTotal = priorTotal + total;
    const combinedCorrect = priorCorrect + correct;
    const combinedAccuracy = combinedTotal ? Math.round((combinedCorrect / combinedTotal) * 100) : accuracy;

    const sessionTopics = questions.map((q, index) => ({
      topic: String(q?.concept_title || q?.title || q?.topic || 'Other'),
      answer: answers.find(a => a.questionIndex === index),
    })).filter(x => x.answer);
    const topicMap = new Map<string, { total: number; correct: number }>();
    sessionTopics.forEach(({ topic, answer }) => {
      const row = topicMap.get(topic) || { total: 0, correct: 0 };
      row.total += 1;
      if (answer?.isCorrect) row.correct += 1;
      topicMap.set(topic, row);
    });
    const topics = Array.from(topicMap.entries()).map(([topic, row]) => ({ topic, ...row, pct: Math.round((row.correct / row.total) * 100) })).slice(0, 5);

    const priorTopicCounts = new Map<string, number>();
    history.forEach(h => { if (h.topic && h.topic !== 'Unknown Topic') priorTopicCounts.set(h.topic, (priorTopicCounts.get(h.topic) || 0) + 1); });
    const sessionUniqueTopics = new Set(sessionTopics.map(x => x.topic));
    const priorUniqueTopics = new Set(priorTopicCounts.keys());
    const newAreas = Array.from(sessionUniqueTopics).filter(topic => !priorUniqueTopics.has(topic)).length;

    return { total, correct, accuracy, priorTotal, priorAccuracy, combinedTotal, combinedAccuracy, topics, newAreas };
  }, [answers, questions]);

  const delta = analytics.priorAccuracy == null ? null : analytics.combinedAccuracy - analytics.priorAccuracy;

  return (
    <main className="min-h-screen overflow-y-auto" style={{ backgroundColor: T.cream, color: T.ink }} aria-label="Tutor session conclusion">
      <div className="mx-auto w-full max-w-[720px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10">
        <section className="border-t pt-7" style={{ borderColor: T.line }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.muted }}>Session complete</div>
          <p className="mt-3 text-[20px] font-medium leading-[1.55] tracking-[-0.01em]" style={{ color: T.espresso }}>
            {analytics.total ? `You answered ${analytics.correct} of ${analytics.total} correctly first time.` : 'No answered cases were added this time.'}
          </p>

          <div className="mt-7 grid grid-cols-3 border-y py-5" style={{ borderColor: T.line }}>
            <div className="pr-3"><div className="text-[28px] font-semibold tracking-[-0.04em]" style={{ color: T.espresso }}>{analytics.accuracy}%</div><div className="mt-1 text-[11px] font-semibold" style={{ color: T.muted }}>first-pass accuracy</div></div>
            <div className="border-l px-3" style={{ borderColor: T.line }}><div className="text-[28px] font-semibold tracking-[-0.04em]" style={{ color: T.espresso }}>{analytics.total}</div><div className="mt-1 text-[11px] font-semibold" style={{ color: T.muted }}>cases answered</div></div>
            <div className="border-l pl-3" style={{ borderColor: T.line }}><div className="text-[28px] font-semibold tracking-[-0.04em]" style={{ color: T.espresso }}>{analytics.newAreas}</div><div className="mt-1 text-[11px] font-semibold" style={{ color: T.muted }}>new areas sampled</div></div>
          </div>

          {analytics.topics.length > 0 && <div className="mt-7">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.muted }}>This session</div>
            <div className="mt-4 space-y-4">
              {analytics.topics.map(row => <div key={row.topic}>
                <div className="flex items-baseline justify-between gap-4"><span className="truncate text-[13px] font-semibold" style={{ color: T.ink }}>{row.topic}</span><span className="shrink-0 text-[12px] font-bold" style={{ color: T.muted }}>{row.correct}/{row.total}</span></div>
                <Bar value={row.pct} />
              </div>)}
            </div>
          </div>}

          <div className="mt-9 border-t pt-7" style={{ borderColor: T.line }}>
            <div className="flex items-end justify-between gap-4">
              <div><div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.muted }}>Your UKMLA picture</div><div className="mt-2 text-[30px] font-semibold tracking-[-0.04em]" style={{ color: T.espresso }}>{analytics.combinedAccuracy}%</div></div>
              <div className="pb-1 text-right text-[12px] font-semibold" style={{ color: delta == null || delta === 0 ? T.muted : T.sage }}>
                {delta == null ? 'baseline building' : `${delta > 0 ? '+' : ''}${delta} pts after this session`}
              </div>
            </div>
            <Bar value={analytics.combinedAccuracy} previous={analytics.priorAccuracy ?? undefined} />
            <div className="mt-2 flex justify-between text-[11px] font-medium" style={{ color: T.muted }}><span>{analytics.combinedTotal} recorded attempts</span>{analytics.priorAccuracy != null && <span>marker = before today</span>}</div>
            <p className="mt-4 text-[12px] font-medium leading-5" style={{ color: T.muted }}>
              This is your observed first-pass performance, not a predicted UKMLA score. As StudyEdit sees more of the curriculum, the picture becomes more reliable.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            {onAnotherFive && <button type="button" onClick={() => onAnotherFive()} className="text-[15px] font-bold underline decoration-[#BBA995] underline-offset-4" style={{ color: T.espresso }}>Keep going →</button>}
            <button type="button" onClick={onDone} className="text-[13px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: T.muted }}>Done for now</button>
          </div>

          {!user && <div className="mt-8 border-t pt-5" style={{ borderColor: T.line }}><p className="text-[13px] font-medium leading-6" style={{ color: T.muted }}>Sign in to carry these analytics into future sessions.</p><button type="button" onClick={() => navigate('/signin?reason=save&next=/')} className="mt-3 text-[13px] font-bold underline decoration-[#BBA995] underline-offset-4" style={{ color: T.espresso }}>Save my progress →</button></div>}
        </section>
      </div>
    </main>
  );
};
