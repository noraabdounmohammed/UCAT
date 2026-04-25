import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AtomSeedForm } from '@/components/seed/AtomSeedForm';
import { useSeedAtom } from '@/hooks/useSeedAtom';

const repo = {
  createDraftAtom: vi.fn(async () => ({ id: 'new-atom-xyz' })),
};

function Harness() {
  const seed = useSeedAtom({ repo: repo as any });
  return (
    <AtomSeedForm
      onSubmit={(input) => seed.submit(input)}
      onReset={seed.reset}
      status={seed.status}
      errorMessage={seed.errorMessage}
      lastAtomId={seed.lastAtomId}
    />
  );
}

describe('seed atom integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('full flow: fill form → submit → success banner with atom id', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/claim/i), 'fact');
    await user.type(screen.getByLabelText(/stem/i), 'Stem?');
    await user.type(screen.getByLabelText(/^answer$/i), 'Answer');
    await user.type(screen.getByLabelText(/distractor 1/i), 'x');
    await user.type(screen.getByLabelText(/distractor 2/i), 'y');
    await user.type(screen.getByLabelText(/distractor 3/i), 'z');
    await user.type(screen.getByLabelText(/citation url/i), 'https://nice.org.uk/cg126');
    await user.type(screen.getByLabelText(/citation label/i), 'NICE CG126');

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(screen.getByText(/queued for review/i)).toBeInTheDocument());
    expect(screen.getByText(/new-atom-xyz/i)).toBeInTheDocument();
    expect(repo.createDraftAtom).toHaveBeenCalledWith(
      expect.objectContaining({
        claim: 'fact',
        canonicalStem: 'Stem?',
        answer: 'Answer',
        distractors: ['x', 'y', 'z'],
      }),
    );
  });
});
