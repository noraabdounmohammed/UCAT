import React from 'react';

export function CoverageTiles({
  buckets,
  showAttempted = false,
  onReview,
}: {
  buckets: { bucket: string; label: string; total: number; mastered: number; attempted?: number; correct?: number; incorrect?: number }[];
  showAttempted?: boolean;
  onReview?: (filterName: string) => void;
}) {
  if (buckets.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        No coverage data yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {buckets.map((b) => (
        <div
          key={b.bucket}
          className="relative rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-600 active:scale-[0.98] transition-all duration-200"
        >
          {/* Background Progress Bar */}
          {showAttempted ? (
            <div className="absolute inset-0 flex">
              {/* Green for correct */}
              {b.correct !== undefined && b.total > 0 && (
                <div 
                  className="bg-green-100/50 dark:bg-green-900/20 transition-all duration-500"
                  style={{ width: `${(b.correct / b.total) * 100}%` }}
                />
              )}
              {/* Red for incorrect */}
              {b.incorrect !== undefined && b.total > 0 && (
                <div 
                  className="bg-red-100/50 dark:bg-red-900/20 transition-all duration-500"
                  style={{ width: `${(b.incorrect / b.total) * 100}%` }}
                />
              )}
              {/* Grey for unseen - fills remaining space */}
              <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-800/50" />
            </div>
          ) : (
            <div className="absolute inset-0 flex">
              <div 
                className={`transition-all duration-500 ${
                  b.mastered >= 80 
                    ? 'bg-green-100/50 dark:bg-green-900/20' 
                    : b.mastered >= 50 
                    ? 'bg-yellow-100/50 dark:bg-yellow-900/20' 
                    : 'bg-red-100/50 dark:bg-red-900/20'
                }`}
                style={{ width: `${b.mastered}%` }}
              />
              <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-800/50" />
            </div>
          )}
          
          {/* Content */}
          <div className="relative px-3 py-2.5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-zinc-900 dark:text-white truncate mb-1 text-[15px]">{b.label}</div>
                <div className="text-xs flex items-center gap-1">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {b.mastered}% accuracy
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    • {showAttempted && b.attempted !== undefined 
                        ? `${b.attempted}/${b.total} ${b.total === 1 ? 'concept' : 'concepts'} attempted` 
                        : `${b.total} ${b.total === 1 ? 'concept' : 'concepts'}`}
                  </span>
                </div>
              </div>
              
              {/* Apple HIG style button - subtle, icon-based */}
              <button 
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/5 dark:bg-white/10 hover:bg-zinc-900/10 dark:hover:bg-white/20 active:scale-95 transition-all"
                onClick={() => {
                  if (onReview) {
                    onReview(b.bucket);
                  }
                }}
                aria-label={`Review ${b.label}`}
              >
                <svg className="w-4 h-4 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniRing({ 
  correctPct, 
  incorrectPct, 
  unseenPct, 
  fallbackPct 
}: { 
  correctPct?: number; 
  incorrectPct?: number; 
  unseenPct?: number; 
  fallbackPct?: number;
}) {
  const r = 12;
  const c = 2 * Math.PI * r;
  
  // Three-layer ring (coverage view with correct/incorrect/unseen)
  if (correctPct !== undefined && incorrectPct !== undefined && unseenPct !== undefined) {
    const correctDash = correctPct * c;
    const incorrectDash = incorrectPct * c;
    const unseenDash = unseenPct * c;
    
    console.log('Ring segments:', { correctPct, incorrectPct, unseenPct, total: correctPct + incorrectPct + unseenPct });
    
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" className="flex-shrink-0">
        {/* Background circle */}
        <circle cx="16" cy="16" r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" className="dark:stroke-zinc-700" />
        
        {/* Green for correct (starts at top) */}
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke="#34C759"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${correctDash} ${c - correctDash}`}
          transform="rotate(-90 16 16)"
          className="transition-all duration-500"
        />
        
        {/* Red for incorrect (continues after green) */}
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke="#FF3B30"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${incorrectDash} ${c - incorrectDash}`}
          transform={`rotate(${-90 + (correctPct * 360)} 16 16)`}
          className="transition-all duration-500"
        />
        
        {/* Grey for unseen (continues after red) */}
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${unseenDash} ${c - unseenDash}`}
          transform={`rotate(${-90 + ((correctPct + incorrectPct) * 360)} 16 16)`}
          className="transition-all duration-500"
        />
      </svg>
    );
  }
  
  // Single-layer ring (fallback for individual concepts)
  if (fallbackPct !== undefined) {
    const d = fallbackPct * c;
    const color = fallbackPct >= 0.8 ? '#34C759' : fallbackPct >= 0.5 ? '#FFD60A' : '#FF3B30';
    
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
  
  // Empty ring
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="flex-shrink-0">
      <circle cx="16" cy="16" r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" className="dark:stroke-zinc-700" />
    </svg>
  );
}
