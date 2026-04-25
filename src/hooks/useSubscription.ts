import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const FREE_DAILY_QUESTION_LIMIT = 20;

interface SubscriptionState {
  isPremium: boolean;
  loading: boolean;
  dailyQuestionsUsed: number;
  dailyQuestionsRemaining: number;
  isAtLimit: boolean;
  incrementDailyCount: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Local-tz date key (YYYY-MM-DD), matches the streak-fix convention so that
 * "today" lines up with the user's wall clock and not UTC.
 */
const todayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

async function fetchDailyCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('daily_session_counts')
    .select('count')
    .eq('user_id', userId)
    .eq('day', todayKey())
    .maybeSingle();
  if (error) {
    console.warn('Could not fetch daily session count:', error.message);
    return 0;
  }
  return (data as { count?: number } | null)?.count ?? 0;
}

async function persistIncrement(userId: string, oldCount: number): Promise<void> {
  const { error } = await supabase
    .from('daily_session_counts')
    .upsert(
      { user_id: userId, day: todayKey(), count: oldCount + 1 },
      { onConflict: 'user_id,day' },
    );
  if (error) {
    console.warn('Could not persist daily session count:', error.message);
  }
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dailyQuestionsUsed, setDailyQuestionsUsed] = useState(0);

  const incrementDailyCount = async (): Promise<void> => {
    if (isPremium) return; // No limit for premium
    if (!user) return; // Guarded — anonymous users never reach here in practice
    const next = dailyQuestionsUsed + 1;
    setDailyQuestionsUsed(next);
    await persistIncrement(user.id, dailyQuestionsUsed);
  };

  const fetchSubscription = async (): Promise<void> => {
    if (!user) {
      setIsPremium(false);
      setDailyQuestionsUsed(0);
      setLoading(false);
      return;
    }

    try {
      const [{ data: profile, error: profileError }, count] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single(),
        fetchDailyCount(user.id),
      ]);

      if (profileError) {
        console.warn('Could not fetch subscription status:', profileError.message);
        setIsPremium(false);
      } else {
        setIsPremium(profile?.is_premium === true);
      }
      setDailyQuestionsUsed(count);
    } catch (err) {
      console.warn('Subscription fetch failed:', err);
      setIsPremium(false);
      setDailyQuestionsUsed(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const dailyQuestionsRemaining = isPremium
    ? Infinity
    : Math.max(0, FREE_DAILY_QUESTION_LIMIT - dailyQuestionsUsed);

  const isAtLimit = !isPremium && dailyQuestionsUsed >= FREE_DAILY_QUESTION_LIMIT;

  return {
    isPremium,
    loading,
    dailyQuestionsUsed,
    dailyQuestionsRemaining,
    isAtLimit,
    incrementDailyCount,
    refresh: fetchSubscription,
  };
}
