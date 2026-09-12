import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown } from 'lucide-react';
import { generateConditionPrimerStream, QuestionContext } from '@/services/openai';

interface ConditionPrimerPanelProps {
  condition: string;
  questionContext: QuestionContext;
  keyFact?: string;
}

export function ConditionPrimerPanel({ condition, questionContext, keyFact }: ConditionPrimerPanelProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadPrimer = async () => {
    if (content || loading) return;
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let streamed = '';

    try {
      await generateConditionPrimerStream(
        { condition, questionContext, keyFact },
        token => {
          streamed += token;
          setContent(streamed);
        },
        undefined,
        controller.signal,
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      abortRef.current = null;
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void loadPrimer();
    else abortRef.current?.abort();
  };

  return (
    <div className="mt-6 border-t border-[#E8DCC4] pt-4">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 py-2 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-[14px] font-bold text-[#1F140C]">Teach me {condition}</span>
          <span className="mt-0.5 block text-[12px] text-[#8A7560]">A one-minute overview from the beginning</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#8A7560] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 rounded-[18px] border border-[#E8DCC4] bg-[#FFFDF8] px-4 py-4 sm:px-5">
          {loading && !content && <div className="text-[14px] font-medium text-[#8A7560]">Building the basics…</div>}
          {content && (
            <ReactMarkdown
              className="text-[15px] font-medium leading-[1.7] text-[#3B2A1E]"
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-[#1F140C]">{children}</strong>,
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
      )}
    </div>
  );
}
