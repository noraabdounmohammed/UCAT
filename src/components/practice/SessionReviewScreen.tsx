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

const T = {
  cream: '#F4ECDF',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  sage: '#667555',
};

export const SessionReviewScreen: React.FC<SessionReviewScreenProps> = ({
  answers,
  questions,
  onDone,
  onAnotherFive,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const evidence = useMemo(() => {
    const total = questions.length;
    const correct = answers.filter(answer => answer.isCorrect).length;
    const misses = questions
      .map((question, index) => ({
        title: question?.concept_title || question?.title || question?.topic || `Question ${index + 1}`,
        answer: answers.find(item => item.questionIndex === index),
      }))
      .filter(item => item.answer && !item.answer.isCorrect);
    const counts = new Map<string, number>();
    misses.forEach(item => counts.set(item.title, (counts.get(item.title) || 0) + 1));
    const repeated = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).find(([, count]) => count >= 2);

    if (!answers.length) {
      return {
        opening: 'We stopped before I gathered enough evidence to update your learning picture.',
        next: 'When you come back, I’ll pick up with a fresh case.',
        detail: 'No answered cases were used as evidence.',
      };
    }

    if (!misses.length) {
      return {
        opening: `That’s enough for this session. You answered ${correct} of ${total} cases correctly first time. That is useful evidence, but one session is not enough for me to call those concepts retained yet.`,
        next: 'I’ll bring some of today’s concepts back after spacing so we can see what you can still retrieve independently.',
        detail: `${total} case${total === 1 ? '' : 's'} added to your learning history`,
      };
    }

    if (repeated) {
      return {
        opening: `That’s enough for this session. ${repeated[0]} needed support more than once, so that is the clearest signal from today. I’m treating it as something to revisit, not as a permanent weakness.`,
        next: `I’ll test ${repeated[0]} again in a different case, alongside material from other parts of the UKMLA map.`,
        detail: `${total} cases · ${correct} correct first time · ${misses.length} misses kept for retrieval`,
      };
    }

    return {
      opening: `That’s enough for this session. The ${misses.length} misses were spread across different areas, so I don’t have enough evidence to call any one area a recurring weakness yet.`,
      next: 'I’ve kept those concepts in your learning history. I’ll bring them back in different cases rather than simply repeating today’s questions.',
      detail: `${total} cases · ${correct} correct first time · ${misses.length} concepts to revisit`,
    };
  }, [answers, questions]);

  return (
    <main className="min-h-screen overflow-y-auto" style={{ backgroundColor: T.cream, color: T.ink }} aria-label="Tutor session conclusion">
      <div className="mx-auto w-full max-w-[700px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10">
        <section className="border-t pt-7" style={{ borderColor: T.line }}>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.muted }}>StudyEdit</div>
          <p className="text-[20px] font-medium leading-[1.65] tracking-[-0.01em] sm:text-[21px]" style={{ color: T.espresso }}>
            {evidence.opening}
          </p>
          <p className="mt-5 text-[17px] font-medium leading-7" style={{ color: T.ink }}>
            {evidence.next}
          </p>

          <div className="mt-7 border-y py-4" style={{ borderColor: T.line }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.muted }}>Your UKMLA map</div>
            <div className="mt-2 text-[14px] font-semibold leading-6" style={{ color: T.espresso }}>{evidence.detail}</div>
            <div className="mt-1 text-[12px] font-medium leading-5" style={{ color: T.muted }}>
              I’ll only call knowledge demonstrated or retained when your evidence supports it.
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
            {onAnotherFive && (
              <button type="button" onClick={() => onAnotherFive()} className="text-[15px] font-bold underline decoration-[#BBA995] underline-offset-4" style={{ color: T.espresso }}>
                Keep going →
              </button>
            )}
            <button type="button" onClick={onDone} className="text-[13px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: T.muted }}>
              Done for now
            </button>
          </div>

          {!user && (
            <div className="mt-8 border-t pt-5" style={{ borderColor: T.line }}>
              <p className="text-[13px] font-medium leading-6" style={{ color: T.muted }}>
                Sign in if you want StudyEdit to carry this learning history into future sessions.
              </p>
              <button type="button" onClick={() => navigate('/signin?reason=save&next=/')} className="mt-3 text-[13px] font-bold underline decoration-[#BBA995] underline-offset-4" style={{ color: T.espresso }}>
                Save my progress →
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
