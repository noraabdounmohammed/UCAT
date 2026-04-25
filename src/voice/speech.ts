/**
 * Thin wrappers over the Web Speech API for use by voice mode.
 *
 * - speak(): TTS the given text via window.speechSynthesis. Falls back to a
 *   no-op (with onEnd fired immediately) when the API is unavailable.
 * - listen(): one-shot STT via window.SpeechRecognition (or webkit prefix).
 *   Returns a SpeechSession with a stop() method. Fires onError if the API
 *   isn't present, so the caller can decide what to do.
 * - isVoiceAvailable(): cheap detector for the unsupported-browser fallback.
 */

export function isVoiceAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTTS = !!window.speechSynthesis;
  const hasSTT = !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
  return hasTTS && hasSTT;
}

export interface SpeakOptions {
  text: string;
  /** BCP 47 language tag. Default 'en-GB'. */
  lang?: string;
  /** Playback rate, 0.1–10. Default 1. */
  rate?: number;
  onEnd?: () => void;
}

export function speak({ text, lang = 'en-GB', rate = 1, onEnd }: SpeakOptions): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  // Prefer the window-scoped constructor (testable via Object.defineProperty)
  // and fall back to the global one when running in a real browser.
  const Utter =
    (window as any).SpeechSynthesisUtterance ??
    (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
  if (!Utter) {
    onEnd?.();
    return;
  }
  const utter = new Utter(text);
  utter.lang = lang;
  utter.rate = rate;
  if (onEnd) utter.onend = () => onEnd();
  window.speechSynthesis.speak(utter);
}

export interface ListenOptions {
  /** BCP 47 language tag. Default 'en-GB'. */
  lang?: string;
  onResult: (transcript: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}

export interface SpeechSession {
  stop: () => void;
}

export function listen({ lang = 'en-GB', onResult, onError, onEnd }: ListenOptions): SpeechSession {
  const Ctor =
    (typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
    null;
  if (!Ctor) {
    onError?.('SpeechRecognition unavailable');
    return { stop: () => {} };
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  rec.onresult = (event: any) => {
    const transcript = event?.results?.[0]?.[0]?.transcript ?? '';
    onResult(transcript);
  };
  rec.onerror = (event: any) => onError?.(event?.error ?? 'unknown');
  rec.onend = () => onEnd?.();

  rec.start();
  return {
    stop: () => {
      try { rec.stop(); } catch { /* swallow — already stopped */ }
    },
  };
}
