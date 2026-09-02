import React, { useEffect, useMemo, useState } from 'react';
import { UkmlaSBAQuestion } from './UkmlaSBAQuestion';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';
import type { FilterState } from './PracticeFilterModalParchment';

interface LearningAwareSBAProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalQuestions?: number;
  title?: string;
  sessionAnswers?: SessionAnswer[];
  onJumpTo?: (index: number) => void;
  availableFilters?: string[];
  activeFilter?: string | null;
  onFilterSelect?: (filter?: string) => void;
  currentFormat?: string;
  onChangeFormat?: (format: string) => void;
  onRestartWithFilters?: (filters?: FilterState) => void;
  preSelectedAnswer?: string;
  preSubmitted?: boolean;
  nextButtonText?: string;
}

type ConfidenceLevel = 'know' | 'unsure' | 'guess';
type EvidenceClass =
  | 'strong_positive'
  | 'weak_positive'
  | 'no_positive_evidence'
  | 'strong_misconception_signal'
  | 'weak_negative'
  | 'uninformative_negative';

const C = {
  paper: '#FFFDF8',
  parchment: '#F4ECDF',
  espresso: '#1F140C',
  muted: '#8A7560',
  line: '#DCCDB8',
};

const learningFont = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function classifyEvidence(correct: boolean, confidence: ConfidenceLevel): EvidenceClass {
  if (correct && confidence === 'know') return 'strong_positive';
  if (correct && confidence === 'unsure') return 'weak_positive';
  if (correct && confidence === 'guess') return 'no_positive_evidence';
  if (!correct && confidence === 'know') return 'strong_misconception_signal';
  if (!correct && confidence === 'unsure') return 'weak_negative';
  return 'uninformative_negative';
}

export const LearningAwareSBA: React.FC<LearningAwareSBAProps> = (props) => {
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const [pendingCorrect, setPendingCorrect] = useState<boolean | null>(null);

  const conceptTitle = useMemo(
    () => String((props.question as any).concept_title || props.question.title || (props.question as any).topic || 'this concept'),
    [props.question],
  );

  useEffect(() => {
    setConfidenceOpen(false);
    setPendingCorrect(null);
  }, [props.question.id, props.currentIndex]);

  const saveSignal = (signal: string, value?: string, extra?: Record<string, unknown>) => {
    try {
      const key = `learning_frontier_${props.question.id || props.question.concept_id || props.currentIndex || 0}_${signal}_${value || ''}`;
      sessionStorage.setItem(key, JSON.stringify({ signal, value, concept: conceptTitle, at: new Date().toISOString(), ...extra }));
    } catch {
      // Learning signals must never block practice.
    }
  };

  const handleChildAnswer = (isCorrect: boolean) => {
    // Confidence is captured before correctness reaches the parent session.
    // Keep the case visible: this is the tutor asking one follow-up, not a new screen.
    setPendingCorrect(isCorrect);
    setConfidenceOpen(true);
  };

  const commitConfidence = (confidence: ConfidenceLevel) => {
    if (pendingCorrect === null) return;
    const evidenceClass = classifyEvidence(pendingCorrect, confidence);
    const confidenceRank = confidence === 'know' ? 2 : confidence === 'unsure' ? 1 : 0;

    saveSignal('answer_confidence', confidence, {
      correct: pendingCorrect,
      confidence_rank: confidenceRank,
      evidence_class: evidenceClass,
    });

    props.onAnswer(pendingCorrect);
    setConfidenceOpen(false);
    setPendingCorrect(null);
  };

  return (
    <>
      {/* Keep the question surface simple. Highlight-to-explain was intentionally removed. */}
      <UkmlaSBAQuestion {...props} onAnswer={handleChildAnswer} />

      {confidenceOpen && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[120]"
          role="dialog"
          aria-label="Answer confidence"
          style={{
            fontFamily: learningFont,
            background: `linear-gradient(to top, ${C.parchment} 72%, rgba(244,236,223,0))`,
          }}
        >
          <div className="mx-auto w-full max-w-[700px] px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-10 sm:px-8">
            <div
              className="pointer-events-auto border-t pt-4"
              style={{ borderColor: C.line, backgroundColor: C.parchment }}
            >
              <div className="text-[16px] font-semibold tracking-[-0.01em]" style={{ color: C.espresso }}>
                How did that feel?
              </div>
              <div className="mt-1 text-[12px] leading-5" style={{ color: C.muted }}>
                Knew it, unsure, or mostly a guess?
              </div>

              <div className="mt-3 grid grid-cols-3 border-y" style={{ borderColor: C.line }}>
                <button
                  type="button"
                  onClick={() => commitConfidence('know')}
                  className="min-h-[48px] px-2 text-[14px] font-semibold transition active:opacity-55"
                  style={{ color: C.espresso, backgroundColor: 'transparent' }}
                >
                  Knew it
                </button>
                <button
                  type="button"
                  onClick={() => commitConfidence('unsure')}
                  className="min-h-[48px] border-x px-2 text-[14px] font-semibold transition active:opacity-55"
                  style={{ color: C.espresso, borderColor: C.line, backgroundColor: 'transparent' }}
                >
                  Unsure
                </button>
                <button
                  type="button"
                  onClick={() => commitConfidence('guess')}
                  className="min-h-[48px] px-2 text-[14px] font-semibold transition active:opacity-55"
                  style={{ color: C.espresso, backgroundColor: 'transparent' }}
                >
                  Guessed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
