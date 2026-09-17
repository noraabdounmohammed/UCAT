import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LearningAwareSBA } from '@/components/practice/LearningAwareSBA';

vi.mock('@/components/practice/UkmlaSBAQuestion', () => ({
  UkmlaSBAQuestion: ({
    collectConfidence,
    onAnswer,
  }: {
    collectConfidence?: boolean;
    onAnswer: (correct: boolean, selectedOption?: string, confidence?: 'know' | 'unsure' | 'guess') => void;
  }) => (
    <>
      <span>{collectConfidence ? 'Confidence enabled' : 'Confidence disabled'}</span>
      <button type="button" onClick={() => onAnswer(true, 'A', 'know')}>Submit confident answer</button>
    </>
  ),
}));

const question: any = {
  id: 'q-confidence-1',
  concept_id: 'concept-1',
  concept_title: 'Aortic stenosis',
  title: 'Aortic stenosis',
  question: 'Example question',
  options: ['A', 'B', 'C', 'D'],
  correct_answer: 'A',
  format: 'ukmla_sba',
};

const baseProps = {
  question,
  onAnswer: vi.fn(),
  onNext: vi.fn(),
  currentIndex: 0,
  totalQuestions: 5,
};

describe('<LearningAwareSBA />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('enables confidence capture and forwards the complete answer signal', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(<LearningAwareSBA {...baseProps} onAnswer={onAnswer} />);

    expect(screen.getByText(/confidence enabled/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /submit confident answer/i }));
    expect(onAnswer).toHaveBeenCalledWith(true, 'A', 'know');
  });

  it('stores a strong-positive learning signal for correct + knew it', async () => {
    const user = userEvent.setup();
    render(<LearningAwareSBA {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /submit confident answer/i }));

    const keys = Object.keys(sessionStorage);
    const confidenceKey = keys.find(key => key.includes('answer_confidence_know'));
    expect(confidenceKey).toBeTruthy();

    const signal = JSON.parse(sessionStorage.getItem(confidenceKey!) || '{}');
    expect(signal).toMatchObject({
      value: 'know',
      correct: true,
      evidence_class: 'strong_positive',
    });
  });

  it('does not expose the retired highlight-to-explain UI', () => {
    render(<LearningAwareSBA {...baseProps} />);
    expect(screen.queryByText(/explain selected/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/explain/i)).not.toBeInTheDocument();
  });
});
