import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCohortRepository } from '@/atom/cohortRepository';

function makeStub(rows: any[] = [], userId: string | null = 'user-1') {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
    then: (resolve: any) => resolve({ data: rows, error: null }),
  };
  return {
    from: vi.fn(() => builder),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
    _builder: builder,
  };
}

describe('cohortRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getMyCohort reads cohort_school from profiles for the auth user', async () => {
    const supabase = makeStub([{ cohort_school: 'Imperial College London' }]);
    const repo = createCohortRepository(supabase as any);

    const cohort = await repo.getMyCohort();

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase._builder.select).toHaveBeenCalledWith('cohort_school');
    expect(supabase._builder.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(cohort).toBe('Imperial College London');
  });

  it('getMyCohort returns null when no row / no cohort set', async () => {
    const supabase = makeStub([]); // no row
    const repo = createCohortRepository(supabase as any);
    expect(await repo.getMyCohort()).toBeNull();
  });

  it('setMyCohort updates both cohort_school and display_name (trimmed) for auth user', async () => {
    const supabase = makeStub([]);
    const repo = createCohortRepository(supabase as any);

    await repo.setMyCohort('  Imperial College London  ', '  Nora  ');

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase._builder.update).toHaveBeenCalledWith({
      cohort_school: 'Imperial College London',
      display_name: 'Nora',
    });
    expect(supabase._builder.eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('setMyCohort throws when not authenticated', async () => {
    const supabase = makeStub([], null);
    const repo = createCohortRepository(supabase as any);
    await expect(repo.setMyCohort('Imperial', 'Nora')).rejects.toThrow(/not authenticated/i);
  });

  it('listCohortLeaderboard maps view rows to camelCase, ordered desc, limited', async () => {
    const supabase = makeStub([
      { user_id: 'u1', display_name: 'Nora', reviews_this_week: 42 },
      { user_id: 'u2', display_name: 'Anonymous', reviews_this_week: 30 },
    ]);
    const repo = createCohortRepository(supabase as any);

    const rows = await repo.listCohortLeaderboard('Imperial College London', 10);

    expect(supabase.from).toHaveBeenCalledWith('cohort_weekly_leaderboard');
    expect(supabase._builder.select).toHaveBeenCalledWith('user_id, display_name, reviews_this_week');
    expect(supabase._builder.eq).toHaveBeenCalledWith('cohort_school', 'Imperial College London');
    expect(supabase._builder.order).toHaveBeenCalledWith('reviews_this_week', { ascending: false });
    expect(supabase._builder.limit).toHaveBeenCalledWith(10);
    expect(rows).toEqual([
      { userId: 'u1', displayName: 'Nora', reviewsThisWeek: 42 },
      { userId: 'u2', displayName: 'Anonymous', reviewsThisWeek: 30 },
    ]);
  });
});
