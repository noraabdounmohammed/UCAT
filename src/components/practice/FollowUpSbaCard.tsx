import React, { useState } from 'react';
import type { StructuredFollowUpSba } from '@/services/structuredFollowUpSba';

const C = {
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  muted: '#8A7560',
  line: '#E8DCC4',
};

type FollowUpSbaCardProps = {
  sba: StructuredFollowUpSba;
  disabled?: boolean;
  onSubmit: (answerId: string) => void | Promise<void>;
};

export const FollowUpSbaCard: React.FC<FollowUpSbaCardProps> = ({ sba, disabled = false, onSubmit }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const locked = disabled || submitted;

  return (
    <div
      className="mt-5 rounded-[22px] border px-4 py-4 shadow-[0_10px_28px_rgba(31,20,12,0.035)] sm:px-5 sm:py-5"
      style={{ borderColor: '#E2D6C3', backgroundColor: C.paper }}
      data-studyedit-structured-followup="true"
      data-studyedit-followup-qa="passed"
    >
      <div className="text-[18px] font-bold leading-[1.55] tracking-[-0.01em] sm:text-[19px]" style={{ color: C.espresso }}>
        {sba.stem}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {sba.options.map(option => {
          const selected = selectedId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={locked}
              onClick={() => setSelectedId(option.id)}
              className="flex w-full items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left transition active:scale-[0.997] disabled:cursor-default sm:px-4"
              style={{
                borderColor: selected ? C.espresso : '#E7DCCB',
                backgroundColor: selected ? '#F4ECDF' : C.cream,
                opacity: locked && !selected ? 0.72 : 1,
              }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold"
                style={{
                  backgroundColor: selected ? C.espresso : 'rgba(31,20,12,.065)',
                  color: selected ? C.cream : C.espresso,
                }}
              >
                {option.id}
              </span>
              <span className="flex-1 text-[16px] font-semibold leading-[1.45]" style={{ color: C.espresso }}>
                {option.text}
              </span>
            </button>
          );
        })}
      </div>

      {!submitted && (
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
      )}
    </div>
  );
};
