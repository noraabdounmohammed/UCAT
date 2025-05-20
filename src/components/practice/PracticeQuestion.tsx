// React is used implicitly for JSX
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Timer, BookOpen, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PracticeQuestionProps {
  question: {
    id: string;
    individual_question: string;
    question_stem?: string | null;
    options: string[];
    correct_answer: string;
    worked_solution?: string | null;
    data_block?: any;
    data_type?: string;
  };
  currentIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  selectedAnswer: string | null;
  onAnswerSelect: (answer: string) => void;
  isLoading?: boolean;
  showFeedback?: boolean;
}

export function PracticeQuestion({
  question,
  currentIndex,
  totalQuestions,
  timeRemaining,
  selectedAnswer,
  onAnswerSelect,
  isLoading,
  showFeedback = false
}: PracticeQuestionProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const isCorrect = selectedAnswer === question.correct_answer;
  const isTimeWarning = timeRemaining <= 30;

  const renderDataBlock = () => {
    if (!question.data_block) return null;

    switch (question.data_type) {
      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {Object.entries(question.data_block[0]).map(([key], index) => (
                  <tr key={index} className="border-b">
                    <th className="py-2 px-4 text-left bg-muted/50">{key}</th>
                    {question.data_block.map((row: any, i: number) => (
                      <td key={i} className="py-2 px-4 text-center">{row[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      case 'bar_chart':
      case 'pie_chart':
        return (
          <div className="bg-muted/30 rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(question.data_block, null, 2)}
            </pre>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-soft-xl transition-shadow duration-300 hover:shadow-soft-2xl">
        <CardHeader className={cn(
          "border-b space-y-4 px-4 md:px-6 pb-6",
          showFeedback && (isCorrect ? "bg-emerald-500/10" : "bg-rose-500/10"),
          "transition-colors duration-300"
        )}>
          {showFeedback ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
              {isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-500" />
              )}
              <CardTitle className="text-lg">
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </CardTitle>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge 
                variant="outline" 
                className="font-normal bg-background/50 backdrop-blur-sm"
              >
                Question {currentIndex + 1} of {totalQuestions}
              </Badge>
              <div className={cn(
                "flex items-center gap-2",
                isTimeWarning ? "text-amber-500 animate-pulse" : "text-muted-foreground",
                "transition-colors duration-300"
              )}>
                {isTimeWarning && <AlertCircle className="h-4 w-4" />}
                <Timer className="h-4 w-4" />
                <span className="tabular-nums font-medium">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
          <Progress 
            value={progress} 
            className={cn(
              "h-2 transition-all duration-300",
              showFeedback && (isCorrect ? "bg-emerald-500/20" : "bg-rose-500/20")
            )} 
          />
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Question Stem */}
          {question.question_stem && (
            <div className="bg-muted/30 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-sm md:text-base leading-relaxed">{question.question_stem}</p>
            </div>
          )}

          {/* Data Block */}
          {renderDataBlock()}

          {/* Question */}
          <div className="text-base md:text-lg font-medium animate-in fade-in slide-in-from-top-2 duration-300">
            {question.individual_question}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                disabled={showFeedback || isLoading}
                onClick={() => onAnswerSelect(String.fromCharCode(65 + index))}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-4 rounded-lg",
                  "border-2 transition-all duration-300",
                  "group hover:shadow-soft-xl focus:outline-none focus:ring-2 focus:ring-primary/20",
                  "animate-in fade-in slide-in-from-bottom-2",
                  "disabled:cursor-not-allowed",
                  showFeedback ? (
                    String.fromCharCode(65 + index) === question.correct_answer
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : String.fromCharCode(65 + index) === selectedAnswer
                      ? "border-rose-500/30 bg-rose-500/5"
                      : "border-transparent bg-muted/30"
                  ) : (
                    selectedAnswer === String.fromCharCode(65 + index)
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/30 hover:border-primary/50"
                  )
                )}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm md:text-base">{option}</span>
                  {showFeedback && (
                    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                      {String.fromCharCode(65 + index) === question.correct_answer && (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">
                          Correct Answer
                        </Badge>
                      )}
                      {String.fromCharCode(65 + index) === selectedAnswer && 
                       String.fromCharCode(65 + index) !== question.correct_answer && (
                        <Badge variant="outline" className="border-rose-500/30 text-rose-500">
                          Your Answer
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Worked Solution */}
          {showFeedback && question.worked_solution && (
            <div className="bg-primary/5 rounded-lg p-4 space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-2 text-primary">
                <BookOpen className="h-4 w-4" />
                <h3 className="font-medium">Worked Solution</h3>
              </div>
              <p className="text-sm md:text-base leading-relaxed">{question.worked_solution}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}