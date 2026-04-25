import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AtomSeedForm } from '@/components/seed/AtomSeedForm';

function renderForm(overrides: any = {}) {
  const props = {
    onSubmit: vi.fn(),
    onReset: vi.fn(),
    status: 'idle' as const,
    errorMessage: null,
    lastAtomId: null,
    ...overrides,
  };
  return { ...render(<AtomSeedForm {...props} />), props };
}

describe('<AtomSeedForm />', () => {
  it('renders all required fields', () => {
    renderForm();
    expect(screen.getByLabelText(/claim/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^answer$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/distractor 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/distractor 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/distractor 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/citation url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/citation label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/topic path/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/difficulty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/exam/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/high yield/i)).toBeInTheDocument();
  });

  it('submits a complete DraftAtomInput on valid submit', async () => {
    const user = userEvent.setup();
    const { props } = renderForm();

    await user.type(screen.getByLabelText(/claim/i), 'beta-blocker first-line for stable angina');
    await user.type(screen.getByLabelText(/stem/i), 'A 60-year-old man… What is first-line?');
    await user.type(screen.getByLabelText(/^answer$/i), 'Beta-blocker');
    await user.type(screen.getByLabelText(/distractor 1/i), 'ACE inhibitor');
    await user.type(screen.getByLabelText(/distractor 2/i), 'CCB');
    await user.type(screen.getByLabelText(/distractor 3/i), 'Aspirin');
    await user.type(screen.getByLabelText(/citation url/i), 'https://nice.org.uk/cg126');
    await user.type(screen.getByLabelText(/citation label/i), 'NICE CG126');
    await user.type(screen.getByLabelText(/topic path/i), 'Cardiology, Stable angina');
    await user.click(screen.getByLabelText(/high yield/i));

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
    expect(props.onSubmit.mock.calls[0][0]).toMatchObject({
      exam: 'UKMLA',
      topicPath: ['Cardiology', 'Stable angina'],
      claim: 'beta-blocker first-line for stable angina',
      canonicalStem: 'A 60-year-old man… What is first-line?',
      answer: 'Beta-blocker',
      distractors: ['ACE inhibitor', 'CCB', 'Aspirin'],
      difficulty: 3,
      citationUrl: 'https://nice.org.uk/cg126',
      citationLabel: 'NICE CG126',
      sourceType: 'NICE',
      highYield: true,
    });
  });

  it('shows success banner with lastAtomId and offers a reset', async () => {
    const user = userEvent.setup();
    const { props } = renderForm({ status: 'success', lastAtomId: 'new-atom-1' });

    expect(screen.getByText(/queued for review/i)).toBeInTheDocument();
    expect(screen.getByText(/new-atom-1/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /seed another/i }));
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it('shows error banner when status=error', () => {
    renderForm({ status: 'error', errorMessage: 'insert blocked' });
    expect(screen.getByText(/insert blocked/i)).toBeInTheDocument();
  });

  it('disables submit while submitting', () => {
    renderForm({ status: 'submitting' });
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
  });
});
