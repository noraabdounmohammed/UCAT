import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PredictedScoreBadge } from '@/components/study/PredictedScoreBadge';

describe('<PredictedScoreBadge />', () => {
  it('renders predicted score as rounded percentage', () => {
    render(<PredictedScoreBadge predictedScore={0.732} atomCount={50} totalAtoms={200} status="ready" />);
    expect(screen.getByText('73%')).toBeInTheDocument();
    expect(screen.getByText(/50\s*\/\s*200/)).toBeInTheDocument();
  });

  it('renders a placeholder while loading', () => {
    render(<PredictedScoreBadge predictedScore={0} atomCount={0} totalAtoms={0} status="loading" />);
    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it('renders zero state with helpful copy when no atoms covered', () => {
    render(<PredictedScoreBadge predictedScore={0} atomCount={0} totalAtoms={200} status="ready" />);
    expect(screen.getByText(/start a session/i)).toBeInTheDocument();
  });

  it('renders nothing visible on error (silent fail-safe)', () => {
    const { container } = render(<PredictedScoreBadge predictedScore={0} atomCount={0} totalAtoms={0} status="error" />);
    expect(container.firstChild).toBeNull();
  });
});
