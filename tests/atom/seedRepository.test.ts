import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSeedRepository } from '@/atom/seedRepository';

function makeStub(returnedRow: any | null = null) {
  const builder: any = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(async () => ({ data: returnedRow, error: null })),
  };
  return { from: vi.fn(() => builder), _builder: builder };
}

describe('seedRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createDraftAtom inserts with status=pending_review and maps camelCase to snake_case', async () => {
    const supabase = makeStub({ id: 'new-atom-id' });
    const repo = createSeedRepository(supabase as any);

    const result = await repo.createDraftAtom({
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

    expect(supabase.from).toHaveBeenCalledWith('atoms');
    expect(supabase._builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        exam: 'UKMLA',
        topic_path: ['Cardiology', 'Stable angina'],
        claim: 'beta-blocker first-line for stable angina',
        canonical_stem: 'A 60-year-old man… What is first-line?',
        answer: 'Beta-blocker',
        distractors: ['ACE inhibitor', 'CCB', 'Aspirin'],
        difficulty: 3,
        citation_url: 'https://nice.org.uk/cg126',
        citation_label: 'NICE CG126',
        source_type: 'NICE',
        high_yield: true,
        status: 'pending_review',
      }),
    );
    expect(result).toEqual({ id: 'new-atom-id' });
  });

  it('defaults highYield to false when omitted', async () => {
    const supabase = makeStub({ id: 'a2' });
    const repo = createSeedRepository(supabase as any);

    await repo.createDraftAtom({
      exam: 'UKMLA',
      topicPath: ['Cardiology'],
      claim: 'fact',
      canonicalStem: 'Stem?',
      answer: 'Answer',
      distractors: ['x', 'y', 'z'],
      difficulty: 3,
      citationUrl: 'https://nice.org.uk/cg126',
      citationLabel: 'NICE CG126',
      sourceType: 'NICE',
    });

    expect(supabase._builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ high_yield: false }),
    );
  });
});
