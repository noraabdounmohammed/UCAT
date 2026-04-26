import { useState } from 'react';

const PRESET_REASONS = [
  'Wrong citation',
  'Distractors implausible',
  'Stem too vague',
  'Out of UKMLA syllabus',
];

export function RejectReasonModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold">Reject this question</h3>
        <div className="space-y-2">
          {PRESET_REASONS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`block w-full text-left px-3 py-2 rounded-lg border text-sm ${
                reason === r ? 'border-stone-900 bg-stone-50' : 'border-stone-300 hover:bg-stone-50'
              }`}
            >
              {r}
            </button>
          ))}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Or write your own reason…"
            className="w-full border border-stone-300 rounded-lg p-2 text-sm min-h-[80px]"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-stone-300 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-50 hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
