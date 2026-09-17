import React, { useEffect, useMemo } from 'react';
import { UkmlaSBAQuestion, type ConfidenceLevel, type TutorTurn } from './UkmlaSBAQuestion';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';
import type { FilterState } from './PracticeFilterModalParchment';
import { hydrateLearnerMemoryFromCloud } from '@/services/learnerMemory';

interface LearningAwareSBAProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean, selectedOption?: string, confidence?: ConfidenceLevel) => void;
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
  preTutorTurns?: TutorTurn[];
  nextButtonText?: string;
  onTutorTurnsChange?: (turns: TutorTurn[]) => void;
  footerControl?: React.ReactNode;
}

type EvidenceClass =
  | 'strong_positive'
  | 'weak_positive'
  | 'no_positive_evidence'
  | 'strong_misconception_signal'
  | 'weak_negative'
  | 'uninformative_negative';

function classifyEvidence(correct: boolean, confidence: ConfidenceLevel): EvidenceClass {
  if (correct && confidence === 'know') return 'strong_positive';
  if (correct && confidence === 'unsure') return 'weak_positive';
  if (correct && confidence === 'guess') return 'no_positive_evidence';
  if (!correct && confidence === 'know') return 'strong_misconception_signal';
  if (!correct && confidence === 'unsure') return 'weak_negative';
  return 'uninformative_negative';
}

export const LearningAwareSBA: React.FC<LearningAwareSBAProps> = (props) => {
  const conceptTitle = useMemo(
    () => String((props.question as any).concept_title || props.question.title || (props.question as any).topic || 'this concept'),
    [props.question],
  );

  useEffect(() => {
    void hydrateLearnerMemoryFromCloud();
  }, []);

  const handleAnswer = (correct: boolean, selectedOption?: string, confidence?: ConfidenceLevel) => {
    if (confidence) {
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
    }
    props.onAnswer(correct, selectedOption, confidence);
  };

  return <UkmlaSBAQuestion {...props} collectConfidence onAnswer={handleAnswer} />;
};
