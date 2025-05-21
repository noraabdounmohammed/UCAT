// React is used implicitly for JSX
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PracticeQuestionProps {
  question: {
    id: string;
    individual_question: string;
    question_stem?: string | null;
    options: string[];
    correct_answer: string;
    worked_solution?: string | null;
    data_block?: Record<string, unknown>[] | null;
    data_type?: string;
  };
  selectedAnswer: string | null;
  onAnswerSelect: (answer: string) => void;
  showFeedback?: boolean;
}

export function PracticeQuestion({
  question,
  selectedAnswer,
  onAnswerSelect,
  showFeedback = false
}: PracticeQuestionProps) {
  const isCorrect = selectedAnswer === question.correct_answer;

  const renderDataBlock = () => {
    if (!question.data_block || !Array.isArray(question.data_block) || question.data_block.length === 0) return null;

    switch (question.data_type) {
      case 'table':
        return (
          <div className="overflow-x-auto rounded-2xl shadow-[0_0_10px_rgba(0,0,0,0.03)] border border-[#E5E5EA]">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {question.data_block && question.data_block[0] && Object.entries(question.data_block[0]).map(([key], index) => (
                  <tr key={index} className="border-b border-[#E5E5EA]">
                    <th className="py-3 px-5 text-left bg-[#F5F5F7] text-[#3A3A3C] font-medium">{key}</th>
                    {question.data_block && question.data_block.map((row: Record<string, unknown>, i: number) => (
                      <td key={i} className="py-3 px-5 text-center text-[#3A3A3C]">{String(row[key])}</td>
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
          <div className="bg-[#F5F5F7] rounded-2xl p-5 shadow-[0_0_10px_rgba(0,0,0,0.03)] border border-[#E5E5EA]">
            <pre className="text-sm whitespace-pre-wrap overflow-x-auto text-[#3A3A3C] font-mono">
              {JSON.stringify(question.data_block, null, 2)}
            </pre>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="w-full">
      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        {showFeedback && (
          <div className={cn(
            "px-6 py-3 text-sm font-medium",
            isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          )}>
            {isCorrect ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Correct Answer</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <span>Incorrect Answer</span>
              </div>
            )}
          </div>
        )}
        
        <CardContent className="p-6 space-y-6">

          {/* Question Stem */}
          {question.question_stem && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <p className="text-sm md:text-base leading-relaxed text-slate-700">{question.question_stem}</p>
            </div>
          )}

          {/* Data Block */}
          {renderDataBlock()}

          {/* Question */}
          <div className="text-base md:text-lg font-medium text-slate-800">
            {question.individual_question}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                disabled={showFeedback}
                onClick={() => onAnswerSelect(String.fromCharCode(65 + index))}
                className={cn(
                  "w-full text-left flex items-center gap-3 p-4 rounded-lg border",
                  "transition-all duration-200 focus:outline-none",
                  showFeedback ? (
                    String.fromCharCode(65 + index) === question.correct_answer
                      ? "bg-green-50 border-green-200 text-green-800"
                      : String.fromCharCode(65 + index) === selectedAnswer
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  ) : (
                    selectedAnswer === String.fromCharCode(65 + index)
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  )
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium",
                  showFeedback ? (
                    String.fromCharCode(65 + index) === question.correct_answer
                      ? "bg-green-100 text-green-700"
                      : String.fromCharCode(65 + index) === selectedAnswer
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-200 text-slate-600"
                  ) : (
                    selectedAnswer === String.fromCharCode(65 + index)
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-100 text-slate-600"
                  )
                )}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-base flex-1">{option}</span>
                {showFeedback && (
                  <div>
                    {String.fromCharCode(65 + index) === question.correct_answer && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {String.fromCharCode(65 + index) === selectedAnswer && 
                     String.fromCharCode(65 + index) !== question.correct_answer && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Worked Solution */}
          {showFeedback && question.worked_solution && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700">
                <BookOpen className="h-4 w-4" />
                <h3 className="font-medium">Explanation</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{question.worked_solution}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}