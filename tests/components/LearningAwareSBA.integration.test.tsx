import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LearningAwareSBA } from '@/components/practice/LearningAwareSBA';

const streamMock = vi.fn(async (
  _prompt: string,
  _context: unknown,
  onToken: (token: string) => void,
) => {
  onToken("Exactly — the murmur radiating to the carotids is the decisive clue. I've seen enough here and am moving on.");
});

vi.mock('@/services/openai', () => ({
  generateAIResponse: vi.fn(async () => 'PASS'),
  generateAIResponseStream: (...args: any[]) => streamMock(...args),
}));

const question: any = {
  id: 'real-flow-1',
  concept_id: 'aortic-stenosis',
  concept_title: 'Aortic stenosis',
  title: 'Aortic stenosis',
  question_stem: 'A 78-year-old man has exertional syncope and an ejection systolic murmur radiating to the carotids. What is the most likely diagnosis?',
  question: 'What is the most likely diagnosis?',
  options: [
    { id: 'A', text: 'Aortic stenosis' },
    { id: 'B', text: 'Mitral regurgitation' },
    { id: 'C', text: 'Aortic regurgitation' },
    { id: 'D', text: 'Mitral stenosis' },
  ],
  correct_answer: 'A',
  explanation: 'Aortic stenosis classically causes an ejection systolic murmur radiating to the carotids and can cause exertional syncope.',
  key_fact: 'Ejection systolic murmur radiating to the carotids suggests aortic stenosis.',
  format: 'ukmla_sba',
};

describe('real SBA → confidence → tutor flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('lets a learner answer, captures confidence, then produces tutor feedback without advancing immediately', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const onNext = vi.fn();

    render(
      <LearningAwareSBA
        question={question}
        onAnswer={onAnswer}
        onNext={onNext}
        currentIndex={0}
        totalQuestions={5}
      />,
    );

    await user.click(screen.getByRole('button', { name: /aortic stenosis/i }));
    await user.click(screen.getByRole('button', { name: /check answer/i }));

    expect(screen.getByRole('dialog', { name: /how sure were you/i })).toBeInTheDocument();
    expect(onAnswer).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /knew it/i }));
    expect(onAnswer).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(screen.getByText(/murmur radiating to the carotids is the decisive clue/i)).toBeInTheDocument();
    });

    expect(streamMock).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });
});
