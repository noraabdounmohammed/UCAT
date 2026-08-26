import { useMemo, useState } from 'react';
import type { FilterState } from '@/components/practice/PracticeFilterModalParchment';

interface StoryPracticeSessionProps {
  filters: FilterState;
  onComplete: () => void;
  onRestartWithFilters: () => void;
}

type Beat = {
  id: string;
  time?: string;
  title: string;
  story: string;
  question: string;
  options: string[];
  correct: number;
  feedback: string;
  teaching: string;
  memoryHook: string;
};

const ACS_BEATS: Beat[] = [
  {
    id: 'arrival',
    time: '07:42',
    title: 'The call you nearly dismiss',
    story: 'James, 58, is meant to be at his daughter’s graduation in two hours. He insists the crushing pressure in his chest is probably indigestion. His wife says he has gone grey and sweaty. The pain is moving into his left arm.',
    question: 'What feature of this story should change the way you think first?',
    options: [
      'The pain started while walking',
      'The pressure-like pain, radiation and autonomic symptoms form a concerning ischaemic pattern',
      'His age alone makes myocardial infarction the most likely diagnosis',
    ],
    correct: 1,
    feedback: 'The pattern matters more than any single detail. Central pressure-like pain with radiation plus sweating or nausea should make myocardial ischaemia a leading concern.',
    teaching: 'In a real patient, you are rarely handed the diagnosis. The first skill is recognising a dangerous symptom pattern quickly enough to act on it.',
    memoryHook: 'James wants to leave for the graduation. The reason you stop him is that this pattern could be time-critical.',
  },
  {
    id: 'ecg',
    time: '07:49',
    title: 'The ECG changes the story',
    story: 'A nurse slides the ECG across the desk. It shows clear ST-segment elevation in contiguous leads. James asks again whether he can just come back after the ceremony.',
    question: 'What has changed clinically?',
    options: [
      'You should wait for troponin before deciding whether this is urgent',
      'This is now a STEMI-pattern presentation and reperfusion is time-critical',
      'The ECG confirms stable angina',
    ],
    correct: 1,
    feedback: 'In the right clinical context, a STEMI pattern turns this into an urgent reperfusion problem. Waiting for later biomarkers should not delay that pathway.',
    teaching: 'The learning move here is consequence: the ECG is not just a label. It changes what must happen next and how quickly.',
    memoryHook: 'The graduation clock is still running. That emotional pressure mirrors the clinical pressure: time matters.',
  },
  {
    id: 'initial-treatment',
    time: '07:53',
    title: 'Your registrar is stuck in resus',
    story: 'The cath-lab referral is being organised. Your registrar is dealing with another emergency and asks you to make sure the immediate treatment sequence is not forgotten.',
    question: 'Which principle is safest to build into your mental sequence?',
    options: [
      'Reperfusion planning replaces all immediate medical treatment',
      'Recognise, stabilise, give indicated immediate treatment, and pursue reperfusion without unnecessary delay',
      'Delay antiplatelet therapy until after angiography in every patient',
    ],
    correct: 1,
    feedback: 'Exactly. Acute management is layered. Reperfusion planning and appropriate immediate treatment happen as part of one coordinated pathway.',
    teaching: 'Sequences are easier to retain when each step answers a clinical need. Do not memorise isolated treatment nouns; remember what problem each action is solving.',
    memoryHook: 'The registrar is absent, so you need a reliable sequence rather than a vague list of facts.',
  },
  {
    id: 'deterioration',
    time: '08:11',
    title: 'The monitor alarms',
    story: 'While James is speaking to his daughter on the phone, the monitor alarms. He becomes pale and clammy. His blood pressure falls sharply and his chest pain persists.',
    question: 'What should your brain do before anything else?',
    options: [
      'Assume anxiety is causing the change',
      'Recognise a possible haemodynamic complication and urgently reassess the patient',
      'Treat this as an expected part of uncomplicated recovery',
    ],
    correct: 1,
    feedback: 'A changing patient means a changing problem. Deterioration after ACS should trigger urgent reassessment for complications rather than passive observation.',
    teaching: 'Complications are more memorable when they appear as consequences in the patient journey instead of as a detached list at the bottom of a textbook page.',
    memoryHook: 'The phone call is interrupted by the alarm. That interruption is the cue: when the patient changes, your priorities change.',
  },
  {
    id: 'follow-up',
    time: 'Three days later',
    title: 'James asks the question patients actually ask',
    story: 'James is recovering. His daughter brings in a graduation photo. He looks at his medication list and asks, “What stops this happening again?”',
    question: 'What is the educational shift now?',
    options: [
      'Acute reperfusion is still the only relevant problem',
      'The story moves from acute rescue to secondary prevention and long-term risk reduction',
      'Once symptoms settle, cardiovascular risk factors no longer matter',
    ],
    correct: 1,
    feedback: 'Right. A condition is not only its emergency presentation. Follow-up naturally creates the reason to learn secondary prevention, medication adherence and risk-factor modification.',
    teaching: 'A recurring patient lets later lessons retrieve earlier knowledge without feeling like a random flashcard review.',
    memoryHook: 'The graduation photo closes the emotional loop while opening the long-term management loop.',
  },
];

function labelFromFilters(filters: FilterState) {
  const condition = filters.conditions.find(value => value !== 'any');
  if (condition) return condition.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const area = filters.areas[0];
  if (area) return area.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return 'your selected medicine';
}

export function StoryPracticeSession({ filters, onComplete, onRestartWithFilters }: StoryPracticeSessionProps) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [showTeaching, setShowTeaching] = useState(false);
  const scopeLabel = useMemo(() => labelFromFilters(filters), [filters]);
  const beats = ACS_BEATS;
  const beat = beats[index];
  const finished = index >= beats.length;

  if (finished) {
    return (
      <main className="min-h-screen bg-[#FAF5EC] px-5 py-8 text-[#2A1E16]">
        <div className="mx-auto max-w-xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7560]">Story complete</div>
          <h1 className="mt-3 text-[38px] font-light leading-[1.04] tracking-[-0.035em]" style={{ fontFamily: "'Fraunces', serif" }}>
            You followed James from symptom to consequence.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#8A7560]">
            This session taught and retrieved ideas, but it has not marked them as mastered. Independent questions remain the evidence for mastery.
          </p>
          <div className="mt-7 rounded-[24px] border border-[#D9CCB6] bg-[#F4ECDF] p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7560]">What this prototype demonstrates</div>
            <div className="mt-3 space-y-2 text-sm leading-6">
              <p>• Clinical facts appear because the patient creates a reason to need them.</p>
              <p>• Emotional details reinforce the clinical decision rather than decorate it.</p>
              <p>• Every beat asks you to predict or decide before teaching.</p>
              <p>• The same patient can return later for spaced retrieval.</p>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={onRestartWithFilters} className="flex-1 rounded-full border border-[#D9CCB6] bg-[#FFFDF8] px-4 py-4 text-sm font-semibold">Change story</button>
            <button onClick={onComplete} className="flex-1 rounded-full bg-[#1F140C] px-4 py-4 text-sm font-semibold text-[#FAF5EC]">Back home</button>
          </div>
        </div>
      </main>
    );
  }

  const answered = choice !== null;
  const correct = choice === beat.correct;
  const progress = Math.round(((index + 1) / beats.length) * 100);

  return (
    <main className="min-h-screen bg-[#FAF5EC] text-[#2A1E16]">
      <div className="mx-auto max-w-xl px-5 pb-10 pt-[calc(env(safe-area-inset-top)+18px)]">
        <div className="flex items-center justify-between gap-4">
          <button onClick={onComplete} className="text-sm text-[#8A7560]">← Leave story</button>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7560]">{scopeLabel}</div>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#E8DCC4]">
          <div className="h-full rounded-full bg-[#8FA379] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[#8A7560]"><span>Episode 1 · Acute Coronary Syndrome</span><span>{index + 1}/{beats.length}</span></div>

        <section className="mt-7 rounded-[26px] border border-[#D9CCB6] bg-[#F4ECDF] p-5 shadow-[0_10px_28px_rgba(31,20,12,.05)]">
          {beat.time && <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E5A89D]">{beat.time}</div>}
          <h1 className="mt-2 text-[30px] font-light leading-[1.05] tracking-[-0.03em]" style={{ fontFamily: "'Fraunces', serif" }}>{beat.title}</h1>
          <p className="mt-4 text-[17px] leading-7" style={{ fontFamily: "'Fraunces', serif" }}>{beat.story}</p>
        </section>

        <section className="mt-6">
          <div className="text-[18px] italic text-[#8A7560]" style={{ fontFamily: "'Fraunces', serif" }}>{beat.question}</div>
          <div className="mt-3 space-y-2.5">
            {beat.options.map((option, optionIndex) => {
              const selected = choice === optionIndex;
              const isCorrectOption = answered && optionIndex === beat.correct;
              const isWrongSelection = answered && selected && !correct;
              return (
                <button
                  key={option}
                  disabled={answered}
                  onClick={() => setChoice(optionIndex)}
                  className="w-full rounded-[18px] border px-4 py-4 text-left text-[13px] font-medium leading-5 transition active:scale-[0.995] disabled:cursor-default"
                  style={{
                    borderColor: isCorrectOption ? '#8FA379' : isWrongSelection ? '#E5A89D' : '#D9CCB6',
                    backgroundColor: isCorrectOption ? 'rgba(143,163,121,.14)' : isWrongSelection ? 'rgba(229,168,157,.14)' : '#FFFDF8',
                  }}
                >{option}</button>
              );
            })}
          </div>
        </section>

        {answered && (
          <section className="mt-5 rounded-[22px] border border-[#D9CCB6] bg-[#FFFDF8] p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: correct ? '#8FA379' : '#E5A89D' }}>{correct ? 'You saw it' : 'This is the learning moment'}</div>
            <p className="mt-2 text-sm leading-6">{beat.feedback}</p>
            {!showTeaching ? (
              <button onClick={() => setShowTeaching(true)} className="mt-4 rounded-full border border-[#D9CCB6] px-4 py-2.5 text-xs font-semibold">Why this matters →</button>
            ) : (
              <div className="mt-4 border-l-2 border-[#E5A89D] pl-4">
                <p className="text-sm leading-6">{beat.teaching}</p>
                <p className="mt-3 text-[15px] italic leading-6 text-[#8A7560]" style={{ fontFamily: "'Fraunces', serif" }}>{beat.memoryHook}</p>
              </div>
            )}
          </section>
        )}

        {answered && showTeaching && (
          <button
            onClick={() => { setIndex(current => current + 1); setChoice(null); setShowTeaching(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="mt-6 w-full rounded-full bg-[#1F140C] px-5 py-4 text-sm font-semibold text-[#FAF5EC] shadow-[0_8px_22px_rgba(31,20,12,.14)]"
          >
            {index === beats.length - 1 ? 'Finish episode →' : 'Continue the story →'}
          </button>
        )}
      </div>
    </main>
  );
}
