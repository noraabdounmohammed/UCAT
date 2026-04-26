import { useState, useEffect } from 'react';
import { fetchDynamicQuestion } from '../../services/dynamicQuestionApi';
import { UkmlaQuestion } from '../../types/dynamicQuestions';
import ReactMarkdown from 'react-markdown';

export function TestExplanationGenerator() {
  const [question, setQuestion] = useState<UkmlaQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [potassiumValues, setPotassiumValues] = useState<string[]>(['3.8', '4.2', '4.5', '4.8']);
  const [selectedPotassium, setSelectedPotassium] = useState<string>('4.5');

  // Load a question with the selected potassium value
  const loadQuestion = async (potassiumValue: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Force the potassium value in the template
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
    loadQuestion(selectedPotassium);
  }, []);

  // Handle potassium selection change
  const handlePotassiumChange = (value: string) => {
    setSelectedPotassium(value);
    loadQuestion(value);
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
            Explanation Generator Test
          </h2>
          <div className="flex gap-2">
            <select 
              value={selectedPotassium}
              onChange={(e) => handlePotassiumChange(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              {potassiumValues.map(value => (
                <option key={value} value={value}>Potassium: {value} mmol/L</option>
              ))}
            </select>
            <button
              onClick={() => loadQuestion(selectedPotassium)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Regenerate
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
            <div
              key={index}
              className={`w-full p-3 text-left rounded-lg transition-colors ${
                index === question.correctAnswer
                  ? 'bg-green-100 border-2 border-green-500 dark:bg-green-900 dark:border-green-400'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
              {option}
              {index === question.correctAnswer && (
                <span className="ml-2 text-green-600 dark:text-green-400">✓ Correct</span>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Explanation</h3>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{question.explanation}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
