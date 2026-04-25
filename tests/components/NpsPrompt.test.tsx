import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NpsPrompt } from '@/components/nps/NpsPrompt';

describe('<NpsPrompt />', () => {
  it('renders 11 score buttons (0-10)', () => {
    render(<NpsPrompt onSubmit={vi.fn()} onDismiss={vi.fn()} />);
    for (let i = 0; i <= 10; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
    }
  });

  it('clicking a score button selects it (visual + accessible state)', async () => {
    const user = userEvent.setup();
    render(<NpsPrompt onSubmit={vi.fn()} onDismiss={vi.fn()} />);
    const eight = screen.getByRole('button', { name: '8' });
    await user.click(eight);
    expect(eight).toHaveAttribute('aria-pressed', 'true');
  });

  it('submit is disabled until a score is chosen, then enabled', async () => {
    const user = userEvent.setup();
    render(<NpsPrompt onSubmit={vi.fn()} onDismiss={vi.fn()} />);
    const submit = screen.getByRole('button', { name: /submit/i });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '7' }));
    expect(submit).not.toBeDisabled();
  });

  it('calls onSubmit with the selected score and comment text', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NpsPrompt onSubmit={onSubmit} onDismiss={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: '9' }));
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'love it');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledWith({ score: 9, comment: 'love it' });
  });

  it('calls onDismiss when "Not now" is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<NpsPrompt onSubmit={vi.fn()} onDismiss={onDismiss} />);
    await user.click(screen.getByRole('button', { name: /not now/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
