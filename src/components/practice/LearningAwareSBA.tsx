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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (confidenceOpen) document.documentElement.setAttribute('data-studyedit-confidence-open', 'true');
    else document.documentElement.removeAttribute('data-studyedit-confidence-open');
    return () => document.documentElement.removeAttribute('data-studyedit-confidence-open');
  }, [confidenceOpen]);

  const saveSignal = (signal: string, value?: string, extra?: Record<string, unknown>) => {
    try {
      const key = `learning_frontier_${props.question.id || props.question.concept_id || props.currentIndex || 0}_${signal}_${value || ''}`;
      sessionStorage.setItem(key, JSON.stringify({ signal, value, concept: conceptTitle, at: new Date().toISOString(), ...extra }));
    } catch {
      // Learning signals must never block practice.
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
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[120]"
          role="dialog"
          aria-label="Answer confidence"
          style={{
            fontFamily: learningFont,
            background: `linear-gradient(to top, ${C.parchment} 76%, rgba(244,236,223,0))`,
          }}
        >
          <div className="mx-auto w-full max-w-[700px] px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-8 sm:px-8">
            <div
              className="pointer-events-auto flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-4"
              style={{ borderColor: C.line, backgroundColor: C.parchment }}
            >
              <div className="mr-auto text-[15px] font-semibold tracking-[-0.01em]" style={{ color: C.espresso }}>
                How sure were you?
              </div>
              <div className="flex items-center gap-4 text-[14px] font-semibold" style={{ color: C.espresso }}>
                <button type="button" onClick={() => commitConfidence('know')} className="underline decoration-[#C5B39D] underline-offset-4 active:opacity-55">Knew it</button>
                <button type="button" onClick={() => commitConfidence('unsure')} className="underline decoration-[#C5B39D] underline-offset-4 active:opacity-55">Unsure</button>
                <button type="button" onClick={() => commitConfidence('guess')} className="underline decoration-[#C5B39D] underline-offset-4 active:opacity-55">Guessed</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
