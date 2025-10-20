import React from 'react';

export function WeakestList({
  items,
  onReview,
}: {
  items: { id: string; title: string; masteryScore: number; attempts: number; lastReviewed?: string; preview?: string }[];
  onReview?: (conceptId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        No weak concepts. Great work!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 5).map((it) => (
        <div
          key={it.id}
          className="group flex items-center gap-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50/50 dark:bg-zinc-800/50 p-3 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/70 active:scale-[0.98] transition-all duration-200"
        >
          <MiniRing pct={it.masteryScore} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-zinc-900 dark:text-white truncate text-[15px]">{it.title}</div>
            {it.preview && (
              <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-1">
                {it.preview.substring(0, 80)}...
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs">
              {it.masteryScore === 0 ? (
                <span className="text-zinc-500 dark:text-zinc-400">Not practiced</span>
              ) : (
                <>
                  <span className={`font-medium ${
                    it.masteryScore >= 0.8 
                      ? 'text-green-600 dark:text-green-400'
                      : it.masteryScore >= 0.5
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {Math.round(it.masteryScore * 100)}% accuracy
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">• {it.attempts} attempts</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniRing({ pct }: { pct: number }) {
  const r = 12;
  const c = 2 * Math.PI * r;
  const d = pct * c;
  
  // Color based on accuracy
  const color = pct >= 0.8 ? '#34C759' : pct >= 0.5 ? '#FFD60A' : '#FF3B30';
  
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="flex-shrink-0">
      <circle cx="16" cy="16" r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" className="dark:stroke-zinc-700" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${d} ${c - d}`}
        transform="rotate(-90 16 16)"
        className="transition-all duration-500"
      />
    </svg>
  );
}
