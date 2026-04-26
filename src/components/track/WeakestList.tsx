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
      <div className="text-center py-8 text-stone-500" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
        No weak concepts. Great work!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 5).map((it) => (
        <div
          key={it.id}
          className="group flex items-center gap-3 rounded-2xl border border-stone-300 bg-white/60 backdrop-blur-xl p-3 hover:bg-white/80 hover:border-stone-400 hover:shadow-md transition-all duration-200"
        >
          <MiniRing pct={it.masteryScore} />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-stone-900 text-sm leading-snug" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>{it.title}</div>
            {it.preview && (
              <div className="mt-0.5 text-xs text-stone-600 line-clamp-1" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                {it.preview.substring(0, 80)}...
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
              {it.attempts === 0 || !it.attempts ? (
                <span className="text-stone-500">Not practiced</span>
              ) : (
                <>
                  <span className={`font-medium ${
                    it.masteryScore >= 0.8 
                      ? 'text-green-600'
                      : it.masteryScore >= 0.5
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {Math.round(it.masteryScore * 100)}% accuracy
                  </span>
                  <span className="text-stone-500">• {it.attempts} attempts</span>
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
      <circle cx="16" cy="16" r={r} fill="none" stroke="#E7E5E4" strokeWidth="6" />
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
