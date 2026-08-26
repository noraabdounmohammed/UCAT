import { useMemo, useRef, useState } from 'react';
import type { FilterState } from '@/components/practice/PracticeFilterModalParchment';
import type { ConceptNode } from '@/types/conceptTypes';

interface StoryPracticeSessionProps {
  filters: FilterState;
  concepts: ConceptNode[];
  onComplete: () => void;
  onRestartWithFilters: () => void;
}

type Act = 'arrival' | 'investigation' | 'diagnosis' | 'management' | 'complication' | 'followup';

type StoryBeat = {
  concept: ConceptNode;
  act: Act;
  time: string;
  speaker: string;
  line: string;
  prompt: string;
  memoryHook: string;
};

const ACT_ORDER: Act[] = ['arrival', 'investigation', 'diagnosis', 'management', 'complication', 'followup'];
const ACT_LABEL: Record<Act, string> = {
  arrival: 'The patient arrives',
  investigation: 'Evidence arrives',
  diagnosis: 'The picture sharpens',
  management: 'The clock starts',
  complication: 'The situation changes',
  followup: 'After the emergency',
};

function actFor(concept: ConceptNode): Act {
  const text = `${concept.title} ${concept.content}`.toLowerCase();
  if (/secondary prevention|follow.?up|rehab|discharge|long.?term|risk factor|lifestyle/.test(text)) return 'followup';
  if (/complication|shock|arrhythm|rupture|failure|deterior|adverse/.test(text)) return 'complication';
  if (/treat|management|therapy|aspirin|antiplatelet|anticoag|pci|fibrinol|reperf|drug|medicat|dose/.test(text)) return 'management';
  if (/diagnos|stemi|nstemi|unstable angina|classification|criteria/.test(text)) return 'diagnosis';
  if (/ecg|troponin|investig|test|imaging|angiograph|blood/.test(text)) return 'investigation';
  return 'arrival';
}

const timeFor = (act: Act, offset: number) => {
  const base: Record<Act, string> = { arrival: '07:42', investigation: '07:49', diagnosis: '07:53', management: '08:02', complication: '08:18', followup: 'Three days later' };
  if (act === 'followup' || offset === 0) return base[act];
  return `${base[act]} +${offset * 2}m`;
};

function narrativeFor(act: Act, i: number) {
  const variants: Record<Act, Array<[string, string]>> = {
    arrival: [
      ['James', '“I know this sounds dramatic, doctor. I just need to get to my daughter’s graduation.”'],
      ['Maya, his wife', '“He went grey in the car. He never looks like that.”'],
      ['Nurse Ellie', '“Can you come back to bed six? There’s another detail I don’t want us to miss.”'],
    ],
    investigation: [
      ['Nurse Ellie', 'The printer wakes up beside you. “Result’s here.”'],
      ['Registrar', '“Before you look at the result, tell me what you expect it to change.”'],
      ['James', '“Is this the test that tells you if I can leave?”'],
    ],
    diagnosis: [
      ['Registrar', '“You have the history and the first results. Name the problem you are actually treating.”'],
      ['Nurse Ellie', '“So — has this crossed the line from possible to time-critical?”'],
      ['James', '“You keep using that word. What does it mean for me?”'],
    ],
    management: [
      ['Registrar', 'Your registrar is pulled into resus. “You own the next step. Don’t just list treatments — tell me why now.”'],
      ['Nurse Ellie', '“What do you want me to give, arrange or monitor next?”'],
      ['James', 'He looks at the clock again. “How much time do we really have?”'],
    ],
    complication: [
      ['Monitor', 'BEEP — BEEP — BEEP. The room changes before anyone says a word.'],
      ['Nurse Ellie', '“He looks different. What are you worried has happened?”'],
      ['Maya, his wife', '“Why has everyone suddenly started moving faster?”'],
    ],
    followup: [
      ['James', 'His daughter puts a graduation photo on the bedside table. “What stops this happening again?”'],
      ['Pharmacist', '“He’s going home with a lot of new information. What absolutely has to make sense before he leaves?”'],
      ['James', '“I feel fine now. Which parts still matter when I’m back home?”'],
    ],
  };
  return variants[act][i % variants[act].length];
}

function buildBeats(concepts: ConceptNode[]): StoryBeat[] {
  const ordered = [...concepts].sort((a, b) => {
    const actDelta = ACT_ORDER.indexOf(actFor(a)) - ACT_ORDER.indexOf(actFor(b));
    if (actDelta) return actDelta;
    const aSafety = Number(Boolean(a.safety_critical || a.importance?.safety_critical));
    const bSafety = Number(Boolean(b.safety_critical || b.importance?.safety_critical));
    if (aSafety !== bSafety) return bSafety - aSafety;
    return (a.prerequisites?.length || 0) - (b.prerequisites?.length || 0);
  });

  const actCounts: Partial<Record<Act, number>> = {};
  return ordered.map(concept => {
    const act = actFor(concept);
    const offset = actCounts[act] || 0;
    actCounts[act] = offset + 1;
    const [speaker, line] = narrativeFor(act, offset);
    const level = Number(concept.mastery_data?.mastery_level || 0);
    const prompt = level === 0
      ? 'You have not learned this reliably yet. Before the chart opens, what do you think might matter here?'
      : level === 1
        ? 'You have struggled with this before. Retrieve the rule before you look.'
        : 'You have answered this correctly before. Can you still produce the rule without seeing it?';
    const memoryHook: Record<Act, string> = {
      arrival: 'Attach the rule to the moment James nearly walks out of hospital.',
      investigation: 'The result only matters because it changes the next decision.',
      diagnosis: 'Diagnosis is a commitment about what problem now needs solving.',
      management: 'The clock and the consequence give the management rule a reason to exist.',
      complication: 'The alarm is your cue: a changing patient means a changing problem.',
      followup: 'The graduation photo closes the crisis and opens the prevention story.',
    };
    return { concept, act, time: timeFor(act, offset), speaker, line, prompt, memoryHook: memoryHook[act] };
  });
}

function scopeLabel(filters: FilterState) {
  const condition = filters.conditions.find(value => value !== 'any');
  const area = filters.areas[0];
  const value = condition || area || 'selected medicine';
  return value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function haptic(pattern: number | number[]) {
  try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch { /* unsupported */ }
}

function tone(kind: 'reveal' | 'continue' | 'finish', enabled: boolean, audioRef: React.MutableRefObject<AudioContext | null>) {
  if (!enabled) return;
  try {
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = audioRef.current || new AudioCtor();
    audioRef.current = ctx;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = kind === 'finish' ? 660 : kind === 'reveal' ? 520 : 390;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === 'finish' ? 0.28 : 0.14));
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.3);
  } catch { /* browser blocks audio */ }
}

export function StoryPracticeSession({ filters, concepts, onComplete, onRestartWithFilters }: StoryPracticeSessionProps) {
  const beats = useMemo(() => buildBeats(concepts), [concepts]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);
  const label = useMemo(() => scopeLabel(filters), [filters]);
  const finished = index >= beats.length;

  if (!beats.length) {
    return <main className="min-h-screen bg-[#FAF5EC] px-5 py-10 text-[#2A1E16]"><div className="mx-auto max-w-xl"><h1 className="text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>Nothing matched this story.</h1><p className="mt-3 text-sm text-[#8A7560]">Change one filter and try again.</p><button onClick={onRestartWithFilters} className="mt-6 rounded-full bg-[#1F140C] px-5 py-3 text-sm font-semibold text-[#FAF5EC]">Change filters</button></div></main>;
  }

  if (finished) {
    haptic([25, 40, 55]);
    tone('finish', soundOn, audioRef);
    return <main className="min-h-screen bg-[#FAF5EC] px-5 pb-12 pt-[calc(env(safe-area-inset-top)+28px)] text-[#2A1E16]"><div className="mx-auto max-w-xl"><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8FA379]">Episode complete</div><h1 className="mt-3 text-[39px] font-light leading-[1.03] tracking-[-0.035em]" style={{ fontFamily: "'Fraunces', serif" }}>You made it through James’s case — and covered the whole selected scope.</h1><div className="mt-6 rounded-[24px] border border-[#D9CCB6] bg-[#F4ECDF] p-5"><div className="flex items-end justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A7560]">Coverage check</div><div className="mt-1 text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>{beats.length}/{concepts.length} concepts</div></div><div className="text-sm font-semibold text-[#8FA379]">100% mapped</div></div><p className="mt-3 text-xs leading-5 text-[#8A7560]">Story exposure does not mark these concepts mastered. Independent application still does that.</p></div><div className="mt-5 max-h-52 overflow-y-auto rounded-[20px] border border-[#E8DCC4] bg-[#FFFDF8] p-4"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A7560]">Concepts encountered</div>{beats.map((beat, i) => <div key={beat.concept.concept_id} className="mt-2 flex gap-3 text-xs"><span className="text-[#8FA379]">✓</span><span>{i + 1}. {beat.concept.title}</span></div>)}</div><div className="mt-6 flex gap-3"><button onClick={onRestartWithFilters} className="flex-1 rounded-full border border-[#D9CCB6] bg-[#FFFDF8] px-4 py-4 text-sm font-semibold">Change story</button><button onClick={onComplete} className="flex-1 rounded-full bg-[#1F140C] px-4 py-4 text-sm font-semibold text-[#FAF5EC]">Back home</button></div></div></main>;
  }

  const beat = beats[index];
  const progress = Math.round(((index + 1) / beats.length) * 100);
  const actIndex = ACT_ORDER.indexOf(beat.act);
  const previousAct = index > 0 ? beats[index - 1].act : null;
  const newAct = previousAct !== beat.act;

  const reveal = () => {
    setRevealed(true);
    haptic(18);
    tone('reveal', soundOn, audioRef);
  };
  const next = () => {
    haptic(10);
    tone('continue', soundOn, audioRef);
    setIndex(value => value + 1);
    setResponse('');
    setRevealed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <main className="min-h-screen bg-[#17110D] text-[#FAF5EC]">
    <div className="mx-auto min-h-screen max-w-xl pb-10 pt-[calc(env(safe-area-inset-top)+14px)]">
      <div className="px-5">
        <div className="flex items-center justify-between"><button onClick={onComplete} className="text-xs text-[#CDBEAC]">← Leave</button><button onClick={() => setSoundOn(v => !v)} className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] text-[#DCCFC0]">{soundOn ? '♪ Sound on' : 'Sound off'}</button></div>
        <div className="mt-5 flex gap-1">{ACT_ORDER.map((act, i) => <div key={act} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i < actIndex ? '#8FA379' : i === actIndex ? '#F2C9C1' : 'rgba(255,255,255,.12)' }} />)}</div>
        <div className="mt-2 flex justify-between text-[9px] uppercase tracking-[0.12em] text-[#9F9082]"><span>{label}</span><span>{index + 1}/{beats.length} · {progress}%</span></div>
      </div>

      {newAct && <div className="mt-7 border-y border-white/10 bg-white/[0.035] px-5 py-5"><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E5A89D]">Act {actIndex + 1}</div><div className="mt-1 text-[27px]" style={{ fontFamily: "'Fraunces', serif" }}>{ACT_LABEL[beat.act]}</div></div>}

      <section className="px-5 pt-7">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E5A89D]">{beat.time}</div>
        <div className="mt-4 flex items-start gap-3"><div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4ECDF] text-sm font-bold text-[#2A1E16]">{beat.speaker.slice(0,1)}</div><div className="max-w-[82%]"><div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9F9082]">{beat.speaker}</div><div className="mt-1 rounded-[22px] rounded-tl-[6px] bg-[#F4ECDF] px-4 py-3.5 text-[16px] leading-6 text-[#2A1E16]" style={{ fontFamily: "'Fraunces', serif" }}>{beat.line}</div></div></div>

        <div className="mt-7 rounded-[22px] border border-white/12 bg-white/[0.045] p-5"><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E5A89D]">Your move</div><p className="mt-2 text-[18px] leading-6" style={{ fontFamily: "'Fraunces', serif" }}>{beat.prompt}</p><textarea value={response} onChange={e => setResponse(e.target.value)} disabled={revealed} placeholder="Think it through — a few words is enough…" className="mt-4 min-h-24 w-full resize-none rounded-[16px] border border-white/12 bg-black/20 px-4 py-3 text-sm leading-5 text-[#FAF5EC] outline-none placeholder:text-[#786C62] disabled:opacity-60" />{!revealed && <div className="mt-3 flex gap-2"><button onClick={reveal} className="flex-1 rounded-full bg-[#F4ECDF] px-4 py-3 text-xs font-semibold text-[#2A1E16]">{response.trim() ? 'Lock it in →' : 'Teach me →'}</button></div>}</div>

        {revealed && <div className="mt-5 overflow-hidden rounded-[22px] bg-[#FAF5EC] text-[#2A1E16]"><div className="border-b border-[#E8DCC4] px-5 py-3"><div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#8A7560]">Chart opens · curriculum concept</div></div><div className="p-5"><h2 className="text-[24px] font-light leading-[1.12]" style={{ fontFamily: "'Fraunces', serif" }}>{beat.concept.title}</h2><div className="mt-3 whitespace-pre-wrap text-sm leading-6">{beat.concept.content}</div>{beat.concept.safety_critical || beat.concept.importance?.safety_critical ? <div className="mt-4 rounded-[14px] bg-[#FBEDE7] px-3 py-2 text-[11px] font-semibold text-[#6B4037]">Safety-critical concept — this will be worth retrieving independently again.</div> : null}<div className="mt-5 border-l-2 border-[#E5A89D] pl-4 text-[15px] italic leading-6 text-[#8A7560]" style={{ fontFamily: "'Fraunces', serif" }}>{beat.memoryHook}</div></div></div>}

        {revealed && <button onClick={next} className="mt-5 w-full rounded-full bg-[#F2C9C1] px-5 py-4 text-sm font-bold text-[#281D15] shadow-[0_10px_24px_rgba(0,0,0,.22)]">{index === beats.length - 1 ? 'End the episode →' : 'Continue →'}</button>}
      </section>
    </div>
  </main>;
}
