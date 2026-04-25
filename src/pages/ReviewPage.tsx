import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthGate } from '@/components/auth/AuthGate';
import { ReviewQueueView } from '@/components/review/ReviewQueueView';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import { createReviewRepository } from '@/atom/reviewRepository';

export function ReviewPage() {
  const { user } = useAuth();
  const { isCreator } = useUserRole();
  const repo = useMemo(() => createReviewRepository(supabase), []);

  const queue = useReviewQueue({
    exam: 'UKMLA',
    reviewerId: user?.id ?? '',
    repo,
  });

  if (!user) {
    return (
      <MainLayout currentPage="review">
        <AuthGate
          title="Sign in to review atoms"
          subtitle="Approve, edit, or reject draft atoms before they go live."
        />
      </MainLayout>
    );
  }

  if (!isCreator) {
    return (
      <MainLayout currentPage="review">
        <div className="text-center py-12 max-w-md mx-auto">
          <div className="text-2xl font-medium text-stone-900 mb-2">Not authorised</div>
          <p className="text-sm text-stone-500">
            Atom review is reserved for clinical reviewers. If this is wrong, contact Nora.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPage="review">
      <div className="max-w-md mx-auto py-6 px-4">
        <h1 className="text-xl font-semibold text-stone-900 mb-4">Review queue</h1>
        <ReviewQueueView queue={queue} />
      </div>
    </MainLayout>
  );
}
