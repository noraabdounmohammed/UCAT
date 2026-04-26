/**
 * Thin wrappers over the Web Speech API for use by voice mode.
 *
 * - speak(): TTS the given text via window.speechSynthesis. Falls back to a
 *   no-op (with onEnd fired immediately) when the API is unavailable. Picks
 *   the best available system voice — modern OS bundles include "Premium",
 *   "Enhanced", and "Neural" tiers that sound far less robotic than the
 *   browser default.
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
  /** Playback rate, 0.1–10. Default 1. Slightly slower (0.95) often
      sounds more natural for medical content with long terms. */
  rate?: number;
  /** Pitch, 0–2. Default 1. */
  pitch?: number;
  onEnd?: () => void;
}

/* ------------------------------------------------------------------ */
/* Voice selection                                                     */
/* ------------------------------------------------------------------ */

/**
 * Names of high-quality voices we explicitly prefer, in order. Some
 * platforms ship these as separate voices (often with "Premium" or
 * "Enhanced" in the name); we just look for the substring.
 *
 * Targets are biased toward UK English to match the in-app default lang.
 */
const PREFERRED_VOICE_HINTS = [
  // macOS + iOS premium voices (en-GB)
  'Daniel (Premium)', 'Daniel (Enhanced)', 'Serena (Premium)',
  'Kate (Premium)', 'Oliver (Premium)',
  // macOS + iOS premium voices (en-US fallback)
  'Samantha (Premium)', 'Samantha (Enhanced)',
  'Ava (Premium)', 'Ava (Enhanced)',
  // Chrome / Google Cloud Wavenet (browser-installed)
  'Google UK English Female', 'Google UK English Male',
  'Google US English',
  // Microsoft Edge / Windows neural voices
  'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  'Microsoft Ryan Online (Natural) - English (United Kingdom)',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  // Plain names (last-resort, often the lower-quality variant)
  'Daniel', 'Serena', 'Kate', 'Oliver', 'Samantha', 'Ava',
];

/** Quality-signal substrings — we prefer any voice whose name includes them. */
const QUALITY_HINTS = ['Premium', 'Enhanced', 'Neural', 'Natural', 'Wavenet', 'Studio'];

/** Cached best voice per lang to avoid re-scanning on every utterance. */
const voiceCache: Map<string, SpeechSynthesisVoice | null> = new Map();

function chooseBestVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const langPrefix = lang.split('-')[0]?.toLowerCase() ?? 'en';

  // 1. Exact-name match against the preferred list
  for (const hint of PREFERRED_VOICE_HINTS) {
    const v = voices.find((vv) => vv.name === hint);
    if (v) return v;
  }

  // 2. Lang-matching voices that include a quality hint (Premium/Enhanced/Neural/...)
  const langMatches = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  const langExact = langMatches.filter((v) => v.lang.toLowerCase() === lang.toLowerCase());
  for (const candidate of [langExact, langMatches]) {
    const quality = candidate.find((v) => QUALITY_HINTS.some((h) => v.name.includes(h)));
    if (quality) return quality;
  }

  // 3. Lang-matching voice marked as default by the platform
  const def = langMatches.find((v) => v.default);
  if (def) return def;

  // 4. Any lang-matching voice (exact lang first, then language-prefix)
  if (langExact[0]) return langExact[0];
  if (langMatches[0]) return langMatches[0];

  // 5. Last resort — first available voice
  return voices[0] ?? null;
}

/**
 * Get the best voice for `lang`, populating it asynchronously if the
 * browser lazy-loads the voice list (Safari + some Chrome versions).
 *
 * Resolves to `null` if speechSynthesis is unavailable or no voices ever
 * load — callers should fall back to the default utterance voice.
 */
function getBestVoice(lang: string): Promise<SpeechSynthesisVoice | null> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve(null);
  const cached = voiceCache.get(lang);
  if (cached !== undefined) return Promise.resolve(cached);

  const synth = window.speechSynthesis;

  return new Promise((resolve) => {
    const finalise = (voices: SpeechSynthesisVoice[]) => {
      const best = chooseBestVoice(lang, voices);
      voiceCache.set(lang, best);
      resolve(best);
    };

    const initial = synth.getVoices();
    if (initial.length > 0) {
      finalise(initial);
      return;
    }

    // Safari + some Chromes load voices async — wait for the event, with a
    // short timeout so we don't block forever.
    const handler = () => {
      synth.removeEventListener('voiceschanged', handler);
      finalise(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', handler);
      finalise(synth.getVoices());
    }, 1000);
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function speak({ text, lang = 'en-GB', rate = 0.95, pitch = 1, onEnd }: SpeakOptions): void {
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

  const dispatch = (voice: SpeechSynthesisVoice | null) => {
    const utter = new Utter(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    if (voice) utter.voice = voice;
    if (onEnd) utter.onend = () => onEnd();
    window.speechSynthesis.speak(utter);
  };

  // Fast path when the voice list is already populated; otherwise wait
  // briefly for the async voiceschanged event before speaking.
  getBestVoice(lang).then(dispatch).catch(() => dispatch(null));
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

/* ------------------------------------------------------------------ */
/* Diagnostics                                                         */
/* ------------------------------------------------------------------ */

/**
 * Returns the human-readable name of the voice that would be used for a
 * given lang on this device. Useful for a "voice picker" UI later.
 */
export async function describeChosenVoice(lang = 'en-GB'): Promise<string | null> {
  const v = await getBestVoice(lang);
  return v ? `${v.name} (${v.lang})` : null;
}
