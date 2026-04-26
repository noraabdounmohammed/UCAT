import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isVoiceAvailable, speak, listen } from '@/voice/speech';

// jsdom already has a window object; override individual properties so we can
// toggle availability without losing the rest of the DOM.
function setSynth(value: any) {
  Object.defineProperty(window, 'speechSynthesis', { value, configurable: true });
}
function setUtterCtor(value: any) {
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value, configurable: true });
}
function setRecCtor(value: any) {
  (window as any).SpeechRecognition = value;
  (window as any).webkitSpeechRecognition = undefined;
}

beforeEach(() => {
  setSynth(undefined);
  setUtterCtor(undefined);
  setRecCtor(undefined);
  // Stub fetch so the server-side TTS path resolves to "not configured" (503)
  // immediately, and speak() falls back to the system path under test.
  (window as any).fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 503,
    arrayBuffer: async () => new ArrayBuffer(0),
  });
});

afterEach(() => {
  setSynth(undefined);
  setUtterCtor(undefined);
  setRecCtor(undefined);
  delete (window as any).fetch;
});

describe('isVoiceAvailable', () => {
  it('returns false when SpeechSynthesis unavailable', () => {
    setRecCtor(function () {});
    expect(isVoiceAvailable()).toBe(false);
  });

  it('returns false when SpeechRecognition unavailable', () => {
    setSynth({ speak: () => {} });
    expect(isVoiceAvailable()).toBe(false);
  });

  it('returns true when both TTS and STT exist', () => {
    setSynth({ speak: () => {} });
    setRecCtor(function () {});
    expect(isVoiceAvailable()).toBe(true);
  });
});

describe('speak', () => {
  it('calls window.speechSynthesis.speak with the utterance', async () => {
    const speakFn = vi.fn();
    const fakeVoice = { name: 'Daniel (Premium)', lang: 'en-GB', default: false } as any;
    setSynth({ speak: speakFn, getVoices: () => [fakeVoice], addEventListener: () => {}, removeEventListener: () => {} });
    setUtterCtor(function (this: any, t: string) { this.text = t; });
    speak({ text: 'hello' });
    // speak() is fully async — flush several microtasks for both the
    // server-TTS attempt + the system-voice fallback.
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(speakFn).toHaveBeenCalledTimes(1);
    expect(speakFn.mock.calls[0][0].text).toBe('hello');
  });

  it('calls onEnd when no speechSynthesis (after server-TTS falls back)', async () => {
    const onEnd = vi.fn();
    speak({ text: 'x', onEnd });
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});

describe('listen', () => {
  it('starts a recognition session and reports a result', () => {
    let recInstance: any;
    function FakeRec(this: any) {
      recInstance = this;
      this.start = vi.fn();
      this.stop = vi.fn();
    }
    setRecCtor(FakeRec as any);
    const onResult = vi.fn();
    listen({ onResult });
    expect(recInstance.start).toHaveBeenCalledTimes(1);
    // simulate a result event
    recInstance.onresult({ results: [[{ transcript: 'beta blocker' }]] });
    expect(onResult).toHaveBeenCalledWith('beta blocker');
  });

  it('calls onError when SpeechRecognition unavailable', () => {
    const onError = vi.fn();
    listen({ onResult: vi.fn(), onError });
    expect(onError).toHaveBeenCalledWith('SpeechRecognition unavailable');
  });

  it('returned session.stop() invokes recogniser.stop()', () => {
    let recInstance: any;
    function FakeRec(this: any) {
      recInstance = this;
      this.start = vi.fn();
      this.stop = vi.fn();
    }
    setRecCtor(FakeRec as any);
    const session = listen({ onResult: vi.fn() });
    session.stop();
    expect(recInstance.stop).toHaveBeenCalledTimes(1);
  });
});
