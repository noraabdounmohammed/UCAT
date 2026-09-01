import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Send, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateAIResponseStream, QuestionContext } from '@/services/openai';
import type { FilterState } from './PracticeFilterModalParchment';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';

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
type TutorTurn = { role: 'student' | 'tutor'; text: string };

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
  sageSoft: '#E2EAD6',
};

function sanitiseExplanation(text: string): string {
  return String(text || '').replace(/\s{2,}/g, ' ').trim();
}

function splitSentences(text: string): string[] {
  return String(text || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
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
  ].map(value => String(value || '').trim()).filter(Boolean);

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
  const cleanVignette = String(vignette || '').replace(/\s+/g, ' ').trim();
  const cleanLeadIn = String(leadIn || '').replace(/\s+/g, ' ').trim();
  if (!cleanVignette || !cleanLeadIn) return cleanVignette;
  return splitSentences(cleanVignette)
    .filter(sentence => sentence.toLowerCase() !== cleanLeadIn.toLowerCase())
    .join(' ')
    .trim();
}

const emphasisStyle: React.CSSProperties = {
  fontWeight: 800,
  textDecorationLine: 'underline',
  textDecorationThickness: '2px',
  textUnderlineOffset: '3px',
  textDecorationColor: '#E5A89D',
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
  const quickCheckMatch = text.match(/([\s\S]*?)(?:\n\s*)?(Quick check:)([\s\S]*)/i);
  const body = quickCheckMatch ? quickCheckMatch[1].trim() : text;
  const check = quickCheckMatch ? quickCheckMatch[3].trim() : '';

  return (
    <div className={first ? '' : 'border-t pt-6'} style={{ borderColor: C.line }}>
      {body && (
        <SkimmableMarkdown
          text={body}
          className={`${first ? 'text-[20px] leading-[1.65] sm:text-[21px]' : 'text-[17px] leading-[1.72]'} font-medium tracking-[-0.01em] text-[#3B2A1E]`}
        />
      )}
      {check && (
        <div className="mt-5 rounded-[18px] border px-4 py-4 sm:px-5" style={{ borderColor: '#D6D9BE', backgroundColor: '#EEF0E2' }}>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#76835F' }}>Quick check</div>
          <SkimmableMarkdown text={check} className="text-[16px] font-semibold leading-7 text-[#3B2A1E]" />
        </div>
      )}
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
  if (correct && confidence === 'know') return `${common} They were correct and said they knew it. Give a very brief confirmation of the decisive clue and do not interrogate them. Do not end with a question.`;
  if (correct && confidence === 'unsure') return `${common} They were correct but unsure. Briefly name the decisive discriminator, then ask one tiny check question that confirms they can use it deliberately. Prefix that final check with "Quick check:".`;
  if (correct && confidence === 'guess') return `${common} They were correct but guessed. Do not imply mastery. Ask what made them choose this answer before teaching it, so you can distinguish lucky recognition from partial reasoning.`;
  if (!correct && confidence === 'know') return `${common} They were wrong but said they knew it, which may indicate a misconception. Do NOT explain the answer yet. Ask them to talk you through how they got to their selected answer.`;
  if (!correct && confidence === 'unsure') return `${common} They were wrong and unsure. Do NOT explain the answer yet. Ask what made them lean toward their selected answer. Keep it warm and specific to the option they chose.`;
  if (!correct && confidence === 'guess') return `${common} They were wrong and guessed. There may be no reasoning to interrogate, so do not ask why they picked it. Teach the smallest prerequisite or rule needed to start, then ask one short prerequisite check. Prefix the check with "Quick check:".`;
  return `${common} Confidence is unavailable. Ask one short neutral question to understand what the learner was thinking before you explain.`;
}

function directExplanationInstruction(): string {
  return 'Give the direct explanation now. Use the verified explanation as ground truth. Explain the decisive mechanism/discriminator in about 80-120 words and finish with one short carry-forward rule. Do not invent the learner\'s reasoning.';
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
  const [tutorTurns, setTutorTurns] = useState<TutorTurn[]>([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [answerStartedAt, setAnswerStartedAt] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getStorageKey = () => `sba_answer_${question.id || question.question?.substring(0, 50)}`;

  useEffect(() => {
    if (preSubmitted) {
      setSelectedOption(preSelectedAnswer || null);
      setCommittedAnswer(preSelectedAnswer || null);
      setHasSubmitted(true);
    } else {
      const saved = sessionStorage.getItem(getStorageKey());
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSelectedOption(parsed.selectedOption || null);
          setCommittedAnswer(parsed.hasSubmitted ? parsed.selectedOption || null : null);
          setHasSubmitted(Boolean(parsed.hasSubmitted));
        } catch {
          setSelectedOption(null);
          setCommittedAnswer(null);
          setHasSubmitted(false);
        }
      } else {
        setSelectedOption(null);
        setCommittedAnswer(null);
        setHasSubmitted(false);
      }
    }
    setShowAllDistractors(false);
    setTutorTurns([]);
    setAiQuestion('');
    setAiStreaming(false);
    setAnswerStartedAt(0);
    abortControllerRef.current?.abort();
  }, [question.id, question.question, question.question_stem, preSubmitted, preSelectedAnswer]);

  const options = useMemo(
    () => (question.options || []).map((option: any, index: number) =>
      typeof option === 'string' ? { id: String.fromCharCode(65 + index), text: option } : option
    ),
    [question.options],
  );

  const rawCorrectAnswer = question.correctAnswer ?? question.correct_answer ?? 'A';
  const correctAnswerId = typeof rawCorrectAnswer === 'number' ? String.fromCharCode(65 + rawCorrectAnswer) : String(rawCorrectAnswer);
  const rawQuestionContent = String((question as any).clinical_vignette || question.question_stem || question.question || '');
  const askLine = extractLeadIn(question, rawQuestionContent);
  const displayQuestionContent = stripLeadInFromVignette(rawQuestionContent, askLine);
  const vignetteParagraphs = displayQuestionContent.split(/\n\s*\n/).map(v => v.trim()).filter(Boolean);
  const explanation = sanitiseExplanation(question.explanation || question.worked_solution || '');
  const keyFact = sanitiseExplanation((question as any).key_fact || '');
  const conceptTitle = String((question as any).concept_title || question.title || (question as any).topic || 'Clinical concept');
  const distractors = ((question as any).distractorExplanations || {}) as Record<string, string>;
  const displayedSelectedText = options.find((option: any) => option.id === (committedAnswer || selectedOption))?.text || '';
  const correctOptionText = options.find((option: any) => option.id === correctAnswerId)?.text || '';
  const isCorrect = hasSubmitted && committedAnswer === correctAnswerId;

  const handleOptionSelect = (optionId: string) => {
    if (hasSubmitted) return;
    setSelectedOption(optionId);
    sessionStorage.setItem(getStorageKey(), JSON.stringify({ selectedOption: optionId, hasSubmitted: false }));
  };

  const runTutor = async (studentText?: string, forceDirect = false, selectedOverride?: string, startedOverride?: number) => {
    if (aiStreaming) return;
    const selectedId = selectedOverride || committedAnswer;
    if (!selectedId) return;

    const selectedText = options.find((option: any) => option.id === selectedId)?.text || 'Selected option';
    const confidence = await waitForConfidence(conceptTitle, startedOverride || answerStartedAt || Date.now());
    const wasCorrect = selectedId === correctAnswerId;
    const priorTurns = tutorTurns.slice(-6);

    if (studentText?.trim()) setTutorTurns(prev => [...prev, { role: 'student', text: studentText.trim() }]);
    setAiQuestion('');
    setAiStreaming(true);

    const optionLines = options.map((option: any) => `${option.id}. ${option.text}`).join('\n');
    const context: QuestionContext = {
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

    const transcript = [...priorTurns, ...(studentText?.trim() ? [{ role: 'student' as const, text: studentText.trim() }] : [])]
      .map(turn => `${turn.role === 'student' ? 'LEARNER' : 'TUTOR'}: ${turn.text}`)
      .join('\n');

    const instruction = forceDirect
      ? directExplanationInstruction()
      : studentText?.trim()
        ? 'Continue the tutoring conversation. Respond directly to the learner\'s latest message. Diagnose only what their words support. If they reveal a gap, address that exact gap. Prefer a short Socratic step or concise explanation over a lecture. You may ask one follow-up question when useful. If you ask a transfer/application question, prefix it with "Quick check:". Never claim they thought something they did not say.'
        : proactiveOpeningInstruction(wasCorrect, confidence);

    const prompt = `${instruction}\n\nCONVERSATION SO FAR:\n${transcript || '(none yet)'}\n\nUse only the supplied current-question context for medical claims. Do not contradict the verified explanation. Keep the interaction concise and tutor-like.`;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let streamed = '';
    setTutorTurns(prev => [...prev, { role: 'tutor', text: '' }]);

    try {
      await generateAIResponseStream(
        prompt,
        context,
        token => {
          streamed += token;
          setTutorTurns(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'tutor') next[next.length - 1] = { role: 'tutor', text: streamed };
            return next;
          });
        },
        () => undefined,
        controller.signal,
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('StudyEdit tutor failed:', error);
        const fallback = forceDirect
          ? (explanation || keyFact || 'Review the decisive clue and correct answer before moving on.')
          : 'Talk me through what you were thinking, and we can work out the exact gap together.';
        setTutorTurns(prev => {
          const next = [...prev];
          if (next[next.length - 1]?.role === 'tutor') next[next.length - 1] = { role: 'tutor', text: fallback };
          return next;
        });
      }
    } finally {
      if (!controller.signal.aborted) setAiStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleCheckAnswer = () => {
    if (!selectedOption || hasSubmitted) return;
    const correct = selectedOption === correctAnswerId;
    const startedAt = Date.now();
    setAnswerStartedAt(startedAt);
    setCommittedAnswer(selectedOption);
    setHasSubmitted(true);
    sessionStorage.setItem(getStorageKey(), JSON.stringify({ selectedOption, hasSubmitted: true }));
    onAnswer(correct);
    void runTutor(undefined, false, selectedOption, startedAt);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: C.parchment, color: C.ink }}>
      <header className="flex shrink-0 items-center justify-between px-5 pb-2 pt-5 sm:px-8 sm:pt-7">
        <div className="text-[13px] font-semibold" style={{ color: C.muted }}>
          Question {currentIndex + 1}{totalQuestions ? ` of ${totalQuestions}` : ''}
        </div>
        {onExit && (
          <button onClick={onExit} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: C.muted }} aria-label="Exit practice">
            <X className="h-5 w-5" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-[620px] px-5 pb-10 pt-5 sm:px-8 sm:pt-7">
          <section aria-label="Question">
            <div className="text-[21px] font-semibold leading-[1.68] tracking-[-0.01em] sm:text-[22px]" style={{ color: C.espresso }}>
              {vignetteParagraphs.map((paragraph, index) => (
                <p key={index} className="mb-7 last:mb-0"><ReactMarkdown>{paragraph}</ReactMarkdown></p>
              ))}
            </div>

            {askLine && (
              <div className="mt-8 border-t pt-7 text-[19px] font-bold leading-[1.5] sm:text-[20px]" style={{ borderColor: C.line, color: C.espresso }}>
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
                    className="flex w-full items-center gap-4 rounded-[16px] border px-4 py-4 text-left transition sm:px-5 sm:py-[18px]"
                    style={{
                      backgroundColor: correctAfterSubmit ? C.sageSoft : wrongSelected ? C.blushSoft : selected && !hasSubmitted ? C.cream : C.paper,
                      borderColor: correctAfterSubmit ? C.sage : wrongSelected ? C.blush : selected && !hasSubmitted ? C.espresso : C.line,
                      opacity: hasSubmitted && !correct && committedAnswer !== option.id ? .52 : 1,
                    }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
                      style={{ backgroundColor: selected && !hasSubmitted ? C.espresso : 'rgba(31,20,12,.06)', color: selected && !hasSubmitted ? C.cream : C.espresso }}
                    >
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
              <button
                type="button"
                onClick={handleCheckAnswer}
                disabled={!selectedOption}
                className="mt-6 flex w-full items-center justify-center rounded-full px-6 py-[18px] text-[16px] font-bold disabled:cursor-not-allowed"
                style={{ backgroundColor: selectedOption ? C.espresso : '#D9CCB6', color: selectedOption ? C.cream : C.muted }}
              >
                Check answer
              </button>
            )}
          </section>

          {hasSubmitted && (
            <section className="mt-8 border-t pt-7" style={{ borderColor: C.line }} aria-label="Answer feedback">
              <div className="flex items-center gap-2.5 text-[15px] font-bold" style={{ color: isCorrect ? '#62734F' : '#94483D' }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: isCorrect ? C.sage : C.blush }}>
                  {isCorrect ? '✓' : '×'}
                </span>
                {isCorrect ? 'Correct' : 'Not quite'}
              </div>

              {!isCorrect && (
                <div className="mt-4 text-[16px] font-semibold leading-6" style={{ color: C.espresso }}>
                  Correct answer: <strong style={emphasisStyle}>{correctAnswerId} — {correctOptionText}</strong>
                </div>
              )}

              {committedAnswer && (
                <div className="mt-3 text-[15px] font-medium leading-6" style={{ color: C.muted }}>
                  You chose: <strong style={{ color: C.espresso }}>{committedAnswer} — {displayedSelectedText}</strong>
                </div>
              )}

              <div className="mt-10">
                <div className="mb-5 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#F6D9D3', color: '#B7655B' }}>
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#A9675D' }}>StudyEdit Tutor</div>
                </div>

                {aiStreaming && tutorTurns.length === 0 && (
                  <div className="py-3 text-[16px] font-medium" style={{ color: C.muted }}>Thinking about what you need next…</div>
                )}

                <div className="space-y-6">
                  {tutorTurns.map((turn, index) => {
                    if (!turn.text) return null;
                    if (turn.role === 'student') {
                      return (
                        <div key={index} className="ml-auto max-w-[86%] rounded-[18px] px-4 py-3 text-[15px] font-medium leading-6" style={{ backgroundColor: C.espresso, color: C.cream }}>
                          {turn.text}
                        </div>
                      );
                    }
                    const tutorIndex = tutorTurns.slice(0, index + 1).filter(item => item.role === 'tutor' && item.text).length;
                    return <TutorMessage key={index} text={turn.text} first={tutorIndex === 1} />;
                  })}
                </div>

                <form
                  className="mt-7 flex items-center gap-2 rounded-[18px] border bg-[#FFFDF8] p-2 pl-4 shadow-[0_8px_24px_rgba(31,20,12,0.04)]"
                  style={{ borderColor: '#DCCDB8' }}
                  onSubmit={event => {
                    event.preventDefault();
                    const query = aiQuestion.trim();
                    if (query) void runTutor(query);
                  }}
                >
                  <input
                    value={aiQuestion}
                    onChange={event => setAiQuestion(event.target.value)}
                    placeholder="Reply or ask anything…"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] font-medium outline-none placeholder:text-[#A89582]"
                    style={{ color: C.espresso }}
                  />
                  <button
                    type="submit"
                    disabled={!aiQuestion.trim() || aiStreaming}
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
                  disabled={aiStreaming}
                  className="mt-3 text-[12px] font-semibold underline decoration-[#BBA995] underline-offset-4 disabled:opacity-40"
                  style={{ color: C.muted }}
                >
                  Just explain it
                </button>
              </div>

              {Object.keys(distractors).length > 0 && (
                <div className="mt-8 border-t pt-4" style={{ borderColor: C.line }}>
                  <button
                    type="button"
                    onClick={() => setShowAllDistractors(v => !v)}
                    className="flex w-full items-center justify-between py-2 text-left text-[14px] font-semibold"
                    style={{ color: C.muted }}
                  >
                    <span>{showAllDistractors ? 'Hide other options' : 'Why the other options are wrong'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAllDistractors ? 'rotate-180' : ''}`} />
                  </button>
                  {showAllDistractors && (
                    <div className="mt-2 divide-y" style={{ borderColor: C.line }}>
                      {Object.entries(distractors)
                        .filter(([letter]) => letter !== correctAnswerId)
                        .map(([letter, text]) => (
                          <div key={letter} className="grid grid-cols-[26px_1fr] gap-3 py-3 text-[16px] font-medium leading-7" style={{ color: '#59483B', borderColor: C.line }}>
                            <strong style={{ color: C.espresso }}>{letter}.</strong>
                            <SkimmableMarkdown text={text} />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-9">
                <button
                  type="button"
                  onClick={onNext}
                  className="flex w-full items-center justify-center rounded-full px-6 py-[18px] text-[16px] font-bold"
                  style={{ backgroundColor: C.espresso, color: C.cream }}
                >
                  {nextButtonText || 'Next question'} →
                </button>
                <div className="mt-3 text-center text-[12px]" style={{ color: C.muted }}>{conceptTitle}</div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
