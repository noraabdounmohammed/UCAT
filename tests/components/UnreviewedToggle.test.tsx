import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UnreviewedToggle } from '@/components/study/UnreviewedToggle';

describe('<UnreviewedToggle />', () => {
  it('renders the label and current value', () => {
    render(<UnreviewedToggle value={false} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/include AI-drafted questions that have not yet been reviewed/i)).not.toBeChecked();
    expect(screen.getByText(/Unlocks the full bank/i)).toBeInTheDocument();
  });

  it('reflects the checked state when value=true', () => {
    render(<UnreviewedToggle value={true} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/include AI-drafted questions/i)).toBeChecked();
  });

  it('calls onChange with the inverted value on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<UnreviewedToggle value={false} onChange={onChange} />);
    await user.click(screen.getByLabelText(/include AI-drafted questions/i));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
