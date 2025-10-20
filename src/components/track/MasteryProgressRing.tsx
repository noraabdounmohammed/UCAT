"use client";

type Counts = { correct: number; incorrect: number; unseen: number };
type Props = {
  counts: Counts;
  onSelect?: (key: "correct" | "incorrect" | "unseen") => void;
};

export default function MasteryProgressRing({ counts, onSelect }: Props) {
  const total = Math.max(1, counts.correct + counts.incorrect + counts.unseen);
  const attempted = counts.correct + counts.incorrect;
  const accuracy = attempted > 0 ? Math.round((counts.correct / attempted) * 100) : 0;
  const masteryPercent = Math.round((counts.correct / total) * 100);

  // Calculate circle properties
  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Calculate stroke dash offsets for each segment
  const correctPercent = (counts.correct / total) * 100;
  const incorrectPercent = (counts.incorrect / total) * 100;

  return (
    <div className="relative">
      <div className="flex flex-col items-center gap-6">
        {/* Circular Progress Ring */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-zinc-100 dark:text-zinc-800"
            />
            
            {/* Correct (green) arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (correctPercent / 100) * circumference}
              className="text-green-500 dark:text-green-400 transition-all duration-500"
              strokeLinecap="round"
            />
            
            {/* Incorrect (red) arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - ((correctPercent + incorrectPercent) / 100) * circumference}
              className="text-red-500 dark:text-red-400 transition-all duration-500"
              strokeLinecap="round"
              style={{ 
                strokeDasharray: `${(incorrectPercent / 100) * circumference} ${circumference}`,
                strokeDashoffset: -(correctPercent / 100) * circumference
              }}
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-zinc-900 dark:text-white">
              {masteryPercent}%
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Mastered
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full space-y-3">
          <div className="text-center">
            <div className="font-semibold text-zinc-900 dark:text-white text-[15px] mb-2">
              Overall Mastery
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {accuracy}% accuracy • {attempted}/{total} concepts attempted
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onSelect?.('correct')}
              className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
            >
              <span className="inline-block h-3 w-3 rounded-full bg-green-500 dark:bg-green-400" />
              <span className="text-zinc-700 dark:text-zinc-300">
                Correct <span className="font-semibold">{counts.correct}</span>
              </span>
            </button>
            
            <button
              onClick={() => onSelect?.('incorrect')}
              className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
            >
              <span className="inline-block h-3 w-3 rounded-full bg-red-500 dark:bg-red-400" />
              <span className="text-zinc-700 dark:text-zinc-300">
                Incorrect <span className="font-semibold">{counts.incorrect}</span>
              </span>
            </button>
            
            <button
              onClick={() => onSelect?.('unseen')}
              className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity"
            >
              <span className="inline-block h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              <span className="text-zinc-700 dark:text-zinc-300">
                Unseen <span className="font-semibold">{counts.unseen}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
