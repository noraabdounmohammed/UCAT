import React, { useState } from 'react';
import type {
  StructuredComparisonObject,
  StructuredFollowUpSba,
  StructuredWhatChangedObject,
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

const WhatChangedCard: React.FC<{ object: StructuredWhatChangedObject }> = ({ object }) => (
  <div
    className="mt-4 rounded-[22px] border px-4 py-4 sm:px-5"
    style={{ borderColor: '#E5B9B1', backgroundColor: C.blushSoft }}
    data-studyedit-teaching-object="what_changed"
  >
    <div className="space-y-2.5">
      {object.changes.map((change, index) => (
        <div key={`${change.from}-${change.to}-${index}`} className="grid grid-cols-[minmax(0,1fr)_22px_minmax(0,1fr)] items-center gap-2">
          <div className="text-[15px] font-bold leading-[1.4]" style={{ color: '#6E4A43' }}>{change.from}</div>
          <div className="text-center text-[15px] font-bold" style={{ color: '#A46C61' }}>→</div>
          <div className="text-[15px] font-extrabold leading-[1.4]" style={{ color: C.espresso }}>{change.to}</div>
        </div>
      ))}
    </div>
    <div className="mt-4 border-t pt-3 text-[15px] font-semibold leading-[1.5]" style={{ borderColor: 'rgba(164,108,97,.22)', color: '#5C4039' }}>
      {object.takeaway}
    </div>
  </div>
);

export const FollowUpSbaCard: React.FC<FollowUpSbaCardProps> = ({ sba, disabled = false, onSubmit }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const locked = disabled || submitted;
  const selectedCorrect = submitted && selectedId === sba.correctAnswerId;
  const transferQuestion = sba.transferCase?.question || sba.stem;

  return (
    <>
      {sba.comparison && <ComparisonCard comparison={sba.comparison} />}

      <div
        className="mt-5 rounded-[22px] border px-4 py-4 shadow-[0_10px_28px_rgba(31,20,12,0.035)] sm:px-5 sm:py-5"
        style={{ borderColor: '#E2D6C3', backgroundColor: C.paper }}
        data-studyedit-structured-followup="true"
        data-studyedit-followup-qa="passed"
        data-studyedit-evidence-mode={sba.evidenceMode}
        data-studyedit-teaching-object={sba.transferCase ? 'transfer_case' : 'followup_sba'}
      >
        {sba.transferCase && (
          <div className="mb-5 text-[17px] font-medium leading-[1.62] tracking-[-0.01em]" style={{ color: '#3B2A1E' }}>
            {sba.transferCase.vignette}
          </div>
        )}

        <div className="text-[18px] font-bold leading-[1.55] tracking-[-0.01em] sm:text-[19px]" style={{ color: C.espresso }}>
          {transferQuestion}
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
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
                className="flex w-full items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left transition active:scale-[0.997] disabled:cursor-default sm:px-4"
                style={{
                  borderColor: correctAfterSubmit ? C.sage : wrongSelected ? C.blush : selected ? C.espresso : '#E7DCCB',
                  backgroundColor: correctAfterSubmit ? C.sageSoft : wrongSelected ? C.blushSoft : selected ? '#F4ECDF' : C.cream,
                  opacity: submitted && !correctAfterSubmit && !wrongSelected ? 0.62 : 1,
                }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold"
                  style={{
                    backgroundColor: selected && !submitted ? C.espresso : 'rgba(31,20,12,.065)',
                    color: selected && !submitted ? C.cream : C.espresso,
                  }}
                >
                  {option.id}
                </span>
                <span className="flex-1 text-[16px] font-semibold leading-[1.45]" style={{ color: C.espresso }}>
                  {option.text}
                </span>
                {correctAfterSubmit && <span className="font-extrabold" style={{ color: '#62734F' }}>✓</span>}
                {wrongSelected && <span className="font-extrabold" style={{ color: '#9B5146' }}>×</span>}
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
            className="mt-4 flex w-full items-center justify-center rounded-full px-5 py-3 text-[14px] font-extrabold disabled:cursor-not-allowed"
            style={{
              backgroundColor: selectedId && !disabled ? C.espresso : '#D9CCB6',
              color: selectedId && !disabled ? C.cream : C.muted,
            }}
          >
            Check answer
          </button>
        ) : (
          <div
            className="mt-4 text-[14px] font-bold"
            style={{ color: selectedCorrect ? '#62734F' : '#94483D' }}
            aria-live="polite"
          >
            {selectedCorrect ? '✓ Yes — you got that right.' : `Not quite — the answer was ${sba.correctAnswerId}.`}
          </div>
        )}
      </div>

      {submitted && sba.whatChanged && <WhatChangedCard object={sba.whatChanged} />}
    </>
  );
};
