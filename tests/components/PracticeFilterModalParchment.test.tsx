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

  it('opens with the original focused-session builder and granular filters visible', () => {
    const onApplyFilters = vi.fn();
    render(
      <PracticeFilterModalParchment
        isOpen
        onClose={vi.fn()}
        onApplyFilters={onApplyFilters}
      />,
    );

    expect(screen.getByRole('heading', { name: /practise your way/i })).toBeInTheDocument();
    expect(screen.getByText(/build a focused session in seconds/i)).toBeInTheDocument();
    expect(screen.getByText(/^anything$/i, { selector: 'span.capitalize' }).closest('button')).toBeInTheDocument();
    expect(screen.getByText(/^weak$/i, { selector: 'span.capitalize' }).closest('button')).toBeInTheDocument();
    expect(screen.getByText(/^unseen$/i, { selector: 'span.capitalize' }).closest('button')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search conditions…')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search presentations…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more filters/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/^weak$/i, { selector: 'span.capitalize' }).closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /begin session/i }));

    expect(onApplyFilters).toHaveBeenCalledWith(expect.objectContaining({
      size: 10,
      statuses: ['weak'],
    }));
  });
});
