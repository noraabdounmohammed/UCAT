import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAtomRepository } from '@/atom/repository';
import type { Atom } from '@/atom/types';

// Minimal in-memory stub of the parts of supabase-js we use.
function makeSupabaseStub(rows: Partial<Atom>[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return {
    from: vi.fn(() => builder),
  };
}

describe('atom repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listApprovedByExam returns only approved atoms for the requested exam', async () => {
    const supabase = makeSupabaseStub([
      { id: 'a1', exam: 'UKMLA', status: 'approved', claim: 'beta-blocker first-line for stable angina' },
    ]);
    const repo = createAtomRepository(supabase as any);

    const atoms = await repo.listApprovedByExam('UKMLA');

    expect(supabase.from).toHaveBeenCalledWith('atoms');
    expect(atoms).toHaveLength(1);
    expect(atoms[0].id).toBe('a1');
  });

  it('listFreeTier returns only free-tier approved atoms', async () => {
    const supabase = makeSupabaseStub([
      { id: 'a2', exam: 'UKMLA', status: 'approved', freeTier: true, claim: 'fact 1' },
    ]);
    const repo = createAtomRepository(supabase as any);

    const atoms = await repo.listFreeTier('UKMLA');

    expect(atoms).toHaveLength(1);
    expect(atoms[0].freeTier).toBe(true);
  });
});
