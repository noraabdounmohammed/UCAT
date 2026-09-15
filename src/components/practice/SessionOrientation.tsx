import React, { useMemo } from 'react';

type SessionOrientationProps = {
  questions: any[];
  concepts: any[];
  plannedCount: number;
};

export function SessionOrientation({ questions, concepts, plannedCount }: SessionOrientationProps) {
  const { current, assessed, secure } = useMemo(() => {
    const submitted = questions.filter(question => {
      try {
        const saved = sessionStorage.getItem(`sba_answer_${question.id}`);
        return Boolean(saved && JSON.parse(saved)?.hasSubmitted);
      } catch { return false; }
    }).length;

    const assessedConcepts = concepts.filter(concept => Number(concept?.mastery_data?.attempts || 0) > 0);
    const secureConcepts = assessedConcepts.filter(concept => Number(concept?.mastery_data?.mastery_level || 0) >= 2);
    return {
      current: Math.min(Math.max(1, submitted + 1), Math.max(1, plannedCount)),
      assessed: assessedConcepts.length,
      secure: secureConcepts.length,
    };
  }, [questions, concepts, plannedCount]);

  const progress = Math.min(100, Math.max(0, ((current - 1) / Math.max(1, plannedCount)) * 100));

  return (
    <div className="studyedit-session-spine" aria-label="Session progress">
      <div className="studyedit-session-spine-row">
        <span>Session {current} of {plannedCount}</span>
        <span>{assessed > 0 ? `UKMLA · ${assessed} assessed · ${secure} secure` : 'UKMLA · building your map'}</span>
      </div>
      <div className="studyedit-session-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    </div>
  );
}
