import React, { useState } from 'react';
import { X, Brain, Clock, Loader2, FileText, Edit3 } from 'lucide-react';
import { useConceptStore } from '@/store/conceptStore';
import type { BloomLevel, QuestionFormat, PracticeConfig } from '@/types/conceptTypes';

interface PracticeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPractice: (config: PracticeConfig) => void;
  availableBloomLevels?: BloomLevel[];
  conceptCount: number;
}

export const PracticeConfigModal: React.FC<PracticeConfigModalProps> = ({
  isOpen,
  onClose,
  onStartPractice,
  availableBloomLevels,
  conceptCount
}) => {
  const { } = useConceptStore();
  // Only show Flashcard and UKMLA SBA formats
  const allFormats: QuestionFormat[] = ['flashcard', 'ukmla_sba'];
  // Default bloom levels if not provided
  const defaultBloomLevels: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  const bloomLevels = availableBloomLevels || defaultBloomLevels;
  const [selectedBloomLevels, setSelectedBloomLevels] = useState<BloomLevel[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<QuestionFormat | null>(null);
  const [useSpacedRepetition, setUseSpacedRepetition] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showFlashcardPromptEditor, setShowFlashcardPromptEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(`Create a question with:
1. A realistic clinical vignette (2-3 sentences) with patient demographics, presentation, and relevant history
2. A clear question stem (e.g., "What is the most appropriate next step?" or "What is the most likely diagnosis?")
3. Five options (A-E) that are plausible and similar in length
4. The correct answer should test understanding of the key concept
5. Include a brief explanation of why the correct answer is right`);
  const [customFlashcardPrompt, setCustomFlashcardPrompt] = useState(`Create a medical flashcard with:
1. A concise, focused question for the front that tests understanding of the key concept
2. A comprehensive answer for the back with 2-3 key points
3. Include clinical relevance where appropriate
4. Make it memorable and easy to review`);

  const handleBloomLevelToggle = (level: BloomLevel) => {
    if (selectedBloomLevels.includes(level)) {
      setSelectedBloomLevels(selectedBloomLevels.filter(l => l !== level));
    } else {
      setSelectedBloomLevels([...selectedBloomLevels, level]);
    }
  };

  const handleFormatToggle = (format: QuestionFormat) => {
    // If the format is already selected, deselect it
    if (selectedFormat === format) {
      setSelectedFormat(null);
    } else {
      // Otherwise, select only this format
      setSelectedFormat(format);
    }
  };

  const handleStartPractice = () => {
    const config = {
      target_bloom_levels: selectedBloomLevels.length > 0 ? selectedBloomLevels : undefined,
      target_formats: selectedFormat ? [selectedFormat] : undefined,
      use_spaced_repetition: useSpacedRepetition,
      question_count: questionCount,
      custom_prompt: customPrompt,
      custom_flashcard_prompt: customFlashcardPrompt
    };
    
    onStartPractice(config);
    onClose();
  };

  if (!isOpen) return null;

  // Helper function to get Bloom level display name and color
  const getBloomLevelInfo = (level: BloomLevel) => {
    switch (level) {
      case 'remember':
        return { name: 'Remember', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' };
      case 'understand':
        return { name: 'Understand', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' };
      case 'apply':
        return { name: 'Apply', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' };
      case 'analyze':
        return { name: 'Analyze', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200' };
      case 'evaluate':
        return { name: 'Evaluate', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' };
      case 'create':
        return { name: 'Create', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' };
      default:
        return { name: level, color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200' };
    }
  };

  // Helper function to get format display name
  const getFormatDisplayName = (format: QuestionFormat) => {
    switch (format) {
      case 'ukmla_sba': return 'UKMLA SBA with AI';
      case 'mcq': return 'Multiple Choice';
      case 'emq': return 'Extended Matching';
      case 'data_interpretation': return 'Data Interpretation';
      case 'osce': return 'OSCE Station';
      case 'short_answer': return 'Short Answer';
      case 'flashcard': return 'Flashcard';
      case 'essay': return 'Essay';
      default: return format;
    }
  };
  
  // Helper function to get format icon
  const getFormatIcon = (format: QuestionFormat): JSX.Element => {
    if (format === 'ukmla_sba') {
      return <span className="text-xs font-bold bg-blue-600 text-white px-1 rounded">AI</span>;
    }
    return <></>;  // Return empty fragment instead of null
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Practice Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Bloom's Taxonomy Levels */}
          <div>
            <div className="flex items-center mb-2">
              <Brain className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                Bloom's Taxonomy Levels
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Select which cognitive levels you want to practice:
            </p>
            <div className="flex flex-wrap gap-2">
              {bloomLevels.map(level => {
                const { name, color } = getBloomLevelInfo(level);
                return (
                  <button
                    key={level}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      selectedBloomLevels.includes(level) 
                        ? color
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => handleBloomLevelToggle(level)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {selectedBloomLevels.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                No selection will include all available levels
              </p>
            )}
          </div>

          {/* Question Formats */}
          <div>
            <div className="flex items-center mb-2">
              <FileText className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                Question Formats
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Select which question formats you want to practice:
            </p>
            <div className="flex flex-wrap gap-2">
              {allFormats.map(format => (
                <button
                  key={format}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    selectedFormat === format 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleFormatToggle(format)}
                >
                  <div className="flex items-center gap-1">
                    {getFormatIcon(format)}
                    <span>{getFormatDisplayName(format)}</span>
                  </div>
                </button>
              ))}
            </div>
            {selectedFormat === null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Please select a format to practice
              </p>
            )}
            
            {/* AI Prompt Editors */}
            <div className="flex gap-3">
              {selectedFormat === 'ukmla_sba' && (
                <button
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Customize UKMLA Prompt
                </button>
              )}
              
              {selectedFormat === 'flashcard' && (
                <button
                  onClick={() => setShowFlashcardPromptEditor(!showFlashcardPromptEditor)}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Customize Flashcard Prompt
                </button>
              )}
            </div>
            
            {showPromptEditor && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  UKMLA SBA Generation Instructions:
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full h-32 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  placeholder="Enter custom instructions for UKMLA SBA generation..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  These instructions will be used to generate UKMLA-style questions. The AI will receive concept details along with your instructions.
                </p>
              </div>
            )}
            
            {showFlashcardPromptEditor && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Flashcard Generation Instructions:
                </label>
                <textarea
                  value={customFlashcardPrompt}
                  onChange={(e) => setCustomFlashcardPrompt(e.target.value)}
                  className="w-full h-32 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                  placeholder="Enter custom instructions for flashcard generation..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  These instructions will be used to generate flashcards. The AI will receive concept details along with your instructions.
                </p>
              </div>
            )}
          </div>

          {/* Spaced Repetition */}
          <div>
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                Practice Options
              </h3>
            </div>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="spaced-repetition"
                checked={useSpacedRepetition}
                onChange={() => setUseSpacedRepetition(!useSpacedRepetition)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="spaced-repetition" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Use spaced repetition (prioritize concepts due for review)
              </label>
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="question-count" className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                Number of questions: {questionCount}
              </label>
              <input
                type="range"
                id="question-count"
                min={1}
                max={Math.min(50, conceptCount)}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>1</span>
                <span>{Math.min(50, conceptCount)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleStartPractice}
              disabled={conceptCount === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {conceptCount === 0 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                'Start Practice'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
