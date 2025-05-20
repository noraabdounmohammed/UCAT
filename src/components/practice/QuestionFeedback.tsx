// React is used implicitly for JSX
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ArrowRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionFeedbackProps {
  question: {
    individual_question: string;
    question_stem?: string | null;
    options: string[];
    correct_answer: string;
    worked_solution?: string | null;
  };
  selectedAnswer: string;
  onNext: () => void;
}

export function QuestionFeedback({
  question,
  selectedAnswer,
  onNext
}: QuestionFeedbackProps) {
  const isCorrect = selectedAnswer === question.correct_answer;
  
  return (
    <Card className="shadow-soft-xl">
      <CardHeader className={cn(
        "border-b space-y-2",
        isCorrect ? "bg-emerald-500/10" : "bg-rose-500/10"
      )}>
        <div className="flex items-center gap-2">
          {isCorrect ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-500" />
          )}
          <CardTitle className="text-lg">
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-6">
        {/* Question and Answer */}
        <div className="space-y-4">
          {question.question_stem && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm md:text-base">{question.question_stem}</p>
            </div>
          )}
          
          <div className="text-base md:text-lg font-medium">
            {question.individual_question}
          </div>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-lg border-2 transition-colors",
                  index.toString() === question.correct_answer
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : index.toString() === selectedAnswer
                    ? "border-rose-500/30 bg-rose-500/5"
                    : "border-transparent bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm md:text-base">{option}</span>
                  {index.toString() === question.correct_answer && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">
                      Correct Answer
                    </Badge>
                  )}
                  {index.toString() === selectedAnswer && index.toString() !== question.correct_answer && (
                    <Badge variant="outline" className="border-rose-500/30 text-rose-500">
                      Your Answer
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worked Solution */}
        {question.worked_solution && (
          <div className="bg-primary/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" />
              <h3 className="font-medium">Worked Solution</h3>
            </div>
            <p className="text-sm md:text-base">{question.worked_solution}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 md:p-6 pt-2 flex justify-end">
        <Button
          onClick={onNext}
          className={cn(
            "group relative px-8 py-6 text-lg font-medium",
            "shadow-soft-xl hover:shadow-soft-2xl",
            "transition-all duration-300"
          )}
        >
          <span className="flex items-center gap-2">
            Next Question
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
}