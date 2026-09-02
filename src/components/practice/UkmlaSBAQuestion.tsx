import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateAIResponse, generateAIResponseStream, QuestionContext } from '@/services/openai';
import {
  generateQualityCheckedFollowUpSba,
  type FollowUpSbaRequest,
  type StructuredFollowUpSba,
} from '@/services/structuredFollowUpSba';
import type { FilterState } from './PracticeFilterModalParchment';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';
import { FollowUpSbaCard } from './FollowUpSbaCard';

interface UkmlaSBAQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
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
  nextButtonText?: string;
}

type ConfidenceLevel = 'know' | 'unsure' | 'guess';
type TutorTurn = { role: 'student' | 'tutor'; text: string; followUpSba?: StructuredFollowUpSba };
type TutorAssessment = 'pass' | 'partial' | 'fail' | 'clarify';
type TutorPlan = { instruction: string; followUp?: FollowUpSbaRequest };

const C = {
  parchment: '#F4ECDF',
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
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

function TutorMessage({
  text,
  first,
  followUpSba,
  followUpDisabled,
  onFollowUpSubmit,
}: {
  text: string;
  first: boolean;
  followUpSba?: StructuredFollowUpSba;
  followUpDisabled: boolean;
  onFollowUpSubmit: (sba: StructuredFollowUpSba, answerId: string) => void | Promise<void>;
}) {
  return (
    <div className={first ? '' : 'border-t pt-6'} style={{ borderColor: C.line }}>
      {text && (
        <SkimmableMarkdown
          text={text}
          className="text-[20px] font-medium leading-[1.65] tracking-[-0.01em] text-[#3B2A1E] sm:text-[21px]"
        />
      )}
      {followUpSba && (
        <FollowUpSbaCard
          sba={followUpSba}
          disabled={followUpDisabled}
          onSubmit={answerId => onFollowUpSubmit(followUpSba, answerId)}
        />
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

function proactiveOpeningPlan(correct: boolean, confidence: ConfidenceLevel | null): TutorPlan {
  const common = 'You are StudyEdit Tutor. The learner has just answered this SBA. Use the verified explanation and key point as ground truth. Do not invent why they chose an option. Make ONE useful pedagogical move only. Usually use one or two concise sentences. Say something only if it changes or sharpens what the learner understands.';

  if (correct && confidence === 'know') {
    return {
      instruction: `${common} They were correct and said they knew it. Give ONE brief confirmation of the decisive clue, then stop. Do not ask another question and do not say they have mastered, secured, locked in, or solidified the concept.`,
    };
  }

  if (correct && confidence === 'unsure') {
    return {
      instruction: `${common} They were correct but unsure. Briefly name the decisive discriminator once. Do not repeat the whole explanation. A single quality-checked application SBA will follow, so do not write a question or options in prose.`,
      followUp: {
        mode: 'application',
        teachingObjective: 'Demonstrate deliberate use of the verified decisive discriminator in one genuinely useful new check.',
      },
    };
  }

  if (correct && confidence === 'guess') {
    return {
      instruction: `${common} They were correct but guessed. Do not teach immediately and do not imply mastery. Ask one short question about what made them choose that option so you can distinguish lucky recognition from partial reasoning.`,
    };
  }

  if (!correct && confidence === 'know') {
    return {
      instruction: `${common} They were wrong but said they knew it, suggesting a possible misconception. Do not explain the full answer yet. Ask them, in one sentence, to talk you through the reasoning that led to their selected option.`,
    };
  }

  if (!correct && confidence === 'unsure') {
    return {
      instruction: `${common} They were wrong and unsure. Do not explain everything yet. Ask one short, specific question about what made them lean toward their selected option.`,
    };
  }

  if (!correct && confidence === 'guess') {
    return {
      instruction: `${common} They were wrong and guessed. Teach only the smallest verified rule needed to orient them, in no more than two short sentences. A single quality-checked prerequisite SBA will follow, so do not write a question or options in prose.`,
      followUp: {
        mode: 'prerequisite',
        teachingObjective: 'Apply the smallest verified prerequisite or rule needed for this concept.',
      },
    };
  }

  return {
    instruction: `${common} Confidence is unavailable. Ask one short neutral question to understand what the learner was thinking before explaining.`,
  };
}

function directExplanationInstruction(): string {
  return 'Give the direct explanation now using the verified explanation as ground truth. Explain only the decisive mechanism or discriminator in about 50-80 words. Avoid repeating points already made. Do not narrate mastery or evidence counting. Do not write answer options; one quality-checked application SBA may follow.';
}

function secureClosingInstruction(isFinalQuestion: boolean): string {
  return isFinalQuestion
    ? 'The learner has demonstrated the target distinction. Acknowledge the exact distinction in ONE short sentence only. Do not restate the teaching, do not say mastered/secure/solid/locked in, do not mention evidence counts, and do not ask another question. End naturally.'
    : 'The learner has demonstrated the target distinction. Acknowledge the exact distinction in ONE short sentence only. Do not restate the teaching, do not say mastered/secure/solid/locked in, do not mention evidence counts, and do not say “I have seen enough”. Do not ask another question. The interface will move on automatically.';
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
  nextButtonText,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(preSelectedAnswer || null);
  const [committedAnswer, setCommittedAnswer] = useState<string | null>(preSubmitted ? preSelectedAnswer || null : null);
  const [hasSubmitted, setHasSubmitted] = useState(preSubmitted);
  const [showAllDistractors, setShowAllDistractors] = useState(false);
  const [questionExpanded, setQuestionExpanded] = useState(!preSubmitted);
  const [tutorTurns, setTutorTurns] = useState<TutorTurn[]>([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [tutorAssessing, setTutorAssessing] = useState(false);
  const [answerStartedAt, setAnswerStartedAt] = useState(0);
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel | null>(null);
  const [advancePending, setAdvancePending] = useState(false);
  const [resolvedFollowUpIds, setResolvedFollowUpIds] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tutorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const getStorageKey = () => `sba_answer_${question.id || question.question?.substring(0, 50)}`;

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
    setTutorTurns([]);
    setAiQuestion('');
    setAiStreaming(false);
    setTutorAssessing(false);
    setAnswerStartedAt(0);
    setConfidenceLevel(null);
    setAdvancePending(false);
    setResolvedFollowUpIds([]);
    abortControllerRef.current?.abort();
    clearAdvanceTimer();
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }));
    return () => clearAdvanceTimer();
  }, [question.id, question.question, question.question_stem, preSubmitted, preSelectedAnswer]);

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
  const hasOpenFollowUp = tutorTurns.some(turn => Boolean(turn.followUpSba && !resolvedFollowUpIds.includes(turn.followUpSba.id)));
  const waitingForTutorText = tutorBusy && (
    !lastTutorTurn ||
    lastTutorTurn.role === 'student' ||
    (lastTutorTurn.role === 'tutor' && !lastTutorTurn.followUpSba)
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

  const scheduleAdvance = () => {
    if (preSubmitted) return;
    clearAdvanceTimer();
    setAdvancePending(true);
    advanceTimerRef.current = window.setTimeout(handleNext, 2600);
  };

  const cancelAdvance = () => {
    clearAdvanceTimer();
    setAdvancePending(false);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const makeContext = (selectedId: string, confidence: ConfidenceLevel | null): QuestionContext => {
    const selectedText = options.find((option: any) => option.id === selectedId)?.text || 'Selected option';
    const optionLines = options.map((option: any) => `${option.id}. ${option.text}`).join('\n');
    const sourceLabel = String((question as any).guideline || (question as any).source_type || '').trim();
    const sourceUrl = String((question as any).guideline_url || '').trim();
    const sourceSection = String((question as any).guideline_section || '').trim();
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
        sourceLabel ? `SOURCE LABEL: ${sourceLabel}` : '',
        sourceSection ? `SOURCE SECTION: ${sourceSection}` : '',
        sourceUrl ? `SOURCE URL METADATA: ${sourceUrl}` : '',
        `OPTIONS:\n${optionLines}`,
      ].filter(Boolean).join('\n\n'),
      options: options.map((option: any) => `${option.id}. ${option.text}`),
      correctAnswer: `${correctAnswerId}. ${correctOptionText}`,
      selectedAnswer: `${selectedId}. ${selectedText}`,
      explanation: explanation || keyFact,
    };
  };

  const turnForTranscript = (turn: TutorTurn): string => {
    const prefix = turn.role === 'student' ? 'LEARNER' : 'TUTOR';
    if (!turn.followUpSba) return `${prefix}: ${turn.text}`;
    const optionLines = turn.followUpSba.options.map(option => `${option.id}. ${option.text}`).join('\n');
    return `${prefix}: ${turn.text}\nSTRUCTURED FOLLOW-UP SBA: ${turn.followUpSba.stem}\n${optionLines}\nKEYED ANSWER: ${turn.followUpSba.correctAnswerId}\nRATIONALE: ${turn.followUpSba.rationale}`;
  };

  const attachFollowUpToLatestTutorTurn = (sba: StructuredFollowUpSba) => {
    setTutorTurns(previous => {
      const next = [...previous];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (next[index].role === 'tutor') {
          next[index] = { ...next[index], followUpSba: sba };
          break;
        }
      }
      return next;
    });
  };

  const appendSafeFallbackCheck = () => {
    setTutorTurns(previous => {
      const next = [...previous];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (next[index].role === 'tutor') {
          const base = next[index].text.trim();
          next[index] = {
            ...next[index],
            text: `${base}${base ? '\n\n' : ''}In one sentence, what makes the correct option better than the closest alternative?`,
          };
          break;
        }
      }
      return next;
    });
  };

  const runTutor = async (
    studentText?: string,
    forceDirect = false,
    selectedOverride?: string,
    startedOverride?: number,
    instructionOverride?: string,
    advanceAfter = false,
    followUpRequest?: FollowUpSbaRequest,
  ) => {
    if (aiStreaming) return;
    const selectedId = selectedOverride || committedAnswer;
    if (!selectedId) return;

    const confidence = confidenceLevel || await waitForConfidence(conceptTitle, startedOverride || answerStartedAt || Date.now());
    if (confidence && confidence !== confidenceLevel) setConfidenceLevel(confidence);
    const wasCorrect = selectedId === correctAnswerId;
    const priorTurns = tutorTurns.slice(-8);

    if (studentText?.trim()) setTutorTurns(previous => [...previous, { role: 'student', text: studentText.trim() }]);
    setAiQuestion('');
    setAiStreaming(true);

    const context = makeContext(selectedId, confidence);
    const transcriptTurns = [
      ...priorTurns,
      ...(studentText?.trim() ? [{ role: 'student' as const, text: studentText.trim() }] : []),
    ] as TutorTurn[];
    const transcript = transcriptTurns.map(turnForTranscript).join('\n');
    const priorFollowUpStems = priorTurns
      .map(turn => turn.followUpSba?.stem || turn.followUpSba?.transferCase?.question || '')
      .filter(Boolean);

    const openingPlan = !instructionOverride && !forceDirect && !studentText?.trim()
      ? proactiveOpeningPlan(wasCorrect, confidence)
      : null;
    const effectiveFollowUp = followUpRequest || (forceDirect
      ? { mode: 'application' as const, teachingObjective: 'Apply the verified explanation once in a useful new check.' }
      : openingPlan?.followUp);
    const followUpWithHistory = effectiveFollowUp
      ? { ...effectiveFollowUp, avoidStems: priorFollowUpStems }
      : undefined;

    const instruction = instructionOverride || (forceDirect
      ? directExplanationInstruction()
      : studentText?.trim()
        ? 'Continue the tutoring conversation naturally. Respond directly to the learner’s latest message. Diagnose only what their words support. Make ONE useful pedagogical move. Do not invent an A-D question in prose. Do not repeat a point already made unless the learner is still getting that exact point wrong.'
        : openingPlan?.instruction || proactiveOpeningPlan(wasCorrect, confidence).instruction);

    const structuredNote = followUpWithHistory
      ? '\n\nA separate structured, quality-checked SBA will be generated after your teaching turn. Do NOT include a question, “Quick check”, or A-D answer options in your prose.'
      : '';
    const prompt = `${instruction}${structuredNote}\n\nCONVERSATION SO FAR:\n${transcript || '(none yet)'}\n\nUse only the supplied current-question context for medical claims. Do not contradict the verified explanation. Keep the interaction concise and tutor-like. Prefer 1-2 sentences and usually stay under 55 words unless answering a genuine learner question. Never narrate the tutoring machinery or evidence count. Avoid phrases such as “lock this in”, “pattern to remember”, “you've got this solidly”, “secure”, “mastered”, or “I've seen enough”. If a point was already clearly stated in the preceding tutor turn, do not state it again unless correcting a repeated error.`;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let streamed = '';

    setTutorTurns(previous => [...previous, { role: 'tutor', text: '' }]);

    try {
      await generateAIResponseStream(
        prompt,
        context,
        token => {
          streamed += token;
          setTutorTurns(previous => {
            const next = [...previous];
            const last = next[next.length - 1];
            if (last?.role === 'tutor') next[next.length - 1] = { ...last, text: streamed };
            return next;
          });
        },
        () => undefined,
        controller.signal,
      );

      if (!controller.signal.aborted && followUpWithHistory) {
        const followUp = await generateQualityCheckedFollowUpSba(context, followUpWithHistory);
        if (controller.signal.aborted) return;
        if (followUp) attachFollowUpToLatestTutorTurn(followUp);
        else appendSafeFallbackCheck();
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('StudyEdit tutor failed:', error);
        const fallback = forceDirect
          ? (explanation || keyFact || 'Review the decisive clue and correct answer before moving on.')
          : 'Talk me through what you were thinking, and we can work out the exact gap together.';
        setTutorTurns(previous => {
          const next = [...previous];
          const last = next[next.length - 1];
          if (last?.role === 'tutor') next[next.length - 1] = { ...last, text: fallback };
          return next;
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        setAiStreaming(false);
        if (advanceAfter || (!followUpWithHistory && !studentText && wasCorrect && confidence === 'know')) scheduleAdvance();
      }
      abortControllerRef.current = null;
    }
  };

  const handleStudentReply = async (
    studentText: string,
    assessmentOverride?: TutorAssessment,
    structuredAttemptNumber = 0,
  ) => {
    const query = studentText.trim();
    if (!query || aiStreaming || tutorAssessing || !committedAnswer) return;

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
      ].map(turnForTranscript).join('\n');

      let assessment: TutorAssessment = assessmentOverride || 'partial';
      if (!assessmentOverride) {
        const assessmentPrompt = `You are the hidden StudyEdit tutoring controller. Judge the learner's latest reply against the tutor's immediately preceding question or instruction and the verified current-question context. Return exactly ONE label and nothing else: PASS, PARTIAL, FAIL, or CLARIFY.\n\nPASS = the reply correctly demonstrates the specific understanding the tutor just tested. A single genuinely diagnostic PASS is sufficient evidence for this learning step; do not demand repetition for its own sake.\nPARTIAL = directionally right but incomplete, vague, or still dependent on prompting.\nFAIL = incorrect or reveals the same misconception.\nCLARIFY = the learner is asking a genuine question, requesting explanation, or otherwise not attempting the tutor's check.\n\nDo not reward confident wording if the medical content is wrong. Do not require wording identical to the model answer.\n\nTRANSCRIPT:\n${recentTranscript}`;
        try {
          assessment = parseTutorAssessment(await generateAIResponse(assessmentPrompt, context));
        } catch {
          assessment = 'partial';
        }
      }

      if (assessment === 'clarify') {
        await runTutor(
          query,
          false,
          undefined,
          undefined,
          'The learner is asking for clarification rather than attempting a check. Answer their question directly and concisely. Do not automatically generate another SBA. If evidence is still needed, end with ONE short natural question that targets the unresolved point. Do not narrate mastery or the tutoring process.',
        );
        return;
      }

      if (assessment === 'pass') {
        await runTutor(query, false, undefined, undefined, secureClosingInstruction(isFinalQuestion), true);
        return;
      }

      const structuredAttempts = structuredAttemptNumber || resolvedFollowUpIds.length;
      const allowAnotherStructuredCheck = structuredAttempts < 2;

      if (allowAnotherStructuredCheck) {
        const correctionInstruction = assessment === 'fail'
          ? 'Correct the exact misconception in the shortest useful way. Do not repeat the full previous explanation. Use no more than two short sentences. A single quality-checked discriminator SBA will follow, so do not write a question or options in prose.'
          : 'Name only the missing piece in the learner’s reasoning without overexplaining or repeating what they already got right. A single quality-checked discriminator SBA will follow, so do not write a question or options in prose.';

        await runTutor(
          query,
          false,
          undefined,
          undefined,
          correctionInstruction,
          false,
          {
            mode: 'discriminator',
            teachingObjective: assessment === 'fail'
              ? 'Check the corrected discriminator once from a genuinely useful angle, without repeating the previous SBA.'
              : 'Check only the specific verified piece that remained missing, without repeating the previous SBA.',
          },
        );
        return;
      }

      const naturalInstruction = assessment === 'fail'
        ? 'The learner is still getting the same point wrong after structured checks. Stop generating more SBAs. Correct only the exact remaining misconception in one or two sentences, then ask ONE short natural free-response question that would reveal whether they now understand it. Do not repeat prior wording.'
        : 'The learner remains partly correct after structured checks. Stop generating more SBAs. Name only the remaining missing piece, then ask ONE short natural free-response question. Do not repeat prior wording.';

      await runTutor(query, false, undefined, undefined, naturalInstruction);
    } finally {
      setTutorAssessing(false);
    }
  };

  const handleFollowUpAnswer = async (sba: StructuredFollowUpSba, answerId: string) => {
    if (tutorBusy || resolvedFollowUpIds.includes(sba.id)) return;
    const selected = sba.options.find(option => option.id === answerId);
    if (!selected) return;
    const attemptNumber = resolvedFollowUpIds.length + 1;
    setResolvedFollowUpIds(previous => previous.includes(sba.id) ? previous : [...previous, sba.id]);
    const assessment: TutorAssessment = answerId === sba.correctAnswerId ? 'pass' : 'fail';
    await handleStudentReply(`${answerId}. ${selected.text}`, assessment, attemptNumber);
  };

  const handleCheckAnswer = () => {
    if (!selectedOption || hasSubmitted) return;
    const correct = selectedOption === correctAnswerId;
    const startedAt = Date.now();
    setAnswerStartedAt(startedAt);
    setCommittedAnswer(selectedOption);
    setHasSubmitted(true);
    setQuestionExpanded(false);
    sessionStorage.setItem(getStorageKey(), JSON.stringify({ selectedOption, hasSubmitted: true }));
    onAnswer(correct);
    void runTutor(undefined, false, selectedOption, startedAt);
    window.setTimeout(() => tutorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: C.parchment, color: C.ink, fontFamily: learningFont }}>
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
        <main className="mx-auto w-full max-w-[700px] px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
          {!hasSubmitted || questionExpanded ? (
            <section aria-label="Question" className="animate-[fadeIn_.25s_ease]">
              <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: C.muted }}>{conceptTitle}</div>

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

              {!hasSubmitted && (
                <button type="button" onClick={handleCheckAnswer} disabled={!selectedOption} className="mt-6 flex w-full items-center justify-center rounded-full px-6 py-[18px] text-[16px] font-bold disabled:cursor-not-allowed" style={{ backgroundColor: selectedOption ? C.espresso : '#D9CCB6', color: selectedOption ? C.cream : C.muted }}>
                  Check answer
                </button>
              )}

              {hasSubmitted && questionExpanded && (
                <button type="button" onClick={() => setQuestionExpanded(false)} className="mt-5 text-[12px] font-semibold underline underline-offset-4" style={{ color: C.muted }}>
                  Hide case
                </button>
              )}
            </section>
          ) : (
            <button type="button" onClick={() => setQuestionExpanded(true)} className="flex w-full items-center justify-between border-y py-4 text-left" style={{ borderColor: C.line }}>
              <span className="min-w-0 pr-4">
                <span className="block truncate text-[15px] font-bold" style={{ color: C.espresso }}>{isCorrect ? '✓' : '×'} {conceptTitle}</span>
                <span className="mt-0.5 block truncate text-[12px] font-medium" style={{ color: C.muted }}>
                  {isCorrect ? `You chose ${displayedSelectedText}` : `You chose ${displayedSelectedText} · Correct: ${correctOptionText}`}
                </span>
              </span>
              <span className="shrink-0 text-[12px] font-semibold" style={{ color: C.muted }}>Show case</span>
            </button>
          )}

          {hasSubmitted && !questionExpanded && (
            <section ref={tutorRef} className="mt-8 scroll-mt-24" aria-label="Answer and tutor">
              <div className="mb-6 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: isCorrect ? '#62734F' : '#94483D' }}>
                {isCorrect ? 'Correct' : 'Not quite'}
              </div>

              <div className="space-y-6">
                {tutorTurns.map((turn, index) => {
                  if (!turn.text && !turn.followUpSba) return null;
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
                  const tutorIndex = tutorTurns.slice(0, index + 1).filter(item => item.role === 'tutor' && (item.text || item.followUpSba)).length;
                  return (
                    <TutorMessage
                      key={index}
                      text={turn.text}
                      first={tutorIndex === 1}
                      followUpSba={turn.followUpSba}
                      followUpDisabled={tutorBusy || Boolean(turn.followUpSba && resolvedFollowUpIds.includes(turn.followUpSba.id))}
                      onFollowUpSubmit={handleFollowUpAnswer}
                    />
                  );
                })}

                {waitingForTutorText && <TutorWorkingIndicator />}
              </div>

              {!preSubmitted && advancePending && (
                <div className="mt-7 flex items-center justify-between gap-4 border-t pt-4" style={{ borderColor: C.line }}>
                  <span className="text-[12px] font-semibold" style={{ color: C.muted }}>{isFinalQuestion ? 'Wrapping up…' : 'Moving on…'}</span>
                  <button type="button" onClick={cancelAdvance} className="text-[12px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: C.muted }}>
                    Wait — I have a question
                  </button>
                </div>
              )}

              {!preSubmitted && !advancePending && !hasOpenFollowUp && (
                <>
                  <form className="mt-7 flex items-center gap-2 rounded-[18px] border bg-[#FFFDF8] p-2 pl-4 shadow-[0_8px_24px_rgba(31,20,12,0.04)]" style={{ borderColor: '#DCCDB8' }} onSubmit={event => {
                    event.preventDefault();
                    const query = aiQuestion.trim();
                    if (query) void handleStudentReply(query);
                  }}>
                    <input
                      ref={inputRef}
                      value={aiQuestion}
                      onChange={event => setAiQuestion(event.target.value)}
                      disabled={tutorBusy}
                      placeholder={tutorBusy ? 'StudyEdit is thinking…' : 'Reply or ask anything…'}
                      className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] font-medium outline-none placeholder:text-[#A89582] disabled:cursor-wait"
                      style={{ color: C.espresso }}
                    />
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

                  <button
                    type="button"
                    onClick={() => void runTutor(undefined, true)}
                    disabled={tutorBusy}
                    className="mt-3 text-[12px] font-semibold underline decoration-[#BBA995] underline-offset-4 disabled:opacity-40"
                    style={{ color: C.muted }}
                  >
                    Just explain it
                  </button>
                </>
              )}

              {Object.keys(distractors).length > 0 && !advancePending && !tutorBusy && !hasOpenFollowUp && (
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

              {preSubmitted && nextButtonText && (
                <button type="button" onClick={handleNext} className="mt-9 flex w-full items-center justify-center rounded-full px-6 py-[18px] text-[16px] font-bold" style={{ backgroundColor: C.espresso, color: C.cream }}>
                  {nextButtonText} →
                </button>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
