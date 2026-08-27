import React from 'react';
import type { QuestionData } from './questionTypes';
import { StudyEditFlashcard } from './StudyEditFlashcard';

interface ModernFlashcardProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalCards?: number;
  title?: string;
  availableFilters?: string[];
  activeFilter?: string | null;
  onFilterSelect?: (filter?: string) => void;
  currentFormat?: string;
  onChangeFormat?: (format: string) => void;
  onRestartWithFilters?: () => void;
}

/**
 * Compatibility entry point for older practice/review routes.
 * The active flashcard experience now lives in StudyEditFlashcard so every
 * route shares one visual language and one answer/mastery flow.
 */
export const ModernFlashcard: React.FC<ModernFlashcardProps> = ({
  question,
  onAnswer,
  onNext,
  onPrevious,
  onExit,
  currentIndex,
  totalCards,
}) => (
  <StudyEditFlashcard
    question={question}
    onAnswer={onAnswer}
    onNext={onNext}
    onPrevious={onPrevious}
    onExit={onExit}
    currentIndex={currentIndex}
    totalCards={totalCards}
  />
);
