import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { QuestionRenderer } from '@/components/practice/QuestionRenderer';

vi.mock('@/components/practice/LearningAwareSBA', () => ({
  LearningAwareSBA: () => <div>Question body</div>,
}));

vi.mock('@/components/practice/ReportQuestionButton', () => ({
  ReportQuestionButton: () => null,
}));

vi.mock('@/components/practice/ModernFlashcard', () => ({
  ModernFlashcard: () => <div>Flashcard</div>,
}));

vi.mock('@/utils/haptics', () => ({
  triggerAnswerHaptic: vi.fn(),
}));

const question: any = {
  id: 'bridge-question',
  concept_id: 'bridge-concept',
  title: 'Bridge concept',
  question: 'Question?',
  options: ['One', 'Two', 'Three', 'Four'],
  correct_answer: 'A',
  format: 'ukmla_sba',
};

describe('<QuestionRenderer /> lesson action bridge', () => {
  it('exposes a stable native next action for session chrome', () => {
    const onNext = vi.fn();
    const { container } = render(
      <QuestionRenderer question={question} format="ukmla_sba" onAnswer={vi.fn()} onNext={onNext} />,
    );

    const shell = container.querySelector('[data-studyedit-question-shell="true"]');
    const next = container.querySelector('[data-studyedit-native-next="true"]');

    expect(shell).toBeTruthy();
    expect(next).toBeTruthy();
    fireEvent.click(next!);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('exposes exit without depending on React internals', () => {
    const onExit = vi.fn();
    const { container } = render(
      <QuestionRenderer question={question} format="ukmla_sba" onAnswer={vi.fn()} onNext={vi.fn()} onExit={onExit} />,
    );

    const exit = container.querySelector('[data-studyedit-native-exit="true"]');
    expect(exit).toBeTruthy();
    fireEvent.click(exit!);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
