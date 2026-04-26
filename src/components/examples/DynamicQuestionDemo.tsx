import { useState, useEffect } from 'react';
import { UkmlaQuestion } from '../../types/dynamicQuestions';
import { fetchDynamicQuestion } from '../../services/dynamicQuestionApi';
import ReactMarkdown from 'react-markdown';

export function DynamicQuestionDemo() {
  const [question, setQuestion] = useState<UkmlaQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Load a dynamic question on component mount
  useEffect(() => {
    loadQuestion();
  }, []);

  // Function to load a new dynamic question
  const loadQuestion = async () => {
    setLoading(true);
    setSelectedOption(null);
    setShowExplanation(false);
    
    try {
      const newQuestion = await fetchDynamicQuestion();
      setQuestion(newQuestion);
    } catch (error) {
      console.error('Failed to load dynamic question:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to regenerate the current question with new variables
  const regenerateQuestion = async () => {
    setRegenerating(true);
    try {
      // Get the same template but with new random variables
      const templateId = question?.id.split('-')[1]; // Extract template ID
      const newQuestion = await fetchDynamicQuestion(templateId);
      setQuestion(newQuestion);
      setSelectedOption(null);
      setShowExplanation(false);
    } catch (error) {
      console.error('Failed to regenerate question:', error);
    } finally {
      setRegenerating(false);
    }
  };

  // Handle option selection
  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
    // Automatically show explanation after selection
    setShowExplanation(true);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading question...</div>;
  }

  if (!question) {
    return <div className="p-8 text-center text-red-500">Failed to load question</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Dynamic Question Example
          </h2>
          <div className="flex gap-2">
            <button
              onClick={regenerateQuestion}
              disabled={regenerating}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate Question'}
            </button>
            <button
              onClick={loadQuestion}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
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
              onClick={() => handleOptionSelect(index)}
              className={`w-full p-3 text-left rounded-lg transition-colors ${
                selectedOption === index
                  ? selectedOption === question.correctAnswer
                    ? 'bg-green-100 border-2 border-green-500 dark:bg-green-900 dark:border-green-400'
                    : 'bg-red-100 border-2 border-red-500 dark:bg-red-900 dark:border-red-400'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
              }`}
              disabled={selectedOption !== null}
            >
              <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
              {option}
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

export default DynamicQuestionDemo;
