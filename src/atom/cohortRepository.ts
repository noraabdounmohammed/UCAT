import type { SupabaseClient } from '@supabase/supabase-js';

export interface CohortLeaderboardRow {
  userId: string;
  displayName: string;
  reviewsThisWeek: number;
}

export interface CohortRepository {
  getMyCohort(): Promise<string | null>;
  setMyCohort(school: string, displayName: string): Promise<void>;
  listCohortLeaderboard(cohort: string, limit: number): Promise<CohortLeaderboardRow[]>;
}

export function createCohortRepository(supabase: SupabaseClient): CohortRepository {
  return {
    async getMyCohort() {
      const userId = (await supabase.auth.getUser()).data.user?.id ?? '';
      const { data, error } = await supabase
        .from('profiles')
        .select('cohort_school')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data?.cohort_school as string | null) ?? null;
    },

    async setMyCohort(school, displayName) {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ cohort_school: school.trim(), display_name: displayName.trim() })
        .eq('id', userId);
      if (error) throw error;
    },

    async listCohortLeaderboard(cohort, limit) {
      const { data, error } = await supabase
        .from('cohort_weekly_leaderboard')
        .select('user_id, display_name, reviews_this_week')
        .eq('cohort_school', cohort)
        .order('reviews_this_week', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        userId: r.user_id,
        displayName: r.display_name,
        reviewsThisWeek: r.reviews_this_week,
      }));
    },
  };
}
