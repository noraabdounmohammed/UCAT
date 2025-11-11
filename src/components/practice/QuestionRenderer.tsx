import React from 'react';
import { QuestionData } from './questionTypes';
import { ModernFlashcard } from './ModernFlashcard';
import { UkmlaSBAQuestion } from './UkmlaSBAQuestion';
import { EMQQuestion } from './EMQQuestion';
import { TrueFalseQuestion } from './TrueFalseQuestion';
import { RankingQuestion } from './RankingQuestion';

interface QuestionRendererProps {
  question: QuestionData;
  format: string;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalCards?: number;
  title?: string;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  format,
  onAnswer,
  onNext,
  onPrevious,
  onExit,
  currentIndex,
  totalCards,
  title
}) => {
  // Debug logging for mind map rendering
  if (format === 'mindmap' && process.env.NODE_ENV === 'development') {
    console.log('🗺️ Rendering mind map question:', {
      id: question.id,
      title: question.title,
      concept_id: question.concept_id,
      hasContent: !!question.content,
      hasExplanation: !!question.explanation
    });
  }

  // Render different question formats based on the format prop
  switch (format) {
    case 'flashcard':
      return (
        <ModernFlashcard
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
          onPrevious={onPrevious}
          onExit={onExit}
          currentIndex={currentIndex}
          totalCards={totalCards}
          title={title}
        />
      );
    
    case 'sba':
    case 'ukmla_sba':
      return (
        <UkmlaSBAQuestion
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
          onPrevious={onPrevious}
          onExit={onExit}
          currentIndex={currentIndex}
          totalQuestions={totalCards}
          title={title || "UKMLA SBA"}
        />
      );
    
    case 'emq':
      return (
        <EMQQuestion
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      );
    
    case 'true_false':
      return (
        <TrueFalseQuestion
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      );
    
    case 'ranking':
      return (
        <RankingQuestion
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
        />
      );
    
    case 'mindmap':
      // Mind map feature temporarily disabled
      return (
        <div className="flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center p-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Mind map feature is currently unavailable
            </p>
            <button
              onClick={onNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Skip to Next
            </button>
          </div>
        </div>
      );
      
    default:
      return (
        <UkmlaSBAQuestion
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
          onPrevious={onPrevious}
          onExit={onExit}
          currentIndex={currentIndex}
          totalQuestions={totalCards}
          title={title || "UKMLA SBA"}
        />
      );
  }
};
