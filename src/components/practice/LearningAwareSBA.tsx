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
  parchment: '#F4ECDF',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  muted: '#8A7560',
  line: '#E8DCC4',
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
      sessionStorage.setItem(key, JSON.stringify({
        signal,
        value,
        concept: conceptTitle,
        at: new Date().toISOString(),
        ...extra,
      }));
    } catch {
      // Learning signals must never interrupt practice.
    }
  };

  const handleChildAnswer = (isCorrect: boolean) => {
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
      <UkmlaSBAQuestion {...props} onAnswer={handleChildAnswer} />

      {confidenceOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-[62px] z-[95] flex items-center justify-center px-5"
          style={{ backgroundColor: C.parchment, color: C.espresso, fontFamily: learningFont }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="studyedit-confidence-title"
        >
          <div className="w-full max-w-[520px]">
            <div id="studyedit-confidence-title" className="text-center text-[18px] font-bold tracking-[-0.01em]">
              How sure were you?
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => commitConfidence('know')}
                className="min-h-[48px] rounded-full border px-3 text-[14px] font-semibold active:scale-[0.99]"
                style={{ borderColor: C.line, backgroundColor: C.paper, color: C.espresso }}
              >
                Knew it
              </button>
              <button
                type="button"
                onClick={() => commitConfidence('unsure')}
                className="min-h-[48px] rounded-full border px-3 text-[14px] font-semibold active:scale-[0.99]"
                style={{ borderColor: C.line, backgroundColor: C.paper, color: C.espresso }}
              >
                Unsure
              </button>
              <button
                type="button"
                onClick={() => commitConfidence('guess')}
                className="min-h-[48px] rounded-full border px-3 text-[14px] font-semibold active:scale-[0.99]"
                style={{ borderColor: C.line, backgroundColor: C.paper, color: C.espresso }}
              >
                Guessed
              </button>
            </div>
            <div className="mt-3 text-center text-[12px] font-medium" style={{ color: C.muted }}>
              This changes what StudyEdit asks next.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
