import { useCallback, useEffect, useRef, useState } from 'react';

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useFeedbackDictation(onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'listening' | 'transcribing'>('idle');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const transcriptCallback = useRef(onTranscript);
  transcriptCallback.current = onTranscript;
  const generation = useRef(0);
  const recognition = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const speechWindow = window as SpeechWindow;
  const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

  const release = useCallback(() => {
    generation.current += 1;
    clearTimeout(timer.current);
    if (recognition.current) {
      recognition.current.onstart = null;
      recognition.current.onend = null;
      recognition.current.onresult = null;
      recognition.current.onerror = null;
      recognition.current.abort();
      recognition.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    release();
    setStatus('idle');
    setPreview('');
    setError('');
  }, [release]);

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    if (!recognition.current) return;
    setStatus('transcribing');
    // Some browsers never deliver onend after a speech-service failure.
    timer.current = setTimeout(() => {
      release();
      setStatus('idle');
      setError('Dictation timed out. Try again, type, or send a quick reaction.');
    }, 10_000);
    recognition.current.stop();
  }, [release]);

  const start = useCallback(async () => {
    release();
    const current = generation.current;
    setError('');
    setPreview('');
    setStatus('starting');
    const active = () => generation.current === current;
    const fail = (message: string) => {
      if (!active()) return;
      release();
      setStatus('idle');
      setPreview('');
      setError(message);
    };
    if (!SpeechRecognition) {
      fail('Use your keyboard’s microphone, type, or use the quick buttons. This browser does not offer dictation.');
      return;
    }
    try {
      const speech = new SpeechRecognition();
      recognition.current = speech;
      speech.lang = 'en-GB';
      speech.continuous = true;
      speech.interimResults = true;
      let words = '';
      speech.onstart = () => { if (active()) setStatus('listening'); };
      speech.onresult = event => {
        if (!active()) return;
        words = Array.from(event.results).map(result => result[0].transcript).join(' ');
        setPreview(words);
      };
      speech.onerror = event => fail(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access was denied. Allow it in your browser, type, or use the quick buttons.'
        : 'Dictation is unavailable right now. Try your keyboard’s microphone, type, or use the quick buttons.');
      speech.onend = () => {
        if (!active()) return;
        release();
        setStatus('idle');
        setPreview('');
        if (words.trim()) transcriptCallback.current(words.trim());
        else setError('No speech picked up. Try again, type, or send a quick reaction.');
      };
      timer.current = setTimeout(stop, 60_000);
      speech.start();
    } catch {
      fail('Couldn’t start dictation. Try your keyboard’s microphone, type, or use the quick buttons.');
    }
  }, [SpeechRecognition, release, stop]);

  useEffect(() => release, [release]);
  return { supported: Boolean(SpeechRecognition), status, error, preview, start, stop, cancel };
}
