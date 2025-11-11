import React from 'react';

interface SimpleMasteryRingProps {
  correct: number;
  incorrect: number;
  unseen: number;
  size?: number;
}

export const SimpleMasteryRing: React.FC<SimpleMasteryRingProps> = ({
  correct,
  incorrect,
  unseen,
  size = 120
}) => {
  const total = Math.max(1, correct + incorrect + unseen);
  const attempted = correct + incorrect;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const masteryPercent = Math.round((correct / total) * 100);

  // Calculate circle properties
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Calculate stroke dash offsets for each segment
  const correctPercent = (correct / total) * 100;
  const incorrectPercent = (incorrect / total) * 100;

  return (
    <div className="flex flex-col items-center">
      {/* Circular Progress Ring */}
      <div className="relative mb-4" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-stone-100"
          />
          
          {/* Correct (green) arc - gentler color */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#86EFAC"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (correctPercent / 100) * circumference}
            className="transition-all duration-500"
            strokeLinecap="round"
          />
          
          {/* Incorrect (red) arc - gentler color */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#FCA5A5"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - ((correctPercent + incorrectPercent) / 100) * circumference}
            className="transition-all duration-500"
            strokeLinecap="round"
            style={{ 
              strokeDasharray: `${(incorrectPercent / 100) * circumference} ${circumference}`,
              strokeDashoffset: -(correctPercent / 100) * circumference
            }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-medium text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
            {masteryPercent}%
          </div>
          <div className="text-[10px] uppercase tracking-widest text-stone-400" style={{ fontFamily: "'Unbounded', sans-serif" }}>
            Mastered
          </div>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="text-center">
        <div className="text-xs text-stone-500 font-light mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {accuracy}% accuracy • {attempted}/{total} attempted
        </div>
        
        {/* Compact Legend */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#86EFAC' }} />
            <span className="text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {correct}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#FCA5A5' }} />
            <span className="text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {incorrect}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-stone-200" />
            <span className="text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {unseen}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
