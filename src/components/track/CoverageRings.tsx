
export function CoverageRings({
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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {buckets.map((b) => {
        const correctPercent = b.correct !== undefined && b.total > 0 ? (b.correct / b.total) : 0;
        const incorrectPercent = b.incorrect !== undefined && b.total > 0 ? (b.incorrect / b.total) : 0;
        
        return (
          <button
            key={b.bucket}
            onClick={() => onReview?.(b.bucket)}
            className="group relative flex flex-col items-center gap-3 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-md active:scale-[0.98] transition-all duration-200"
          >
            {/* Progress Ring */}
            <div className="relative">
              <MiniProgressRing
                correctPercent={correctPercent}
                incorrectPercent={incorrectPercent}
                masteredPercent={b.mastered / 100}
                showAttempted={showAttempted}
              />
              {/* Center percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  {b.mastered}%
                </span>
              </div>
            </div>

            {/* Label and stats */}
            <div className="text-center w-full">
              <div className="font-semibold text-zinc-900 dark:text-white text-[13px] mb-1 truncate">
                {b.label}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {showAttempted && b.attempted !== undefined 
                  ? `${b.attempted}/${b.total} ${b.total === 1 ? 'concept' : 'concepts'} attempted` 
                  : `${b.total} ${b.total === 1 ? 'concept' : 'concepts'}`}
              </div>
            </div>

            {/* Hover arrow indicator */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MiniProgressRing({ 
  correctPercent, 
  incorrectPercent, 
  masteredPercent,
  showAttempted 
}: { 
  correctPercent: number;
  incorrectPercent: number;
  masteredPercent: number;
  showAttempted: boolean;
}) {
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  if (showAttempted) {
    // Show three segments: correct (green), incorrect (red), unseen (gray)
    return (
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-200 dark:text-zinc-700"
        />
        
        {/* Correct (green) arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#34C759"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (correctPercent * circumference)}
          className="transition-all duration-500"
          strokeLinecap="round"
        />
        
        {/* Incorrect (red) arc */}
        {incorrectPercent > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#FF3B30"
            strokeWidth={strokeWidth}
            strokeDasharray={`${incorrectPercent * circumference} ${circumference}`}
            strokeDashoffset={-(correctPercent * circumference)}
            className="transition-all duration-500"
            strokeLinecap="round"
          />
        )}
      </svg>
    );
  } else {
    // Show single mastery percentage ring with color coding
    const color = masteredPercent >= 0.8 
      ? '#34C759' 
      : masteredPercent >= 0.5 
      ? '#FFD60A' 
      : '#FF3B30';
    
    return (
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-200 dark:text-zinc-700"
        />
        
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (masteredPercent * circumference)}
          className="transition-all duration-500"
          strokeLinecap="round"
        />
      </svg>
    );
  }
}
