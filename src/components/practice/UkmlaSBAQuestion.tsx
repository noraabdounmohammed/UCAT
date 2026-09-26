import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateAIResponse, generateAIResponseStream, QuestionContext } from '@/services/openai';
import { TutorVoiceControls } from './TutorVoiceControls';
import type { FilterState } from './PracticeFilterModalParchment';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';

interface UkmlaSBAQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean, selectedOption?: string, confidence?: ConfidenceLevel) => void;
  onNext: () => void;
  onPrevious?: () => void;
  onExit?: () => void;
  currentIndex?: number;
  totalQuestions?: number;
  title?: string;
  sessionAnswers?: SessionAnswer[];
  onJumpTo?: (index: number) => void;
  availableFilters?: string[];
  activeFilter?: string | null;
  onFilterSelect?: (filter?: string) => void;
  currentFormat?: string;
  onChangeFormat?: (format: string) => void;
  onRestartWithFilters?: (filters?: FilterState) => void;
  preSelectedAnswer?: string;
  preSubmitted?: boolean;
  preTutorTurns?: TutorTurn[];
  prePassedChecks?: number;
  preConfidence?: ConfidenceLevel;
  nextButtonText?: string;
  collectConfidence?: boolean;
  onTutorTurnsChange?: (turns: TutorTurn[]) => void;
  onPassedChecksChange?: (passedChecks: number) => void;
  footerControl?: React.ReactNode;
}

export type ConfidenceLevel = 'know' | 'unsure' | 'guess';
export type TutorTurn = { role: 'student' | 'tutor'; text: string };
type TutorAssessment = 'pass' | 'partial' | 'fail' | 'clarify';

const C = {
  parchment: '#F4ECDF',
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#746354',
  line: '#E8DCC4',
  blush: '#E5A89D',
  blushSoft: '#F9E4DF',
  sage: '#8FA379',
  sageSoft: '#EEF0E2',
};

const learningFont = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const brandFont = "'Fraunces', Georgia, 'Times New Roman', serif";

function sanitiseExplanation(text: string): string {
  return String(text || '').replace(/\s{2,}/g, ' ').trim();
}

function normaliseVignetteText(text: string): string {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitSentences(text: string): string[] {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter(Boolean);
}

function isLikelyLeadIn(text: string): boolean {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return Boolean(clean && clean.length <= 180 && clean.endsWith('?'));
}

function extractLeadIn(question: QuestionData, vignette: string): string {
  const candidates = [
    (question as any).question_text,
    (question as any).stem_question,
    (question as any).individual_question,
    question.question,
    question.question_stem,
    vignette,
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean);

  for (const candidate of candidates.slice(0, 4)) {
    if (isLikelyLeadIn(candidate)) return candidate.replace(/\s+/g, ' ').trim();
  }

  for (const candidate of candidates) {
    const sentences = splitSentences(candidate);
    for (let i = sentences.length - 1; i >= 0; i -= 1) {
      if (isLikelyLeadIn(sentences[i])) return sentences[i];
    }
  }

  return '';
}

function stripLeadInFromVignette(vignette: string, leadIn: string): string {
  const v = normaliseVignetteText(vignette);
  const l = String(leadIn || '').replace(/\s+/g, ' ').trim();
  if (!v || !l) return v;

  return v
    .split(/\n{2,}/)
    .map(paragraph => splitSentences(paragraph)
      .filter(sentence => sentence.replace(/\s+/g, ' ').trim().toLowerCase() !== l.toLowerCase())
      .join(' ')
      .trim())
    .filter(Boolean)
    .join('\n\n');
}

function buildVignetteParagraphs(text: string): string[] {
  const normalised = normaliseVignetteText(text);
  if (!normalised) return [];

  const explicit = normalised
    .split(/\n{2,}/)
    .map(part => part.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (explicit.length > 1) return explicit;

  const sectionCue = /(?<=[.!?])\s+(?=(?:On examination|On physical examination|Examination reveals|Neurological examination|Cardiovascular examination|Respiratory examination|Abdominal examination|On auscultation|Blood tests? (?:show|reveal)|Laboratory (?:tests|results) (?:show|reveal)|Investigations? (?:show|reveal)|Initial investigations|An? ECG (?:shows|reveals)|ECG (?:shows|reveals)|A chest X-ray|Chest X-ray|CXR (?:shows|reveals)|CT (?:head|brain|chest|abdomen|pelvis)? ?(?:shows|reveals)|MRI (?:shows|reveals)|Urinalysis (?:shows|reveals)|Arterial blood gas|ABG (?:shows|reveals)|Vital signs|Observations|His observations|Her observations)\b)/gi;

  return normalised
    .replace(sectionCue, '\n\n')
    .split(/\n{2,}/)
    .map(part => part.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function requiredEvidence(correct: boolean, confidence: ConfidenceLevel | null): number {
  if (correct && confidence === 'know') return 0;
  return 1;
}

export function tutorNavigationIntent(text: string): 'next' | 'stop' | null {
  const clean = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[.!]+$/g, '')
    .replace(/[–—]/g, '-');
  if (!clean || clean.includes('?') || clean.length > 90) return null;
  if (/^(?:i(?:'m| am) )?(?:done|finished)(?: for (?:now|today))?(?: please)?$/.test(clean) || /^(?:stop|end)(?: (?:this|the))? session(?: please)?$/.test(clean)) return 'stop';
  if (/^(?:(?:i (?:understand|get it)(?: now)?|got it|okay|ok)[,;:\s-]*)?(?:next(?: case| question)?|skip(?: this| it)?|move on|continue|finish(?: (?:this|the) session)?)(?: please)?$/.test(clean)) return 'next';
  return null;
}

function parseTutorAssessment(text: string): TutorAssessment {
  const value = String(text || '').trim().toUpperCase();
  if (value.includes('CLARIFY')) return 'clarify';
  if (value.includes('PASS')) return 'pass';
  if (value.includes('FAIL')) return 'fail';
  return 'partial';
}

const emphasisStyle: React.CSSProperties = {
  fontWeight: 800,
  textDecorationLine: 'underline',
  textDecorationThickness: '2px',
  textUnderlineOffset: '3px',
  textDecorationColor: C.blush,
  background: 'linear-gradient(to top, rgba(229,168,157,.20) 38%, transparent 38%)',
};

function SkimmableMarkdown({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong style={emphasisStyle}>{children}</strong>,
          em: ({ children }) => <em className="font-semibold not-italic" style={emphasisStyle}>{children}</em>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function TutorMessage({ text, first }: { text: string; first: boolean }) {
  const match = text.match(/([\s\S]*?)(?:\n\s*)?(Quick check:)([\s\S]*)/i);
  const body = match ? match[1].trim() : text;
  const check = match ? match[3].trim() : '';

  return (
    <div className={first ? '' : 'border-t pt-6'} style={{ borderColor: C.line }}>
      {body && (
        <SkimmableMarkdown
          text={body}
          className="text-[20px] font-medium leading-[1.65] tracking-[-0.01em] text-[#3B2A1E] sm:text-[21px]"
        />
      )}
      {check && (
        <div className="mt-5 rounded-[19px] border px-4 py-4 sm:px-5" style={{ borderColor: '#D6D9BE', backgroundColor: C.sageSoft }}>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#76835F' }}>Quick check</div>
          <SkimmableMarkdown
            text={check}
            className="text-[20px] font-semibold leading-[1.65] tracking-[-0.01em] text-[#3B2A1E] sm:text-[21px]"
          />
        </div>
      )}
    </div>
  );
}

function TutorWorkingIndicator() {
  return (
    <div className="flex items-center gap-2 py-2" role="status" aria-live="polite" aria-label="StudyEdit is thinking">
      <span className="text-[12px] font-semibold" style={{ color: C.muted }}>StudyEdit is thinking</span>
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map(index => (
          <span
            key={index}
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: C.muted, animationDelay: `${index * 180}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

function readLatestConfidence(conceptTitle: string, notBefore = 0): ConfidenceLevel | null {
  try {
    let latest: { value: ConfidenceLevel; at: number } | null = null;
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith('learning_frontier_') || !key.includes('_answer_confidence_')) continue;
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!['know', 'unsure', 'guess'].includes(parsed?.value)) continue;
      if (String(parsed.concept || '').trim().toLowerCase() !== conceptTitle.trim().toLowerCase()) continue;
      const at = new Date(parsed.at || 0).getTime();
      if (at < notBefore) continue;
      if (!latest || at > latest.at) latest = { value: parsed.value as ConfidenceLevel, at };
    }
    return latest?.value || null;
  } catch {
    return null;
  }
}

async function waitForConfidence(conceptTitle: string, startedAt: number): Promise<ConfidenceLevel | null> {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const confidence = readLatestConfidence(conceptTitle, startedAt - 1000);
    if (confidence) return confidence;
    await new Promise(resolve => window.setTimeout(resolve, 120));
  }
  return readLatestConfidence(conceptTitle, startedAt - 1000);
}

function proactiveOpeningInstruction(correct: boolean, confidence: ConfidenceLevel | null): string {
  const common = 'You are StudyEdit Tutor. The learner has just answered this SBA. Use the verified explanation and key point as ground truth. Do not invent why they chose an option. Make ONE pedagogical move only, usually 1-3 short sentences. Do not dump a full explanation unless instructed. End with at most one question.';
  if (correct && confidence === 'know') return `${common} They were correct and said they knew it. Give a very brief confirmation of the decisive clue. Do not ask another question. Tell them you have seen enough evidence and are moving on.`;
  if (correct && confidence === 'unsure') return `${common} They were correct but unsure. Briefly name the decisive discriminator, then ask one tiny transfer check that confirms they can use it deliberately. Prefix that final check with "Quick check:".`;
  if (correct && confidence === 'guess') return `${common} They were correct but guessed. Do not imply mastery. Ask what made them choose this answer before teaching it, so you can distinguish lucky recognition from partial reasoning.`;
  if (!correct && confidence === 'know') return `${common} They were wrong but said they knew it, which may indicate a misconception. Do NOT explain the answer yet. Ask them to talk you through how they got to their selected answer.`;
  if (!correct && confidence === 'unsure') return `${common} They were wrong and unsure. Do NOT explain the answer yet. Ask what made them lean toward their selected answer. Keep it warm and specific to the option they chose.`;
  if (!correct && confidence === 'guess') return `${common} They were wrong and guessed. Teach the smallest prerequisite or rule needed to start, then ask one short prerequisite check. Prefix the check with "Quick check:".`;
  return `${common} Confidence is unavailable. Ask one short neutral question to understand what the learner was thinking before you explain.`;
}

function directExplanationInstruction(): string {
  return 'Give the direct explanation now. Use the verified explanation as ground truth. Explain the decisive mechanism or discriminator in about 60-100 words. Then ask one short application question so you can verify the learner can use it. Prefix that question with "Quick check:". Do not invent the learner\'s reasoning.';
}

function secureClosingInstruction(isFinalQuestion: boolean): string {
  return isFinalQuestion
    ? 'The learner has now given enough evidence that they can apply this distinction in the current check. Confirm the exact thing they now have right in one concise sentence. Do not teach anything new and do not ask another question. End naturally by saying that is enough for today.'
    : 'The learner has now given enough evidence that they can apply this distinction in the current check. Confirm the exact thing they now have right in one concise sentence. Do not teach anything new and do not ask another question. End naturally by telling them you have seen enough here and are moving on.';
}

export const UkmlaSBAQuestion: React.FC<UkmlaSBAQuestionProps> = ({
  question,
  onAnswer,
  onNext,
  onExit,
  currentIndex = 0,
  totalQuestions = 0,
  preSelectedAnswer,
  preSubmitted = false,
  preTutorTurns,
  prePassedChecks = 0,
  preConfidence,
  nextButtonText,
  collectConfidence = false,
  onTutorTurnsChange,
  onPassedChecksChange,
  footerControl,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(preSelectedAnswer || null);
  const [committedAnswer, setCommittedAnswer] = useState<string | null>(preSubmitted ? preSelectedAnswer || null : null);
  const [hasSubmitted, setHasSubmitted] = useState(preSubmitted);
  const [showAllDistractors, setShowAllDistractors] = useState(false);
  const [questionExpanded, setQuestionExpanded] = useState(!preSubmitted);
  const [tutorTurns, setTutorTurns] = useState<TutorTurn[]>(preTutorTurns || []);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [tutorAssessing, setTutorAssessing] = useState(false);
  const [answerStartedAt, setAnswerStartedAt] = useState(0);
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel | null>(null);
  const [passedChecks, setPassedChecks] = useState(0);
  const [advancePending, setAdvancePending] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [composerInput, setComposerInput] = useState<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const resetOnFirstTutorTextRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const getStorageKey = () => `sba_answer_${question.id || question.question?.substring(0, 50)}`;
  const setComposerRef = useCallback((node: HTMLTextAreaElement | null) => {
    inputRef.current = node;
    setComposerInput(node);
  }, []);

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (preSubmitted) {
      setSelectedOption(preSelectedAnswer || null);
      setCommittedAnswer(preSelectedAnswer || null);
      setHasSubmitted(true);
      setQuestionExpanded(false);
    } else {
      const saved = sessionStorage.getItem(getStorageKey());
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSelectedOption(parsed.selectedOption || null);
          setCommittedAnswer(parsed.hasSubmitted ? parsed.selectedOption || null : null);
          setHasSubmitted(Boolean(parsed.hasSubmitted));
          setQuestionExpanded(!parsed.hasSubmitted);
        } catch {
          setSelectedOption(null);
          setCommittedAnswer(null);
          setHasSubmitted(false);
          setQuestionExpanded(true);
        }
      } else {
        setSelectedOption(null);
        setCommittedAnswer(null);
        setHasSubmitted(false);
        setQuestionExpanded(true);
      }
    }
    setShowAllDistractors(false);
    setTutorTurns(preSubmitted ? preTutorTurns || [] : []);
    setAiQuestion('');
    setAiStreaming(false);
    setTutorAssessing(false);
    setAnswerStartedAt(0);
    setConfidenceLevel(preConfidence || null);
    setPassedChecks(prePassedChecks);
    setAdvancePending(false);
    setTutorError(null);
    resetOnFirstTutorTextRef.current = false;
    abortControllerRef.current?.abort();
    clearAdvanceTimer();
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
    return () => { clearAdvanceTimer(); abortControllerRef.current?.abort(); };
  }, [question.id, question.question, question.question_stem, preSubmitted, preSelectedAnswer]);

  const onTutorTurnsChangeRef = useRef(onTutorTurnsChange);
  onTutorTurnsChangeRef.current = onTutorTurnsChange;
  useEffect(() => {
    if (hasSubmitted) onTutorTurnsChangeRef.current?.(tutorTurns);
  }, [hasSubmitted, tutorTurns]);

  const options = useMemo(
    () => (question.options || []).map((option: any, index: number) =>
      typeof option === 'string' ? { id: String.fromCharCode(65 + index), text: option } : option,
    ),
    [question.options],
  );

  const rawCorrectAnswer = question.correctAnswer ?? question.correct_answer ?? 'A';
  const correctAnswerId = typeof rawCorrectAnswer === 'number' ? String.fromCharCode(65 + rawCorrectAnswer) : String(rawCorrectAnswer);
  const rawQuestionContent = String((question as any).clinical_vignette || question.question_stem || question.question || '');
  const askLine = extractLeadIn(question, rawQuestionContent);
  const displayQuestionContent = stripLeadInFromVignette(rawQuestionContent, askLine);
  const vignetteParagraphs = buildVignetteParagraphs(displayQuestionContent);
  const explanation = sanitiseExplanation(question.explanation || question.worked_solution || '');
  const keyFact = sanitiseExplanation((question as any).key_fact || '');
  const conceptTitle = String((question as any).concept_title || question.title || (question as any).topic || 'Clinical concept');
  const distractors = ((question as any).distractorExplanations || {}) as Record<string, string>;
  const displayedSelectedText = options.find((option: any) => option.id === (committedAnswer || selectedOption))?.text || '';
  const correctOptionText = options.find((option: any) => option.id === correctAnswerId)?.text || '';
  const isCorrect = hasSubmitted && committedAnswer === correctAnswerId;
  const progress = totalQuestions ? Math.min(100, ((currentIndex + (hasSubmitted ? 1 : 0)) / totalQuestions) * 100) : 0;
  const isFinalQuestion = Boolean(totalQuestions && currentIndex >= totalQuestions - 1);
  const tutorBusy = tutorAssessing || aiStreaming;
  const lastTutorTurn = tutorTurns[tutorTurns.length - 1];
  const waitingForTutorText = tutorBusy && (
    !lastTutorTurn ||
    lastTutorTurn.role === 'student' ||
    (lastTutorTurn.role === 'tutor' && !lastTutorTurn.text)
  );

  const handleOptionSelect = (id: string) => {
    if (hasSubmitted) return;
    setSelectedOption(id);
    sessionStorage.setItem(getStorageKey(), JSON.stringify({ selectedOption: id, hasSubmitted: false }));
  };

  const handleNext = () => {
    clearAdvanceTimer();
    setAdvancePending(false);
    abortControllerRef.current?.abort();
    onNext();
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const scrollToSessionTop = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  };

  const keepFirstTutorTextAtTop = () => {
    if (!resetOnFirstTutorTextRef.current) return;
    resetOnFirstTutorTextRef.current = false;
    scrollToSessionTop();
  };

  const scheduleAdvance = () => {
    if (preSubmitted) return;
    clearAdvanceTimer();
    setAdvancePending(true);
    advanceTimerRef.current = window.setTimeout(handleNext, 3200);
  };

  const cancelAdvance = () => {
    clearAdvanceTimer();
    setAdvancePending(false);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const makeContext = (selectedId: string, confidence: ConfidenceLevel | null): QuestionContext => {
    const selectedText = options.find((option: any) => option.id === selectedId)?.text || 'Selected option';
    const optionLines = options.map((option: any) => `${option.id}. ${option.text}`).join('\n');
    return {
      question: [
        `CONCEPT: ${conceptTitle}`,
        `QUESTION: ${askLine || rawQuestionContent}`,
        `CLINICAL VIGNETTE: ${displayQuestionContent}`,
        `STUDENT SELECTED: ${selectedId}. ${selectedText}`,
        `CORRECT ANSWER: ${correctAnswerId}. ${correctOptionText}`,
        `CONFIDENCE: ${confidence || 'not supplied'}`,
        `VERIFIED EXPLANATION: ${explanation || 'Not supplied'}`,
        `KEY FACT: ${keyFact || 'Not supplied'}`,
        `VERIFIED DISTRACTOR FEEDBACK: ${selectedId !== correctAnswerId ? (distractors[selectedId] || 'Not supplied') : 'Not applicable'}`,
        `OPTIONS:\n${optionLines}`,
      ].join('\n\n'),
      options: options.map((option: any) => `${option.id}. ${option.text}`),
      correctAnswer: `${correctAnswerId}. ${correctOptionText}`,
      selectedAnswer: `${selectedId}. ${selectedText}`,
      explanation: explanation || keyFact,
    };
  };

  const runTutor = async (
    studentText?: string,
    forceDirect = false,
    selectedOverride?: string,
    startedOverride?: number,
    instructionOverride?: string,
    advanceAfter = false,
    confidenceOverride?: ConfidenceLevel | null,
  ) => {
    if (aiStreaming) return;
    const selectedId = selectedOverride || committedAnswer;
    if (!selectedId) return;

    const confidence = confidenceOverride || confidenceLevel || await waitForConfidence(conceptTitle, startedOverride || answerStartedAt || Date.now());
    if (confidence && confidence !== confidenceLevel) setConfidenceLevel(confidence);
    const wasCorrect = selectedId === correctAnswerId;
    const priorTurns = tutorTurns.slice(-8);

    if (studentText?.trim()) setTutorTurns(previous => [...previous, { role: 'student', text: studentText.trim() }]);
    setAiQuestion('');
    setTutorError(null);
    setAiStreaming(true);

    const context = makeContext(selectedId, confidence);
    const transcript = [
      ...priorTurns,
      ...(studentText?.trim() ? [{ role: 'student' as const, text: studentText.trim() }] : []),
    ].map(turn => `${turn.role === 'student' ? 'LEARNER' : 'TUTOR'}: ${turn.text}`).join('\n');

    const instruction = instructionOverride || (forceDirect
      ? directExplanationInstruction()
      : studentText?.trim()
        ? 'Continue the tutoring conversation. Respond directly to the learner\'s latest message. Diagnose only what their words support. Make one pedagogical move. If understanding still needs evidence, end with one short application question prefixed "Quick check:". Never declare the concept secure unless the tutoring controller has explicitly instructed you to close.'
        : proactiveOpeningInstruction(wasCorrect, confidence));

    const prompt = `${instruction}\n\nCONVERSATION SO FAR:\n${transcript || '(none yet)'}\n\nUse only the supplied current-question context for medical claims. Do not contradict the verified explanation. Keep the interaction concise and tutor-like.`;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let streamed = '';
    let succeeded = false;

    setTutorTurns(previous => [...previous, { role: 'tutor', text: '' }]);

    try {
      const finalResponse = await generateAIResponseStream(
        prompt,
        context,
        token => {
          const isFirstVisibleToken = !streamed.trim() && Boolean(token.trim());
          streamed += token;
          setTutorTurns(previous => {
            const next = [...previous];
            const last = next[next.length - 1];
            if (last?.role === 'tutor') next[next.length - 1] = { role: 'tutor', text: streamed };
            return next;
          });
          if (isFirstVisibleToken) keepFirstTutorTextAtTop();
        },
        () => undefined,
        controller.signal,
      );
      succeeded = true;
      if (finalResponse) {
        setTutorTurns(previous => {
          const next = [...previous];
          if (next[next.length - 1]?.role === 'tutor') next[next.length - 1] = { role: 'tutor', text: finalResponse };
          return next;
        });
        keepFirstTutorTextAtTop();
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('StudyEdit tutor failed:', error);
        const fallback = forceDirect
          ? (explanation || keyFact || 'Review the decisive clue and correct answer before moving on.')
          : (explanation || keyFact || 'Use the marked answer and the decisive clue in the case before moving on.');
        setTutorTurns(previous => {
          const next = [...previous];
          if (next[next.length - 1]?.role === 'tutor') next[next.length - 1] = { role: 'tutor', text: fallback };
          return next;
        });
        setTutorError('The personalised tutor connection dropped. I’m showing the verified answer explanation instead.');
        keepFirstTutorTextAtTop();
      }
    } finally {
      if (!controller.signal.aborted) {
        setAiStreaming(false);
        if (succeeded && (advanceAfter || (!studentText && wasCorrect && confidence === 'know'))) scheduleAdvance();
      }
      abortControllerRef.current = null;
    }
  };

  const handleStudentReply = async (studentText: string) => {
    const query = studentText.trim();
    if (!query || aiStreaming || tutorAssessing || !committedAnswer) return;

    const navigationIntent = tutorNavigationIntent(query);
    if (navigationIntent === 'stop') {
      cancelAdvance();
      if (onExit) onExit();
      else handleNext();
      return;
    }
    if (navigationIntent === 'next') {
      handleNext();
      return;
    }

    cancelAdvance();
    setAiQuestion('');
    setTutorAssessing(true);

    try {
      const confidence = confidenceLevel || readLatestConfidence(conceptTitle, answerStartedAt - 1000);
      if (confidence && confidence !== confidenceLevel) setConfidenceLevel(confidence);
      const context = makeContext(committedAnswer, confidence);
      const recentTranscript = [
        ...tutorTurns.slice(-8),
        { role: 'student' as const, text: query },
      ].map(turn => `${turn.role === 'student' ? 'LEARNER' : 'TUTOR'}: ${turn.text}`).join('\n');

      const assessmentPrompt = `You are the hidden StudyEdit tutoring controller. Judge the learner's latest reply against the tutor's immediately preceding question or instruction and the verified current-question context. Return exactly ONE label and nothing else: PASS, PARTIAL, FAIL, or CLARIFY.\n\nPASS = the reply correctly demonstrates the understanding the tutor just tested.\nPARTIAL = directionally right but incomplete, vague, or still dependent on prompting.\nFAIL = incorrect or reveals the same misconception.\nCLARIFY = the learner is asking a genuine question, requesting explanation, or otherwise not attempting the tutor's check.\n\nDo not reward confident wording if the medical content is wrong. Do not require wording identical to the model answer.\n\nTRANSCRIPT:\n${recentTranscript}`;

      let assessment: TutorAssessment = 'partial';
      try {
        assessment = parseTutorAssessment(await generateAIResponse(assessmentPrompt, context));
      } catch {
        assessment = 'partial';
      }

      if (assessment === 'clarify') {
        await runTutor(
          query,
          false,
          undefined,
          undefined,
          'The learner is asking for clarification rather than attempting the check. Answer their question directly and concisely. Then, if understanding still needs evidence, return to the learning goal with one short Quick check. Do not declare mastery yet.',
        );
        return;
      }

      if (assessment === 'pass') {
        const nextPassed = passedChecks + 1;
        setPassedChecks(nextPassed);
        if (/quick\s*check/i.test([...tutorTurns].reverse().find(turn => turn.role === 'tutor')?.text || '')) {
          onPassedChecksChange?.(nextPassed);
        }
        const needed = requiredEvidence(isCorrect, confidence);

        if (nextPassed >= needed) {
          await runTutor(query, false, undefined, undefined, secureClosingInstruction(isFinalQuestion), true);
        } else {
          await runTutor(
            query,
            false,
            undefined,
            undefined,
            'The learner answered that step correctly, but you still need stronger evidence before moving on. Briefly acknowledge it, then ask ONE transfer question that changes one clinically meaningful variable or asks them for the decisive discriminator. Prefix it with "Quick check:". Do not repeat the same question and do not declare mastery yet.',
          );
        }
        return;
      }

      const correctionInstruction = assessment === 'fail'
        ? 'The learner has not demonstrated the target understanding yet. Correct the exact misconception in the shortest useful way, then ask one simpler Quick check that tests the same discriminator from a different angle. Do not move on.'
        : 'The learner is partly there but the evidence is not secure. Name the missing piece without overexplaining, then ask one focused Quick check that requires them to supply that missing piece. Do not move on.';

      await runTutor(query, false, undefined, undefined, correctionInstruction);
    } finally {
      setTutorAssessing(false);
    }
  };

  const handleCheckAnswer = (confidence?: ConfidenceLevel) => {
    if (!selectedOption || hasSubmitted) return;
    if (collectConfidence && !confidence) return;
    const correct = selectedOption === correctAnswerId;
    const startedAt = Date.now();
    setAnswerStartedAt(startedAt);
    setCommittedAnswer(selectedOption);
    setHasSubmitted(true);
    setQuestionExpanded(false);
    setConfidenceLevel(confidence || null);
    sessionStorage.setItem(getStorageKey(), JSON.stringify({ selectedOption, hasSubmitted: true }));
    onAnswer(correct, selectedOption, confidence);
    resetOnFirstTutorTextRef.current = true;
    scrollToSessionTop();
    void runTutor(undefined, false, selectedOption, startedAt, undefined, false, confidence || null);
  };

  return (
    <div ref={rootRef} className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: C.parchment, color: C.ink, fontFamily: learningFont }}>
      <header className="shrink-0 border-b backdrop-blur-md" style={{ borderColor: 'rgba(232,220,196,.7)', backgroundColor: 'rgba(244,236,223,.92)' }}>
        <div className="mx-auto flex w-full max-w-[700px] items-center justify-between px-5 py-4 sm:px-8">
          <div className="text-[24px] tracking-[-0.04em]" style={{ color: C.espresso, fontFamily: brandFont }}>
            studyedit<span style={{ color: C.blush }}>.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-semibold" style={{ color: C.muted }}>
              {currentIndex + 1}{totalQuestions ? ` / ${totalQuestions}` : ''}
            </span>
            {totalQuestions > 0 && (
              <div className="h-1 w-[76px] overflow-hidden rounded-full" style={{ backgroundColor: '#E2D4BE' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: C.sage }} />
              </div>
            )}
            {onExit && (
              <button onClick={onExit} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: C.muted }} aria-label="Exit practice">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[700px] px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
          <h1 className="sr-only">UKMLA practice: {conceptTitle}</h1>
          {!hasSubmitted || questionExpanded ? (
            <section aria-label="Question" className={`animate-[fadeIn_.25s_ease] ${hasSubmitted && questionExpanded ? 'studyedit-case-expanded' : ''}`}>
    {hasSubmitted && questionExpanded ? (
      <button type="button" onClick={() => setQuestionExpanded(false)} className="studyedit-case-collapse-head flex w-full items-center gap-3 text-left" aria-label="Collapse case">
        <span className={`studyedit-case-status ${isCorrect ? 'is-correct' : 'is-wrong'}`} aria-hidden="true">{isCorrect ? '✓' : '×'}</span>
        <span className="studyedit-case-copy min-w-0 flex-1">
          <span className="studyedit-case-topic block truncate">{conceptTitle}</span>
          <span className="studyedit-case-answer block truncate">{displayedSelectedText}</span>
        </span>
        <ChevronDown className="studyedit-case-chevron h-5 w-5 shrink-0 rotate-180" aria-hidden="true" />
      </button>
    ) : (
      <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.muted }}>{conceptTitle}</div>
    )}

              <div className="text-[20px] font-medium leading-[1.65] tracking-[-0.01em] sm:text-[21px]" style={{ color: C.espresso }}>
                {vignetteParagraphs.map((paragraph, index) => (
                  <div key={index} className="mb-6 last:mb-0"><ReactMarkdown>{paragraph}</ReactMarkdown></div>
                ))}
              </div>

              {askLine && (
                <div className="mt-8 border-t pt-6 text-[20px] font-bold leading-[1.55] tracking-[-0.01em] sm:text-[21px]" style={{ borderColor: C.line, color: C.espresso }}>
                  {askLine}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                {options.map((option: any) => {
                  const selected = selectedOption === option.id;
                  const correct = option.id === correctAnswerId;
                  const wrongSelected = hasSubmitted && committedAnswer === option.id && !correct;
                  const correctAfterSubmit = hasSubmitted && correct;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={hasSubmitted}
                      className="flex w-full items-center gap-4 rounded-[17px] border px-4 py-4 text-left transition sm:px-5 sm:py-[18px]"
                      style={{
                        backgroundColor: correctAfterSubmit ? C.sageSoft : wrongSelected ? C.blushSoft : selected && !hasSubmitted ? C.cream : C.paper,
                        borderColor: correctAfterSubmit ? C.sage : wrongSelected ? C.blush : selected && !hasSubmitted ? C.espresso : C.line,
                        opacity: hasSubmitted && !correct && committedAnswer !== option.id ? 0.52 : 1,
                      }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold" style={{ backgroundColor: selected && !hasSubmitted ? C.espresso : 'rgba(31,20,12,.06)', color: selected && !hasSubmitted ? C.cream : C.espresso }}>
                        {option.id}
                      </span>
                      <span className="flex-1 text-[17px] font-semibold leading-[1.45] sm:text-[18px]" style={{ color: C.espresso }}>{option.text}</span>
                      {correctAfterSubmit && <span className="font-bold" style={{ color: '#62734F' }}>✓</span>}
                      {wrongSelected && <span className="font-bold" style={{ color: '#9B5146' }}>×</span>}
                    </button>
                  );
                })}
              </div>

              {!hasSubmitted && (collectConfidence ? (
                <div className={`studyedit-confidence-prompt mt-6 transition-opacity ${selectedOption ? 'opacity-100' : 'opacity-55'}`} aria-label="Answer confidence">
                  <div className="mb-3 text-center text-[15px] font-semibold" style={{ color: C.espresso }}>How sure are you?</div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['know', 'Knew it'],
                      ['unsure', 'Unsure'],
                      ['guess', 'Guessed'],
                    ] as Array<[ConfidenceLevel, string]>).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => handleCheckAnswer(value)} disabled={!selectedOption} className="min-h-[48px] rounded-full border px-3 text-[14px] font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.espresso }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-center text-[12px]" style={{ color: '#746354' }}>{selectedOption ? 'Choose one to submit your answer.' : 'Choose an answer first.'}</div>
                </div>
              ) : (
                <button type="button" onClick={() => handleCheckAnswer()} disabled={!selectedOption} className="mt-6 flex w-full items-center justify-center rounded-full px-6 py-[18px] text-[16px] font-bold disabled:cursor-not-allowed" style={{ backgroundColor: selectedOption ? C.espresso : '#D9CCB6', color: selectedOption ? C.cream : '#746354' }}>
                  Check answer
                </button>
              ))}
            </section>
          ) : (
            <button type="button" onClick={() => setQuestionExpanded(true)} className="studyedit-case-summary flex w-full items-center text-left" aria-label="Expand full case">
    <span className={`studyedit-case-status ${isCorrect ? 'is-correct' : 'is-wrong'}`} aria-hidden="true">{isCorrect ? '✓' : '×'}</span>
    <span className="studyedit-case-copy min-w-0 flex-1">
      <span className="studyedit-case-topic block truncate">{conceptTitle}</span>
      <span className="studyedit-case-answer block truncate">{displayedSelectedText}</span>
    </span>
    <ChevronDown className="studyedit-case-chevron h-5 w-5 shrink-0" aria-hidden="true" />
  </button>
          )}

          {hasSubmitted && !questionExpanded && (
            <section className="mt-8 scroll-mt-24" aria-label="Answer and tutor">
              <div className="mb-6 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: isCorrect ? '#62734F' : '#94483D' }}>
                {isCorrect ? 'Correct' : 'Not quite'}
              </div>

              <div className="space-y-6">
                {tutorTurns.map((turn, index) => {
                  if (!turn.text) return null;
                  if (turn.role === 'student') {
                    return (
                      <div key={index} className="border-y py-5" style={{ borderColor: C.line }}>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.muted }}>You</div>
                        <div className="text-[20px] font-semibold leading-[1.55] tracking-[-0.01em] sm:text-[21px]" style={{ color: C.espresso }}>
                          {turn.text}
                        </div>
                      </div>
                    );
                  }
                  const tutorIndex = tutorTurns.slice(0, index + 1).filter(item => item.role === 'tutor' && item.text).length;
                  return <TutorMessage key={index} text={turn.text} first={tutorIndex === 1} />;
                })}

                {waitingForTutorText && <TutorWorkingIndicator />}
              </div>

              {tutorError && (
                <div className="mt-5 rounded-[15px] border px-4 py-3 text-[13px] font-semibold leading-5" role="status" style={{ borderColor: '#E4C9C2', backgroundColor: C.blushSoft, color: '#7D4139' }}>
                  {tutorError}
                </div>
              )}

              {!preSubmitted && advancePending && (
                <div className="mt-7 flex items-center justify-between gap-4 border-t pt-4" style={{ borderColor: C.line }}>
                  <span className="text-[12px] font-semibold" style={{ color: C.muted }}>{isFinalQuestion ? 'Wrapping up…' : 'Moving on…'}</span>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={cancelAdvance} className="text-[12px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: '#746354' }}>
                      Wait — I have a question
                    </button>
                    <button type="button" onClick={handleNext} className="text-[13px] font-bold underline decoration-[#BBA995] underline-offset-4" style={{ color: C.espresso }}>
                      {isFinalQuestion ? 'Finish now →' : 'Next now →'}
                    </button>
                  </div>
                </div>
              )}

              {!advancePending && (
                <>
                  <div className="mt-7 flex justify-end border-t pt-4" style={{ borderColor: C.line }}>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="text-[14px] font-bold underline decoration-[#BBA995] underline-offset-4 transition-opacity active:opacity-60"
                      style={{ color: C.espresso }}
                    >
                      {isFinalQuestion ? (nextButtonText || 'Finish session →') : (nextButtonText || 'Next question →')}
                    </button>
                  </div>
                  <form className="mt-5 flex items-end gap-2 rounded-[18px] border bg-[#FFFDF8] p-2 pl-4 shadow-[0_8px_24px_rgba(31,20,12,0.04)]" style={{ borderColor: '#DCCDB8' }} onSubmit={event => {
                    event.preventDefault();
                    const query = aiQuestion.trim();
                    if (query) void handleStudentReply(query);
                  }}>
                    <textarea
                      aria-label="Your reply to the tutor"
                      ref={setComposerRef}
                      rows={1}
                      value={aiQuestion}
                      onChange={event => {
                        setAiQuestion(event.target.value);
                        event.currentTarget.style.height = 'auto';
                        event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 180)}px`;
                        event.currentTarget.style.overflowY = event.currentTarget.scrollHeight > 180 ? 'auto' : 'hidden';
                      }}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          const query = aiQuestion.trim();
                          if (query && !tutorBusy) void handleStudentReply(query);
                        }
                      }}
                      disabled={tutorBusy}
                      placeholder={tutorBusy ? 'StudyEdit is thinking…' : 'Reply or ask anything…'}
                      className="min-h-[44px] max-h-[180px] min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[16px] font-medium leading-6 outline-none placeholder:text-[#766655] disabled:cursor-wait"
                      style={{ color: C.espresso, overflowY: 'hidden' }}
                    />
                    {composerInput && rootRef.current && !tutorBusy && <TutorVoiceControls input={composerInput} tutorRoot={rootRef.current} />}
                    <button
                      type="submit"
                      disabled={!aiQuestion.trim() || tutorBusy}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-[0.96] disabled:opacity-35"
                      style={{ backgroundColor: C.espresso, color: C.cream }}
                      aria-label="Reply to StudyEdit"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>

                  <button type="button" onClick={() => void runTutor(undefined, true)} disabled={tutorBusy} className="mt-3 text-[12px] font-semibold underline decoration-[#BBA995] underline-offset-4 disabled:opacity-40" style={{ color: C.muted }}>Just explain it</button>
                </>
              )}

              {Object.keys(distractors).length > 0 && !advancePending && !tutorBusy && (
                <div className="mt-8 border-t pt-4" style={{ borderColor: C.line }}>
                  <button type="button" onClick={() => setShowAllDistractors(value => !value)} className="flex w-full items-center justify-between py-2 text-left text-[14px] font-semibold" style={{ color: C.muted }}>
                    <span>{showAllDistractors ? 'Hide other options' : 'Why the other options are wrong'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAllDistractors ? 'rotate-180' : ''}`} />
                  </button>
                  {showAllDistractors && (
                    <div className="mt-2 divide-y" style={{ borderColor: C.line }}>
                      {Object.entries(distractors).filter(([letter]) => letter !== correctAnswerId).map(([letter, text]) => (
                        <div key={letter} className="grid grid-cols-[26px_1fr] gap-3 py-3 text-[17px] font-medium leading-7 sm:text-[18px]" style={{ color: '#59483B', borderColor: C.line }}>
                          <strong style={{ color: C.espresso }}>{letter}.</strong>
                          <SkimmableMarkdown text={text} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-[12px] font-semibold" style={{ borderColor: C.line, color: '#746354' }}>
                {(question as any).guideline_url ? (
                  <a href={String((question as any).guideline_url)} target="_blank" rel="noreferrer" className="underline decoration-[#BBA995] underline-offset-4">
                    Source: {String((question as any).guideline || (question as any).source_type || 'clinical guidance')}
                  </a>
                ) : <span>Answer grounded in the supplied learning material</span>}
                {footerControl}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
