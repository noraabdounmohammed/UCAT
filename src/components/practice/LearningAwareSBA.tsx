import React, { useMemo, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
  parchment: '#F4ECDF',
  paper: '#FFFDF8',
  cream: '#FAF5EC',
  espresso: '#1F140C',
  ink: '#2A1E16',
  muted: '#8A7560',
  line: '#E8DCC4',
  blush: '#E5A89D',
  blushSoft: '#F9E4DF',
};

function firstUsefulSentence(text: string) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.match(/^(.+?[.!?])(?:\s|$)/)?.[1] || clean;
}

export const LearningAwareSBA: React.FC<LearningAwareSBAProps> = (props) => {
  const [learningOpen, setLearningOpen] = useState(false);
  const [usedLearningMode, setUsedLearningMode] = useState(false);

  const conceptTitle = useMemo(() => String(
    (props.question as any).concept_title || props.question.title || (props.question as any).topic || 'this concept'
  ), [props.question]);

  const teachingText = useMemo(() => {
    const keyFact = String((props.question as any).key_fact || '').trim();
    const explanation = String(props.question.explanation || props.question.worked_solution || '').trim();
    return keyFact || firstUsefulSentence(explanation) || 'This is above your current knowledge frontier. We’ll treat it as learning, not a failed retrieval.';
  }, [props.question]);

  const openLearning = () => {
    setUsedLearningMode(true);
    setLearningOpen(true);
    try {
      const key = `learning_frontier_${props.question.id || props.question.concept_id || props.currentIndex || 0}`;
      sessionStorage.setItem(key, JSON.stringify({ signal: 'dont_know_yet', concept: conceptTitle, at: new Date().toISOString() }));
    } catch {
      // Learning mode must never block the question if storage is unavailable.
    }
  };

  return (
    <>
      <UkmlaSBAQuestion {...props} />

      {!props.preSubmitted && !learningOpen && (
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

      {learningOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F140C]/20 sm:items-center" role="dialog" aria-modal="true" aria-label="Learning mode">
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[30px] border-t px-6 pb-8 pt-5 sm:max-w-[560px] sm:rounded-[30px] sm:border" style={{ borderColor: C.line, backgroundColor: C.cream, color: C.ink }}>
            <div className="mx-auto mb-5 h-1 w-10 rounded-full sm:hidden" style={{ backgroundColor: '#D9CCB6' }} />
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#A9675D' }}>Learn mode</div>
                <h2 className="mt-2 text-[27px] font-medium leading-tight" style={{ color: C.espresso, fontFamily: "'Fraunces', serif" }}>Let’s build this first.</h2>
              </div>
              <button type="button" onClick={() => setLearningOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: C.line, color: C.muted }} aria-label="Back to question"><X className="h-5 w-5" /></button>
            </div>

            <p className="mt-4 text-[14px] leading-6" style={{ color: C.muted }}>You don’t need to guess just to unlock the teaching. StudyEdit will treat this as a signal that the question may be above your current knowledge frontier.</p>

            <div className="mt-6 rounded-[22px] border p-5" style={{ borderColor: '#E5B9B1', backgroundColor: C.blushSoft }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#9C655D' }}>The concept</div>
              <div className="mt-2 text-[20px] font-bold leading-7" style={{ color: C.espresso }}>{conceptTitle}</div>
              <div className="mt-4 text-[16px] font-medium leading-7" style={{ color: '#4B372A' }}>
                <ReactMarkdown>{teachingText}</ReactMarkdown>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border px-4 py-3 text-[13px] leading-5" style={{ borderColor: C.line, backgroundColor: C.paper, color: C.muted }}>
              v0 deliberately uses only the question’s existing verified teaching material. The next version will diagnose the missing prerequisite before deciding what to teach.
            </div>

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
