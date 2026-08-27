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
  cream: '#FAF5EC',
  espresso: '#1F140C',
  ink: '#2A1E16',
  inkMuted: '#8A7560',
  blush: '#F2C9C1',
  blushDeep: '#E5A89D',
  line: '#D9CCB6',
  lineSoft: '#E8DCC4',
};

export function PracticeModeFilterFlow({ isOpen, onClose, onApplyFilters }: PracticeModeFilterFlowProps) {
  const [studyMode, setStudyMode] = useState<PracticeStudyMode | null>(null);

  if (!isOpen) return null;

  if (studyMode) {
    return (
      <PracticeFilterModalParchment
        isOpen={true}
        onClose={onClose}
        onApplyFilters={(filters) => onApplyFilters({ ...filters, studyMode })}
      />
    );
  }

  const choices: Array<{
    id: PracticeStudyMode;
    title: string;
    eyebrow: string;
    description: string;
    detail: string;
    icon: typeof BookOpenCheck;
  }> = [
    {
      id: 'questions',
      title: 'Questions',
      eyebrow: 'Apply it',
      description: 'Exam-style clinical questions that test whether you can use what you know.',
      detail: 'Best for application and exam practice',
      icon: BookOpenCheck,
    },
    {
      id: 'flashcards',
      title: 'Flashcards',
      eyebrow: 'Recall it',
      description: 'Quick active-recall cards from the same concepts, with spaced review built in.',
      detail: 'Best for a fast pass and remembering facts',
      icon: Layers3,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-5"
      style={{
        backgroundColor: 'rgba(31,20,12,0.24)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-[30px] border-t px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+20px)] shadow-[0_-18px_60px_rgba(31,20,12,0.16)] md:max-w-[470px] md:rounded-[30px] md:border md:px-7 md:pb-7 md:pt-7"
        style={{ backgroundColor: T.cream, borderColor: T.line, fontFamily: "'Inter', sans-serif" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: T.inkMuted }}>
              Practise your way
            </div>
            <h1
              className="mt-2 text-[31px] font-light leading-[1.05] tracking-[-0.035em]"
              style={{ fontFamily: "'Fraunces', serif", color: T.ink }}
            >
              How do you want to <em style={{ color: T.blushDeep }}>study?</em>
            </h1>
            <p className="mt-2 text-[13px] leading-5" style={{ color: T.inkMuted }}>
              Choose a format, then filter the exact concepts you want to work on.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-[0.96]"
            style={{ borderColor: T.line, color: T.inkMuted, backgroundColor: 'rgba(255,253,248,.55)' }}
            aria-label="Close practice builder"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-7 grid gap-3">
          {choices.map((choice) => {
            const Icon = choice.icon;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => setStudyMode(choice.id)}
                className="group w-full rounded-[24px] border p-5 text-left transition duration-150 hover:-translate-y-[1px] active:scale-[0.99]"
                style={{ backgroundColor: 'rgba(255,253,248,.72)', borderColor: T.lineSoft }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: choice.id === 'flashcards' ? 'rgba(242,201,193,.45)' : 'rgba(217,204,182,.38)', color: T.espresso }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.inkMuted }}>
                      {choice.eyebrow}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-[23px] font-light" style={{ fontFamily: "'Fraunces', serif", color: T.ink }}>
                        {choice.title}
                      </span>
                      <span aria-hidden="true" className="text-[20px] transition group-hover:translate-x-0.5" style={{ color: T.blushDeep }}>→</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-5" style={{ color: T.inkMuted }}>{choice.description}</p>
                    <div className="mt-3 text-[11px] font-medium" style={{ color: T.espresso }}>{choice.detail}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 border-t pt-4 text-[11px] leading-4" style={{ borderColor: T.lineSoft, color: T.inkMuted }}>
          Both formats use the same curriculum map and update the same progress model.
        </div>
      </div>
    </div>
  );
}
