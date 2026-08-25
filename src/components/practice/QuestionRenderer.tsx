import React from 'react';
import { QuestionData } from './questionTypes';
import { ModernFlashcard } from './ModernFlashcard';
import { LearningAwareSBA } from './LearningAwareSBA';
import { ReportQuestionButton } from './ReportQuestionButton';
import { SessionAnswer } from './SessionProgressDropdown';

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
  sessionAnswers?: SessionAnswer[];
  onJumpTo?: (index: number) => void;
  availableFilters?: string[];
  activeFilter?: string | null;
  onFilterSelect?: (filter?: string) => void;
  onChangeFormat?: (format: string) => void;
  onRestartWithFilters?: () => void;
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
  title,
  sessionAnswers,
  onJumpTo,
  availableFilters,
  activeFilter,
  onFilterSelect,
  onChangeFormat,
  onRestartWithFilters
}) => {
  if (format === 'mindmap' && process.env.NODE_ENV === 'development') {
    console.log('🗺️ Rendering mind map question:', {
      id: question.id,
      title: question.title,
      concept_id: question.concept_id,
      hasContent: !!question.content,
      hasExplanation: !!question.explanation
    });
  }

  const renderSba = () => (
    <>
      <LearningAwareSBA
        question={question}
        onAnswer={onAnswer}
        onNext={onNext}
        onPrevious={onPrevious}
        onExit={onExit}
        currentIndex={currentIndex}
        totalQuestions={totalCards}
        title={title || 'UKMLA SBA'}
        sessionAnswers={sessionAnswers}
        onJumpTo={onJumpTo}
        availableFilters={availableFilters}
        activeFilter={activeFilter}
        onFilterSelect={onFilterSelect}
        currentFormat={format}
        onChangeFormat={onChangeFormat}
        onRestartWithFilters={onRestartWithFilters}
      />
      <div className="mt-3 flex justify-end px-1">
        <ReportQuestionButton question={question} />
      </div>
    </>
  );

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
          availableFilters={availableFilters}
          activeFilter={activeFilter}
          onFilterSelect={onFilterSelect}
          currentFormat={format}
          onChangeFormat={onChangeFormat}
          onRestartWithFilters={onRestartWithFilters}
        />
      );

    case 'sba':
    case 'ukmla_sba':
      return renderSba();

    case 'mindmap':
      return (
        <div className="flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center p-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Mind map feature is currently unavailable</p>
            <button onClick={onNext} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Skip to Next</button>
          </div>
        </div>
      );

    default:
      return renderSba();
  }
};
