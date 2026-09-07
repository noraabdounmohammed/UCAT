import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LearnerErrorBoundary } from '@/components/LearnerErrorBoundary';

function Broken() {
  throw new Error('boom');
}

describe('<LearnerErrorBoundary />', () => {
  it('shows a useful recovery screen instead of a blank app', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <LearnerErrorBoundary>
        <Broken />
      </LearnerErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /page didn’t load properly/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back home/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
