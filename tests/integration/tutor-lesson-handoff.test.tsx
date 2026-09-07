import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LearningAwareSBA } from '@/components/practice/LearningAwareSBA';

const streamMock = vi.fn(async (
  prompt: string,
  _context: unknown,
  onToken: (token: string) => void,
) => {
  if (/enough evidence|secure for this session/i.test(prompt)) {
    onToken("Exactly — that's the discriminator. I've seen enough here and am moving on.");
  } else {
    onToken('Right diagnosis. Quick check: what single examination finding makes aortic stenosis especially likely here?');
  }
});

vi.mock('@/services/openai', () => ({
  generateAIResponse: vi.fn(async () => 'PASS'),
  generateAIResponseStream: (...args: any[]) => streamMock(...args),
}));

const question: any = {
  id: 'handoff-flow-1',
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

function installSessionBehavior() {
  const file = path.resolve(process.cwd(), 'public/studyedit-session-behavior.js');
  window.eval(fs.readFileSync(file, 'utf8'));
}

describe('tutor lesson handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  });

  it('shows the learner reply immediately, wraps naturally, and advances only when Next question is chosen', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const onAnswer = vi.fn();

    render(
      <div data-studyedit-question-shell="true">
        <button
          type="button"
          data-studyedit-native-next="true"
          aria-hidden="true"
          tabIndex={-1}
          style={{ display: 'none' }}
          onClick={onNext}
        >
          Native next
        </button>
        <LearningAwareSBA
          question={question}
          onAnswer={onAnswer}
          onNext={onNext}
          currentIndex={0}
          totalQuestions={5}
        />
      </div>,
    );

    installSessionBehavior();

    await user.click(screen.getByRole('button', { name: /aortic stenosis/i }));
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    await user.click(screen.getByRole('button', { name: /unsure/i }));

    await screen.findByText(/what single examination finding makes aortic stenosis/i);

    const composer = screen.getByPlaceholderText(/reply or ask anything/i);
    await user.type(composer, 'The murmur radiating to the carotids.');
    await user.click(screen.getByRole('button', { name: /reply to studyedit/i }));

    expect(screen.getByText('The murmur radiating to the carotids.')).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();

    await screen.findByText(/that's the discriminator/i);

    await waitFor(() => {
      expect(screen.getByText(/anything you want to ask before the next case/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next question/i })).toBeInTheDocument();
    });

    expect(onNext).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /next question/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
