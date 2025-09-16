import React from 'react';
import { QuestionData } from './questionTypes';
import { ModernFlashcard } from './ModernFlashcard';
import { UkmlaSBAQuestion } from './UkmlaSBAQuestion';

interface QuestionRendererProps {
  question: QuestionData;
  format: string;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  format,
  onAnswer,
  onNext
}) => {
  // Render different question formats based on the format prop
  switch (format) {
    case 'flashcard':
      return (
        <ModernFlashcard
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      );
    
    case 'ukmla_sba':
      return (
        <UkmlaSBAQuestion
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      );
      
    default:
      return (
        <UkmlaSBAQuestion
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      );
  }
};
