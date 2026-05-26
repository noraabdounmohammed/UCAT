import React, { useEffect, useState } from 'react';
import { RotateCcw, Plus, Sun, Moon, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionAnswer } from './SessionProgressDropdown';
import { useTheme } from '@/contexts/ThemeContext';
import { PracticeSessionTakeaways } from './PracticeSessionTakeaways';

interface SessionReviewScreenProps {
  answers: SessionAnswer[];
  questions: any[];
  onRetryIncorrect: () => void;
  onDone: () => void;
  onAnotherFive?: (filter?: string) => void;
  onViewQuestion?: (questionIndex: number) => void;
}

// StudyEdit: Concept-focused messaging
const getSessionMessage = (mastered: number, stillOnList: number, total: number) => {
  if (stillOnList === 0) {
    return { 
      headline: `${mastered} mastered.`, 
      sub: 'Every concept clicked. The territory just expanded.' 
    };
  }
  if (mastered >= total * 0.7) {
    return { 
      headline: `${mastered} mastered.`, 
      sub: `${stillOnList} still on your list — they'll come back.` 
    };
  }
  if (mastered >= total * 0.5) {
    return { 
      headline: `${mastered} mastered.`, 
      sub: `${stillOnList} need more work. The system will bring them back.` 
    };
  }
  return { 
    headline: `${stillOnList} still on your list.`, 
    sub: `${mastered} moved forward. The gaps are now visible — that's the point.` 
  };
};

export const SessionReviewScreen: React.FC<SessionReviewScreenProps> = ({
  answers,
  questions,
  onRetryIncorrect,
  onDone,
  onAnotherFive,
  onViewQuestion,
}) => {
  const [visible, setVisible] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const light = theme === 'light';
  
  // StudyEdit: Use parchment theme in light mode
  const useParchment = light;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const total = questions.length;
  const mastered = answers.filter(a => a.isCorrect).length;
  const stillOnList = answers.filter(a => !a.isCorrect).length;
  const { headline, sub } = getSessionMessage(mastered, stillOnList, total);
  const incorrectQuestions = answers.filter(a => !a.isCorrect);

  // Group concepts by their state change
  const conceptsMastered = answers.filter(a => a.isCorrect).map(a => {
    const q = questions[a.questionIndex];
    return q?.title || q?.topic || `Concept ${a.questionIndex + 1}`;
  });
  const conceptsStillWeak = answers.filter(a => !a.isCorrect).map(a => {
    const q = questions[a.questionIndex];
    return q?.title || q?.topic || `Concept ${a.questionIndex + 1}`;
  });

  return (
    <div 
      className={cn(
        'fixed inset-0 flex flex-col overflow-y-auto transition-opacity duration-500',
        useParchment ? 'bg-[#F4ECDF]' : 'bg-[#0A0A0A]',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={useParchment ? {
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0.03 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        backgroundBlendMode: 'multiply'
      } : undefined}
    >
      {/* Theme toggle */}
      <div className="sticky top-0 z-10 flex justify-end px-4 pt-4">
        <button
          onClick={toggleTheme}
          className={cn(
            'p-2 rounded-full transition-colors',
            useParchment ? 'hover:bg-[#EBE1D0] text-[#8A7560]' : 'hover:bg-white/10 text-white/60'
          )}
          aria-label="Toggle theme"
        >
          {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>

      <div className="max-w-[480px] mx-auto w-full px-5 sm:px-6 pb-10 sm:pb-16">
        {/* Top section - mono label + headline */}
        <div className={cn(
          "pb-5 mb-6 border-b",
          useParchment ? "border-[#E8DCC4]" : "border-white/10"
        )}>
          <div 
            className={cn(
              "text-[11px] font-medium tracking-[0.22em] uppercase mb-3",
              useParchment ? "text-[#8A7560]" : "text-white/50"
            )}
          >
            Session complete · {total} concepts
          </div>
          <h1 
            className={cn(
              "text-[32px] font-light leading-[1.0] tracking-[-0.025em]",
              useParchment ? "text-[#2A1E16]" : "text-white"
            )}
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {headline.split(' ').map((word, i) => 
              word.includes('mastered') || word.includes('list') ? (
                <em key={i} className="text-[#E5A89D] italic">{word} </em>
              ) : (
                <span key={i}>{word} </span>
              )
            )}
          </h1>
          <p 
            className={cn(
              "text-[14px] italic mt-2",
              useParchment ? "text-[#8A7560]" : "text-white/50"
            )}
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {sub}
          </p>
        </div>

        {/* Map Widget - Territory shifts */}
        <div className={cn(
          "rounded-[22px] p-6 mb-4 relative overflow-hidden",
          useParchment ? "bg-[#1F140C] text-[#FAF5EC]" : "bg-white/5 text-white"
        )}>
          {/* Gradient overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(229,168,157,0.1), transparent 50%)' }}
          />
          
          <div className="relative z-10">
            <div className={cn(
              "text-[10px] font-medium tracking-[0.22em] uppercase mb-3",
              useParchment ? "text-[#FAF5EC]/50" : "text-white/40"
            )}>
              Your map · what just moved
            </div>
            <h2 
              className="text-[22px] font-light leading-[1.2] tracking-[-0.015em] mb-5"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              The territory <em className="italic text-[#F2C9C1]">shifted</em>.
            </h2>

            {/* Shift lines */}
            <div className={cn(
              "flex flex-col gap-2 pt-4 border-t",
              useParchment ? "border-[#FAF5EC]/10" : "border-white/10"
            )}>
              {mastered > 0 && (
                <div className="flex items-center gap-3 text-[13px] animate-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4a3a2c]" />
                    <span className="text-[#8A7560] text-[10px]">→</span>
                    <span className="w-2 h-2 rounded-full bg-[#8FA379]" />
                  </div>
                  <span 
                    className="text-[14px] italic text-[#FAF5EC]"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    +{mastered}
                  </span>
                  <span className="text-[12.5px] text-[#c8b89c]">
                    moved to <em className="text-[#F2C9C1] italic">mastered</em>
                    {conceptsMastered.length > 0 && conceptsMastered.length <= 2 && (
                      <span> — {conceptsMastered.slice(0, 2).join(', ')}</span>
                    )}
                  </span>
                </div>
              )}
              
              {stillOnList > 0 && (
                <div className="flex items-center gap-3 text-[13px] animate-in slide-in-from-bottom-2 duration-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#c8b89c]" />
                    <span className="text-[#8A7560] text-[10px]">→</span>
                    <span className="w-2 h-2 rounded-full bg-[#E5A89D]" />
                  </div>
                  <span 
                    className="text-[14px] italic text-[#FAF5EC]"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    +{stillOnList}
                  </span>
                  <span className="text-[12.5px] text-[#c8b89c]">
                    <em className="text-[#F2C9C1] italic">still weak</em>
                    {conceptsStillWeak.length > 0 && conceptsStillWeak.length <= 2 && (
                      <span> — {conceptsStillWeak.slice(0, 2).join(', ')}</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {stillOnList > 0 ? (
          <div className="mb-6">
            {/* Retry prompt */}
            <div className={cn(
              "py-[18px] pl-[22px] pr-4 border-l-[3px] mb-4",
              useParchment 
                ? "bg-[#FAF5EC] border-l-[#E5A89D]" 
                : "bg-white/5 border-l-rose-400"
            )}>
              <div 
                className={cn(
                  "text-[10px] font-medium tracking-[0.22em] uppercase mb-2",
                  useParchment ? "text-[#8A7560]" : "text-white/50"
                )}
              >
                The system suggests
              </div>
              <p 
                className={cn(
                  "text-[15px] leading-[1.4]",
                  useParchment ? "text-[#2A1E16]" : "text-white/90"
                )}
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Retry the {stillOnList} weak concept{stillOnList > 1 ? 's' : ''} now — 
                <em className="text-[#E5A89D] italic"> it's 3× more effective</em> than moving on.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onRetryIncorrect}
                className={cn(
                  "py-4 rounded-full font-medium text-[13.5px] flex items-center justify-center gap-2 transition-all border",
                  useParchment 
                    ? "bg-[#FAF5EC] border-[#D9CCB6] text-[#2A1E16] hover:border-[#8A7560]" 
                    : "bg-white/10 border-white/20 text-white hover:bg-white/15"
                )}
              >
                <RotateCcw className="w-4 h-4" />
                Retry {stillOnList}
              </button>
              {onAnotherFive && (
                <button
                  onClick={() => onAnotherFive(undefined)}
                  className={cn(
                    "py-4 rounded-full font-medium text-[13.5px] flex items-center justify-center gap-2 transition-all",
                    useParchment 
                      ? "bg-[#1F140C] text-[#FAF5EC] hover:bg-[#3B2A1E]" 
                      : "bg-white text-[#0A0A0A] hover:bg-white/90"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Another 5
                </button>
              )}
            </div>
          </div>
        ) : onAnotherFive && (
          <div className="mb-6">
            <button
              onClick={() => onAnotherFive(undefined)}
              className={cn(
                "w-full py-[18px] rounded-full font-medium text-[15px] flex items-center justify-center gap-3 transition-all",
                useParchment 
                  ? "bg-[#1F140C] text-[#FAF5EC] hover:bg-[#3B2A1E] hover:-translate-y-0.5" 
                  : "bg-white text-[#0A0A0A] hover:bg-white/90 hover:-translate-y-0.5"
              )}
            >
              <Plus className="w-4 h-4" />
              Another 5 concepts
            </button>
          </div>
        )}

        {/* AI Takeaways */}
        <PracticeSessionTakeaways answers={answers} questions={questions} light={light} />

        {/* Concept breakdown - StudyEdit style */}
        <div className={cn(
          'border rounded-[18px] overflow-hidden mb-6',
          useParchment ? 'bg-[#FAF5EC] border-[#D9CCB6]' : 'bg-white/5 border-white/10'
        )}>
          <div className={cn(
            'px-5 py-3.5 border-b',
            useParchment ? 'border-[#E8DCC4]' : 'border-white/10'
          )}>
            <p className={cn(
              'text-[10px] font-medium tracking-[0.22em] uppercase',
              useParchment ? 'text-[#8A7560]' : 'text-white/40'
            )}>
              Concept breakdown
            </p>
          </div>
          <div className={cn('divide-y', useParchment ? 'divide-[#E8DCC4]' : 'divide-white/5')}>
            {questions.map((q, i) => {
              const answer = answers.find(a => a.questionIndex === i);
              const topic = q.title || q.topic || `Concept ${i + 1}`;
              const isClickable = onViewQuestion && answer;
              const isMastered = answer?.isCorrect;
              const isWeak = answer && !answer.isCorrect;

              return (
                <button
                  key={i}
                  onClick={() => isClickable && onViewQuestion(i)}
                  disabled={!isClickable}
                  className={cn(
                    'w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all',
                    isClickable && (useParchment ? 'hover:pl-6' : 'hover:bg-white/5'),
                    !isClickable && 'cursor-default'
                  )}
                >
                  {/* Status pip */}
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full flex-shrink-0",
                    isMastered && "bg-[#8FA379]",
                    isWeak && "bg-[#E5A89D]",
                    !answer && (useParchment ? "bg-[#D9CCB6]" : "bg-white/20")
                  )} />
                  
                  {/* Concept name */}
                  <span 
                    className={cn(
                      'flex-1 text-[14.5px]',
                      useParchment ? 'text-[#2A1E16]' : 'text-white/80'
                    )}
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    {topic}
                  </span>
                  
                  {/* Status label */}
                  <span className={cn(
                    'text-[11px] font-medium',
                    isMastered && (useParchment ? 'text-[#8FA379]' : 'text-emerald-400'),
                    isWeak && (useParchment ? 'text-[#E5A89D]' : 'text-rose-400'),
                    !answer && (useParchment ? 'text-[#8A7560]' : 'text-white/30')
                  )}>
                    {isMastered ? 'mastered' : isWeak ? 'weak' : 'skipped'}
                  </span>
                  
                  {isClickable && (
                    <ChevronRight className={cn(
                      'w-4 h-4',
                      useParchment ? 'text-[#8A7560]' : 'text-white/20'
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Back to dashboard */}
        <button
          onClick={onDone}
          className={cn(
            "w-full py-4 rounded-full border font-medium text-[13.5px] flex items-center justify-center gap-2 transition-all",
            useParchment 
              ? "bg-[#FAF5EC] border-[#D9CCB6] text-[#3B2A1E] hover:border-[#8A7560]" 
              : "bg-white/10 border-white/15 text-white/70 hover:bg-white/15"
          )}
        >
          Back to dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
