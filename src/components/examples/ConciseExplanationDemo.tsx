import { useState, useEffect } from 'react';
import { fetchDynamicQuestion } from '../../services/dynamicQuestionApi';
import { UkmlaQuestion } from '../../types/dynamicQuestions';
import ReactMarkdown from 'react-markdown';

export function ConciseExplanationDemo() {
  const [question, setQuestion] = useState<UkmlaQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // We'll use these variables in future enhancements
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Load a question with the selected potassium value
  const loadQuestion = async () => {
    setLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    
    try {
      // Fetch a dynamic question
      const templateId = 'HTN-001';
      const customQuestion = await fetchDynamicQuestion(templateId);
      
      // Display the generated question
      setQuestion(customQuestion);
    } catch (err) {
      setError('Failed to generate question: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Load initial question
  useEffect(() => {
    loadQuestion();
  }, []);

  // Handle answer selection
  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
    setShowExplanation(true);
  };

  if (loading) {
    return <div className="p-8 text-center">Generating question...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (!question) {
    return <div className="p-8 text-center">No question generated</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Concise Explanation Demo
          </h2>
          <div className="flex gap-2">
            <button
              onClick={loadQuestion}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              New Question
            </button>
          </div>
        </div>
        
        <div className="mb-4 text-sm flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
            {question.section}
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
            {question.topic}
          </span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
            {question.microSkill}
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">
            {question.difficulty}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
            ID: {question.id}
          </span>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-6">
          <p className="whitespace-pre-line text-gray-800 dark:text-gray-200">
            {question.content}
          </p>
        </div>
        
        <div className="space-y-3 mb-6">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`w-full p-3 text-left rounded-lg transition-colors ${
                selectedAnswer === index
                  ? index === question.correctAnswer
                    ? 'bg-green-100 border-2 border-green-500 dark:bg-green-900 dark:border-green-400'
                    : 'bg-red-100 border-2 border-red-500 dark:bg-red-900 dark:border-red-400'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
              }`}
            >
              <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
              {option}
              {selectedAnswer === index && index === question.correctAnswer && (
                <span className="ml-2 text-green-600 dark:text-green-400">✓ Correct</span>
              )}
              {selectedAnswer === index && index !== question.correctAnswer && (
                <span className="ml-2 text-red-600 dark:text-red-400">✗ Incorrect</span>
              )}
            </button>
          ))}
        </div>
        
        {showExplanation && (
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Explanation</h3>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{question.explanation}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
