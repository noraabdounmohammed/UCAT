import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Home, Plus, RotateCcw } from 'lucide-react';
import { generateAIResponseStream, QuestionContext } from '@/services/openai';
import { SessionAnswer } from './SessionProgressDropdown';

interface SessionReviewScreenProps {
  answers: SessionAnswer[];
  questions: any[];
  onRetryIncorrect: () => void;
  onDone: () => void;
  onAnotherFive?: (filter?: string) => void;
  onViewQuestion?: (questionIndex: number) => void;
  sessionDuration?: number;
}

interface TutorDebrief {
  observation: string;
  nextStep: string;
}

const T = {
  cream: '#FAF5EC',
  paper: '#FFFDF8',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  blushDeep: '#E5A89D',
  blushSoft: '#F9E4DF',
  sage: '#8FA379',
  sageSoft: '#E2EAD6',
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

function cleanLine(value: string): string {
  return value.replace(/^[-*#\s]+/, '').replace(/^["']|["']$/g, '').trim();
}

function parseTutorDebrief(raw: string): TutorDebrief | null {
  const observation = raw.match(/OBSERVATION\s*:\s*([^\n]+)/i)?.[1];
  const nextStep = raw.match(/NEXT\s*:\s*([^\n]+)/i)?.[1];
  if (!observation || !nextStep) return null;
  return { observation: cleanLine(observation), nextStep: cleanLine(nextStep) };
}

export const SessionReviewScreen: React.FC<SessionReviewScreenProps> = ({
  answers,
  questions,
  onRetryIncorrect,
  onDone,
  onAnotherFive,
  onViewQuestion,
  sessionDuration,
}) => {
  const [visible, setVisible] = useState(false);
  const [debrief, setDebrief] = useState<TutorDebrief | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  const total = questions.length;
  const correct = answers.filter(answer => answer.isCorrect).length;
  const needsReview = answers.filter(answer => !answer.isCorrect).length;

  const concepts = useMemo(() => {
    return questions.map((question, index) => {
      const answer = answers.find(a => a.questionIndex === index);
      const title = question?.concept_title || question?.title || question?.topic || `Concept ${index + 1}`;
      const stem = question?.clinical_vignette || question?.vignette || question?.question_stem || question?.question || question?.content || '';
      const leadIn = question?.question_text || question?.individual_question || question?.question || '';
      const keyFact = question?.key_fact || '';
      const preview = stem.length > 90 ? `${stem.slice(0, 90)}…` : stem;
      return {
        index,
        title,
        stem,
        leadIn,
        keyFact,
        preview,
        selectedOption: answer?.selectedOption || '',
        isCorrect: answer?.isCorrect ?? false,
      };
    });
  }, [questions, answers]);

  const weakConcepts = concepts.filter(concept => !concept.isCorrect);
  const heldConcepts = concepts.filter(concept => concept.isCorrect);

  const uniqueTitles = (items: typeof concepts) => Array.from(new Set(items.map(item => item.title))).slice(0, 3);
  const heldTitles = uniqueTitles(heldConcepts);
  const weakTitles = uniqueTitles(weakConcepts);

  const evidenceConceptCount = useMemo(() => new Set(concepts.map(concept => concept.title)).size, [concepts]);

  const repeatedMiss = useMemo(() => {
    const counts = new Map<string, number>();
    weakConcepts.forEach(concept => counts.set(concept.title, (counts.get(concept.title) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).find(([, count]) => count >= 2) || null;
  }, [weakConcepts]);

  const deterministicObservation = useMemo(() => {
    if (needsReview === 0) return `Nothing obvious needs chasing from this session. I’d keep the concepts in rotation and let spacing do the work.`;
    if (repeatedMiss) return `${repeatedMiss[0]} caught you more than once today. That is enough evidence for me to bring that distinction back deliberately.`;
    if (needsReview === 1) return `One concept needs another look, but there isn’t enough evidence here to call it a broader pattern.`;
    return `The misses were spread across different concepts, so I wouldn’t call a broader pattern yet.`;
  }, [needsReview, repeatedMiss]);

  const deterministicNext = useMemo(() => {
    if (needsReview === 0) return `I’ll use today’s successful retrieval to decide what can wait and what should come back later.`;
    if (repeatedMiss) return `I’ll bring ${repeatedMiss[0]} back soon in a different vignette, and space the other misses separately.`;
    return `I’ll bring the missed concepts back in different vignettes, spaced apart rather than repeated immediately.`;
  }, [needsReview, repeatedMiss]);

  useEffect(() => {
    if (total === 0 || answers.length === 0) return;

    const sessionRows = concepts.map((concept, i) => {
      const question = questions[i];
      const correctAnswer = question?.correct_answer || question?.correctAnswer || '';
      return [
        `Q${i + 1}`,
        concept.isCorrect ? 'correct' : 'incorrect',
        `concept=${concept.title}`,
        `selected=${concept.selectedOption || 'unknown'}`,
        `correct=${correctAnswer || 'unknown'}`,
        `lead-in=${String(concept.leadIn).slice(0, 120)}`,
        concept.keyFact ? `key-fact=${String(concept.keyFact).slice(0, 150)}` : '',
      ].filter(Boolean).join(' | ');
    }).join('\n');

    const sessionSignature = questions.map(q => q?.id || q?.concept_id || '').join('-').slice(0, 90);
    const prompt = `SessionDebrief-${sessionSignature}-${correct}-${needsReview}.\n\nYou are StudyEdit giving a short, perceptive UKMLA tutor debrief from REAL SESSION EVIDENCE only. Return EXACTLY two single-line fields and nothing else:\nOBSERVATION: [max 22 words]\nNEXT: [max 20 words]\n\nRules:\n- Sound like a sharp human tutor who has just watched the session: calm, specific, economical.\n- Do NOT restate the score or say how many answers were wrong; that is already visible on screen.\n- Do NOT use vague phrases such as "broad diagnostic uncertainty", "varied topics", "areas of weakness", "performance pattern", "knowledge gaps" or similar report language.\n- No congratulations, emojis, hype, motivational filler, coaching clichés or generic AI language.\n- Never use "mastered", "strong at", "weak at" or readiness percentages.\n- Only claim a repeated pattern when at least TWO separate questions genuinely support the SAME concept, distinction or reasoning feature.\n- A repeated concept is valid evidence. A vague category such as diagnosis/management is NOT valid unless the supplied lead-ins clearly support it at least twice.\n- If there is no supported repeated signal, say so simply: e.g. "The misses were spread across different concepts, so I wouldn’t call a broader pattern yet."\n- Do not invent medical facts, prior history, learner traits, question categories or causal explanations.\n- NEXT must sound like StudyEdit taking the next action: use "I’ll bring...", "I’ll space...", "I’ll vary...". Never use engineering words such as flag, log, item, queue, algorithm or dataset.\n- NEXT should normally prioritise a repeated missed concept first, then space unrelated misses separately.\n\nSESSION:\n${sessionRows}`;

    const context: QuestionContext = {
      question: sessionRows,
      options: [],
      correctAnswer: `${correct}/${total} retrieved this time`,
      selectedAnswer: `${needsReview} missed this session`,
      explanation: 'Use only the supplied session rows. Do not infer beyond them.',
    };

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;
    setDebriefLoading(true);
    let raw = '';

    void generateAIResponseStream(
      prompt,
      context,
      token => { raw += token; },
      undefined,
      controller.signal,
    ).then(() => {
      if (controller.signal.aborted) return;
      setDebrief(parseTutorDebrief(raw));
    }).catch(error => {
      if (!controller.signal.aborted) console.error('Session debrief failed:', error);
    }).finally(() => {
      if (!controller.signal.aborted) setDebriefLoading(false);
    });

    return () => controller.abort();
  }, [answers, concepts, correct, needsReview, questions, total]);

  const observation = debrief?.observation || deterministicObservation;
  const nextStep = debrief?.nextStep || deterministicNext;

  return (
    <main
      className={`fixed inset-0 overflow-y-auto transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: T.cream, color: T.ink }}
    >
      <div className="mx-auto min-h-full w-full max-w-[540px] px-5 pb-10 pt-5 sm:px-7">
        <header className="flex items-center justify-between border-b pb-4" style={{ borderColor: T.line }}>
          <div>
            <div className="text-[17px] font-semibold tracking-tight" style={{ color: T.espresso }}>StudyEdit</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em]" style={{ color: T.muted }}>Session review</div>
          </div>
          <button onClick={onDone} className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium" style={{ borderColor: T.line, color: T.ink, backgroundColor: T.paper }}>
            <Home className="h-3.5 w-3.5" /> Home
          </button>
        </header>

        <section className="pt-9">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: T.muted }}>
            Session complete · {total} question{total === 1 ? '' : 's'}{sessionDuration ? ` · ${formatDuration(sessionDuration)}` : ''}
          </div>
          <h1 className="mt-3 text-[39px] font-light leading-[1.04] tracking-[-0.035em]" style={{ fontFamily: "'Fraunces', serif", color: T.espresso }}>
            That was useful.
          </h1>
          <p className="mt-4 max-w-md text-[15px] font-medium leading-6" style={{ color: T.ink }}>
            I’ve got fresh evidence from <strong>{evidenceConceptCount}</strong> concept{evidenceConceptCount === 1 ? '' : 's'}. Here’s what changed.
          </p>
        </section>

        <section className="mt-7 flex items-end gap-3 border-b pb-6" style={{ borderColor: T.line }}>
          <div className="text-[52px] font-light leading-none" style={{ fontFamily: "'Fraunces', serif", color: T.espresso }}>{correct}</div>
          <div className="pb-1 text-sm leading-5" style={{ color: T.muted }}>
            of {total}<br />retrieved this time
          </div>
        </section>

        {heldTitles.length > 0 && (
          <section className="mt-7">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#647452' }}>What held up</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {heldTitles.map(title => (
                <span key={title} className="rounded-full border px-3 py-2 text-[13px] font-semibold" style={{ backgroundColor: T.sageSoft, borderColor: T.sage, color: T.espresso }}>{title}</span>
              ))}
            </div>
          </section>
        )}

        {weakTitles.length > 0 && (
          <section className="mt-7">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#9C655D' }}>Where I’d spend the next effort</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {weakTitles.map(title => (
                <span key={title} className="rounded-full border px-3 py-2 text-[13px] font-semibold" style={{ backgroundColor: T.blushSoft, borderColor: T.blushDeep, color: T.espresso }}>{title}</span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 border-l-[3px] pl-5" style={{ borderColor: T.blushDeep }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: T.muted }}>Something I noticed</div>
          <p className="mt-2 text-[18px] font-semibold leading-[1.5] tracking-[-0.01em]" style={{ color: T.espresso }}>
            {debriefLoading && !debrief ? deterministicObservation : observation}
          </p>
        </section>

        <section className="mt-7 rounded-[20px] border p-5" style={{ backgroundColor: T.paper, borderColor: T.line }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: T.muted }}>So next time…</div>
          <p className="mt-2 text-[16px] font-medium leading-6" style={{ color: T.espresso }}>
            {debriefLoading && !debrief ? deterministicNext : nextStep}
          </p>
        </section>

        {weakConcepts.length > 0 && (
          <section className="mt-7">
            <details>
              <summary className="cursor-pointer list-none rounded-[18px] border px-4 py-4 text-[13px] font-semibold" style={{ backgroundColor: T.paper, borderColor: T.line, color: T.espresso }}>
                Review the {needsReview} miss{needsReview === 1 ? '' : 'es'} <span className="ml-1" style={{ color: T.muted }}>↓</span>
              </summary>
              <div className="mt-3 overflow-hidden rounded-[20px] border" style={{ backgroundColor: T.paper, borderColor: T.line }}>
                {weakConcepts.map((concept, position) => (
                  <button key={concept.index} onClick={() => onViewQuestion?.(concept.index)} disabled={!onViewQuestion} className="flex w-full items-center gap-3 px-4 py-4 text-left disabled:cursor-default" style={{ borderTop: position ? `1px solid ${T.line}` : 'none' }}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs" style={{ backgroundColor: T.blushSoft, border: `1px solid ${T.blushDeep}`, color: '#9C655D' }}>×</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold" style={{ color: T.espresso }}>{concept.title}</div>
                      {concept.preview && <div className="mt-1 truncate text-xs" style={{ color: T.muted }}>{concept.preview}</div>}
                    </div>
                    {onViewQuestion && <ArrowRight className="h-4 w-4 shrink-0" style={{ color: T.muted }} />}
                  </button>
                ))}
              </div>
            </details>
          </section>
        )}

        <section className="mt-9 border-t pt-6" style={{ borderColor: T.line }}>
          <button onClick={onDone} className="flex w-full items-center justify-between rounded-full px-5 py-4 text-sm font-semibold" style={{ backgroundColor: T.espresso, color: T.cream }}>
            <span>Back to Home</span><ArrowRight className="h-4 w-4" />
          </button>

          {needsReview > 0 && (
            <button onClick={onRetryIncorrect} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border px-5 py-4 text-sm font-medium" style={{ backgroundColor: T.paper, borderColor: T.line, color: T.ink }}>
              <RotateCcw className="h-4 w-4" /> Retry the {needsReview}
            </button>
          )}

          {onAnotherFive && (
            <button onClick={() => onAnotherFive(undefined)} className="mt-2 flex w-full items-center justify-center gap-2 px-5 py-3 text-sm" style={{ color: T.muted }}>
              <Plus className="h-4 w-4" /> Another 5
            </button>
          )}
        </section>

        <section className="mt-8">
          <details>
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.18em]" style={{ color: T.muted }}>All concepts visited</summary>
            <div className="mt-3 overflow-hidden rounded-[20px] border" style={{ backgroundColor: T.paper, borderColor: T.line }}>
              {concepts.map((concept, position) => (
                <button key={concept.index} onClick={() => onViewQuestion?.(concept.index)} disabled={!onViewQuestion} className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-default" style={{ borderTop: position ? `1px solid ${T.line}` : 'none' }}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]" style={{ backgroundColor: concept.isCorrect ? T.sageSoft : T.blushSoft, border: `1px solid ${concept.isCorrect ? T.sage : T.blushDeep}`, color: concept.isCorrect ? '#647452' : '#9C655D' }}>{concept.isCorrect ? '✓' : '×'}</span>
                  <span className="min-w-0 flex-1 truncate text-sm" style={{ color: T.ink }}>{concept.title}</span>
                  {onViewQuestion && <ArrowRight className="h-3.5 w-3.5" style={{ color: T.muted }} />}
                </button>
              ))}
            </div>
          </details>
        </section>
      </div>
    </main>
  );
};
