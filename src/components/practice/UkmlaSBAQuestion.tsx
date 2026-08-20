import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Send, X } from 'lucide-react';
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
  return text
    .replace(/[Tt]he content explicitly states? that ['\"]/g, '')
    .replace(/['\"]\s*\.\s*(?=Option|The correct)/g, '. ')
    .replace(/[Tt]he content (explicitly )?(states?|says?|mentions?|indicates?|notes?)[^.]*\.\s*/g, '')
    .replace(/[Bb]ased on (the )?(concept |provided )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Aa]ccording to (the )?(concept |provided )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Aa]s (stated|mentioned|described|provided|outlined|given) in (the )?(concept |provided )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Ff]rom (the )?(concept )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Aa]s per (the )?(concept )?content[^,.]*[,.]?\s*/g, '')
    .replace(/[Bb]ased on (the )?(provided|given) (information|material|concept)[^,.]*[,.]?\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function firstUsefulSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const match = clean.match(/^(.+?[.!?])(?:\s|$)/);
  return match?.[1] || clean;
}

type ClinicalSection = 'history' | 'examination' | 'investigations' | 'treatment';

function clinicalSectionForSentence(sentence: string, current: ClinicalSection): ClinicalSection {
  const value = sentence.trim();
  if (/^(?:On examination|Physical examination|Clinical examination|Neurological examination|Cardiovascular examination|Respiratory examination|Abdominal examination|On auscultation|Observations|Vital signs|His observations|Her observations)\b/i.test(value)) return 'examination';
  if (/^(?:Investigations|Initial investigations|Blood tests|Laboratory tests|Blood results|An ECG|ECG|Electrocardiogram|Chest X-ray|Chest radiograph|CXR|X-ray|CT|MRI|Ultrasound|Urinalysis|Troponin|Blood gas|ABG)\b/i.test(value)) return 'investigations';
  if (/^(?:He is treated|She is treated|Treatment is started|Treatment|Following treatment|Following|Subsequently|Later|Hours later|Days later|During admission|While in hospital|The patient is given)\b/i.test(value)) return 'treatment';
  return current;
}

function formatClinicalVignette(text: string): string {
  const clean = text.trim();
  if (!clean) return '';

  const authoredParagraphs = clean.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean);
  if (authoredParagraphs.length > 1) return authoredParagraphs.join('\n\n');

  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
  if (sentences.length < 2) return clean;

  const paragraphs: Array<{ section: ClinicalSection; sentences: string[] }> = [];
  let currentSection: ClinicalSection = 'history';
  for (const sentence of sentences) {
    const section = clinicalSectionForSentence(sentence, currentSection);
    currentSection = section;
    const last = paragraphs[paragraphs.length - 1];
    if (!last || last.section !== section) paragraphs.push({ section, sentences: [sentence] });
    else last.sentences.push(sentence);
  }
  return paragraphs.map(paragraph => paragraph.sentences.join(' ')).join('\n\n');
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
      >{text}</ReactMarkdown>
    </div>
  );
}

interface PriorEvidence {
  attempts: number;
  correct: number;
  incorrect: number;
  lastPracticed?: string | null;
}

function readPriorConceptEvidence(question: QuestionData, conceptTitle: string): PriorEvidence | null {
  try {
    const conceptId = String(question.concept_id || (question as any).conceptId || '');
    let best: PriorEvidence | null = null;

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.endsWith('_user_concepts')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const concepts = JSON.parse(raw);
      if (!Array.isArray(concepts)) continue;
      const match = concepts.find((concept: any) => {
        if (conceptId && String(concept.concept_id || concept.id || '') === conceptId) return true;
        return String(concept.title || '').trim().toLowerCase() === conceptTitle.trim().toLowerCase();
      });
      if (!match?.mastery_data) continue;

      const md = match.mastery_data;
      const evidence = {
        attempts: Number(md.attempts || 0),
        correct: Number(md.correct || 0),
        incorrect: Number(md.incorrect || 0),
        lastPracticed: md.last_practiced || md.fsrs_last_review || null,
      };
      if (!best || evidence.attempts > best.attempts) best = evidence;
    }
    return best;
  } catch {
    return null;
  }
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
  const [hasSubmitted, setHasSubmitted] = useState(preSubmitted);
  const [showAllDistractors, setShowAllDistractors] = useState(false);
  const [showSourceExplanation, setShowSourceExplanation] = useState(preSubmitted);
  const [primaryExplanation, setPrimaryExplanation] = useState('');
  const [followUpResponse, setFollowUpResponse] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [personalisedStarted, setPersonalisedStarted] = useState(preSubmitted);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getStorageKey = () => `sba_answer_${question.id || question.question?.substring(0, 50)}`;

  useEffect(() => {
    if (preSubmitted) {
      setSelectedOption(preSelectedAnswer || null);
      setHasSubmitted(true);
      setShowSourceExplanation(true);
    } else {
      const savedState = sessionStorage.getItem(getStorageKey());
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setSelectedOption(parsed.selectedOption || null);
          setHasSubmitted(Boolean(parsed.hasSubmitted));
        } catch {
          setSelectedOption(null);
          setHasSubmitted(false);
        }
      } else {
        setSelectedOption(null);
        setHasSubmitted(false);
      }
      setShowSourceExplanation(false);
    }

    setShowAllDistractors(false);
    setPrimaryExplanation('');
    setFollowUpResponse('');
    setAiPrompt('');
    setAiQuestion('');
    setAiStreaming(false);
    setPersonalisedStarted(preSubmitted);
    abortControllerRef.current?.abort();
  }, [question.id, question.question, question.question_stem, preSubmitted, preSelectedAnswer]);

  const options = useMemo(() => (question.options || []).map((option: any, index: number) => {
    if (typeof option === 'string') return { id: String.fromCharCode(65 + index), text: option };
    return option;
  }), [question.options]);

  const rawCorrectAnswer = question.correctAnswer ?? question.correct_answer ?? 'A';
  const correctAnswerId = typeof rawCorrectAnswer === 'number' ? String.fromCharCode(65 + rawCorrectAnswer) : String(rawCorrectAnswer);

  const rawQuestionContent = (question as any).clinical_vignette || question.question_stem || question.question || '';
  const questionContent = formatClinicalVignette(rawQuestionContent);
  const vignetteParagraphs = questionContent.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean);
  const askLine = (question as any).question_text
    || (question as any).stem_question
    || (question as any).individual_question
    || ((question as any).clinical_vignette ? question.question : '')
    || '';

  const explanation = sanitiseExplanation(question.explanation || question.worked_solution || '');
  const keyFact = sanitiseExplanation((question as any).key_fact || '');
  const conceptTitle = (question as any).concept_title || question.title || (question as any).topic || 'Clinical concept';
  const distractors = ((question as any).distractorExplanations || {}) as Record<string, string>;
  const selectedDistractor = selectedOption && selectedOption !== correctAnswerId ? distractors[selectedOption] : '';
  const selectedOptionText = options.find((option: any) => option.id === selectedOption)?.text || '';
  const correctOptionText = options.find((option: any) => option.id === correctAnswerId)?.text || '';
  const isCorrect = hasSubmitted && selectedOption === correctAnswerId;
  const takeaway = keyFact || firstUsefulSentence(explanation);

  const handleOptionSelect = (optionId: string) => {
    if (hasSubmitted) return;
    setSelectedOption(optionId);
    sessionStorage.setItem(getStorageKey(), JSON.stringify({ selectedOption: optionId, hasSubmitted: false }));
  };

  const askStudyEdit = async (prompt: string, priorEvidence?: PriorEvidence | null, isDefaultExplanation = false) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || aiStreaming) return;

    setAiPrompt(isDefaultExplanation ? '' : cleanPrompt);
    setAiQuestion('');
    if (isDefaultExplanation) {
      setPrimaryExplanation('');
      setPersonalisedStarted(true);
    } else {
      setFollowUpResponse('');
    }
    setAiStreaming(true);

    const optionLines = options.map((option: any) => `${option.id}. ${option.text}`).join('\n');
    const selectedLine = selectedOption ? `${selectedOption}. ${selectedOptionText || 'Selected option'}` : 'No option selected';
    const correctLine = `${correctAnswerId}. ${correctOptionText || 'Correct option'}`;
    const selectedFeedback = selectedDistractor || 'No specific distractor explanation supplied.';
    const evidence = priorEvidence ?? readPriorConceptEvidence(question, conceptTitle);
    const evidenceLine = evidence && evidence.attempts > 0
      ? `Before this answer: ${evidence.attempts} prior attempt${evidence.attempts === 1 ? '' : 's'} on this concept; ${evidence.correct} correct; ${evidence.incorrect} incorrect.`
      : 'No meaningful prior concept evidence is available yet.';
    const questionRef = String(question.id || question.concept_id || `${currentIndex + 1}-${rawQuestionContent.slice(0, 32)}`)
      .replace(/\s+/g, '-')
      .slice(0, 80);

    const tutorContextPacket = [
      `STUDENT SELECTED: ${selectedLine}`,
      `CORRECT ANSWER: ${correctLine}`,
      `QUESTION ASKED: ${askLine || 'Use the clinical vignette to answer the SBA.'}`,
      `CONCEPT: ${conceptTitle}`,
      `PRIOR LEARNER EVIDENCE: ${evidenceLine}`,
      `KEY POINT / GROUND TRUTH: ${keyFact || takeaway || 'Not supplied'}`,
      `VERIFIED QUESTION EXPLANATION: ${explanation || 'Not supplied'}`,
      `VERIFIED DISTRACTOR FEEDBACK FOR STUDENT'S CHOICE: ${selectedFeedback}`,
      `OPTIONS:\n${optionLines}`,
      `FULL CLINICAL VIGNETTE:\n${rawQuestionContent}`,
    ].join('\n\n');

    const context: QuestionContext = {
      question: tutorContextPacket,
      options: options.map((option: any) => `${option.id}. ${option.text}`),
      correctAnswer: correctLine,
      selectedAnswer: selectedLine,
      explanation: explanation || keyFact || takeaway,
    };

    const defaultInstruction = `Give this student their personalised post-answer teaching explanation. Start with their exact answer and whether it was right or wrong. Then explain the decisive clue(s) in this vignette in very simple language, similar to an excellent "explain this simply" response. Use the verified explanation and key point as ground truth. End with one short carry-forward rule for the next vignette. Keep it around 90-140 words. Bold the few phrases worth skimming. If prior learner evidence shows at least 2 previous attempts, you may briefly mention the factual attempt/correct/incorrect pattern, but do not claim a recurring misconception unless the supplied evidence explicitly proves one.`;
    const intentPrompt = isDefaultExplanation ? 'Personalised default explanation' : cleanPrompt;
    const modelPrompt = `${intentPrompt}\nQuestionRef ${questionRef} Selected ${selectedOption || 'none'}. ${isDefaultExplanation ? defaultInstruction : cleanPrompt}\n\nUse ONLY the supplied current-question context. The student's selected answer is explicitly provided. Never say it was not provided. Do not contradict the verified explanation. Do not invent prior attempts or patterns. For a follow-up, answer the follow-up request directly and do not simply repeat the original explanation.`;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let streamed = '';

    try {
      await generateAIResponseStream(
        modelPrompt,
        context,
        (token: string) => {
          streamed += token;
          if (isDefaultExplanation) setPrimaryExplanation(streamed);
          else setFollowUpResponse(streamed);
        },
        () => undefined,
        controller.signal,
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('StudyEdit personalised feedback failed:', error);
        const fallback = explanation || takeaway || 'Review the correct answer and the decisive clues in the vignette before moving on.';
        if (isDefaultExplanation) setPrimaryExplanation(fallback);
        else setFollowUpResponse('I could not rework that just now. Try another prompt in a moment.');
      }
    } finally {
      if (!controller.signal.aborted) setAiStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleCheckAnswer = () => {
    if (!selectedOption || hasSubmitted) return;
    const priorEvidence = readPriorConceptEvidence(question, conceptTitle);
    const correct = selectedOption === correctAnswerId;
    setHasSubmitted(true);
    sessionStorage.setItem(getStorageKey(), JSON.stringify({ selectedOption, hasSubmitted: true }));
    onAnswer(correct);
    void askStudyEdit('personalised explanation', priorEvidence, true);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: C.parchment, color: C.ink }}>
      <header className="flex shrink-0 items-center justify-between px-5 pb-2 pt-5 sm:px-8 sm:pt-7">
        <div className="text-[13px] font-semibold" style={{ color: C.muted }}>
          Question {currentIndex + 1}{totalQuestions ? ` of ${totalQuestions}` : ''}
        </div>
        {onExit && (
          <button onClick={onExit} className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-black/[0.04]" style={{ color: C.muted }} aria-label="Exit practice">
            <X className="h-[20px] w-[20px]" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-[620px] px-5 pb-10 pt-5 sm:px-8 sm:pt-7">
          <section aria-label="Question">
            <div className="text-[21px] font-semibold leading-[1.68] tracking-[-0.01em] sm:text-[22px]" style={{ color: C.espresso, fontFamily: 'Inter, sans-serif' }}>
              {vignetteParagraphs.map((paragraph, index) => (
                <p key={`${question.id || 'question'}-vignette-${index}`} className="mb-7 last:mb-0">
                  <ReactMarkdown components={{ p: ({ children }) => <>{children}</>, strong: ({ children }) => <strong className="font-bold">{children}</strong> }}>
                    {paragraph}
                  </ReactMarkdown>
                </p>
              ))}
            </div>

            {askLine && (
              <div className="mt-8 border-t pt-7 text-[19px] font-bold leading-[1.5] sm:text-[20px]" style={{ borderColor: C.line, color: C.espresso }}>
                {askLine}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {options.map((option: { id: string; text: string }) => {
                const selected = selectedOption === option.id;
                const correct = option.id === correctAnswerId;
                const wrongSelected = hasSubmitted && selected && !correct;
                const correctAfterSubmit = hasSubmitted && correct;
                const mutedAfterSubmit = hasSubmitted && !selected && !correct;
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
                      boxShadow: selected && !hasSubmitted ? '0 0 0 2px rgba(31,20,12,.06)' : 'none',
                      opacity: mutedAfterSubmit ? 0.52 : 1,
                    }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold" style={{ backgroundColor: correctAfterSubmit ? 'rgba(143,163,121,.22)' : wrongSelected ? 'rgba(229,168,157,.25)' : selected && !hasSubmitted ? C.espresso : 'rgba(31,20,12,.06)', color: selected && !hasSubmitted ? C.cream : C.espresso }}>{option.id}</span>
                    <span className="flex-1 text-[17px] font-semibold leading-[1.45] sm:text-[18px]" style={{ color: C.espresso }}>{option.text}</span>
                    {correctAfterSubmit && <span className="font-bold" style={{ color: '#62734F' }}>✓</span>}
                    {wrongSelected && <span className="font-bold" style={{ color: '#9B5146' }}>×</span>}
                  </button>
                );
              })}
            </div>

            {!hasSubmitted && (
              <button type="button" onClick={handleCheckAnswer} disabled={!selectedOption} className="mt-6 flex w-full items-center justify-center rounded-full px-6 py-[18px] text-[16px] font-bold transition active:scale-[0.99] disabled:cursor-not-allowed" style={{ backgroundColor: selectedOption ? C.espresso : '#D9CCB6', color: selectedOption ? C.cream : C.muted }}>
                Check answer
              </button>
            )}
          </section>

          {hasSubmitted && (
            <section className="mt-8 border-t pt-7" style={{ borderColor: C.line }} aria-label="Answer feedback">
              <div className="flex items-center gap-2.5 text-[15px] font-bold" style={{ color: isCorrect ? '#62734F' : '#94483D' }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: isCorrect ? C.sage : C.blush }}>{isCorrect ? '✓' : '×'}</span>
                {isCorrect ? 'Correct' : 'Not quite'}
              </div>

              {!isCorrect && (
                <div className="mt-4 text-[16px] font-semibold leading-6" style={{ color: C.espresso }}>
                  Correct answer: <strong style={emphasisStyle}>{correctAnswerId} — {correctOptionText}</strong>
                </div>
              )}

              <div className="mt-7">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#A9675D' }}>Your explanation</div>
                {aiStreaming && !aiPrompt && !primaryExplanation && (
                  <div className="mt-3 border-l-[3px] pl-4 text-[16px] font-semibold leading-7" style={{ borderColor: C.blush, color: C.muted }}>
                    StudyEdit is tailoring this to your answer…
                  </div>
                )}
                {primaryExplanation && (
                  <div className="mt-3 border-l-[3px] pl-4" style={{ borderColor: C.blush }}>
                    <SkimmableMarkdown text={primaryExplanation} className="text-[17px] font-semibold leading-[1.72] text-[#3B2A1E]" />
                  </div>
                )}
                {!personalisedStarted && preSubmitted && (
                  <div className="mt-3 border-l-[3px] pl-4" style={{ borderColor: C.blush }}>
                    <SkimmableMarkdown text={explanation || takeaway} className="text-[17px] font-semibold leading-[1.72] text-[#3B2A1E]" />
                  </div>
                )}
              </div>

              <div className="mt-6 border-t pt-4" style={{ borderColor: C.line }}>
                <button type="button" onClick={() => setShowSourceExplanation(value => !value)} className="flex w-full items-center justify-between py-2 text-left text-[14px] font-semibold" style={{ color: C.muted }}>
                  <span>{showSourceExplanation ? 'Hide source explanation' : 'See source explanation'}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showSourceExplanation ? 'rotate-180' : ''}`} />
                </button>
                {showSourceExplanation && (
                  <div className="mt-2">
                    {takeaway && <div className="rounded-[16px] border p-4" style={{ backgroundColor: C.blushSoft, borderColor: '#F0D2CA' }}><SkimmableMarkdown text={takeaway} className="text-[17px] font-bold leading-[1.55]" /></div>}
                    {explanation && <SkimmableMarkdown text={explanation} className="mt-4 text-[15px] font-medium leading-[1.72] text-[#4C3A2E]" />}
                  </div>
                )}
              </div>

              {Object.keys(distractors).length > 0 && (
                <div className="mt-2 border-t pt-4" style={{ borderColor: C.line }}>
                  <button type="button" onClick={() => setShowAllDistractors(value => !value)} className="flex w-full items-center justify-between py-2 text-left text-[14px] font-semibold" style={{ color: C.muted }}>
                    <span>{showAllDistractors ? 'Hide other options' : 'Why the other options are wrong'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAllDistractors ? 'rotate-180' : ''}`} />
                  </button>
                  {showAllDistractors && (
                    <div className="mt-2 divide-y" style={{ borderColor: C.line }}>
                      {Object.entries(distractors).filter(([letter]) => letter !== correctAnswerId).map(([letter, text]) => (
                        <div key={letter} className="grid grid-cols-[26px_1fr] gap-3 py-3 text-[15px] font-medium leading-6" style={{ color: '#59483B', borderColor: C.line }}>
                          <strong style={{ color: C.espresso }}>{letter}.</strong><SkimmableMarkdown text={text} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-7 border-t pt-5" style={{ borderColor: C.line }}>
                <div className="text-[15px] font-bold" style={{ color: C.espresso }}>Ask StudyEdit</div>
                <div className="mt-1 text-[12px]" style={{ color: C.muted }}>Go deeper only if you need to.</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => askStudyEdit('Explain this even more simply in under 80 words.')} disabled={aiStreaming} className="rounded-full border px-3 py-2 text-[13px] font-semibold disabled:opacity-50" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.ink }}>Explain another way</button>
                  {!isCorrect && <button type="button" onClick={() => askStudyEdit('Why was my answer tempting, and what exact clue rules it out here?')} disabled={aiStreaming} className="rounded-full border px-3 py-2 text-[13px] font-semibold disabled:opacity-50" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.ink }}>Why was mine tempting?</button>}
                  <button type="button" onClick={() => askStudyEdit('What clue should I notice next time I see this concept in a different vignette? Keep it brief.')} disabled={aiStreaming} className="rounded-full border px-3 py-2 text-[13px] font-semibold disabled:opacity-50" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.ink }}>What should I spot next time?</button>
                  <button type="button" onClick={() => askStudyEdit('Give me one short different clinical example that tests the same concept.')} disabled={aiStreaming} className="rounded-full border px-3 py-2 text-[13px] font-semibold disabled:opacity-50" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.ink }}>Another example</button>
                </div>

                {aiPrompt && (
                  <div className="mt-5 border-l-[3px] pl-4" style={{ borderColor: C.blush }}>
                    <div className="text-[12px] font-semibold" style={{ color: '#A9675D' }}>StudyEdit · {aiPrompt}</div>
                    {aiStreaming && !followUpResponse && <div className="mt-2 text-[15px] font-medium" style={{ color: C.muted }}>Reworking this for you…</div>}
                    {followUpResponse && <SkimmableMarkdown text={followUpResponse} className="mt-2 text-[16px] font-medium leading-[1.7] text-[#3B2A1E]" />}
                  </div>
                )}

                <form className="mt-4 flex items-center gap-2 border-b pb-2" style={{ borderColor: C.line }} onSubmit={(event) => { event.preventDefault(); void askStudyEdit(aiQuestion); }}>
                  <input value={aiQuestion} onChange={(event) => setAiQuestion(event.target.value)} placeholder="Ask about this question…" className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-medium outline-none placeholder:text-[#A89582]" style={{ color: C.espresso }} />
                  <button type="submit" disabled={!aiQuestion.trim() || aiStreaming} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-35" style={{ backgroundColor: C.espresso, color: C.cream }} aria-label="Ask StudyEdit"><Send className="h-4 w-4" /></button>
                </form>
              </div>

              <div className="mt-8">
                <button type="button" onClick={onNext} className="flex w-full items-center justify-center rounded-full px-6 py-[18px] text-[16px] font-bold" style={{ backgroundColor: C.espresso, color: C.cream }}>
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