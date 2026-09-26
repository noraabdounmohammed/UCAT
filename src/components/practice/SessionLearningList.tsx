import { ArrowRight } from 'lucide-react';
import { evidenceLabel, needsRevisit, type LearningItem } from '@/lib/sessionLearning';

export function SessionLearningList({ items, onViewQuestion }: {
  items: LearningItem[];
  onViewQuestion?: (index: number) => void;
}) {
  return (
    <ul className="mt-4 divide-y divide-[#E8DCC4] border-y border-[#E8DCC4]">
      {items.map(item => {
        const content = <>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold leading-6 text-[#2A1E16]">{item.title}</span>
            <span className={`mt-1 block text-[14px] leading-5 ${needsRevisit(item) ? 'text-[#8C473D]' : 'text-[#526347]'}`}>
              {evidenceLabel(item)}
            </span>
            {item.passedChecks > 0 && !item.isCorrect && (
              <span className="mt-1 block text-[14px] leading-5 text-[#746354]">First answer incorrect; then answered a tutor check correctly.</span>
            )}
          </span>
          {onViewQuestion && <ArrowRight className="h-4 w-4 shrink-0 text-[#746354]" aria-hidden="true" />}
        </>;
        return <li key={`${item.questionIndex}-${item.title}`}>
          {onViewQuestion
            ? <button type="button" onClick={() => onViewQuestion(item.questionIndex)} className="flex min-h-16 w-full items-center gap-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8FA379]">{content}</button>
            : <div className="flex items-center gap-4 py-4">{content}</div>}
        </li>;
      })}
    </ul>
  );
}
