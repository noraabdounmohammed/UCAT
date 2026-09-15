import React, { useRef, useState } from 'react';
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

function latestTutorText(root: HTMLElement): string {
  const section = root.querySelector('section[aria-label="Answer and tutor"]');
  const conversation = section?.querySelector('.space-y-6');
  if (!conversation) return '';
  const blocks = Array.from(conversation.children) as HTMLElement[];
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i];
    const text = (block.innerText || '').trim();
    if (!text || text === 'StudyEdit is thinking') continue;
    if (/^You\b/i.test(text)) continue;
    return text.replace(/^QUICK CHECK\s*/i, 'Quick check. ');
  }
  return '';
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
          if (!response.ok) throw new Error('transcription unavailable');
          const data = await response.json();
          const text = String(data.text || '').trim();
          if (text) setReactInputValue(input, [input.value.trim(), text].filter(Boolean).join(input.value.trim() ? ' ' : ''));
        } catch (error) {
          console.error('StudyEdit voice input failed:', error);
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start(250);
      setRecording(true);
    } catch (error) {
      console.error('Microphone unavailable:', error);
    }
  };

  const playTutor = async () => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }
    const text = latestTutorText(tutorRoot);
    if (!text) return;
    setPlaying(true);
    try {
      const response = await fetch('/.netlify/functions/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'marin' }),
      });
      if (!response.ok) throw new Error('speech unavailable');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setPlaying(false); };
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; setPlaying(false); };
      await audio.play();
    } catch (error) {
      console.error('StudyEdit speech playback failed:', error);
      setPlaying(false);
    }
  };

  const buttonClass = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8A7560] transition active:scale-95 disabled:opacity-40';

  return (
    <div className="flex shrink-0 items-center gap-0.5" aria-label="StudyEdit voice controls">
      <button type="button" className={buttonClass} onClick={startRecording} disabled={transcribing} aria-label={recording ? 'Stop recording' : 'Speak to StudyEdit'} title={recording ? 'Stop recording' : 'Speak to StudyEdit'}>
        {transcribing ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : recording ? <Square className="h-[16px] w-[16px] fill-current" /> : <Mic className="h-[19px] w-[19px]" />}
      </button>
      <button type="button" className={buttonClass} onClick={playTutor} aria-label={playing ? 'Stop audio' : 'Listen to StudyEdit'} title={playing ? 'Stop audio' : 'Listen to StudyEdit'}>
        {playing ? <Square className="h-[16px] w-[16px] fill-current" /> : <Volume2 className="h-[19px] w-[19px]" />}
      </button>
    </div>
  );
}
