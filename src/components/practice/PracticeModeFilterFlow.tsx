import { useState } from 'react';
import { BookOpenCheck, Layers3, X } from 'lucide-react';
import { PracticeFilterModalParchment, type FilterState } from './PracticeFilterModalParchment';

export type PracticeStudyMode = 'questions' | 'flashcards';
export type PracticeModeFilterState = FilterState & { studyMode: PracticeStudyMode };

interface PracticeModeFilterFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: PracticeModeFilterState) => void;
}

const T = {
  cream: '#FAF5EC', espresso: '#1F140C', ink: '#2A1E16', inkMuted: '#8A7560',
  blushDeep: '#E5A89D', line: '#D9CCB6', lineSoft: '#E8DCC4',
};

export function PracticeModeFilterFlow({ isOpen, onClose, onApplyFilters }: PracticeModeFilterFlowProps) {
  const [studyMode, setStudyMode] = useState<PracticeStudyMode | null>(null);
  if (!isOpen) return null;

  if (studyMode === 'questions') {
    return (
      <PracticeFilterModalParchment
        isOpen={true}
        onClose={onClose}
        onApplyFilters={(filters) => onApplyFilters({ ...filters, studyMode: 'questions' })}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-5"
      style={{ backgroundColor: 'rgba(31,20,12,0.24)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-[30px] border-t px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+20px)] shadow-[0_-18px_60px_rgba(31,20,12,0.16)] md:max-w-[470px] md:rounded-[30px] md:border md:px-7 md:pb-7 md:pt-7"
        style={{ backgroundColor: T.cream, borderColor: T.line }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: T.inkMuted }}>Practise your way</div>
            <h1 className="mt-2 text-[31px] font-light leading-[1.05] tracking-[-0.035em]" style={{ fontFamily: "'Fraunces', serif", color: T.ink }}>
              Choose how you want to <em style={{ color: T.blushDeep }}>study.</em>
            </h1>
            <p className="mt-2 text-[13px] leading-5" style={{ color: T.inkMuted }}>Start with UKMLA questions, then filter the exact concepts you want.</p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: T.line, color: T.inkMuted }} aria-label="Close practice builder">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-7 grid gap-3">
          <button
            type="button"
            onClick={() => setStudyMode('questions')}
            className="group w-full rounded-[24px] border p-5 text-left transition hover:-translate-y-[1px] active:scale-[0.99]"
            style={{ backgroundColor: 'rgba(255,253,248,.78)', borderColor: T.lineSoft }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(217,204,182,.38)', color: T.espresso }}><BookOpenCheck className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.inkMuted }}>Apply it</div>
                <div className="mt-1 flex items-center justify-between"><span className="text-[23px] font-light" style={{ fontFamily: "'Fraunces', serif" }}>Questions</span><span style={{ color: T.blushDeep }}>→</span></div>
                <p className="mt-1.5 text-[13px] leading-5" style={{ color: T.inkMuted }}>Exam-style clinical questions mapped to the concepts underneath.</p>
                <div className="mt-3 text-[11px] font-medium" style={{ color: T.espresso }}>Ready to use</div>
              </div>
            </div>
          </button>

          <div className="w-full rounded-[24px] border p-5 text-left opacity-80" style={{ backgroundColor: 'rgba(255,253,248,.55)', borderColor: T.lineSoft }}>
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(242,201,193,.4)', color: T.espresso }}><Layers3 className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.inkMuted }}>Recall it</span><span className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ backgroundColor: '#F2C9C1', color: '#7F514A' }}>Beta</span></div>
                <div className="mt-1 text-[23px] font-light" style={{ fontFamily: "'Fraunces', serif" }}>Flashcards</div>
                <p className="mt-1.5 text-[13px] leading-5" style={{ color: T.inkMuted }}>Active-recall cards are being quality-checked before we open them to early users.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-4 text-[11px] leading-4" style={{ borderColor: T.lineSoft, color: T.inkMuted }}>Questions are live now. Flashcards will join the same learner map during beta.</div>
      </div>
    </div>
  );
}
