import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Sun, Moon } from 'lucide-react';
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
  sessionDuration?: number; // in seconds
}

// StudyEdit: Concept-focused messaging
const getSessionMessage = (mastered: number, stillOnList: number, total: number) => {
  if (stillOnList === 0) {
    if (mastered === 1) {
      return { headline: 'One nailed.', sub: 'The territory just expanded.' };
    }
    return { headline: `${mastered} nailed.`, sub: 'Every concept clicked. The territory just expanded.' };
  }
  if (mastered === 0) {
    return { 
      headline: `${stillOnList} still on your list.`, 
      sub: `0 moved forward. The gaps are now visible — that's the point.` 
    };
  }
  if (mastered === 1 && stillOnList === 1) {
    return { 
      headline: 'One nailed. One still on your list.', 
      sub: `50% isn't a grade — it's a signal. The one you missed is exactly the one the system will bring back tomorrow, in different clothing.` 
    };
  }
  if (mastered >= total * 0.7) {
    return { 
      headline: `${mastered} nailed.`, 
      sub: `${stillOnList} still on your list — they'll come back.` 
    };
  }
  return { 
    headline: `${stillOnList} still on your list.`, 
    sub: `${mastered} moved forward. The gaps are now visible — that's the point.` 
  };
};

// Format duration as "X min Ys"
const formatDuration = (seconds?: number) => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins} min ${secs}s`;
};

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

  // Build concept data with details
  const conceptData = useMemo(() => {
    return questions.map((q, i) => {
      const answer = answers.find(a => a.questionIndex === i);
      const title = (q as any).concept_title || q?.title || q?.topic || `Concept ${i + 1}`;
      // Extract category/system from custom_filters or title
      const category = q?.custom_filters?.[0]?.split('-').map((w: string) => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ') || '';
      // Get stem/vignette preview
      const stem = q?.vignette || q?.question || q?.content || '';
      const stemPreview = stem.length > 60 ? stem.substring(0, 60) + '…' : stem;
      // Get accuracy data
      const attempts = q?.mastery_data?.attempts || (answer ? 1 : 0);
      const correct = q?.mastery_data?.correct || (answer?.isCorrect ? 1 : 0);
      const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
      
      return {
        title,
        category,
        stemPreview,
        attempts,
        accuracy,
        isCorrect: answer?.isCorrect ?? false,
        isWeak: answer && !answer.isCorrect,
        questionIndex: i
      };
    });
  }, [questions, answers]);

  return (
    <div 
      className={cn(
        'fixed inset-0 flex flex-col overflow-y-auto transition-opacity duration-500',
        useParchment ? 'bg-[#FAF5EC]' : 'bg-[#0A0A0A]',
        visible ? 'opacity-100' : 'opacity-0'
      )}
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

      <div className="max-w-[440px] mx-auto w-full px-[22px] pb-10">
        {/* Greeting block */}
        <div className={cn(
          "pt-7 pb-6 mb-6 border-b",
          useParchment ? "border-[#E8DCC4]" : "border-white/10"
        )}>
          <div 
            className={cn(
              "text-[11px] font-medium tracking-[0.22em] uppercase mb-3.5",
              useParchment ? "text-[#8A7560]" : "text-white/50"
            )}
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Session complete · {total} concept{total !== 1 ? 's' : ''}{sessionDuration ? ` · ${formatDuration(sessionDuration)}` : ''}
          </div>
          <h1 
            className={cn(
              "text-[38px] font-light leading-[1.0] tracking-[-0.025em] mb-3.5",
              useParchment ? "text-[#2A1E16]" : "text-white"
            )}
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {headline.split('. ').map((part, i, arr) => {
              // Highlight key words
              const words = part.split(' ').map((word, j) => {
                if (word.toLowerCase().includes('nailed') || word.toLowerCase().includes('list')) {
                  return <em key={j} className="italic text-[#E5A89D]">{word} </em>;
                }
                return <span key={j}>{word} </span>;
              });
              return (
                <span key={i}>
                  {words}
                  {i < arr.length - 1 && '. '}
                </span>
              );
            })}
          </h1>
          <p 
            className={cn(
              "text-[16px] italic leading-[1.5]",
              useParchment ? "text-[#3B2A1E]" : "text-white/70"
            )}
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            {sub.split(' ').map((word, i) => {
              if (word.toLowerCase().includes('signal') || word.toLowerCase().includes('tomorrow')) {
                return <em key={i} className="text-[#E5A89D]">{word} </em>;
              }
              return <span key={i}>{word} </span>;
            })}
          </p>
        </div>

        {/* Map Widget - Territory shifts */}
        <div 
          className="rounded-[20px] p-6 mb-4 relative overflow-hidden"
          style={{ backgroundColor: '#1F140C' }}
        >
          {/* Gradient overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(229,168,157,0.08), transparent 50%)' }}
          />
          
          <div className="relative z-10">
            {/* Header with Open map link */}
            <div className="flex items-center justify-between mb-[18px]">
              <span 
                className="text-[10px] font-medium tracking-[0.22em] uppercase"
                style={{ color: 'rgba(245,239,227,0.5)' }}
              >
                Map · what just moved
              </span>
              <button 
                onClick={onDone}
                className="text-[12px] italic pb-0.5"
                style={{ 
                  fontFamily: "'Fraunces', serif", 
                  color: '#F2C9C1',
                  borderBottom: '1px solid rgba(229,168,157,0.4)'
                }}
              >
                Open map →
              </button>
            </div>
            
            <h2 
              className="text-[22px] font-light leading-[1.2] tracking-[-0.015em] mb-[18px]"
              style={{ fontFamily: "'Fraunces', serif", color: '#FAF5EC' }}
            >
              {total === 1 ? 'One concept' : `${mastered > 0 || stillOnList > 0 ? (mastered + stillOnList) : total} concepts`} <em className="italic" style={{ color: '#F2C9C1' }}>shifted</em>.
            </h2>

            {/* Shift rows */}
            <div className="flex flex-col gap-2.5">
              {mastered > 0 && (
                <div className="flex items-center gap-3 text-[13.5px] leading-[1.35]" style={{ color: '#d7c8b3' }}>
                  <span 
                    className="text-[16px] tracking-[-0.01em] mr-1"
                    style={{ fontFamily: "'Fraunces', serif", color: '#FAF5EC' }}
                  >
                    {mastered}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: '#4a3a2c' }} />
                    <span className="text-[11px]" style={{ color: '#8A7560' }}>→</span>
                    <span 
                      className="w-[9px] h-[9px] rounded-full" 
                      style={{ backgroundColor: '#8FA379', boxShadow: '0 0 0 3px rgba(143,163,121,0.18)' }} 
                    />
                  </div>
                  <span className="text-[12.5px]" style={{ color: '#c8b89c' }}>
                    {conceptData.filter(c => c.isCorrect).slice(0, 1).map(c => c.title).join('')}
                  </span>
                </div>
              )}
              
              {stillOnList > 0 && (
                <div className="flex items-center gap-3 text-[13.5px] leading-[1.35]" style={{ color: '#d7c8b3' }}>
                  <span 
                    className="text-[16px] tracking-[-0.01em] mr-1"
                    style={{ fontFamily: "'Fraunces', serif", color: '#FAF5EC' }}
                  >
                    {stillOnList}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: '#E5A89D' }} />
                    <span className="text-[11px]" style={{ color: '#8A7560' }}>→</span>
                    <span className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: '#E5A89D' }} />
                  </div>
                  <span className="text-[12.5px]" style={{ color: '#c8b89c' }}>
                    <em style={{ fontStyle: 'italic' }}>still</em> weak · {conceptData.filter(c => c.isWeak).slice(0, 1).map(c => c.title).join('')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Takeaways Card */}
        <PracticeSessionTakeaways answers={answers} questions={questions} light={light} />

        {/* Review Card - Retry suggestion */}
        {stillOnList > 0 && (
          <div 
            className="rounded-[16px] p-[18px_20px] mb-4 flex gap-3.5 items-start"
            style={{ 
              backgroundColor: '#F9E4DF', 
              border: '1px solid #E5A89D' 
            }}
          >
            <span 
              className="text-[24px] leading-none flex-shrink-0 mt-0.5"
              style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: '#E5A89D' }}
            >
              ↻
            </span>
            <div className="flex-1">
              <div 
                className="text-[16px] font-medium leading-[1.3] mb-1"
                style={{ fontFamily: "'Fraunces', serif", color: '#2A1E16' }}
              >
                {stillOnList === 1 ? 'One concept' : `${stillOnList} concepts`} to <em className="italic" style={{ color: '#8a3328' }}>review now</em>
              </div>
              <p className="text-[12.5px] leading-[1.45]" style={{ color: '#3B2A1E' }}>
                Retrying within the hour is roughly 3× more effective than coming back to it tomorrow. The link is fresh — make it stick.
              </p>
            </div>
          </div>
        )}

        {/* CTA Pair */}
        <div className="grid grid-cols-[1fr_1.3fr] gap-2.5 mb-7">
          <button
            onClick={onRetryIncorrect}
            disabled={stillOnList === 0}
            className="py-4 rounded-full font-medium text-[13.5px] flex items-center justify-center gap-2 transition-all border disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              fontFamily: "'Inter', sans-serif",
              backgroundColor: useParchment ? '#FAF5EC' : 'rgba(255,255,255,0.1)',
              borderColor: useParchment ? '#D9CCB6' : 'rgba(255,255,255,0.2)',
              color: useParchment ? '#2A1E16' : '#fff'
            }}
          >
            ↻ Retry the {stillOnList || 0}
          </button>
          {onAnotherFive && (
            <button
              onClick={() => onAnotherFive(undefined)}
              className="py-4 rounded-full font-medium text-[13.5px] flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
              style={{ 
                fontFamily: "'Inter', sans-serif",
                backgroundColor: useParchment ? '#1F140C' : '#fff',
                color: useParchment ? '#FAF5EC' : '#0A0A0A'
              }}
            >
              <Plus className="w-4 h-4" />
              Another 5 →
            </button>
          )}
        </div>

        {/* Concept breakdown - StudyEdit style */}
        <div className="pt-1.5">
          <div className="flex justify-between items-baseline mb-3.5">
            <span 
              className="text-[11px] font-medium tracking-[0.22em] uppercase"
              style={{ color: useParchment ? '#8A7560' : 'rgba(255,255,255,0.4)' }}
            >
              Concepts visited
            </span>
            <span 
              className="text-[12.5px] italic"
              style={{ fontFamily: "'Fraunces', serif", color: useParchment ? '#8A7560' : 'rgba(255,255,255,0.4)' }}
            >
              tap to revisit
            </span>
          </div>
          
          <div>
            {conceptData.map((concept, i) => {
              const isClickable = onViewQuestion;

              return (
                <button
                  key={i}
                  onClick={() => isClickable && onViewQuestion(concept.questionIndex)}
                  disabled={!isClickable}
                  className="w-full flex items-center gap-3.5 py-4 text-left transition-all border-t"
                  style={{ 
                    borderColor: useParchment ? '#E8DCC4' : 'rgba(255,255,255,0.08)',
                    paddingLeft: '0',
                    cursor: isClickable ? 'pointer' : 'default'
                  }}
                  onMouseOver={(e) => isClickable && (e.currentTarget.style.paddingLeft = '4px')}
                  onMouseOut={(e) => (e.currentTarget.style.paddingLeft = '0')}
                >
                  {/* Status icon */}
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[13px]"
                    style={{ 
                      backgroundColor: concept.isCorrect ? '#E2EAD6' : concept.isWeak ? '#F9E4DF' : (useParchment ? '#EBE1D0' : 'rgba(255,255,255,0.1)'),
                      border: `1px solid ${concept.isCorrect ? '#8FA379' : concept.isWeak ? '#E5A89D' : (useParchment ? '#D9CCB6' : 'rgba(255,255,255,0.2)')}`,
                      color: concept.isCorrect ? '#8FA379' : concept.isWeak ? '#E5A89D' : (useParchment ? '#8A7560' : 'rgba(255,255,255,0.4)')
                    }}
                  >
                    {concept.isCorrect ? '✓' : concept.isWeak ? '✕' : '–'}
                  </div>
                  
                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div 
                      className="text-[16px] font-medium leading-[1.2] mb-1 tracking-[-0.005em]"
                      style={{ fontFamily: "'Fraunces', serif", color: useParchment ? '#2A1E16' : '#fff' }}
                    >
                      {concept.category && <span>{concept.category} · </span>}
                      <em className="italic" style={{ color: '#E5A89D', fontWeight: 400 }}>{concept.title}</em>
                    </div>
                    <div 
                      className="text-[12px] leading-[1.4] truncate"
                      style={{ color: useParchment ? '#8A7560' : 'rgba(255,255,255,0.5)' }}
                    >
                      {concept.stemPreview || 'No preview available'}
                    </div>
                  </div>
                  
                  {/* Meta */}
                  <div 
                    className="text-right flex-shrink-0 text-[12px] italic leading-[1.3]"
                    style={{ fontFamily: "'Fraunces', serif", color: useParchment ? '#8A7560' : 'rgba(255,255,255,0.4)' }}
                  >
                    <span 
                      className="block text-[14px]"
                      style={{ color: concept.isWeak ? '#E5A89D' : (useParchment ? '#2A1E16' : '#fff') }}
                    >
                      {concept.attempts}×
                    </span>
                    {concept.accuracy}% accuracy
                  </div>
                </button>
              );
            })}
            {/* Bottom border for last item */}
            <div style={{ borderTop: `1px solid ${useParchment ? '#E8DCC4' : 'rgba(255,255,255,0.08)'}` }} />
          </div>
        </div>

      </div>
    </div>
  );
};
