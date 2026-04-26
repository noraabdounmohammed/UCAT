import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CohortSelectModal } from '@/components/leaderboard/CohortSelectModal';
import type { CohortRepository } from '@/atom/cohortRepository';

function makeRepo(overrides: Partial<CohortRepository> = {}): CohortRepository {
  return {
    getMyCohort: vi.fn().mockResolvedValue(null),
    setMyCohort: vi.fn().mockResolvedValue(undefined),
    listCohortLeaderboard: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('<CohortSelectModal />', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the school dropdown + display-name input', () => {
    render(<CohortSelectModal repo={makeRepo()} onCohortSet={vi.fn()} />);
    expect(screen.getByLabelText(/medical school/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    // Sanity-check a couple of canonical schools are in the dropdown options.
    expect(screen.getByRole('option', { name: 'Imperial College London' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'University of Oxford' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other (UK)' })).toBeInTheDocument();
  });

  it('submitting calls repo.setMyCohort and onCohortSet', async () => {
    const user = userEvent.setup();
    const repo = makeRepo();
    const onCohortSet = vi.fn();

    render(<CohortSelectModal repo={repo} onCohortSet={onCohortSet} />);

    await user.selectOptions(screen.getByLabelText(/medical school/i), 'Imperial College London');
    await user.type(screen.getByLabelText(/display name/i), 'Nora');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(repo.setMyCohort).toHaveBeenCalledWith('Imperial College London', 'Nora');
    expect(onCohortSet).toHaveBeenCalledTimes(1);
  });

  it('disables save until a school is picked AND a display name is entered', async () => {
    const user = userEvent.setup();
    render(<CohortSelectModal repo={makeRepo()} onCohortSet={vi.fn()} />);

    const save = screen.getByRole('button', { name: /save/i });
    expect(save).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/medical school/i), 'University of Oxford');
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/display name/i), 'Nora');
    expect(save).not.toBeDisabled();
  });

  it('shows error banner if setMyCohort throws', async () => {
    const user = userEvent.setup();
    const repo = makeRepo({
      setMyCohort: vi.fn().mockRejectedValue(new Error('insert blocked')),
    });
    const onCohortSet = vi.fn();

    render(<CohortSelectModal repo={repo} onCohortSet={onCohortSet} />);
    await user.selectOptions(screen.getByLabelText(/medical school/i), 'Imperial College London');
    await user.type(screen.getByLabelText(/display name/i), 'Nora');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/insert blocked/i)).toBeInTheDocument();
    expect(onCohortSet).not.toHaveBeenCalled();
  });
});
