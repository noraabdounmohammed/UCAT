import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LaunchHomePage } from '@/pages/LaunchHomePage';
import { saveSessionLearning } from '@/lib/sessionLearning';
import { writeLaunchSessionDraft } from '@/lib/launchSessionDraft';

const state = vi.hoisted(() => ({
  concepts: [] as Array<Record<string, unknown>>,
  user: null as null | { id: string },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.user, loading: false, signOut: vi.fn() }),
}));

vi.mock('@/contexts/ConceptStoreContext', () => ({
  ConceptStoreProvider: ({ children }: { children: React.ReactNode }) => children,
  useConceptStore: () => ({
    concepts: state.concepts,
    isPracticing: false,
    practiceQuestions: [],
    startPractice: vi.fn(),
    endPractice: vi.fn(),
    updateMastery: vi.fn(),
    practiceError: null,
    filterOptions: { custom_filters: [] },
    setPracticeSelection: vi.fn(),
  }),
}));

vi.mock('@/components/practice/ApplePracticeSession', () => ({ ApplePracticeSession: () => null }));
vi.mock('@/components/practice/SessionOrientation', () => ({ SessionOrientation: () => null }));
vi.mock('@/components/practice/PracticeFilterModalParchment', () => ({
  PracticeFilterModalParchment: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Filter panel</div> : null,
}));

function concept(id: string, mastery: Record<string, unknown>) {
  return {
    concept_id: id,
    title: id,
    content: id,
    custom_filters: ['cardiology'],
    prerequisites: [],
    mastery_data: {
      attempts: 0,
      correct: 0,
      incorrect: 0,
      mastery_level: 0,
      last_practiced: null,
      ...mastery,
    },
  };
}

describe('LaunchHomePage', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/?home=1');
    localStorage.clear();
    sessionStorage.clear();
    state.user = null;
  });

  it('gives a first-time learner one clear, low-commitment starting action', () => {
    state.concepts = [concept('one', {}), concept('two', {}), concept('three', {})];

    render(<MemoryRouter><LaunchHomePage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /your personal UKMLA tutor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try 3 cases/i })).toHaveTextContent('3 cases · about 6 min');
    expect(screen.getByRole('button', { name: /tailor your session/i })).toBeInTheDocument();
    expect(screen.getByText(/your learning picture starts here/i)).toBeInTheDocument();
  });

  it('turns prior evidence into an actionable returning-learner home', () => {
    state.concepts = [
      concept('weak', { attempts: 2, correct: 0, incorrect: 2, mastery_level: 1 }),
      concept('secure', { attempts: 2, correct: 2, incorrect: 0, mastery_level: 2 }),
      concept('unseen', {}),
    ];

    render(<MemoryRouter><LaunchHomePage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /what to work on next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recommended session/i })).toHaveTextContent('1 area to revisit');
    expect(screen.getByText(/2 concepts practised/i)).toBeInTheDocument();
    expect(screen.getByText('1 to revisit')).toBeInTheDocument();
    expect(screen.queryByText(/currently secure/i)).not.toBeInTheDocument();
  });

  it('includes an uncertain starter in progress and allows resume before the curriculum loads', () => {
    state.concepts = [];
    const questions = [{ id: 'starter', concept_id: 'stemi', concept_title: 'STEMI: choosing reperfusion', options: [] }];
    const answers = [{ questionIndex: 0, isCorrect: true, confidence: 'unsure' as const }];
    writeLaunchSessionDraft({ questions, answers, currentIndex: 0, showReview: false, reviewingQuestionIndex: null, startedAt: Date.now(), learnerScope: 'guest' });

    render(<MemoryRouter><LaunchHomePage /></MemoryRouter>);

    expect(screen.getByText('1 concept practised')).toBeInTheDocument();
    expect(screen.getByText('1 to revisit')).toBeInTheDocument();
    expect(screen.getByText('STEMI: choosing reperfusion')).toBeInTheDocument();
    expect(screen.getByText('Correct answer · unsure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resume session/i })).toBeEnabled();
  });

  it('does not show another account’s summary after changing accounts', () => {
    state.concepts = [];
    state.user = { id: 'alice' };
    saveSessionLearning('alice', [{ id: 'q1', concept_title: 'Alice’s session', options: [] }], [{ questionIndex: 0, isCorrect: true }], Date.now(), true);
    const { rerender } = render(<MemoryRouter><LaunchHomePage /></MemoryRouter>);
    expect(screen.getByText('Alice’s session')).toBeInTheDocument();
    state.user = { id: 'bob' };
    rerender(<MemoryRouter><LaunchHomePage /></MemoryRouter>);
    expect(screen.queryByText('Alice’s session')).not.toBeInTheDocument();
  });
});
