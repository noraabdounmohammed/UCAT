import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// Define properly typed interfaces for the centralized database questions
interface QuestionData {
  id: string;
  individual_question?: string;
  content?: string;
  question?: string;
  question_stem?: string;
  options: Array<{ text: string; id: string } | string>;
  correct_answer?: string;
  correctAnswer?: number;
  worked_solution?: string;
  explanation?: string;
  data_block?: Record<string, unknown> | null;
  data_type?: string;
}

interface PracticeSessionProps {
  questions: QuestionData[];
  onComplete: () => void;
}

/**
 * This component has been deprecated and replaced by NewPracticeSession.
 * This is a placeholder implementation to maintain backward compatibility.
 */
export function PracticeSession({ questions, onComplete }: PracticeSessionProps) {
  useEffect(() => {
    toast.info("Using the new practice session implementation");
  }, []);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Practice Session</h2>
        <p className="mb-6">This component has been replaced with a new implementation.</p>
        <Button onClick={onComplete}>Return to Dashboard</Button>
      </div>
    </div>
  );
}
