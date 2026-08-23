import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Sparkles, X } from 'lucide-react';
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

type ConfidenceLevel = 'know' | 'unsure' | 'guess';
type EvidenceClass = 'strong_positive' | 'weak_positive' | 'no_positive_evidence' | 'strong_misconception_signal' | 'weak_negative' | 'uninformative_negative';
type SelectionMode = 'term' | 'phrase' | 'passage';
type SelectionOrigin = 'question' | 'explainer';

interface ExplorerNode {
  selection: string;
  explanation: string;
  origin: SelectionOrigin;
}

interface SelectionActionPosition {
  left: number;
  top: number;
  placeBelow: boolean;
}

const C = {
  paper: '#FFFDF8',
  cream: '#FAF5EC',
  parchment: '#F4ECDF',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  blushSoft: '#F9E4DF',
};

function cleanSelection(value: string) {
  return value.replace(/\s+/g, ' ').replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '').trim();
}

function classifyEvidence(correct: boolean, confidence: ConfidenceLevel): EvidenceClass {
  if (correct && confidence === 'know') return 'strong_positive';
  if (correct && confidence === 'unsure') return 'weak_positive';
  if (correct && confidence === 'guess') return 'no_positive_evidence';
  if (!correct && confidence === 'know') return 'strong_misconception_signal';
  if (!correct && confidence === 'unsure') return 'weak_negative';
  return 'uninformative_negative';
}

function selectionMode(text: string): SelectionMode {
  const words = cleanSelection(text).split(/\s+/).filter(Boolean).length;
  if (words <= 3) return 'term';
  if (words <= 14) return 'phrase';
  return 'passage';
}

export const LearningAwareSBA: React.FC<LearningAwareSBAProps> = (props) => {
  const [selectedPhrase, setSelectedPhrase] = useState('');
  const [selectionOrigin, setSelectionOrigin] = useState<SelectionOrigin>('question');
  const [selectionActionPosition, setSelectionActionPosition] = useState<SelectionActionPosition | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerText, setExplainerText] = useState('');
  const [explainerLoading, setExplainerLoading] = useState(false);
  const [explorerStack, setExplorerStack] = useState<ExplorerNode[]>([]);
  const [confidenceOpen, setConfidenceOpen] = useState(false);
  const [pendingCorrect, setPendingCorrect] = useState<boolean | null>(null);
  const questionRootRef = useRef<HTMLDivElement>(null);
  const explainerRootRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const captureTimersRef = useRef<number[]>([]);

  const conceptTitle = useMemo(() => String(
    (props.question as any).concept_title || props.question.title || (props.question as any).topic || 'this concept'
  ), [props.question]);

  const saveSignal = (signal: string, value?: string, extra?: Record<string, unknown>) => {
    try {
      const key = `learning_frontier_${props.question.id || props.question.concept_id || props.currentIndex || 0}_${signal}_${value || ''}`;
      sessionStorage.setItem(key, JSON.stringify({ signal, value, concept: conceptTitle, at: new Date().toISOString(), ...extra }));
    } catch {
      // Learning signals must never block practice.
    }
  };

  const handleChildAnswer = (isCorrect: boolean) => {
    setPendingCorrect(isCorrect);
    setConfidenceOpen(true);
  };

  const commitConfidence = (confidence: ConfidenceLevel) => {
    if (pendingCorrect === null) return;
    const evidenceClass = classifyEvidence(pendingCorrect, confidence);
    const confidenceRank = confidence === 'know' ? 2 : confidence === 'unsure' ? 1 : 0;
    saveSignal('answer_confidence', confidence, {
      correct: pendingCorrect,
      confidence_rank: confidenceRank,
      evidence_class: evidenceClass,
    });
    props.onAnswer(pendingCorrect);
    setConfidenceOpen(false);
    setPendingCorrect(null);
  };

  const clearCaptureTimers = () => {
    captureTimersRef.current.forEach(id => window.clearTimeout(id));
    captureTimersRef.current = [];
  };

  const positionActionForRange = (range: Range) => {
    const rect = range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) {
      setSelectionActionPosition(null);
      return;
    }

    const viewportWidth = window.innerWidth;
    const estimatedButtonHalfWidth = 72;
    const left = Math.min(
      viewportWidth - estimatedButtonHalfWidth - 10,
      Math.max(estimatedButtonHalfWidth + 10, rect.left + rect.width / 2),
    );
    const roomAbove = rect.top > 58;

    setSelectionActionPosition({
      left,
      top: roomAbove ? rect.top - 8 : rect.bottom + 8,
      placeBelow: !roomAbove,
    });
  };

  const captureSelection = () => {
    if (confidenceOpen) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    if (!anchorNode || !focusNode) return;

    const questionRoot = questionRootRef.current;
    const explainerRoot = explainerRootRef.current;
    const insideQuestion = Boolean(questionRoot?.contains(anchorNode) && questionRoot?.contains(focusNode));
    const insideExplainer = Boolean(explainerRoot?.contains(anchorNode) && explainerRoot?.contains(focusNode));
    if (!insideQuestion && !insideExplainer) return;

    const phrase = cleanSelection(selection.toString());
    if (phrase.length < 2 || phrase.length > 1200) return;

    setSelectedPhrase(phrase);
    setSelectionOrigin(insideExplainer ? 'explainer' : 'question');
    positionActionForRange(selection.getRangeAt(0));
  };

  const scheduleCapture = () => {
    clearCaptureTimers();
    [0, 60, 140, 260].forEach(delay => {
      captureTimersRef.current.push(window.setTimeout(captureSelection, delay));
    });
  };

  useEffect(() => {
    setSelectedPhrase('');
    setSelectionOrigin('question');
    setSelectionActionPosition(null);
    setExplainerOpen(false);
    setExplainerText('');
    setExplainerLoading(false);
    setExplorerStack([]);
    setConfidenceOpen(false);
    setPendingCorrect(null);
    abortControllerRef.current?.abort();
    clearCaptureTimers();
  }, [props.question.id, props.currentIndex]);

  useEffect(() => {
    const onSelectionChange = () => window.setTimeout(captureSelection, 20);
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('pointerup', scheduleCapture);
    document.addEventListener('touchend', scheduleCapture);
    document.addEventListener('mouseup', scheduleCapture);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('pointerup', scheduleCapture);
      document.removeEventListener('touchend', scheduleCapture);
      document.removeEventListener('mouseup', scheduleCapture);
      clearCaptureTimers();
    };
  });

  useEffect(() => {
    const reposition = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      positionActionForRange(selection.getRangeAt(0));
    };
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, []);

  const explainSelectedPhrase = async () => {
    const phrase = cleanSelection(selectedPhrase);
    if (!phrase || explainerLoading) return;

    const mode = selectionMode(phrase);
    const sourceExplanation = selectionOrigin === 'explainer'
      ? explorerStack[explorerStack.length - 1]?.explanation || explainerText
      : '';

    saveSignal('unfamiliar_selection', phrase, {
      selection_mode: mode,
      character_count: phrase.length,
      origin: selectionOrigin,
      depth: selectionOrigin === 'explainer' ? explorerStack.length + 1 : 1,
    });

    setExplainerOpen(true);
    setExplainerText('');
    setExplainerLoading(true);
    setSelectionActionPosition(null);
    window.getSelection()?.removeAllRanges();

    const context: QuestionContext = {
      question: `The learner highlighted this text while studying medicine: ${phrase}`,
      options: [],
      correctAnswer: 'Hidden. Do not infer or reveal it.',
      selectedAnswer: 'No answer is being evaluated in this explainer interaction.',
      explanation: sourceExplanation,
    };

    const modeInstruction = mode === 'term'
      ? 'Define it in plain English, then give the clinically important idea an excellent doctor should attach to it.'
      : mode === 'phrase'
        ? 'Unpack the phrase as a whole. Explain the important components, how they relate, and the clinical meaning a doctor should carry forward.'
        : 'Teach the highlighted passage as a compact clinical reasoning unit. Organise the findings, explain the mechanisms or relationships that matter, and state the general pattern a doctor should learn to recognise.';

    const recursiveInstruction = selectionOrigin === 'explainer'
      ? `The learner highlighted this from a previous explanation. Explain the selected material one layer deeper without assuming they understood the surrounding explanation. Previous explanation for context only: ${sourceExplanation.slice(0, 1400)}`
      : 'This selection came directly from the question.';

    const prompt = [
      `The learner highlighted: “${phrase}”.`,
      recursiveInstruction,
      modeInstruction,
      'Optimise for durable clinical understanding and becoming an excellent doctor, not merely getting this exam item right.',
      'Use clinically standard language. Prioritise mechanisms, discriminating features, pattern recognition, and safety-relevant implications when genuinely relevant.',
      'Do not solve the surrounding SBA, reveal the correct option, or tell the learner which answer to choose.',
      'Do not force every response into a diagnosis. If the selection is terminology, explain it well. If it contains several findings, show how they relate in general clinical reasoning.',
      'Keep it concise enough to stay in flow: usually 60-150 words. Use bullets only when they materially improve clarity.',
      'If the highlighted text is ambiguous or you cannot explain it confidently, say so rather than inventing specificity.',
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
      if (!controller.signal.aborted && streamed.trim()) {
        setExplorerStack(prev => [...prev, { selection: phrase, explanation: streamed, origin: selectionOrigin }]);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('StudyEdit selection explainer failed:', error);
        setExplainerText('I could not explain that reliably just now. Return to the question and try again in a moment.');
      }
    } finally {
      if (!controller.signal.aborted) setExplainerLoading(false);
      abortControllerRef.current = null;
      setSelectedPhrase('');
      setSelectionActionPosition(null);
    }
  };

  const closeExplainer = () => {
    abortControllerRef.current?.abort();
    setExplainerOpen(false);
    setExplainerLoading(false);
    setSelectedPhrase('');
    setSelectionActionPosition(null);
    setExplorerStack([]);
    window.getSelection()?.removeAllRanges();
  };

  const goBackOneLayer = () => {
    if (explorerStack.length <= 1) {
      closeExplainer();
      return;
    }
    const nextStack = explorerStack.slice(0, -1);
    const previous = nextStack[nextStack.length - 1];
    setExplorerStack(nextStack);
    setExplainerText(previous.explanation);
    setSelectedPhrase('');
    setSelectionActionPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  const currentExplorerNode = explorerStack[explorerStack.length - 1];
  const actionVisible = Boolean(selectedPhrase && selectionActionPosition && !confidenceOpen && !explainerLoading);

  return (
    <>
      <div
        ref={questionRootRef}
        className="contents [&_*]:selection:bg-[#E8C9C2]/70 [&_*]:selection:text-[#1F140C]"
        style={{ WebkitUserSelect: 'text', userSelect: 'text', WebkitTouchCallout: 'default' }}
      >
        <UkmlaSBAQuestion {...props} onAnswer={handleChildAnswer} />
      </div>

      {actionVisible && selectionActionPosition && (
        <button
          type="button"
          onPointerDown={event => event.preventDefault()}
          onMouseDown={event => event.preventDefault()}
          onTouchStart={event => event.preventDefault()}
          onClick={() => void explainSelectedPhrase()}
          className="fixed z-[100] inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-bold shadow-[0_10px_28px_rgba(31,20,12,0.20)] backdrop-blur"
          style={{
            left: selectionActionPosition.left,
            top: selectionActionPosition.top,
            transform: selectionActionPosition.placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            borderColor: '#DDB1A8',
            backgroundColor: 'rgba(255,253,248,.99)',
            color: C.espresso,
          }}
          aria-label={`Explain ${selectedPhrase}`}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Explain
        </button>
      )}

      {confidenceOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-5" style={{ backgroundColor: C.parchment }} role="dialog" aria-modal="true" aria-label="Answer confidence">
          <div className="w-full max-w-[520px]">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#A9675D' }}>Before you see the answer</div>
            <h2 className="mt-3 text-[31px] font-medium leading-tight" style={{ color: C.espresso, fontFamily: "'Fraunces', serif" }}>How sure were you?</h2>
            <p className="mt-3 text-[14px] leading-6" style={{ color: C.muted }}>This helps StudyEdit tell real knowledge from a lucky guess.</p>
            <div className="mt-7 flex flex-col gap-3">
              <button type="button" onClick={() => commitConfidence('know')} className="rounded-[18px] border px-5 py-4 text-left transition active:scale-[0.99]" style={{ borderColor: C.line, backgroundColor: C.paper }}><div className="text-[16px] font-bold" style={{ color: C.espresso }}>Knew it</div><div className="mt-1 text-[12px] leading-5" style={{ color: C.muted }}>I could explain why I chose it.</div></button>
              <button type="button" onClick={() => commitConfidence('unsure')} className="rounded-[18px] border px-5 py-4 text-left transition active:scale-[0.99]" style={{ borderColor: C.line, backgroundColor: C.paper }}><div className="text-[16px] font-bold" style={{ color: C.espresso }}>Unsure</div><div className="mt-1 text-[12px] leading-5" style={{ color: C.muted }}>I had some reasoning, but I wasn’t certain.</div></button>
              <button type="button" onClick={() => commitConfidence('guess')} className="rounded-[18px] border px-5 py-4 text-left transition active:scale-[0.99]" style={{ borderColor: '#E5B9B1', backgroundColor: C.blushSoft }}><div className="text-[16px] font-bold" style={{ color: C.espresso }}>Guessed</div><div className="mt-1 text-[12px] leading-5" style={{ color: C.muted }}>I didn’t really know — I picked one to move on.</div></button>
            </div>
          </div>
        </div>
      )}

      {explainerOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#1F140C]/20 sm:items-center" role="dialog" aria-modal="true" aria-label="Clinical explainer">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-[30px] border-t px-6 pb-8 pt-5 sm:max-w-[600px] sm:rounded-[30px] sm:border" style={{ borderColor: C.line, backgroundColor: C.cream, color: C.ink }}>
            <div className="mx-auto mb-5 h-1 w-10 rounded-full sm:hidden" style={{ backgroundColor: '#D9CCB6' }} />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {explorerStack.length > 1 && (
                  <button type="button" onClick={goBackOneLayer} className="mb-3 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: C.muted }}><ChevronLeft className="h-4 w-4" />Previous layer</button>
                )}
                <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#A9675D' }}>Clinical explainer</div>
                <h2 className="mt-2 line-clamp-3 text-[22px] font-medium leading-tight" style={{ color: C.espresso, fontFamily: "'Fraunces', serif" }}>{currentExplorerNode?.selection || selectedPhrase || 'Selected text'}</h2>
              </div>
              <button type="button" onClick={closeExplainer} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: C.line, color: C.muted }} aria-label="Back to question"><X className="h-5 w-5" /></button>
            </div>

            {explorerStack.length > 1 && (
              <div className="mt-3 flex gap-1 overflow-x-auto pb-1 text-[10px] font-semibold" style={{ color: C.muted }}>
                {explorerStack.map((node, index) => <React.Fragment key={`${node.selection}-${index}`}><span className="max-w-[150px] shrink-0 truncate">{node.selection}</span>{index < explorerStack.length - 1 && <span>›</span>}</React.Fragment>)}
              </div>
            )}

            <div
              ref={explainerRootRef}
              className="mt-5 select-text rounded-[22px] border p-5 [&_*]:selection:bg-[#E8C9C2]/80 [&_*]:selection:text-[#1F140C]"
              style={{ borderColor: '#E5B9B1', backgroundColor: C.blushSoft, WebkitUserSelect: 'text', userSelect: 'text' }}
            >
              {explainerLoading && !explainerText && <div className="text-[15px] font-medium leading-6" style={{ color: C.muted }}>Building the clinical meaning…</div>}
              {explainerText && <div className="text-[16px] font-medium leading-7" style={{ color: '#4B372A' }}><ReactMarkdown>{explainerText}</ReactMarkdown></div>}
            </div>

            <p className="mt-4 text-[12px] leading-5" style={{ color: C.muted }}><strong>Anything in this explanation unclear?</strong> Highlight it normally. The Explain button will appear beside your selection.</p>
            <button type="button" onClick={closeExplainer} className="mt-5 flex w-full items-center justify-center rounded-full px-6 py-[17px] text-[15px] font-bold" style={{ backgroundColor: C.espresso, color: C.cream }}>Back to the case →</button>
          </div>
        </div>
      )}
    </>
  );
};