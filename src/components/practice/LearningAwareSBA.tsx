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
  line: '#E8DCC4',
  blushSoft: '#F9E4DF',
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
    // Confidence is deliberately captured before correctness reaches the parent session.
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
          className="fixed inset-0 z-[120] flex items-center justify-center px-5"
          role="dialog"
          aria-modal="true"
          aria-label="Answer confidence"
          style={{ backgroundColor: C.parchment, fontFamily: learningFont }}
        >
          <div className="w-full max-w-[520px]">
            <h2 className="text-[28px] font-semibold leading-[1.25] tracking-[-0.02em] sm:text-[30px]" style={{ color: C.espresso }}>
              How did that feel?
            </h2>
            <div className="mt-6 grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => commitConfidence('know')}
                className="min-h-[52px] rounded-full border px-3 text-[14px] font-bold transition active:scale-[0.98] sm:text-[15px]"
                style={{ borderColor: C.line, backgroundColor: C.paper, color: C.espresso }}
              >
                Knew it
              </button>
              <button
                type="button"
                onClick={() => commitConfidence('unsure')}
                className="min-h-[52px] rounded-full border px-3 text-[14px] font-bold transition active:scale-[0.98] sm:text-[15px]"
                style={{ borderColor: C.line, backgroundColor: C.paper, color: C.espresso }}
              >
                Unsure
              </button>
              <button
                type="button"
                onClick={() => commitConfidence('guess')}
                className="min-h-[52px] rounded-full border px-3 text-[14px] font-bold transition active:scale-[0.98] sm:text-[15px]"
                style={{ borderColor: '#E5B9B1', backgroundColor: C.blushSoft, color: C.espresso }}
              >
                Guessed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
