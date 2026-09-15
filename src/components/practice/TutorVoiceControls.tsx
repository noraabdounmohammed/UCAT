import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Square, Volume2, X } from 'lucide-react';

interface Props {
  input: HTMLInputElement | HTMLTextAreaElement;
  tutorRoot: HTMLElement;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function setReactInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

function appendTranscript(input: HTMLInputElement | HTMLTextAreaElement, transcript: string) {
  const text = transcript.trim();
  if (!text) return;
  const existing = input.value.trim();
  setReactInputValue(input, [existing, text].filter(Boolean).join(existing ? ' ' : ''));
}

function latestTutorBlock(root: HTMLElement): HTMLElement | null {
  const section = root.querySelector('section[aria-label="Answer and tutor"]');
  const conversation = section?.querySelector('.space-y-6');
  if (!conversation) return null;
  const blocks = Array.from(conversation.children) as HTMLElement[];
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const text = (blocks[i].innerText || '').trim();
    if (!text || text === 'StudyEdit is thinking' || /^You\b/i.test(text)) continue;
    return blocks[i];
  }
  return null;
}

function latestTutorText(root: HTMLElement): string {
  const block = latestTutorBlock(root);
  const text = (block?.innerText || '').trim();
  return text.replace(/^QUICK CHECK\s*/i, 'Quick check. ');
}

function browserSpeak(text: string, onEnd: () => void) {
  if (!('speechSynthesis' in window)) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /en-GB/i.test(v.lang) && /natural|premium|enhanced|google|samantha|serena/i.test(v.name)) || voices.find(v => /en-GB/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
  if (preferred) utterance.voice = preferred;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

const Waveform = () => (
  <div className="flex h-9 min-w-0 flex-1 items-center justify-center gap-[3px] overflow-hidden px-2" aria-hidden="true">
    {Array.from({ length: 30 }, (_, index) => (
      <span
        key={index}
        className="studyedit-voice-wave block w-[3px] shrink-0 rounded-full bg-[#8A7560]"
        style={{ animationDelay: `${(index % 10) * -75}ms`, height: `${8 + ((index * 7) % 22)}px` }}
      />
    ))}
  </div>
);

export function TutorVoiceControls({ input, tutorRoot }: Props) {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);
  const initialTextRef = useRef('');

  const form = input.closest('form');

  useEffect(() => {
    if (!form) return;
    form.dataset.studyeditDictating = recording ? 'true' : 'false';
    return () => { delete form.dataset.studyeditDictating; };
  }, [form, recording]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioRef.current?.pause();
  }, []);

  const finish = () => {
    recognitionRef.current = null;
    setRecording(false);
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    recognitionRef.current?.abort();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setReactInputValue(input, initialTextRef.current);
    finish();
  };

  const stopRecording = () => {
    cancelledRef.current = false;
    if (recognitionRef.current) recognitionRef.current.stop();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const startPremiumRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      chunksRef.current = [];
      const preferred = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (cancelledRef.current) return finish();
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const response = await fetch('/.netlify/functions/transcribe', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
          if (!response.ok) throw new Error('transcription unavailable');
          const data = await response.json();
          appendTranscript(input, String(data.text || ''));
        } finally {
          finish();
        }
      };
      recorder.start(250);
      setRecording(true);
    } catch {
      finish();
    }
  };

  const startRecording = () => {
    if (recording) return stopRecording();
    cancelledRef.current = false;
    initialTextRef.current = input.value;

    // On Chrome/Android this is the important path: start live recognition on the
    // very first tap. Do not record/upload first and only then fall back, which
    // previously forced the learner to speak a second time.
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (Recognition) {
      const recognition: SpeechRecognitionLike = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-GB';
      recognition.continuous = false;
      recognition.interimResults = true;
      let finalText = '';
      const prefix = input.value.trim();
      recognition.onstart = () => setRecording(true);
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) finalText += transcript;
          else interim += transcript;
        }
        const heard = `${finalText}${interim}`.trim();
        if (heard) setReactInputValue(input, [prefix, heard].filter(Boolean).join(' '));
      };
      recognition.onerror = finish;
      recognition.onend = finish;
      try {
        // Switch the UI immediately; recognition.onstart can lag behind Android's
        // permission/audio setup and made the old control feel like it needed two taps.
        setRecording(true);
        recognition.start();
      } catch {
        finish();
      }
      return;
    }

    void startPremiumRecorder();
  };

  const playTutor = async () => {
    if (playing) {
      audioRef.current?.pause();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      audioRef.current = null;
      setPlaying(false);
      return;
    }
    const text = latestTutorText(tutorRoot);
    if (!text) return;
    setPlaying(true);
    try {
      const response = await fetch('/.netlify/functions/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: 'marin' }) });
      if (!response.ok) throw new Error('premium speech unavailable');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setPlaying(false); };
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; browserSpeak(text, () => setPlaying(false)); };
      await audio.play();
    } catch {
      browserSpeak(text, () => setPlaying(false));
    }
  };

  const listenTarget = latestTutorBlock(tutorRoot);
  const micClass = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8A7560] transition active:scale-95';
  const listenClass = 'mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-[#8A7560] transition hover:text-[#1F140C] active:scale-95';

  return (
    <>
      {recording ? (
        <div className="studyedit-dictation-bar absolute inset-0 z-10 flex items-center rounded-[18px] bg-[#FFFDF8] px-2" aria-label="Listening">
          <button type="button" onClick={cancelRecording} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1F140C] active:scale-95" aria-label="Cancel dictation">
            <X className="h-6 w-6" />
          </button>
          <Waveform />
          <button type="button" onClick={stopRecording} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8E5DF] text-[#1F140C] active:scale-95" aria-label="Stop dictation">
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center" aria-label="StudyEdit voice input">
          <button type="button" className={micClass} onClick={startRecording} aria-label="Dictate to StudyEdit" title="Dictate to StudyEdit">
            <Mic className="h-[19px] w-[19px]" />
          </button>
        </div>
      )}
      {listenTarget && createPortal(
        <div className="flex justify-end" data-studyedit-listen-control="true">
          <button type="button" className={listenClass} onClick={playTutor} aria-label={playing ? 'Stop audio' : 'Listen to this StudyEdit response'} title={playing ? 'Stop audio' : 'Listen to this response'}>
            {playing ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span>{playing ? 'Stop' : 'Listen'}</span>
          </button>
        </div>,
        listenTarget,
      )}
    </>
  );
}
