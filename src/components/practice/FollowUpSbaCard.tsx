import React, { useState } from 'react';
import type {
  StructuredComparisonObject,
  StructuredFollowUpSba,
} from '@/services/structuredFollowUpSba';

const C = {
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  muted: '#8A7560',
  line: '#E8DCC4',
  blush: '#E5A89D',
  blushSoft: '#F9E4DF',
  sage: '#8FA379',
  sageSoft: '#EEF0E2',
};

type FollowUpSbaCardProps = {
  sba: StructuredFollowUpSba;
  disabled?: boolean;
  onSubmit: (answerId: string) => void | Promise<void>;
};

const ComparisonCard: React.FC<{ comparison: StructuredComparisonObject }> = ({ comparison }) => (
  <div
    className="mt-5 rounded-[22px] border px-4 py-4 sm:px-5 sm:py-5"
    style={{ borderColor: '#E2D6C3', backgroundColor: C.paper }}
    data-studyedit-teaching-object="comparison"
  >
    <div className="grid grid-cols-2 gap-4 border-b pb-3" style={{ borderColor: C.line }}>
      <div className="text-[15px] font-extrabold leading-[1.35]" style={{ color: C.espresso }}>{comparison.leftTitle}</div>
      <div className="text-[15px] font-extrabold leading-[1.35]" style={{ color: C.espresso }}>{comparison.rightTitle}</div>
    </div>

    <div>
      {comparison.rows.map((row, index) => (
        <div key={`${row.feature}-${index}`} className="border-b py-3 last:border-b-0" style={{ borderColor: 'rgba(232,220,196,.75)' }}>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: C.muted }}>{row.feature}</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-[15px] font-semibold leading-[1.45]" style={{ color: '#49372A' }}>{row.left}</div>
            <div className="text-[15px] font-semibold leading-[1.45]" style={{ color: '#49372A' }}>{row.right}</div>
          </div>
        </div>
      ))}
    </div>

    {comparison.takeaway && (
      <div className="mt-3 text-[14px] font-semibold leading-[1.5]" style={{ color: '#59483B' }}>
        {comparison.takeaway}
      </div>
    )}
  </div>
);

export const FollowUpSbaCard: React.FC<FollowUpSbaCardProps> = ({ sba, disabled = false, onSubmit }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const locked = disabled || submitted;
  const selectedCorrect = submitted && selectedId === sba.correctAnswerId;
  const questionText = sba.transferCase?.question || sba.stem;

  return (
    <div data-studyedit-followup-shell="true">
      {sba.comparison && <ComparisonCard comparison={sba.comparison} />}

      <div
        className="mt-6"
        data-studyedit-structured-followup="true"
        data-studyedit-followup-qa="passed"
        data-studyedit-evidence-mode={sba.evidenceMode}
        data-studyedit-teaching-object={sba.transferCase ? 'transfer_case' : 'followup_sba'}
      >
        {sba.transferCase && (
          <div className="text-[20px] font-medium leading-[1.65] tracking-[-0.01em] sm:text-[21px]" style={{ color: C.espresso }}>
            {sba.transferCase.vignette}
          </div>
        )}

        <div
          className={`${sba.transferCase ? 'mt-8 border-t pt-6' : ''} text-[20px] font-bold leading-[1.55] tracking-[-0.01em] sm:text-[21px]`}
          style={{ borderColor: C.line, color: C.espresso }}
        >
          {questionText}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {sba.options.map(option => {
            const selected = selectedId === option.id;
            const correctAfterSubmit = submitted && option.id === sba.correctAnswerId;
            const wrongSelected = submitted && selected && option.id !== sba.correctAnswerId;

            return (
              <button
                key={option.id}
                type="button"
                disabled={locked}
                onClick={() => setSelectedId(option.id)}
                className="flex w-full items-center gap-4 rounded-[17px] border px-4 py-4 text-left transition active:scale-[0.997] disabled:cursor-default sm:px-5 sm:py-[18px]"
                style={{
                  backgroundColor: correctAfterSubmit ? C.sageSoft : wrongSelected ? C.blushSoft : selected && !submitted ? C.cream : C.paper,
                  borderColor: correctAfterSubmit ? C.sage : wrongSelected ? C.blush : selected && !submitted ? C.espresso : C.line,
                  opacity: submitted && !correctAfterSubmit && !wrongSelected ? 0.52 : 1,
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
                  style={{
                    backgroundColor: selected && !submitted ? C.espresso : 'rgba(31,20,12,.06)',
                    color: selected && !submitted ? C.cream : C.espresso,
                  }}
                >
                  {option.id}
                </span>
                <span className="flex-1 text-[17px] font-semibold leading-[1.45] sm:text-[18px]" style={{ color: C.espresso }}>
                  {option.text}
                </span>
                {correctAfterSubmit && <span className="font-bold" style={{ color: '#62734F' }}>✓</span>}
                {wrongSelected && <span className="font-bold" style={{ color: '#9B5146' }}>×</span>}
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <button
            type="button"
            disabled={!selectedId || disabled}
            onClick={() => {
              if (!selectedId || disabled) return;
              setSubmitted(true);
              void onSubmit(selectedId);
            }}
            className="mt-6 flex w-full items-center justify-center rounded-full px-6 py-[18px] text-[16px] font-bold disabled:cursor-not-allowed"
            style={{
              backgroundColor: selectedId && !disabled ? C.espresso : '#D9CCB6',
              color: selectedId && !disabled ? C.cream : C.muted,
            }}
          >
            Check answer
          </button>
        ) : (
          <div
            className="mt-5 text-[14px] font-bold"
            style={{ color: selectedCorrect ? '#62734F' : '#94483D' }}
            aria-live="polite"
          >
            {selectedCorrect ? '✓ Yes — you got that right.' : `Not quite — the answer was ${sba.correctAnswerId}.`}
          </div>
        )}
      </div>

      {/* whatChanged remains available in structured QA metadata but is intentionally not shown to learners. */}
    </div>
  );
};
