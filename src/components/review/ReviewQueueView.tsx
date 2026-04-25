import type { UseReviewQueueResult } from '@/hooks/useReviewQueue';
import { ReviewCard } from './ReviewCard';

export function ReviewQueueView({ queue }: { queue: UseReviewQueueResult }) {
  if (queue.status === 'loading') {
    return <div className="text-stone-500 text-center py-12">Loading…</div>;
  }
  if (queue.status === 'empty') {
    return (
      <div className="text-stone-700 text-center py-12 max-w-md mx-auto">
        <div className="text-2xl font-medium mb-2">No atoms left to review 🎉</div>
        <p className="text-sm text-stone-500">Check back when more drafts come in.</p>
      </div>
    );
  }
  if (queue.status === 'error') {
    return (
      <div className="text-red-700 text-center py-12">
        Something went wrong: {queue.errorMessage}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="text-xs text-stone-500 text-center">
        {queue.progress.done} / {queue.progress.total}
      </div>
      {queue.currentAtom && (
        <ReviewCard
          key={queue.currentAtom.id}
          atom={queue.currentAtom}
          onApprove={() => queue.approve()}
          onReject={(reason) => queue.reject(reason)}
          onUpdate={(patch) => queue.updateAndApprove(patch)}
        />
      )}
    </div>
  );
}
