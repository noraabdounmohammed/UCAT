import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateAIResponseStream, type QuestionContext } from '@/services/openai';
import { UkmlaSBAQuestion } from './UkmlaSBAQuestion';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';
import type { FilterState } from './PracticeFilterModalParchment';

interface LearningAwareSBAProps {
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
  paper: '#FFFDF8',
  cream: '#FAF5EC',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  blushSoft: '#F9E4DF',
};

function firstUsefulSentence(text: string) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.match(/^(.+?[.!?])(?:\s|$)/)?.[1] || clean;
}

function cleanSelection(value: string) {
  return value.replace(/\s+/g, ' ').replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '').trim();
}

export const LearningAwareSBA: React.FC<LearningAwareSBAProps> = (props) => {
  const [learningOpen, setLearningOpen] = useState(false);
  const [usedLearningMode, setUsedLearningMode] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState('');
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerText, setExplainerText] = useState('');
  const [explainerLoading, setExplainerLoading] = useState(false);
  const questionRootRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const conceptTitle = useMemo(() => String(
    (props.question as any).concept_title || props.question.title || (props.question as any).topic || 'this concept'
  ), [props.question]);

  const teachingText = useMemo(() => {
    const keyFact = String((props.question as any).key_fact || '').trim();
    const explanation = String(props.question.explanation || props.question.worked_solution || '').trim();
    return keyFact || firstUsefulSentence(explanation) || 'This is above your current knowledge frontier. We’ll treat it as learning, not a failed retrieval.';
  }, [props.question]);

  const saveSignal = (signal: string, value?: string) => {
    try {
      const key = `learning_frontier_${props.question.id || props.question.concept_id || props.currentIndex || 0}_${signal}_${value || ''}`;
      sessionStorage.setItem(key, JSON.stringify({ signal, value, concept: conceptTitle, at: new Date().toISOString() }));
    } catch {
      // Learning signals must never block practice.
    }
  };

  const openLearning = () => {
    setUsedLearningMode(true);
    setLearningOpen(true);
    saveSignal('dont_know_yet');
  };

  useEffect(() => {
    setSelectedPhrase('');
    setExplainerOpen(false);
    setExplainerText('');
    setExplainerLoading(false);
    abortControllerRef.current?.abort();
  }, [props.question.id, props.currentIndex]);

  useEffect(() => {
    const readSelection = () => {
      if (learningOpen || explainerOpen) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      const root = questionRootRef.current;
      if (!root || !anchorNode || !focusNode || !root.contains(anchorNode) || !root.contains(focusNode)) return;

      const phrase = cleanSelection(selection.toString());
      if (phrase.length < 2 || phrase.length > 120) return;
      setSelectedPhrase(phrase);
    };

    document.addEventListener('selectionchange', readSelection);
    return () => document.removeEventListener('selectionchange', readSelection);
  }, [learningOpen, explainerOpen]);

  const explainSelectedPhrase = async () => {
    const phrase = cleanSelection(selectedPhrase);
    if (!phrase || explainerLoading) return;

    saveSignal('unfamiliar_term', phrase);
    setExplainerOpen(true);
    setExplainerText('');
    setExplainerLoading(true);

    const questionText = String(
      (props.question as any).clinical_vignette || props.question.question_stem || props.question.question || ''
    );
    const context: QuestionContext = {
      question: `The learner selected the phrase: ${phrase}. This appeared inside a UKMLA-style learning question.`,
      options: [],
      correctAnswer: 'Hidden. Do not infer or reveal it.',
      selectedAnswer: 'The learner has not submitted an answer for this explainer interaction.',
      explanation: '',
    };

    const prompt = [
      `Explain ONLY the selected medical term or phrase: “${phrase}”.`,
      'Give a neutral, plain-English definition in 1-3 short sentences, ideally under 65 words.',
      'Do not say whether it makes any answer option more or less likely. Do not solve the question. Do not name or hint at the correct answer.',
      'Do not connect the definition back to the patient in the vignette. This is a vocabulary/foundation explainer, not question feedback.',
      'If the selected text is ambiguous, non-medical, or you cannot explain it confidently, say that briefly rather than guessing.',
      `For context only, the surrounding vignette was: ${questionText.slice(0, 1200)}`,
    ].join('\n');

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let streamed = '';

    try {
      await generateAIResponseStream(
        prompt,
        context,
        (token: string) => {
          streamed += token;
          setExplainerText(streamed);
        },
        () => undefined,
        controller.signal,
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('StudyEdit term explainer failed:', error);
        setExplainerText('I could not explain that reliably just now. You can return to the question and try again in a moment.');
      }
    } finally {
      if (!controller.signal.aborted) setExplainerLoading(false);
      abortControllerRef.current = null;
    }
  };

  const closeExplainer = () => {
    abortControllerRef.current?.abort();
    setExplainerOpen(false);
    setExplainerLoading(false);
    setSelectedPhrase('');
    window.getSelection()?.removeAllRanges();
  };

  return (
    <>
      <div ref={questionRootRef} className="contents">
        <UkmlaSBAQuestion {...props} />
      </div>

      {selectedPhrase && !learningOpen && !explainerOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-40 flex justify-center px-4 sm:bottom-6">
          <button
            type="button"
            onClick={() => void explainSelectedPhrase()}
            className="pointer-events-auto inline-flex max-w-[92vw] items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold shadow-[0_10px_28px_rgba(31,20,12,0.14)] backdrop-blur"
            style={{ borderColor: '#DDB1A8', backgroundColor: 'rgba(255,253,248,.98)', color: C.espresso }}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate">Explain “{selectedPhrase}”</span>
          </button>
        </div>
      )}

      {!props.preSubmitted && !learningOpen && !explainerOpen && !selectedPhrase && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-30 flex justify-center px-5 sm:bottom-6">
          <button
            type="button"
            onClick={openLearning}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold shadow-[0_8px_24px_rgba(31,20,12,0.10)] backdrop-blur"
            style={{ borderColor: C.line, backgroundColor: 'rgba(255,253,248,.96)', color: C.muted }}
          >
            <BookOpen className="h-4 w-4" />
            I don’t know this yet
          </button>
        </div>
      )}

      {explainerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F140C]/20 sm:items-center" role="dialog" aria-modal="true" aria-label={`Explain ${selectedPhrase}`}>
          <div className="max-h-[82vh] w-full overflow-y-auto rounded-t-[30px] border-t px-6 pb-8 pt-5 sm:max-w-[560px] sm:rounded-[30px] sm:border" style={{ borderColor: C.line, backgroundColor: C.cream, color: C.ink }}>
            <div className="mx-auto mb-5 h-1 w-10 rounded-full sm:hidden" style={{ backgroundColor: '#D9CCB6' }} />
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#A9675D' }}>Quick explainer</div>
                <h2 className="mt-2 text-[26px] font-medium leading-tight" style={{ color: C.espresso, fontFamily: "'Fraunces', serif" }}>{selectedPhrase}</h2>
              </div>
              <button type="button" onClick={closeExplainer} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: C.line, color: C.muted }} aria-label="Back to question">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-[22px] border p-5" style={{ borderColor: '#E5B9B1', backgroundColor: C.blushSoft }}>
              {explainerLoading && !explainerText && (
                <div className="text-[15px] font-medium leading-6" style={{ color: C.muted }}>Explaining without giving away the question…</div>
              )}
              {explainerText && (
                <div className="text-[16px] font-medium leading-7" style={{ color: '#4B372A' }}>
                  <ReactMarkdown>{explainerText}</ReactMarkdown>
                </div>
              )}
            </div>

            <p className="mt-4 text-[12px] leading-5" style={{ color: C.muted }}>This records the phrase as unfamiliar for this session, but does not mark the question wrong or reveal the answer.</p>
            <button type="button" onClick={closeExplainer} className="mt-5 flex w-full items-center justify-center rounded-full px-6 py-[17px] text-[15px] font-bold" style={{ backgroundColor: C.espresso, color: C.cream }}>
              Back to the case →
            </button>
          </div>
        </div>
      )}

      {learningOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F140C]/20 sm:items-center" role="dialog" aria-modal="true" aria-label="Learning mode">
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[30px] border-t px-6 pb-8 pt-5 sm:max-w-[560px] sm:rounded-[30px] sm:border" style={{ borderColor: C.line, backgroundColor: C.cream, color: C.ink }}>
            <div className="mx-auto mb-5 h-1 w-10 rounded-full sm:hidden" style={{ backgroundColor: '#D9CCB6' }} />
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#A9675D' }}>Learn mode</div>
                <h2 className="mt-2 text-[27px] font-medium leading-tight" style={{ color: C.espresso, fontFamily: "'Fraunces', serif" }}>Let’s build this first.</h2>
              </div>
              <button type="button" onClick={() => setLearningOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: C.line, color: C.muted }} aria-label="Back to question">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-[14px] leading-6" style={{ color: C.muted }}>You don’t need to guess just to unlock the teaching. StudyEdit will treat this as a signal that the question may be above your current knowledge frontier.</p>
            <div className="mt-6 rounded-[22px] border p-5" style={{ borderColor: '#E5B9B1', backgroundColor: C.blushSoft }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#9C655D' }}>The concept</div>
              <div className="mt-2 text-[20px] font-bold leading-7" style={{ color: C.espresso }}>{conceptTitle}</div>
              <div className="mt-4 text-[16px] font-medium leading-7" style={{ color: '#4B372A' }}><ReactMarkdown>{teachingText}</ReactMarkdown></div>
            </div>
            <div className="mt-5 rounded-[18px] border px-4 py-3 text-[13px] leading-5" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.muted }}>For safety, this first version only teaches from the question’s existing verified material. Prerequisite teaching will be added behind the same interaction once it is evidence-bound.</div>
            <button type="button" onClick={() => setLearningOpen(false)} className="mt-6 flex w-full items-center justify-center rounded-full px-6 py-[17px] text-[15px] font-bold" style={{ backgroundColor: C.espresso, color: C.cream }}>
              Back to the case →
            </button>
            {usedLearningMode && <div className="mt-3 text-center text-[11px]" style={{ color: C.muted }}>Marked as “didn’t know yet” for this session.</div>}
          </div>
        </div>
      )}
    </>
  );
};
