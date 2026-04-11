import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const FREE_DAILY_QUESTION_LIMIT = 20;
const DAILY_COUNT_KEY = 'medicu_daily_question_count';
const DAILY_DATE_KEY = 'medicu_daily_question_date';

interface SubscriptionState {
  isPremium: boolean;
  loading: boolean;
  dailyQuestionsUsed: number;
  dailyQuestionsRemaining: number;
  isAtLimit: boolean;
  incrementDailyCount: () => void;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dailyQuestionsUsed, setDailyQuestionsUsed] = useState(0);

  // Get/reset daily question count
  const getDailyCount = (): number => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(DAILY_DATE_KEY);
    if (storedDate !== today) {
      localStorage.setItem(DAILY_DATE_KEY, today);
      localStorage.setItem(DAILY_COUNT_KEY, '0');
      return 0;
    }
    return parseInt(localStorage.getItem(DAILY_COUNT_KEY) || '0', 10);
  };

  const incrementDailyCount = () => {
    if (isPremium) return; // No limit for premium
    const today = new Date().toDateString();
    localStorage.setItem(DAILY_DATE_KEY, today);
    const newCount = getDailyCount() + 1;
    localStorage.setItem(DAILY_COUNT_KEY, String(newCount));
    setDailyQuestionsUsed(newCount);
  };

  const fetchSubscription = async () => {
    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Could not fetch subscription status:', error.message);
        setIsPremium(false);
      } else {
        setIsPremium(profile?.is_premium === true);
      }
    } catch (err) {
      console.warn('Subscription fetch failed:', err);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDailyQuestionsUsed(getDailyCount());
    fetchSubscription();
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
