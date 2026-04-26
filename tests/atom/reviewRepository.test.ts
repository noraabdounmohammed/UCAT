import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReviewRepository } from '@/atom/reviewRepository';

function makeStub(rows: any[] = []) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return { from: vi.fn(() => builder), _builder: builder };
}

describe('reviewRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listPendingReview filters status=pending_review for the exam, ordered high-yield first', async () => {
    const supabase = makeStub([
      { id: 'a1', exam: 'UKMLA', status: 'pending_review', high_yield: true, claim: 'fact 1' },
    ]);
    const repo = createReviewRepository(supabase as any);

    const atoms = await repo.listPendingReview('UKMLA', 20);

    expect(supabase.from).toHaveBeenCalledWith('atoms');
    expect(supabase._builder.eq).toHaveBeenCalledWith('exam', 'UKMLA');
    expect(supabase._builder.eq).toHaveBeenCalledWith('status', 'pending_review');
    expect(supabase._builder.order).toHaveBeenCalledWith('high_yield', { ascending: false });
    expect(supabase._builder.limit).toHaveBeenCalledWith(20);
    expect(atoms).toHaveLength(1);
    expect(atoms[0].id).toBe('a1');
  });

  it('approveAtom updates atom + writes a review_decisions row', async () => {
    const supabase = makeStub([]);
    const repo = createReviewRepository(supabase as any);

    await repo.approveAtom('a1', 'reviewer-1');

    // First call updates atoms
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'atoms');
    expect(supabase._builder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        reviewed_by: 'reviewer-1',
      }),
    );
    // Second call inserts decision
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'review_decisions');
    expect(supabase._builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        atom_id: 'a1',
        reviewer_id: 'reviewer-1',
        decision: 'approve',
      }),
    );
  });

  it('rejectAtom records the reason in review_decisions', async () => {
    const supabase = makeStub([]);
    const repo = createReviewRepository(supabase as any);

    await repo.rejectAtom('a1', 'reviewer-1', 'wrong citation');

    expect(supabase._builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected', reviewed_by: 'reviewer-1' }),
    );
    expect(supabase._builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        atom_id: 'a1',
        reviewer_id: 'reviewer-1',
        decision: 'reject',
        reason: 'wrong citation',
      }),
    );
  });

  it('updateAtom maps camelCase patch to snake_case row update', async () => {
    const supabase = makeStub([]);
    const repo = createReviewRepository(supabase as any);

    await repo.updateAtom('a1', {
      claim: 'fixed claim',
      canonicalStem: 'fixed stem?',
      answer: 'fixed answer',
      distractors: ['x', 'y', 'z'],
      citationUrl: 'https://nice.org.uk/cg126',
      citationLabel: 'NICE CG126',
    });

    expect(supabase.from).toHaveBeenCalledWith('atoms');
    expect(supabase._builder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        claim: 'fixed claim',
        canonical_stem: 'fixed stem?',
        answer: 'fixed answer',
        distractors: ['x', 'y', 'z'],
        citation_url: 'https://nice.org.uk/cg126',
        citation_label: 'NICE CG126',
      }),
    );
    expect(supabase._builder.eq).toHaveBeenCalledWith('id', 'a1');
  });
});
