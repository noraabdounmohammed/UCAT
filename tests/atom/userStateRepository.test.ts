import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserStateRepository } from '@/atom/userStateRepository';

function makeStub(rows: any[] = []) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return { from: vi.fn(() => builder), _builder: builder };
}

describe('userStateRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listDueForUser pulls user_atom_state rows where due_at <= now', async () => {
    const supabase = makeStub([
      { user_id: 'u1', atom_id: 'a1', stability: 1.5, difficulty: 5, due_at: '2026-04-25T00:00:00Z', last_review_at: null, reps: 0, lapses: 0 },
    ]);
    const repo = createUserStateRepository(supabase as any);

    const due = await repo.listDueForUser('u1', new Date('2026-04-26T00:00:00Z'), 10);

    expect(supabase.from).toHaveBeenCalledWith('user_atom_state');
    expect(due).toHaveLength(1);
    expect(due[0].atomId).toBe('a1');
    expect(supabase._builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(supabase._builder.lte).toHaveBeenCalledWith('due_at', '2026-04-26T00:00:00.000Z');
    expect(supabase._builder.limit).toHaveBeenCalledWith(10);
  });

  it('upsertState writes camelCase state as snake_case row', async () => {
    const supabase = makeStub([]);
    const repo = createUserStateRepository(supabase as any);

    await repo.upsertState({
      userId: 'u1',
      atomId: 'a1',
      stability: 2.5,
      difficulty: 6,
      dueAt: '2026-05-01T00:00:00.000Z',
      lastReviewAt: '2026-04-25T00:00:00.000Z',
      reps: 1,
      lapses: 0,
    });

    expect(supabase._builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        atom_id: 'a1',
        stability: 2.5,
        difficulty: 6,
        due_at: '2026-05-01T00:00:00.000Z',
        last_review_at: '2026-04-25T00:00:00.000Z',
        reps: 1,
        lapses: 0,
      }),
      { onConflict: 'user_id,atom_id' },
    );
  });

  it('insertReviewEvent writes a review_events row', async () => {
    const supabase = makeStub([]);
    const repo = createUserStateRepository(supabase as any);

    await repo.insertReviewEvent({
      userId: 'u1',
      atomId: 'a1',
      variantId: null,
      rating: 3,
      confidence: 4,
      responseMs: 4_200,
    });

    expect(supabase.from).toHaveBeenCalledWith('review_events');
    expect(supabase._builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        atom_id: 'a1',
        rating: 3,
        confidence: 4,
        response_ms: 4_200,
      }),
    );
  });
});
