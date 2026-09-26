import React, { useMemo } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';
import { learningItems, needsRevisit } from '@/lib/sessionLearning';
import { SessionLearningList } from './SessionLearningList';

interface SessionReviewScreenProps {
  answers: SessionAnswer[];
  questions: QuestionData[];
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
  line: '#DCCDBA',
  sage: '#667555',
  sageSoft: '#E7ECD9',
  blushSoft: '#F9E4DF',
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins ? `${mins}m ${secs}s` : `${secs}s`;
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
  const navigate = useNavigate();
  const { user } = useAuth();

  const cases = useMemo(() => answers
    .slice()
    .sort((a, b) => a.questionIndex - b.questionIndex)
    .map(answer => {
      const question = questions[answer.questionIndex];
      const title = String(question?.concept_title || question?.title || question?.topic || `Case ${answer.questionIndex + 1}`);
      const options = (question?.options || []).map((option, optionIndex) => (
        typeof option === 'string'
          ? { id: String.fromCharCode(65 + optionIndex), text: option }
          : option
      ));
      const rawCorrect = question?.correctAnswer ?? question?.correct_answer ?? 'A';
      const correctOption = typeof rawCorrect === 'number'
        ? String.fromCharCode(65 + rawCorrect)
        : String(rawCorrect);

      return {
        questionIndex: answer.questionIndex,
        title,
        isCorrect: answer.isCorrect,
        selectedOption: answer.selectedOption,
        selectedText: options.find(option => option.id === answer.selectedOption)?.text || '',
        correctOption,
        confidence: answer.confidence,
      };
    }), [answers, questions]);

  const correct = cases.filter(item => item.isCorrect).length;
  const misses = cases.filter(item => !item.isCorrect);
  const nextSessionSize = Math.max(1, questions.length);
  const items = useMemo(() => learningItems(answers, questions), [answers, questions]);
  const toRevisit = items.filter(needsRevisit);
  const nextItem = toRevisit[0];
  const followUps = items.filter(item => item.passedChecks > 0).length;

  return (
    <main
      className="min-h-screen overflow-y-auto"
      style={{ backgroundColor: T.cream, color: T.ink }}
      aria-label="Session complete"
    >
      <div className="mx-auto w-full max-w-[720px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <section className="border-t pt-7" style={{ borderColor: T.line }}>
          <div className="text-[11px] font-bold uppercase tracking-[.18em]" style={{ color: T.muted }}>
            Session complete
          </div>
          <h1 className="mt-3 text-[38px] font-light leading-none tracking-[-.04em] sm:text-[46px]" style={{ color: T.espresso, fontFamily: "'Fraunces', serif" }}>
            {correct} of {cases.length} correct
          </h1>
          <p className="mt-4 text-[16px] leading-7" style={{ color: T.muted }}>
            {misses.length === 0
              ? 'All correct.'
              : `${misses.length} ${misses.length === 1 ? 'case' : 'cases'} worth another look.`}
          </p>
          {sessionDuration ? (
            <div className="mt-2 text-[13px] font-semibold" style={{ color: T.muted }}>
              {cases.length} {cases.length === 1 ? 'case' : 'cases'} · {formatDuration(sessionDuration)}
            </div>
          ) : null}

          <section className="mt-8" aria-labelledby="session-learning-heading">
            <h2 id="session-learning-heading" className="text-[16px] font-bold">What you practised</h2>
            <SessionLearningList items={items} onViewQuestion={onViewQuestion} />
            {followUps > 0 && <p className="mt-3 text-[14px] leading-6" style={{ color: T.muted }}>
              {followUps} {followUps === 1 ? 'concept checked' : 'concepts checked'} in a tutor follow-up. Revisit later to check recall.
            </p>}
          </section>

          <section className="mt-7 rounded-[20px] border p-5" style={{ borderColor: T.line, backgroundColor: T.paper }} aria-labelledby="next-learning-step">
            <h2 id="next-learning-step" className="text-[16px] font-bold">Your next step</h2>
            <p className="mt-2 text-[16px] leading-6" style={{ color: T.ink }}>
              {nextItem ? `Revisit ${nextItem.title}.` : 'Continue with a fresh set of cases.'}
            </p>
            <p className="mt-2 text-[14px] leading-6" style={{ color: T.muted }}>
              {nextItem ? (nextItem.isCorrect
                ? `You got the answer right but ${nextItem.confidence === 'guess' ? 'guessed' : 'felt unsure'}. Work through a tutor check to test your reasoning.`
                : 'Work through the reasoning with your tutor, then try its follow-up check.')
                : 'You answered these cases or their follow-up checks correctly. Future practice will help check what you retain.'}
            </p>
            {nextItem && onViewQuestion && <button type="button" onClick={() => onViewQuestion(nextItem.questionIndex)} className="mt-3 min-h-11 text-[15px] font-bold underline underline-offset-4">
              Revisit with tutor
            </button>}
          </section>

          <details className="mt-7 border-t pt-6" style={{ borderColor: T.line }}>
            <summary className="cursor-pointer list-none text-[15px] font-bold underline underline-offset-4" style={{ color: T.espresso }}>
              Review answers
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
                    aria-hidden="true"
                  >
                    {item.isCorrect ? '✓' : '×'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold" style={{ color: T.espresso }}>{item.title}</span>
                    <span className="mt-1 block text-[14px] font-medium" style={{ color: T.muted }}>
                      {item.isCorrect
                        ? `${item.selectedOption || 'Correct'}${item.confidence ? ` · ${item.confidence === 'know' ? 'knew it' : item.confidence === 'guess' ? 'guessed' : 'unsure'}` : ''}`
                        : `Your answer: ${item.selectedOption || '—'}${item.selectedText ? ` · ${item.selectedText}` : ''} · Correct: ${item.correctOption}`}
                    </span>
                  </span>
                  {onViewQuestion ? <ArrowRight className="h-4 w-4 shrink-0" style={{ color: T.muted }} aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
            {misses.length > 0 ? (
              <button
                type="button"
                onClick={onRetryIncorrect}
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold underline underline-offset-4"
                style={{ color: T.muted }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry incorrect
              </button>
            ) : null}
          </details>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {onAnotherFive ? (
              <button
                type="button"
                onClick={() => onAnotherFive()}
                className="flex min-h-[54px] items-center justify-center rounded-full bg-[#1F140C] px-5 text-[15px] font-bold text-[#FAF5EC]"
              >
                Continue with {nextSessionSize} more
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDone}
              className="flex min-h-[54px] items-center justify-center rounded-full border px-5 text-[15px] font-bold"
              style={{ borderColor: T.line, backgroundColor: T.paper, color: T.espresso }}
            >
              Go to Home
            </button>
          </div>

          {!user ? (
            <div className="mt-8 border-t pt-6" style={{ borderColor: T.line }}>
              <button
                type="button"
                onClick={() => navigate('/signin?mode=signup&reason=save&next=/?home=1')}
                className="text-[14px] font-bold underline underline-offset-4"
                style={{ color: T.espresso }}
              >
                Save progress
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};
