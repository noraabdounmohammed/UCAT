import { useRef, useState } from 'react';
import type { Atom, ConfidenceValue, FsrsRatingValue } from '@/atom/types';
import { ConfidenceButtons } from './ConfidenceButtons';
import { FsrsRatingButtons } from './FsrsRatingButtons';

export interface AtomRated {
  rating: FsrsRatingValue;
  confidence: ConfidenceValue;
  responseMs: number;
}

export function AtomRenderer({ atom, onRated }: { atom: Atom; onRated: (r: AtomRated) => void }) {
  const startedAt = useRef(performance.now());
  const [confidence, setConfidence] = useState<ConfidenceValue | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-stone-900">{atom.canonicalStem}</h2>
      {atom.imageUrl && (
        <img src={atom.imageUrl} alt={atom.imageAlt ?? ''} className="rounded-lg max-h-64 mx-auto" />
      )}

      {confidence === null ? (
        <ConfidenceButtons onPick={setConfidence} />
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
            <div className="font-medium text-stone-900">{atom.answer}</div>
            <a
              href={atom.citationUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-stone-600 hover:underline mt-1 inline-block"
            >
              {atom.citationLabel}
            </a>
          </div>
          <FsrsRatingButtons
            onPick={(rating) =>
              onRated({
                rating,
                confidence,
                responseMs: Math.round(performance.now() - startedAt.current),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
