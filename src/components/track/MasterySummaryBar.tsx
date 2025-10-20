"use client";
import * as React from "react";

type Counts = { correct: number; incorrect: number; unseen: number };
type Props = {
  counts: Counts;
  onSelect?: (key: "correct" | "incorrect" | "unseen") => void;
};

export default function MasterySummaryBar({ counts, onSelect }: Props) {
  const total = Math.max(1, counts.correct + counts.incorrect + counts.unseen);
  const attempted = counts.correct + counts.incorrect;
  const accuracy = attempted > 0 ? Math.round((counts.correct / attempted) * 100) : 0;

  return (
    <div className="relative rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-600 transition-all duration-200">
      {/* Background Progress Bar */}
      <div className="absolute inset-0 flex">
        {/* Green for correct */}
        <div 
          className="bg-green-100/50 dark:bg-green-900/20 transition-all duration-500"
          style={{ width: `${(counts.correct / total) * 100}%` }}
        />
        {/* Red for incorrect */}
        <div 
          className="bg-red-100/50 dark:bg-red-900/20 transition-all duration-500"
          style={{ width: `${(counts.incorrect / total) * 100}%` }}
        />
        {/* Grey for unseen */}
        <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-800/50" />
      </div>
      
      {/* Content */}
      <div className="relative px-3 py-2.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-zinc-900 dark:text-white text-[15px] mb-1">Overall Mastery</div>
            <div className="text-xs flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-white">
                {accuracy}% accuracy
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                • {attempted}/{total} concepts attempted
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({
  label,
  value,
  dot,
  onClick,
}: {
  label: string;
  value: string;
  dot: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 px-2 py-1 text-zinc-700 dark:text-zinc-300 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      aria-label={`Filter by ${label}`}
      type="button"
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: dot }} />
      <span>{label}</span>
      <span className="text-zinc-400">· {value}</span>
    </button>
  );
}
