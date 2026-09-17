import React from 'react';
import { House, SlidersHorizontal } from 'lucide-react';

type SessionOrientationProps = {
  currentIndex: number;
  plannedCount: number;
  answeredCount: number;
  scopeLabel: string;
  isTailored: boolean;
  onAdjust: () => void;
  onExit: () => void;
};

export function SessionOrientation({
  currentIndex,
  plannedCount,
  answeredCount,
  scopeLabel,
  isTailored,
  onAdjust,
  onExit,
}: SessionOrientationProps) {
  const current = Math.min(Math.max(1, currentIndex + 1), Math.max(1, plannedCount));
  const progress = Math.min(100, Math.max(0, (currentIndex / Math.max(1, plannedCount)) * 100));

  return (
    <div className="studyedit-session-spine" aria-label="Session progress">
      <div className="studyedit-session-spine-row">
        <button type="button" onClick={onExit} className="studyedit-session-icon" aria-label="Go to Home" title="Go to Home">
          <House className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span>Case {current} of {plannedCount}</span>
            <span>{answeredCount > 0 ? `${answeredCount} assessed` : 'UKMLA AKT'}</span>
          </div>
          <div className="studyedit-session-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
          <div className="studyedit-session-scope" title={scopeLabel}>
            <span className={`studyedit-session-scope-dot ${isTailored ? 'is-tailored' : ''}`} aria-hidden="true" />
            <span className="truncate">{scopeLabel}</span>
            <span className="studyedit-session-scope-note">Study Edit adapts within this focus</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdjust}
          className="studyedit-session-focus-button"
          aria-label={`Choose session focus. Current focus: ${scopeLabel}`}
          title="Choose session focus"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="studyedit-session-focus-long">Choose focus</span>
          <span className="studyedit-session-focus-short">Focus</span>
        </button>
      </div>
    </div>
  );
}
