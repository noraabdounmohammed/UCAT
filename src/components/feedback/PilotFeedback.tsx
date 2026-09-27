import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, MessageSquare, Mic, Square, X } from 'lucide-react';
import { useFeedbackDictation } from '@/hooks/useFeedbackDictation';
import { FEEDBACK_REACTIONS, FEEDBACK_TOPICS, submitPilotFeedback, type FeedbackContext, type FeedbackReaction, type PilotFeedback } from '@/lib/pilotFeedback';
import { track } from '@/instrumentation/events';

type OpenFeedback = (context: FeedbackContext, reaction?: FeedbackReaction) => void;
const Feedback = createContext<OpenFeedback | null>(null);
const chip = 'min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#667555]';
const selectedChip = 'border-[#667555] bg-[#E7ECD9] text-[#35462F]';
const idleChip = 'border-[#DCCDBA] bg-[#FFFDF8] text-[#49382B] hover:bg-[#F4ECDF]';
const emptyFeedback = (context: FeedbackContext): PilotFeedback => ({
  id: crypto.randomUUID(), reaction: null, topics: [], message: '', usedVoice: false, context,
});

export function PilotFeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PilotFeedback>(() => emptyFeedback({ source: 'home' }));
  const [state, setState] = useState<'editing' | 'sending' | 'sent'>('editing');
  const [error, setError] = useState('');
  const sending = useRef(false);
  const lastAttempt = useRef('');
  const trigger = useRef<HTMLElement | null>(null);
  const voice = useFeedbackDictation(text => setDraft(previous => ({
    ...previous, message: [previous.message.trim(), text].filter(Boolean).join(' ').slice(0, 2000), usedVoice: true,
  })));
  const voiceBusy = voice.status !== 'idle';

  const openFeedback = useCallback<OpenFeedback>((context, reaction) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraft(previous => {
      const fresh = state === 'sent' ? emptyFeedback(context) : previous;
      const hasDraft = fresh.reaction || fresh.topics.length || fresh.message;
      return { ...fresh, context: hasDraft ? fresh.context : context, reaction: reaction ?? fresh.reaction };
    });
    if (state !== 'sending') setState('editing');
    setError('');
    setOpen(true);
    track('pilot_feedback_opened', { source: context.source });
  }, [state]);

  const close = (next: boolean) => {
    if (!next) voice.cancel();
    setOpen(next);
  };

  const submit = async () => {
    if (sending.current || voiceBusy || (!draft.reaction && !draft.topics.length && !draft.message.trim())) return;
    sending.current = true;
    setState('sending');
    setError('');
    const signature = JSON.stringify({ ...draft, id: undefined });
    const submission = lastAttempt.current && lastAttempt.current !== signature
      ? { ...draft, id: crypto.randomUUID() } : draft;
    lastAttempt.current = signature;
    if (submission !== draft) setDraft(submission);
    try {
      await submitPilotFeedback(submission);
      setState('sent');
      track('pilot_feedback_submitted', { source: draft.context.source, reaction: draft.reaction, used_voice: draft.usedVoice });
    } catch {
      setState('editing');
      setError('Couldn’t confirm your feedback was sent. Your draft is still here — please try again.');
    } finally {
      sending.current = false;
    }
  };

  return <Feedback.Provider value={openFeedback}>
    {children}
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-[#1F140C]/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-labelledby="pilot-feedback-title"
          className="ph-no-capture fixed left-1/2 top-1/2 z-[101] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-[#DCCDBA] bg-[#FFFDF8] p-5 text-[#2A1E16] shadow-xl sm:p-7"
          onKeyDown={event => event.stopPropagation()}
          onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}
          onOpenAutoFocus={event => { event.preventDefault(); document.getElementById('pilot-feedback-title')?.focus(); }}
        >
          <div className="pr-9">
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#667555]">Early access · Feedback phase</p>
            <Dialog.Title id="pilot-feedback-title" tabIndex={-1} className="mt-2 text-[28px] font-medium leading-tight tracking-tight outline-none" style={{ fontFamily: "'Fraunces', serif" }}>
              {state === 'sent' ? 'Thank you. We’re listening.' : 'Help shape StudyEdit'}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-[#746354]">
              {state === 'sent' ? 'Your feedback reached the StudyEdit team. It will help us decide what to improve next.' : 'A few taps is enough. Add a voice note or type if you like. No account or call needed.'}
            </Dialog.Description>
          </div>
          <Dialog.Close aria-label="Close feedback" className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-[#746354] hover:bg-[#F4ECDF]"><X className="h-5 w-5" /></Dialog.Close>
          {state === 'sent' ? <div className="mt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#526744]" role="status"><Check className="h-5 w-5" /> Feedback sent</div>
            <Dialog.Close className="mt-6 min-h-12 w-full rounded-full bg-[#1F140C] px-5 py-3 font-semibold text-[#FFFDF8]">Back to studying</Dialog.Close>
          </div> : <form className="mt-5 space-y-5" onSubmit={event => { event.preventDefault(); void submit(); }}>
            <fieldset disabled={state === 'sending'}>
              <legend className="mb-2 text-sm font-bold">How has it been so far?</legend>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_REACTIONS.map(reaction => <button type="button" key={reaction.value} aria-pressed={draft.reaction === reaction.value} className={`${chip} ${draft.reaction === reaction.value ? selectedChip : idleChip}`} onClick={() => setDraft(previous => ({ ...previous, reaction: previous.reaction === reaction.value ? null : reaction.value }))}>{reaction.label}</button>)}
              </div>
            </fieldset>
            <details>
              <summary className="min-h-8 cursor-pointer text-sm font-semibold text-[#746354]">Anything in particular? <span className="font-normal">(optional)</span></summary>
              <fieldset disabled={state === 'sending'} className="mt-2 flex flex-wrap gap-2" aria-label="Feedback topics">
                {FEEDBACK_TOPICS.map(topic => <button type="button" key={topic.value} aria-pressed={draft.topics.includes(topic.value)} className={`${chip} ${draft.topics.includes(topic.value) ? selectedChip : idleChip}`} onClick={() => setDraft(previous => ({ ...previous, topics: previous.topics.includes(topic.value) ? previous.topics.filter(value => value !== topic.value) : [...previous.topics, topic.value] }))}>{topic.label}</button>)}
              </fieldset>
            </details>
            <div>
              <label htmlFor="pilot-feedback-message" className="text-sm font-bold">What should we know? <span className="font-normal text-[#746354]">(optional)</span></label>
              <textarea id="pilot-feedback-message" rows={3} maxLength={2000} value={draft.message} disabled={state === 'sending' || voiceBusy} onChange={event => setDraft(previous => ({ ...previous, message: event.target.value }))} placeholder="What helped, what got in your way, or what’s missing?" className="mt-2 block w-full resize-y rounded-2xl border border-[#DCCDBA] bg-white p-3 text-base leading-6 outline-none focus:border-[#667555] focus:ring-1 focus:ring-[#667555] disabled:opacity-70" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                {!voice.supported ? <span className="inline-flex items-center gap-2 text-sm text-[#746354]"><Mic className="h-4 w-4" aria-hidden="true" /> For voice, use your keyboard’s microphone.</span> : voice.status === 'idle'
                  ? <button type="button" disabled={state === 'sending' || draft.message.length >= 2000} onClick={() => void voice.start()} className={`${chip} ${idleChip} inline-flex items-center gap-2 disabled:opacity-50`}><Mic className="h-4 w-4" aria-hidden="true" /> Use voice</button>
                  : <div className="flex flex-wrap items-center gap-2">
                    {voice.status === 'listening' && <button type="button" onClick={voice.stop} className={`${chip} ${selectedChip} inline-flex items-center gap-2`}><Square className="h-3 w-3 fill-current" aria-hidden="true" /> Stop & review</button>}
                    <button type="button" onClick={voice.cancel} className="min-h-11 px-2 text-sm font-semibold underline underline-offset-4">Cancel voice</button>
                  </div>}
                <span className="text-xs text-[#746354]">{draft.message.length}/2,000</span>
              </div>
              {voiceBusy && <p role="status" className="mt-2 text-sm font-semibold text-[#526744]">{voice.status === 'starting' ? 'Waiting for microphone access…' : voice.status === 'listening' ? 'Listening… up to 60 seconds.' : 'Turning your voice into text…'}</p>}
              {voice.preview && <p className="mt-2 text-sm leading-6 text-[#746354]">{voice.preview}</p>}
              {voice.error && <p role="alert" className="mt-2 text-sm leading-6 text-[#9C4335]">{voice.error}</p>}
              <p className="mt-2 text-xs leading-5 text-[#746354]">Voice becomes editable text using your device or browser’s speech service. Only your submitted feedback is saved by StudyEdit. Please leave out patient details. <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2">Privacy</a></p>
            </div>
            {error && <p role="alert" className="text-sm leading-6 text-[#9C4335]">{error}</p>}
            <button type="submit" disabled={state === 'sending' || voiceBusy || (!draft.reaction && !draft.topics.length && !draft.message.trim())} className="min-h-12 w-full rounded-full bg-[#1F140C] px-5 py-3 font-semibold text-[#FFFDF8] disabled:cursor-not-allowed disabled:opacity-40">{state === 'sending' ? 'Sending…' : 'Send feedback'}</button>
            <p className="text-center text-xs text-[#746354]">Shared privately with the StudyEdit team.</p>
          </form>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </Feedback.Provider>;
}

export function PilotFeedbackBanner({ context }: { context: FeedbackContext }) {
  const open = useContext(Feedback);
  if (!open) return null;
  return <button type="button" onClick={() => open(context)} className="mb-5 mt-4 flex w-full items-center gap-3 rounded-[18px] border border-[#BCC8AD] bg-[#E7ECD9] px-4 py-3 text-left text-[#35462F] hover:bg-[#DFE6CE]" aria-label="Early access: give feedback and help shape StudyEdit">
    <MessageSquare className="h-5 w-5 shrink-0" aria-hidden="true" />
    <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.13em]">Early access · Feedback phase</span><span className="mt-0.5 block text-[15px] font-bold">Help shape StudyEdit</span><span className="mt-0.5 block text-xs">A few taps, a voice note, or a message.</span></span>
    <span className="shrink-0 text-xs font-bold underline underline-offset-4">Give feedback</span>
  </button>;
}

export function PilotFeedbackButton({ context }: { context: FeedbackContext }) {
  const open = useContext(Feedback);
  if (!open) return null;
  return <button type="button" onClick={() => open(context)} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-[#BCC8AD] bg-[#E7ECD9] px-3 text-xs font-bold text-[#35462F]" aria-label="Give feedback"><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Feedback</button>;
}

export function SessionFeedbackPrompt({ answeredCount, caseCount }: { answeredCount: number; caseCount: number }) {
  const open = useContext(Feedback);
  if (!open) return null;
  const context: FeedbackContext = { source: 'session_complete', answeredCount, caseCount };
  return <section className="mt-7 rounded-[20px] border border-[#BCC8AD] bg-[#E7ECD9] p-5 text-[#35462F]" aria-labelledby="pilot-session-feedback">
    <p className="text-[10px] font-bold uppercase tracking-[.14em]">Help shape StudyEdit</p>
    <h2 id="pilot-session-feedback" className="mt-2 text-lg font-bold">Was this session useful?</h2>
    <p className="mt-1 text-sm leading-6">We’re in our feedback phase. Your honest reaction helps us improve.</p>
    <div className="mt-3 flex flex-wrap gap-2">{FEEDBACK_REACTIONS.map(reaction => <button key={reaction.value} type="button" className={`${chip} ${idleChip}`} onClick={() => open(context, reaction.value)}>{reaction.label}</button>)}</div>
    <button type="button" onClick={() => open(context)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"><Mic className="h-4 w-4" aria-hidden="true" /> Or tell us in your own words</button>
  </section>;
}
