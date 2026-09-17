import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { SessionOrientation } from '@/components/practice/SessionOrientation';

describe('SessionOrientation', () => {
  it('makes the recommended focus visible without blocking the first case', () => {
    render(
      <SessionOrientation
        currentIndex={0}
        plannedCount={5}
        answeredCount={0}
        scopeLabel="Recommended mix"
        isTailored={false}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('Case 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('UKMLA AKT')).toBeInTheDocument();
    expect(screen.getByText('Recommended mix')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /choose session focus/i })).not.toBeInTheDocument();
  });

  it('shows the tailored scope and keeps Home as the only session action', () => {
    const onExit = vi.fn();
    render(
      <SessionOrientation
        currentIndex={2}
        plannedCount={5}
        answeredCount={2}
        scopeLabel="Weak areas · Cardiology"
        isTailored
        onExit={onExit}
      />,
    );

    expect(screen.getByText('Case 3 of 5')).toBeInTheDocument();
    expect(screen.getByText('2 assessed')).toBeInTheDocument();
    expect(screen.getByText('Weak areas · Cardiology')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /go to home/i }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
