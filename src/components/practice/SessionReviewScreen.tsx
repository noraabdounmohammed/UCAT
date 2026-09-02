import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
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

type Journey = 'cold' | 'new' | 'returning';

const T = {
  parchment: '#F4ECDF',
  paper: '#FFFDF8',
  cream: '#FAF5EC',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E1D4BF',
  blush: '#E5A89D',
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

function readJourney(): Journey {
  if (typeof window === 'undefined') return 'returning';
  try {
    const stored = window.sessionStorage.getItem('studyedit_current_journey_v1');
    if (stored === 'cold' || stored === 'new' || stored === 'returning') return stored;
  } catch {
    // Journey styling must never block the lesson ending.
  }
  return 'returning';
}

export const SessionReviewScreen: React.FC<SessionReviewScreenProps> = ({
  answers,
  questions,
  onRetryIncorrect,
  onDone,
  onAnotherFive,
  onViewQuestion,
}) => {
  const [visible, setVisible] = useState(false);
  const [debrief, setDebrief] = useState<TutorDebrief | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const journey = useMemo(readJourney, []);

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
      const title = question?.concept_title || question?.title || question?.topic || `Question ${index + 1}`;
      const stem = question?.clinical_vignette || question?.vignette || question?.question_stem || question?.question || question?.content || '';
      const leadIn = question?.question_text || question?.individual_question || question?.question || '';
      const keyFact = question?.key_fact || '';
      const preview = stem.length > 112 ? `${stem.slice(0, 112)}…` : stem;
      return {
        index,
        title,
        leadIn,
        keyFact,
        preview,
        selectedOption: answer?.selectedOption || '',
        isCorrect: answer?.isCorrect ?? false,
      };
    });
  }, [questions, answers]);

  const weakConcepts = concepts.filter(concept => !concept.isCorrect);

  const repeatedMiss = useMemo(() => {
    const counts = new Map<string, number>();
    weakConcepts.forEach(concept => counts.set(concept.title, (counts.get(concept.title) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).find(([, count]) => count >= 2) || null;
  }, [weakConcepts]);

  const deterministicObservation = useMemo(() => {
    if (needsReview === 0) return `Nothing obvious needs chasing from that. I’d leave those alone for now rather than testing them again just because we can.`;
    if (repeatedMiss) return `${repeatedMiss[0]} caught you more than once. I’d bring that distinction back deliberately rather than repeating everything.`;
    if (needsReview === 1) return `There’s one thing I want another look at, but I wouldn’t turn one miss into a story about your ability.`;
    return `The misses were on different things. I’d bring them back separately rather than pretending they’re one big weakness.`;
  }, [needsReview, repeatedMiss]);

  const deterministicNext = useMemo(() => {
    if (needsReview === 0) return `Next time I’d move on and let today’s successful retrieval earn some space.`;
    if (repeatedMiss) return `Next time I’d start by checking ${repeatedMiss[0]} from a different angle, then move on.`;
    return `Next time I’d revisit the misses in different cases, spaced apart.`;
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
    const prompt = `SessionDebrief-${sessionSignature}-${correct}-${needsReview}.\n\nYou are StudyEdit closing a private UKMLA tutorial. Return EXACTLY two single-line fields and nothing else:\nOBSERVATION: [max 24 words]\nNEXT: [max 22 words]\n\nRules:\n- Sound like the same sharp human tutor who has just spent the lesson with this learner. Calm, specific, economical.\n- Do not sound like a report, dashboard, analytics product or coaching app.\n- Do NOT restate the score.\n- No congratulations, emojis, hype, motivational filler or generic AI language.\n- Never use mastered, strong at, weak at, readiness, performance, knowledge gaps, evidence count or learning signal.\n- Only claim a repeated pattern when at least TWO separate questions genuinely support the SAME concept or distinction.\n- If there is no supported repeated signal, say so plainly rather than manufacturing a pattern.\n- Do not invent medical facts, learner traits or causal explanations.\n- NEXT should sound like you personally deciding what to do when they return: “I’d bring…”, “I’d start…”, “I’d leave…”.\n\nSESSION:\n${sessionRows}`;

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
  const closingTitle = journey === 'cold' ? 'That’s enough for a first pass.' : 'Good place to stop.';
  const closingLead = journey === 'cold'
    ? 'I’ve seen enough to stop treating you like a blank slate.'
    : journey === 'new'
      ? 'That gave me something useful to work with next time.'
      : 'I’ve got a clearer idea of what I want to bring back next time.';

  return (
    <main
      className={`fixed inset-0 overflow-y-auto transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ backgroundColor: T.parchment, color: T.ink }}
    >
      <div className="mx-auto min-h-full w-full max-w-[700px] px-5 pb-14 pt-7 sm:px-8 sm:pt-10">
        <div className="text-[23px] tracking-[-0.045em]" style={{ fontFamily: "'Fraunces', Georgia, serif", color: T.espresso }}>
          studyedit<span style={{ color: T.blush }}>.</span>
        </div>

        <section className="pt-[12vh] sm:pt-[14vh]">
          <h1
            className="max-w-[610px] text-[40px] font-light leading-[1.05] tracking-[-0.04em] sm:text-[50px]"
            style={{ fontFamily: "'Fraunces', Georgia, serif", color: T.espresso }}
          >
            {closingTitle}
          </h1>
          <p className="mt-5 max-w-[570px] text-[17px] font-medium leading-7" style={{ color: '#4A382B' }}>
            {closingLead}
          </p>

          <div className="mt-8 max-w-[590px] border-t pt-7" style={{ borderColor: T.line }}>
            <p className="text-[20px] font-medium leading-[1.6] tracking-[-0.01em]" style={{ color: T.espresso }}>
              {debriefLoading && !debrief ? deterministicObservation : observation}
            </p>
            <p className="mt-5 text-[16px] font-medium leading-7" style={{ color: T.muted }}>
              {debriefLoading && !debrief ? deterministicNext : nextStep}
            </p>
          </div>

          <div className="mt-7 text-[12px]" style={{ color: T.muted }}>
            First pass: {correct} of {total}.
          </div>

          {weakConcepts.length > 0 && (
            <details className="mt-8 max-w-[590px] border-t pt-5" style={{ borderColor: T.line }}>
              <summary className="cursor-pointer list-none text-[13px] font-semibold underline decoration-[#BBA995] underline-offset-4" style={{ color: T.espresso }}>
                Want to look back at {needsReview === 1 ? 'the one I’d revisit' : 'the ones I’d revisit'}?
              </summary>
              <div className="mt-4 border-t" style={{ borderColor: T.line }}>
                {weakConcepts.map((concept, position) => (
                  <button
                    key={concept.index}
                    onClick={() => onViewQuestion?.(concept.index)}
                    disabled={!onViewQuestion}
                    className="flex w-full items-start justify-between gap-4 py-4 text-left disabled:cursor-default"
                    style={{ borderTop: position ? `1px solid ${T.line}` : 'none' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold" style={{ color: T.espresso }}>Question {concept.index + 1}</div>
                      {concept.preview && <div className="mt-1 line-clamp-2 text-[12px] leading-5" style={{ color: T.muted }}>{concept.preview}</div>}
                    </div>
                    {onViewQuestion && <ArrowRight className="mt-1 h-4 w-4 shrink-0" style={{ color: T.muted }} />}
                  </button>
                ))}
              </div>
            </details>
          )}

          <div className="mt-10 max-w-[590px] border-t pt-6" style={{ borderColor: T.line }}>
            {journey === 'cold' ? (
              <>
                <button
                  onClick={onDone}
                  className="group flex items-center gap-3 text-[17px] font-semibold"
                  style={{ color: T.espresso }}
                >
                  Remember this for next time <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-0.5" />
                </button>
                <p className="mt-2 text-[12px] leading-5" style={{ color: T.muted }}>That’s the point where I’d ask you to save it — not before.</p>
              </>
            ) : (
              <button
                onClick={onDone}
                className="group flex items-center gap-3 text-[17px] font-semibold"
                style={{ color: T.espresso }}
              >
                Done for now <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-0.5" />
              </button>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] font-medium" style={{ color: T.muted }}>
              {onAnotherFive && (
                <button onClick={() => onAnotherFive(undefined)} className="underline decoration-[#BBA995] underline-offset-4">
                  Keep going
                </button>
              )}
              {needsReview > 0 && (
                <button onClick={onRetryIncorrect} className="inline-flex items-center gap-1.5 underline decoration-[#BBA995] underline-offset-4">
                  <RotateCcw className="h-3.5 w-3.5" /> Revisit the misses now
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
