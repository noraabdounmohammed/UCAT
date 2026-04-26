import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNpsRepository } from '@/atom/npsRepository';

function makeStub() {
  const builder: any = {
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { from: vi.fn(() => builder), _builder: builder };
}

describe('npsRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submitNps inserts user_id, score, comment, context into nps_responses', async () => {
    const supabase = makeStub();
    const repo = createNpsRepository(supabase as any);

    await repo.submitNps('user-1', 9, 'great product', 'after-5-sessions');

    expect(supabase.from).toHaveBeenCalledWith('nps_responses');
    expect(supabase._builder.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      score: 9,
      comment: 'great product',
      context: 'after-5-sessions',
    });
  });

  it('submitNps allows null comment', async () => {
    const supabase = makeStub();
    const repo = createNpsRepository(supabase as any);

    await repo.submitNps('user-1', 7, null, 'after-5-sessions');

    expect(supabase._builder.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      score: 7,
      comment: null,
      context: 'after-5-sessions',
    });
  });
});
