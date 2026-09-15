import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UkmlaSBAQuestion } from './UkmlaSBAQuestion';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';
import type { FilterState } from './PracticeFilterModalParchment';
import { hydrateLearnerMemoryFromCloud } from '@/services/learnerMemory';

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
  espresso: '#1F140C',
  muted: '#8A7560',
  line: '#E8DCC4',
};

function classifyEvidence(correct: boolean, confidence: ConfidenceLevel): EvidenceClass {
  if (correct && confidence === 'know') return 'strong_positive';
  if (correct && confidence === 'unsure') return 'weak_positive';
  if (correct && confidence === 'guess') return 'no_positive_evidence';
  if (!correct && confidence === 'know') return 'strong_misconception_signal';
  if (!correct && confidence === 'unsure') return 'weak_negative';
  return 'uninformative_negative';
}

export const LearningAwareSBA: React.FC<LearningAwareSBAProps> = (props) => {
  const [confidenceSlot, setConfidenceSlot] = useState<HTMLElement | null>(null);
  const [answerReady, setAnswerReady] = useState(false);
  const checkButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingConfidenceRef = useRef<ConfidenceLevel | null>(null);

  const conceptTitle = useMemo(
    () => String((props.question as any).concept_title || props.question.title || (props.question as any).topic || 'this concept'),
    [props.question],
  );

  const saveSignal = (correct: boolean, confidence: ConfidenceLevel) => {
    try {
      const key = `learning_frontier_${props.question.id || props.question.concept_id || props.currentIndex || 0}_answer_confidence_${confidence}`;
      sessionStorage.setItem(key, JSON.stringify({
        signal: 'answer_confidence',
        value: confidence,
        concept: conceptTitle,
        at: new Date().toISOString(),
        correct,
        confidence_rank: confidence === 'know' ? 2 : confidence === 'unsure' ? 1 : 0,
        evidence_class: classifyEvidence(correct, confidence),
      }));
    } catch {
      // Learning signals must never interrupt practice.
    }
  };

  useEffect(() => {
    void hydrateLearnerMemoryFromCloud();
    pendingConfidenceRef.current = null;
    setAnswerReady(false);

    let slot: HTMLDivElement | null = null;
    const sync = () => {
      const check = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => button.textContent?.trim() === 'Check answer') || null;

      if (!check) {
        checkButtonRef.current = null;
        setAnswerReady(false);
        if (slot?.isConnected) slot.remove();
        slot = null;
        setConfidenceSlot(null);
        return;
      }

      checkButtonRef.current = check;
      check.style.display = 'none';
      setAnswerReady(!check.disabled);

      if (!slot?.isConnected) {
        slot = document.createElement('div');
        slot.dataset.studyeditConfidenceSlot = 'true';
        check.insertAdjacentElement('afterend', slot);
        setConfidenceSlot(slot);
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'style'] });
    sync();

    return () => {
      observer.disconnect();
      if (slot?.isConnected) slot.remove();
      checkButtonRef.current = null;
      setConfidenceSlot(null);
    };
  }, [props.question.id, props.currentIndex]);

  const handleChildAnswer = (isCorrect: boolean) => {
    const confidence = pendingConfidenceRef.current;
    if (!confidence) return;
    saveSignal(isCorrect, confidence);
    props.onAnswer(isCorrect);
    pendingConfidenceRef.current = null;
  };

  const submitWithConfidence = (confidence: ConfidenceLevel) => {
    const check = checkButtonRef.current;
    if (!check || check.disabled) return;
    pendingConfidenceRef.current = confidence;
    check.click();
  };

  return (
    <>
      <UkmlaSBAQuestion {...props} onAnswer={handleChildAnswer} />

      {confidenceSlot && createPortal(
        <div className={`mt-6 transition-opacity ${answerReady ? 'opacity-100' : 'pointer-events-none opacity-0'}`} aria-label="Answer confidence" aria-hidden={!answerReady}>
          <div className="mb-3 text-center text-[15px] font-semibold" style={{ color: C.espresso }}>How sure were you?</div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => submitWithConfidence('know')} disabled={!answerReady} className="min-h-[48px] rounded-full border px-3 text-[14px] font-semibold active:scale-[0.99] disabled:cursor-default" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.espresso }}>Knew it</button>
            <button type="button" onClick={() => submitWithConfidence('unsure')} disabled={!answerReady} className="min-h-[48px] rounded-full border px-3 text-[14px] font-semibold active:scale-[0.99] disabled:cursor-default" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.espresso }}>Unsure</button>
            <button type="button" onClick={() => submitWithConfidence('guess')} disabled={!answerReady} className="min-h-[48px] rounded-full border px-3 text-[14px] font-semibold active:scale-[0.99] disabled:cursor-default" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.espresso }}>Guessed</button>
          </div>
          <div className="mt-2 text-center text-[11px]" style={{ color: C.muted }}>Choose one to submit your answer.</div>
        </div>,
        confidenceSlot,
      )}
    </>
  );
};
