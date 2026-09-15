import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Square, Volume2, Loader2 } from 'lucide-react';

interface Props {
  input: HTMLInputElement;
  tutorRoot: HTMLElement;
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

function appendTranscript(input: HTMLInputElement, transcript: string) {
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

function browserRecognition(input: HTMLInputElement, onStart: () => void, onStop: () => void): boolean {
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Recognition) return false;
  const recognition = new Recognition();
  recognition.lang = 'en-GB';
  recognition.continuous = false;
  recognition.interimResults = true;
  const existing = input.value.trim();
  let finalText = '';
  recognition.onstart = onStart;
  recognition.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0]?.transcript || '';
      if (event.results[i].isFinal) finalText += transcript;
      else interim += transcript;
    }
    const heard = `${finalText}${interim}`.trim();
    if (heard) setReactInputValue(input, [existing, heard].filter(Boolean).join(' '));
  };
  recognition.onerror = onStop;
  recognition.onend = onStop;
  recognition.start();
  return true;
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

export function TutorVoiceControls({ input, tutorRoot }: Props) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopRecording = () => recorderRef.current?.stop();

  const startRecording = async () => {
    if (recording) return stopRecording();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      chunksRef.current = [];
      const preferred = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        setRecording(false);
        streamRef.current?.getTracks().forEach(track => track.stop());
        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const response = await fetch('/.netlify/functions/transcribe', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
          if (!response.ok) throw new Error('premium transcription unavailable');
          const data = await response.json();
          appendTranscript(input, String(data.text || ''));
        } catch {
          browserRecognition(input, () => setRecording(true), () => setRecording(false));
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start(250);
      setRecording(true);
    } catch {
      browserRecognition(input, () => setRecording(true), () => setRecording(false));
    }
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
  const micClass = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8A7560] transition active:scale-95 disabled:opacity-40';
  const listenClass = 'mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-[#8A7560] transition hover:text-[#1F140C] active:scale-95';

  return (
    <>
      <div className="flex shrink-0 items-center" aria-label="StudyEdit voice input">
        <button type="button" className={micClass} onClick={startRecording} disabled={transcribing} aria-label={recording ? 'Stop recording' : 'Speak to StudyEdit'} title={recording ? 'Stop recording' : 'Speak to StudyEdit'}>
          {transcribing ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : recording ? <Square className="h-[16px] w-[16px] fill-current" /> : <Mic className="h-[19px] w-[19px]" />}
        </button>
      </div>
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
