import React from 'react';

type RingsProps = {
  counts: { correct: number; incorrect: number; unseen: number; masteryPercent: number };
};

export function ActivityRings({ counts }: RingsProps) {
  const size = 180;
  const stroke = 14;
  const r = (offset: number) => (size / 2 - stroke / 2 - offset);
  const C = (radius: number) => 2 * Math.PI * radius;
  const mk = (val: number, total: number, radius: number) => {
    const pct = total ? Math.max(0, Math.min(1, val / total)) : 0;
    const c = C(radius);
    return { dash: `${pct * c} ${c}` };
  };
  const total = counts.correct + counts.incorrect + counts.unseen || 1;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[240px]">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        {/* base tracks */}
        {[0, 18, 36].map((off, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r(off)}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={stroke}
          />
        ))}
        {/* mastered */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r(0)}
          fill="none"
          stroke="#34C759"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={mk(counts.correct, total, r(0)).dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
        {/* incorrect */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r(18)}
          fill="none"
          stroke="#FF3B30"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={mk(counts.incorrect, total, r(18)).dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
        {/* unseen */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r(36)}
          fill="none"
          stroke="#9CA3AF"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={mk(counts.unseen, total, r(36)).dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-4xl font-semibold text-zinc-900 dark:text-white">
            {counts.masteryPercent}%
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Mastered</div>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-3 text-xs flex-wrap">
        <Pill color="#34C759" label="Correct" value={counts.correct} />
        <Pill color="#FF3B30" label="Incorrect" value={counts.incorrect} />
        <Pill color="#9CA3AF" label="Unseen" value={counts.unseen} />
      </div>
    </div>
  );
}

function Pill({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 px-2 py-1 backdrop-blur">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
      <span className="text-zinc-400">· {value}</span>
    </div>
  );
}
