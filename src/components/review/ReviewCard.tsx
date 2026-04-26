import { useState } from 'react';
import type { Atom } from '@/atom/types';
import type { AtomPatch } from '@/atom/reviewRepository';
import { RejectReasonModal } from './RejectReasonModal';

export function ReviewCard({
  atom,
  onApprove,
  onReject,
  onUpdate,
}: {
  atom: Atom;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onUpdate: (patch: AtomPatch) => void;
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    claim: atom.claim,
    canonicalStem: atom.canonicalStem,
    answer: atom.answer,
    citationUrl: atom.citationUrl,
    citationLabel: atom.citationLabel,
  });

  if (editing) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md mx-auto space-y-3">
        <h3 className="text-sm font-medium text-stone-700">Edit question</h3>
        <label className="block text-sm">
          <span className="text-stone-700">Claim</span>
          <textarea
            value={draft.claim}
            onChange={(e) => setDraft({ ...draft, claim: e.target.value })}
            className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-700">Stem</span>
          <textarea
            value={draft.canonicalStem}
            onChange={(e) => setDraft({ ...draft, canonicalStem: e.target.value })}
            className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm min-h-[80px]"
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-700">Answer</span>
          <input
            type="text"
            value={draft.answer}
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            className="w-full border border-stone-300 rounded-lg p-2 mt-1 text-sm"
          />
        </label>
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onUpdate(draft)}
            className="px-3 py-1.5 text-sm rounded-lg bg-stone-900 text-white hover:bg-stone-800"
          >
            Save & approve
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md mx-auto space-y-4">
      <div className="text-xs text-stone-500 uppercase tracking-wide">
        {atom.topicPath.join(' › ')}
      </div>
      <p className="text-sm text-stone-700 italic">{atom.claim}</p>
      <h2 className="text-base font-medium text-stone-900">{atom.canonicalStem}</h2>
      <div className="bg-stone-50 rounded-lg p-3 border border-stone-200 space-y-1 text-sm">
        <div><span className="font-medium">Answer:</span> {atom.answer}</div>
        <div className="text-stone-600">
          <span className="font-medium">Distractors:</span>{' '}
          {atom.distractors.map((d, i) => (
            <span key={d}>
              {i > 0 ? ' · ' : ''}
              <span>{d}</span>
            </span>
          ))}
        </div>
      </div>
      <a
        href={atom.citationUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-xs text-stone-600 hover:underline"
      >
        {atom.citationLabel}
      </a>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onApprove}
          className="flex-1 px-3 py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-800 text-sm font-medium"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-sm font-medium"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setShowRejectModal(true)}
          className="flex-1 px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium"
        >
          Reject
        </button>
      </div>
      {showRejectModal && (
        <RejectReasonModal
          onCancel={() => setShowRejectModal(false)}
          onConfirm={(reason) => {
            setShowRejectModal(false);
            onReject(reason);
          }}
        />
      )}
    </div>
  );
}
