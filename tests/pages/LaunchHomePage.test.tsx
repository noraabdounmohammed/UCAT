import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LaunchHomePage } from '@/pages/LaunchHomePage';

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

    expect(screen.getByRole('heading', { name: /find your most useful gaps/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start diagnostic/i })).toHaveTextContent('3 cases · about 6 min');
    expect(screen.getByRole('button', { name: /tailor your session/i })).toBeInTheDocument();
    expect(screen.getByText(/your map starts here/i)).toBeInTheDocument();
  });

  it('turns prior evidence into an actionable returning-learner home', () => {
    state.concepts = [
      concept('weak', { attempts: 2, correct: 0, incorrect: 2, mastery_level: 1 }),
      concept('secure', { attempts: 2, correct: 2, incorrect: 0, mastery_level: 2 }),
      concept('unseen', {}),
    ];

    render(<MemoryRouter><LaunchHomePage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /what to work on next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start recommended session/i })).toHaveTextContent('1 weak area');
    expect(screen.getByText(/2 concepts mapped/i)).toBeInTheDocument();
    expect(screen.getByText(/1 needs attention · 1 currently secure/i)).toBeInTheDocument();
  });
});
