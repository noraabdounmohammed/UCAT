import React, { useState } from 'react';
import { QuestionData } from './questionTypes';
import { Check, X, RotateCcw } from 'lucide-react';

interface EMQQuestionProps {
  question: QuestionData;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

interface Scenario {
  id: string;
  prompt: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  explanation: string;
}

export const EMQQuestion: React.FC<EMQQuestionProps> = ({
  question,
  onAnswer,
  onNext
}) => {
  // Create scenario from question data
  const initialScenarios: Scenario[] = [
    {
      id: 's1',
      prompt: question.question_stem || question.clinical_vignette || '',
      selectedOptionId: null,
      correctOptionId: question.correct_answer,
      explanation: question.explanation || ''
    }
  ];

  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleOptionSelect = (scenarioId: string, optionId: string) => {
    if (hasSubmitted) return;
    
    setScenarios(prev => prev.map(s => 
      s.id === scenarioId 
        ? { ...s, selectedOptionId: optionId }
        : s
    ));
  };

  const handleClearScenario = (scenarioId: string) => {
    if (hasSubmitted) return;
    
    setScenarios(prev => prev.map(s => 
      s.id === scenarioId 
        ? { ...s, selectedOptionId: null }
        : s
    ));
  };

  const allAnswered = scenarios.every(s => s.selectedOptionId !== null);

  const handleSubmit = () => {
    if (!allAnswered || hasSubmitted) return;
    
    setHasSubmitted(true);
    
    const allCorrect = scenarios.every(s => s.selectedOptionId === s.correctOptionId);
    onAnswer(allCorrect);
  };

  const handleNext = () => {
    onNext();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
        <h2 className="text-[20px] font-semibold text-zinc-900 dark:text-white">
          Extended Matching Question
        </h2>
        <p className="text-[13px] text-zinc-600 dark:text-zinc-400 mt-1">
          Match each scenario to the most appropriate option
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Option Bank - Sticky */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <div className="p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08]">
              <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white mb-4">
                Options
              </h3>
              <div className="space-y-2">
                {question.options?.map((option) => {
                  const isUsed = scenarios.some(s => s.selectedOptionId === option.id);
                  const isCorrect = hasSubmitted && scenarios.some(s => s.correctOptionId === option.id);
                  
                  return (
                    <div
                      key={option.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCorrect
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-500/30'
                          : isUsed
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500/30'
                          : 'bg-white/60 dark:bg-zinc-800/60 border-black/[0.08] dark:border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-semibold ${
                          isCorrect
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                            : isUsed
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {option.id}
                        </span>
                        <span className="text-[14px] text-zinc-900 dark:text-white leading-relaxed flex-1">
                          {option.text}
                        </span>
                        {isCorrect && hasSubmitted && (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Scenarios */}
        <div className="lg:col-span-2 space-y-4">
          {scenarios.map((scenario, index) => {
            const isCorrect = hasSubmitted && scenario.selectedOptionId === scenario.correctOptionId;
            const isIncorrect = hasSubmitted && scenario.selectedOptionId !== scenario.correctOptionId;
            const selectedOption = question.options?.find(o => o.id === scenario.selectedOptionId);

            return (
              <div
                key={scenario.id}
                className={`p-5 rounded-2xl border-2 transition-all ${
                  isCorrect
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : isIncorrect
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                    : 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-black/[0.08] dark:border-white/[0.08]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-[15px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Scenario {index + 1}
                  </h4>
                  {scenario.selectedOptionId && !hasSubmitted && (
                    <button
                      onClick={() => handleClearScenario(scenario.id)}
                      className="text-[13px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <p className="text-[15px] text-zinc-900 dark:text-white leading-relaxed mb-4 whitespace-pre-wrap">
                  {scenario.prompt}
                </p>

                {/* Option Selection */}
                {!hasSubmitted && (
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Select best match:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {question.options?.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleOptionSelect(scenario.id, option.id)}
                          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                            scenario.selectedOptionId === option.id
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'bg-white/60 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.08]'
                          }`}
                        >
                          {option.id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Answer Display */}
                {scenario.selectedOptionId && !hasSubmitted && selectedOption && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[13px] font-semibold">
                        {selectedOption.id}
                      </span>
                      <span className="text-[14px] text-blue-900 dark:text-blue-100">
                        {selectedOption.text}
                      </span>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {hasSubmitted && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      {isCorrect ? (
                        <>
                          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <span className="text-[15px] font-semibold text-green-900 dark:text-green-100">
                            Correct
                          </span>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <span className="text-[15px] font-semibold text-red-900 dark:text-red-100">
                            Incorrect
                          </span>
                        </>
                      )}
                    </div>

                    {scenario.explanation && (
                      <div className="p-3 bg-white/50 dark:bg-zinc-800/50 rounded-lg">
                        <p className="text-[14px] text-zinc-900 dark:text-white leading-relaxed">
                          {scenario.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end gap-3">
        {!hasSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className={`px-6 py-3 rounded-xl text-[15px] font-semibold transition-all ${
              allAnswered
                ? 'bg-[#007AFF] text-white hover:opacity-90 shadow-sm'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            Check Answers
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-[#007AFF] text-white rounded-xl text-[15px] font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
};
