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
          className="relative rounded-2xl border border-stone-300 overflow-hidden hover:border-stone-400 hover:shadow-md transition-all duration-200 bg-white/60 backdrop-blur-xl"
        >
          {/* Background Progress Bar - Three segments: mastered (green), attempted (red), unseen (grey) */}
          <div className="absolute inset-0 flex">
            {/* Green for mastered concepts (mastery_level === 2) */}
            <div 
              className="bg-green-100/60 transition-all duration-500"
              style={{ width: `${b.mastered}%` }}
            />
            {/* Red for attempted but not mastered - calculate from attempted and mastered */}
            {b.attempted !== undefined && b.total > 0 && (
              <div 
                className="bg-red-100/60 transition-all duration-500"
                style={{ width: `${Math.max(0, ((b.attempted - (b.mastered * b.total / 100)) / b.total) * 100)}%` }}
              />
            )}
            {/* Grey for unseen - fills remaining space */}
            <div className="flex-1 bg-stone-100/60" />
          </div>
          
          {/* Content */}
          <div className="relative px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-900 truncate mb-1 text-sm" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>{b.label}</div>
                <div className="text-xs flex items-center gap-1" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                  <span className="font-medium text-stone-900">
                    {b.mastered}% mastery
                  </span>
                  <span className="text-stone-500">
                    • {showAttempted && b.attempted !== undefined 
                        ? `${b.attempted}/${b.total} ${b.total === 1 ? 'concept' : 'concepts'} attempted` 
                        : `${b.total} ${b.total === 1 ? 'concept' : 'concepts'}`}
                  </span>
                </div>
              </div>
              
              {/* Arrow button */}
              <button 
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 transition-all"
                onClick={() => {
                  if (onReview) {
                    onReview(b.bucket);
                  }
                }}
                aria-label={`Review ${b.label}`}
              >
                <svg className="w-4 h-4 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
