import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAttemptsRepository } from '@/atom/mockAttemptsRepository';

function makeStub() {
  const builder: any = {
    insert: vi.fn(async () => ({ data: null, error: null })),
  };
  return { from: vi.fn(() => builder), _builder: builder };
}

describe('mockAttemptsRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saveAttempt inserts mock_attempts with camelCase mapped to snake_case', async () => {
    const supabase = makeStub();
    const repo = createMockAttemptsRepository(supabase as any);

    const startedAt = new Date('2026-04-25T09:30:00Z');
    const finishedAt = new Date('2026-04-25T10:00:00Z');

    await repo.saveAttempt({
      userId: 'user-1',
      exam: 'UKMLA',
      atomCount: 20,
      correct: 14,
      total: 20,
      percentage: 70,
      durationSec: 1800,
      timeUsedSec: 1750,
      finished: true,
      startedAt,
      finishedAt,
    });

    expect(supabase.from).toHaveBeenCalledWith('mock_attempts');
    expect(supabase._builder.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      exam: 'UKMLA',
      atom_count: 20,
      correct: 14,
      total: 20,
      percentage: 70,
      duration_sec: 1800,
      time_used_sec: 1750,
      finished: true,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
    });
  });
});
