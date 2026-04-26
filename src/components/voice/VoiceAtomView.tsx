import { useEffect, useRef, useState } from 'react';
import type { Atom } from '@/atom/types';
import { speak, listen, type SpeechSession } from '@/voice/speech';
import { matchSpokenAnswer, type MatchOutcome } from '@/voice/match';

type Phase = 'speaking' | 'listening' | 'matched' | 'no-match';

/**
 * Per-atom phase machine for voice mode.
 *
 *   speaking → listening → matched | no-match
 *
 * Use `key={atom.id}` from the parent so the component remounts (and
 * resets phase to 'speaking') when the next atom comes in. Same pattern
 * as Plan 2's `<AtomRenderer>` reset fix.
 */
export function VoiceAtomView({
  atom,
  onMatch,
}: {
  atom: Atom;
  onMatch: (outcome: MatchOutcome) => void;
}) {
  const [phase, setPhase] = useState<Phase>('speaking');
  const [transcript, setTranscript] = useState('');
  const sessionRef = useRef<SpeechSession | null>(null);

  // 1) Speak the stem once on mount.
  useEffect(() => {
    speak({
      text: atom.canonicalStem,
      onEnd: () => setPhase('listening'),
    });
    return () => {
      // Stop the recogniser if we unmount mid-listen.
      sessionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) When phase flips to 'listening', start STT.
  useEffect(() => {
    if (phase !== 'listening') return;
    sessionRef.current = listen({
      onResult: (t) => {
        setTranscript(t);
        const outcome = matchSpokenAnswer(t, atom);
        setPhase(outcome.kind === 'no-match' ? 'no-match' : 'matched');
        onMatch(outcome);
      },
      onError: () => {
        setPhase('no-match');
        onMatch({ kind: 'no-match' });
      },
    });
    return () => sessionRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="space-y-3">
      <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
        {atom.topicPath.join(' > ')}
      </div>
      {/* Read the actual stem (not the claim) so the user sees what was just spoken. */}
      <div className="text-base text-stone-900 dark:text-stone-100">{atom.canonicalStem}</div>
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-3 text-center text-sm">
        {phase === 'speaking' && <span className="text-stone-700 dark:text-stone-300">Speaking the question...</span>}
        {phase === 'listening' && <span className="text-emerald-700 dark:text-emerald-400">Listening...</span>}
        {phase === 'matched' && (
          <span className="text-stone-700 dark:text-stone-300">
            You said: <em>{transcript}</em>
          </span>
        )}
        {phase === 'no-match' && (
          <span className="text-amber-700 dark:text-amber-400">
            Didn't catch that{transcript ? <>: <em>{transcript}</em></> : null}
          </span>
        )}
      </div>
    </div>
  );
}
