import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PracticeFilterModalParchment } from '@/components/practice/PracticeFilterModalParchment';

const store = vi.hoisted(() => ({
  setPracticeSelection: vi.fn(),
  loadConcepts: vi.fn(),
  concepts: [
    {
      concept_id: 'heart-failure-management',
      title: 'Heart failure management',
      custom_filters: ['cardiology', 'heart-failure', 'breathlessness', 'management'],
      mastery_data: { attempts: 2, mastery_level: 1 },
    },
    {
      concept_id: 'asthma-diagnosis',
      title: 'Asthma diagnosis',
      custom_filters: ['respiratory', 'asthma', 'wheeze', 'diagnosis'],
      mastery_data: { attempts: 0, mastery_level: 0 },
    },
  ],
  filterCategories: [
    { id: 'specialty', name: 'Specialty' },
    { id: 'condition', name: 'Condition' },
    { id: 'presentation', name: 'Presentation' },
    { id: 'facet', name: 'Facet' },
  ],
}));

vi.mock('@/contexts/ConceptStoreContext', () => ({
  useConceptStore: () => ({
    curriculumId: 'test-curriculum',
    concepts: store.concepts,
    filterCategories: store.filterCategories,
    setPracticeSelection: store.setPracticeSelection,
    isLoading: false,
    loadConcepts: store.loadConcepts,
  }),
}));

describe('PracticeFilterModalParchment', () => {
  beforeEach(() => {
    localStorage.clear();
    store.setPracticeSelection.mockClear();
    localStorage.setItem('test-curriculum_filter_assignments', JSON.stringify({
      cardiology: 'specialty',
      respiratory: 'specialty',
      'heart-failure': 'condition',
      asthma: 'condition',
      breathlessness: 'presentation',
      wheeze: 'presentation',
      management: 'facet',
      diagnosis: 'facet',
    }));
  });

  it('offers fast intents first and keeps granular choices behind More filters', () => {
    const onApplyFilters = vi.fn();
    render(
      <PracticeFilterModalParchment
        isOpen
        onClose={vi.fn()}
        onApplyFilters={onApplyFilters}
        defaultSize={3}
      />,
    );

    expect(screen.getByRole('heading', { name: /choose what to practise/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recommended/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /weak areas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unseen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /needs review/i })).toBeDisabled();
    expect(screen.queryByPlaceholderText('Search conditions…')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more filters/i }));
    expect(screen.getByPlaceholderText('Search conditions…')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /weak areas/i }));
    fireEvent.click(screen.getByRole('button', { name: /start 1-case session/i }));

    expect(onApplyFilters).toHaveBeenCalledWith(expect.objectContaining({
      size: 3,
      statuses: ['weak'],
    }));
  });
});
