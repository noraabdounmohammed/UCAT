import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { readLaunchSessionDraft } from '@/lib/launchSessionDraft';
import { readRecentSession } from '@/lib/sessionLearning';
import type { QuestionData } from '@/components/practice/questionTypes';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/services/learnerMemory', () => ({ hydrateLearnerMemoryFromCloud: vi.fn(), getLearnerMemoryContext: () => '', recordLearnerEvent: vi.fn() }));
vi.mock('@/services/openai', () => ({
  generateAIResponse: vi.fn(async () => 'PASS'),
  generateAIResponseStream: vi.fn(async (_prompt: string, _context: unknown, onToken: (text: string) => void) => {
    onToken('Quick check: which reperfusion treatment can be delivered promptly here?');
  }),
}));

const questions: QuestionData[] = [{
  id: 'test-stemi', concept_id: 'test-concept', concept_title: 'STEMI: choosing reperfusion', format: 'ukmla_sba',
  question_stem: 'A patient has an acute STEMI and timely PCI is available. Which reperfusion treatment is preferred?',
  options: [{ id: 'A', text: 'Primary PCI' }, { id: 'B', text: 'Outpatient angiography' }],
  correct_answer: 'A', explanation: 'Timely primary PCI is the preferred reperfusion strategy in this case.',
}];

function Location() { return <output aria-label="Current route">{useLocation().pathname}</output>; }

describe('real session save and return', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  it('restores the answer and tutor, records a follow-up separately, and saves completion before signup', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const onComplete = vi.fn();
    const session = <MemoryRouter><ApplePracticeSession questions={questions} onComplete={onComplete} onAnswerSubmit={onAnswer} persistLaunchState /><Location /></MemoryRouter>;
    const first = render(session);
    await user.click(screen.getByRole('button', { name: /outpatient angiography/i }));
    await user.click(screen.getByRole('button', { name: /unsure/i }));
    await screen.findByText(/which reperfusion treatment can be delivered promptly here/i);
    await waitFor(() => expect(readLaunchSessionDraft()?.answers[0].tutorTurns?.length).toBeGreaterThan(0));
    expect(readRecentSession('guest')).toMatchObject({ completed: false, answered: 1, correct: 0 });
    first.unmount();

    render(session);
    expect(screen.getByText(/which reperfusion treatment can be delivered promptly here/i)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Your reply to the tutor' }), 'Primary PCI');
    await user.click(screen.getByRole('button', { name: 'Reply to StudyEdit' }));
    await waitFor(() => expect(readRecentSession('guest')?.items[0].passedChecks).toBe(1));
    await user.click(screen.getByRole('button', { name: 'Finish session' }));

    expect(screen.getByRole('heading', { name: '0 of 1 correct' })).toBeInTheDocument();
    expect(screen.getByText('Follow-up check answered correctly')).toBeInTheDocument();
    expect(screen.getByText('First answer incorrect; then answered a tutor check correctly.')).toBeInTheDocument();
    expect(readRecentSession('guest')).toMatchObject({ completed: true, answered: 1, correct: 0, items: [{ passedChecks: 1 }] });
    await user.click(screen.getByRole('button', { name: 'Save progress' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/signin');
    expect(onComplete).not.toHaveBeenCalled();
    expect(onAnswer).toHaveBeenCalledOnce();
  });
});
