import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeedbackDictation } from '@/hooks/useFeedbackDictation';

class RecognitionMock {
  static latest: RecognitionMock;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() { RecognitionMock.latest = this; }
}

describe('feedback dictation', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('SpeechRecognition', RecognitionMock); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('turns speech into reviewable text only when dictation ends', async () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useFeedbackDictation(onTranscript));
    await act(() => result.current.start());
    act(() => RecognitionMock.latest.onresult?.({ results: [{ 0: { transcript: 'Helpful tutor' }, isFinal: true }] }));
    expect(onTranscript).not.toHaveBeenCalled();
    expect(result.current.preview).toBe('Helpful tutor');
    act(() => result.current.stop());
    expect(onTranscript).toHaveBeenCalledWith('Helpful tutor');
    act(() => vi.advanceTimersByTime(61_000));
    expect(result.current.error).toBe('');
    expect(result.current.status).toBe('idle');
  });

  it('discards cancelled speech and ignores late callbacks', async () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useFeedbackDictation(onTranscript));
    await act(() => result.current.start());
    const lateEnd = RecognitionMock.latest.onend;
    act(() => { RecognitionMock.latest.onresult?.({ results: [{ 0: { transcript: 'Do not send' } }] }); result.current.cancel(); });
    act(() => lateEnd?.());
    expect(onTranscript).not.toHaveBeenCalled();
    expect(RecognitionMock.latest.abort).toHaveBeenCalled();
    expect(result.current.preview).toBe('');
  });

  it('explains denied microphone access without blocking typed feedback', async () => {
    const { result } = renderHook(() => useFeedbackDictation(vi.fn()));
    await act(() => result.current.start());
    act(() => RecognitionMock.latest.onerror?.({ error: 'not-allowed' }));
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toMatch(/access was denied/);
  });

  it('offers a keyboard fallback when browser dictation is unsupported', async () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    const { result } = renderHook(() => useFeedbackDictation(vi.fn()));
    expect(result.current.supported).toBe(false);
    await act(() => result.current.start());
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toMatch(/keyboard’s microphone/);
  });

  it('stops listening on unmount', async () => {
    const { result, unmount } = renderHook(() => useFeedbackDictation(vi.fn()));
    await act(() => result.current.start());
    unmount();
    expect(RecognitionMock.latest.abort).toHaveBeenCalledOnce();
  });
});
