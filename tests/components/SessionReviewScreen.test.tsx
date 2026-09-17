import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { SessionReviewScreen } from '@/components/practice/SessionReviewScreen';
import type { QuestionData } from '@/components/practice/questionTypes';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

const questions: QuestionData[] = [
  {
    id: 'q1',
    concept_title: 'Thyroid nodules',
    options: [{ id: 'A', text: 'Answer A' }, { id: 'B', text: 'Answer B' }],
    correctAnswer: 'A',
  },
  {
    id: 'q2',
    concept_title: 'Thyroid function',
    options: [{ id: 'A', text: 'Answer A' }, { id: 'B', text: 'Answer B' }],
    correctAnswer: 'B',
  },
];

describe('SessionReviewScreen', () => {
  it('shows a concise result and sends Done to a real Home action', () => {
    const onDone = vi.fn();
    render(
      <MemoryRouter>
        <SessionReviewScreen
          answers={[
            { questionIndex: 0, isCorrect: true, selectedOption: 'A' },
            { questionIndex: 1, isCorrect: false, selectedOption: 'A' },
          ]}
          questions={questions}
          onRetryIncorrect={vi.fn()}
          onDone={onDone}
          onAnotherFive={vi.fn()}
          sessionDuration={74}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '1 of 2 correct' })).toBeInTheDocument();
    expect(screen.getByText('1 case worth another look.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with 2 more' })).toBeInTheDocument();
    expect(screen.queryByText(/recorded attempts|marker = before session|not a readiness score|concepts evidenced/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go to Home' }));
    expect(onDone).toHaveBeenCalledOnce();
  });
});
