import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserStateRepository } from '@/atom/userStateRepository';

function makeStub(rows: any[] = []) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return { from: vi.fn(() => builder), _builder: builder };
}

describe('userStateRepository.listMistakeAtomsForUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries user_atom_state filtered by user_id, lapses>=1, last_review_at>=since', async () => {
    const supabase = makeStub([
      { user_id: 'u1', atom_id: 'a1', stability: 1, difficulty: 6, due_at: '2026-04-25T00:00:00Z', last_review_at: '2026-04-24T10:00:00Z', reps: 2, lapses: 1 },
    ]);
    const repo = createUserStateRepository(supabase as any);
    const since = new Date('2026-03-26T00:00:00Z');

    const result = await repo.listMistakeAtomsForUser('u1', since, 20);

    expect(supabase.from).toHaveBeenCalledWith('user_atom_state');
    expect(supabase._builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(supabase._builder.gte).toHaveBeenCalledWith('lapses', 1);
    expect(supabase._builder.gte).toHaveBeenCalledWith('last_review_at', '2026-03-26T00:00:00.000Z');
    expect(supabase._builder.order).toHaveBeenCalledWith('last_review_at', { ascending: false });
    expect(supabase._builder.limit).toHaveBeenCalledWith(20);
    expect(result).toHaveLength(1);
    expect(result[0].atomId).toBe('a1');
    expect(result[0].lapses).toBe(1);
  });

  it('maps snake_case rows to camelCase domain types', async () => {
    const supabase = makeStub([
      { user_id: 'u1', atom_id: 'a2', stability: 0.5, difficulty: 8, due_at: '2026-04-26T00:00:00Z', last_review_at: '2026-04-25T00:00:00Z', reps: 3, lapses: 2 },
    ]);
    const repo = createUserStateRepository(supabase as any);

    const result = await repo.listMistakeAtomsForUser('u1', new Date('2026-04-01T00:00:00Z'), 10);

    expect(result[0]).toMatchObject({
      userId: 'u1',
      atomId: 'a2',
      stability: 0.5,
      difficulty: 8,
      reps: 3,
      lapses: 2,
    });
  });
});
