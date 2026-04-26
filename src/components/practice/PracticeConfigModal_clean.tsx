import React, { useState, useEffect } from 'react';
import { X, Brain, FileText } from 'lucide-react';
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
  // Show all available formats
  const allFormats: QuestionFormat[] = ['flashcard', 'sba', 'ukmla_sba', 'emq', 'true_false', 'ranking'];
  
  // Formats that are coming soon (disabled)
  const comingSoonFormats: QuestionFormat[] = ['emq', 'true_false', 'ranking'];
  // Default bloom levels if not provided
  const defaultBloomLevels: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  const bloomLevels = availableBloomLevels || defaultBloomLevels;
  const [selectedBloomLevels, setSelectedBloomLevels] = useState<BloomLevel[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<QuestionFormat | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showFlashcardPromptEditor, setShowFlashcardPromptEditor] = useState(false);
  const [showUkmlaNameInput, setShowUkmlaNameInput] = useState(false);
  const [showFlashcardNameInput, setShowFlashcardNameInput] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplateName, setEditingTemplateName] = useState<string | null>(null);
  
  // Prompt presets
  const [promptPresets, setPromptPresets] = useState<Record<string, string>>({});
  const [flashcardPresets, setFlashcardPresets] = useState<Record<string, string>>({});
  const [selectedPromptPreset, setSelectedPromptPreset] = useState<string>('default');
  const [selectedFlashcardPreset, setSelectedFlashcardPreset] = useState<string>('default');
  
  // Built-in prompt templates for different curriculum types
  const builtInSBAPrompts = {
    'clinical': `Create a question with:
1. A realistic clinical vignette (2-3 sentences) with patient demographics, presentation, and relevant history
2. A clear question stem (e.g., "What is the most appropriate next step?" or "What is the most likely diagnosis?")
3. Five options (A-E) that are plausible and similar in length
4. The correct answer should test understanding of the key concept
5. Include a brief explanation of why the correct answer is right`,
    
    'academic': `Create a question with:
1. A clear scenario or context (2-3 sentences) that sets up the problem
2. A direct question stem that tests understanding of the key concept
3. Five options (A-E) that are plausible and similar in length
4. The correct answer should demonstrate mastery of the concept
5. Include a brief explanation of why the correct answer is right`,
    
    'professional': `Create a question with:
1. A realistic professional scenario (2-3 sentences) describing a workplace situation
2. A clear question stem (e.g., "What is the best approach?" or "What should be done first?")
3. Five options (A-E) that are plausible and similar in length
4. The correct answer should reflect best practices
5. Include a brief explanation of why the correct answer is right`,
    
    'factual': `Create a question with:
1. A brief context or setup (1-2 sentences) if needed
2. A direct question stem that tests knowledge of the key concept
3. Five options (A-E) that are plausible and similar in length
4. The correct answer should be factually accurate
5. Include a brief explanation of why the correct answer is right`
  };

  const builtInFlashcardPrompts = {
    'clinical': `Create a medical flashcard with:
1. A concise, focused question for the front that tests understanding of the key concept
2. A comprehensive answer for the back with 2-3 key points
3. Include clinical relevance where appropriate
4. Make it memorable and easy to review`,
    
    'academic': `Create a flashcard with:
1. A clear, focused question for the front that tests understanding of the key concept
2. A comprehensive answer for the back with 2-3 key points
3. Include relevant examples or applications
4. Make it clear and easy to review`,
    
    'professional': `Create a flashcard with:
1. A practical question for the front that tests understanding of the key concept
2. A comprehensive answer for the back with 2-3 key points
3. Include real-world applications where appropriate
4. Make it actionable and easy to review`,
    
    'factual': `Create a flashcard with:
1. A direct question for the front that tests knowledge of the key concept
2. A clear, factual answer for the back with 2-3 key points
3. Include relevant context or examples
4. Make it concise and easy to review`
  };

  const defaultPrompt = builtInSBAPrompts['clinical'];
  const defaultFlashcardPrompt = builtInFlashcardPrompts['clinical'];

  const [customPrompt, setCustomPrompt] = useState(defaultPrompt);
  const [customFlashcardPrompt, setCustomFlashcardPrompt] = useState(defaultFlashcardPrompt);

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPromptPresets = localStorage.getItem('prompt_presets');
    const savedFlashcardPresets = localStorage.getItem('flashcard_presets');
    const lastUsedPromptPreset = localStorage.getItem('last_prompt_preset');
    const lastUsedFlashcardPreset = localStorage.getItem('last_flashcard_preset');
    
    if (savedPromptPresets) {
      const presets = JSON.parse(savedPromptPresets);
      setPromptPresets(presets);
    }
    
    if (savedFlashcardPresets) {
      const presets = JSON.parse(savedFlashcardPresets);
      setFlashcardPresets(presets);
    }
    
    if (lastUsedPromptPreset && lastUsedPromptPreset !== 'default') {
      setSelectedPromptPreset(lastUsedPromptPreset);
      const presets = savedPromptPresets ? JSON.parse(savedPromptPresets) : {};
      if (presets[lastUsedPromptPreset]) {
        setCustomPrompt(presets[lastUsedPromptPreset]);
      }
    }
    
    if (lastUsedFlashcardPreset && lastUsedFlashcardPreset !== 'default') {
      setSelectedFlashcardPreset(lastUsedFlashcardPreset);
      const presets = savedFlashcardPresets ? JSON.parse(savedFlashcardPresets) : {};
      if (presets[lastUsedFlashcardPreset]) {
        setCustomFlashcardPrompt(presets[lastUsedFlashcardPreset]);
      }
    }
  }, []);

  const handleBloomLevelToggle = (level: BloomLevel) => {
    if (selectedBloomLevels.includes(level)) {
      setSelectedBloomLevels(selectedBloomLevels.filter(l => l !== level));
    } else {
      setSelectedBloomLevels([...selectedBloomLevels, level]);
    }
  };

  const handleFormatToggle = (format: QuestionFormat) => {
    // Don't allow selection of coming soon formats
    if (comingSoonFormats.includes(format)) {
      return;
    }
    
    // If the format is already selected, deselect it
    if (selectedFormat === format) {
      setSelectedFormat(null);
    } else {
      // Otherwise, select only this format
      setSelectedFormat(format);
    }
  };


  const handleStartPractice = () => {
    // Determine which prompt to use based on selected preset
    let finalPrompt = customPrompt;
    let finalFlashcardPrompt = customFlashcardPrompt;
    
    // If a saved preset is selected, use that prompt
    if (selectedPromptPreset !== 'default' && selectedPromptPreset !== 'custom') {
      finalPrompt = promptPresets[selectedPromptPreset] || customPrompt;
    } else if (selectedPromptPreset === 'default') {
      finalPrompt = defaultPrompt;
    }
    
    if (selectedFlashcardPreset !== 'default' && selectedFlashcardPreset !== 'custom') {
      finalFlashcardPrompt = flashcardPresets[selectedFlashcardPreset] || customFlashcardPrompt;
    } else if (selectedFlashcardPreset === 'default') {
      finalFlashcardPrompt = defaultFlashcardPrompt;
    }
    
    const config = {
      target_bloom_levels: selectedBloomLevels.length > 0 ? selectedBloomLevels : undefined,
      target_formats: selectedFormat ? [selectedFormat] : undefined,
      question_count: conceptCount, // Use all available concepts
      custom_prompt: finalPrompt,
      custom_flashcard_prompt: finalFlashcardPrompt
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
      case 'sba': return 'SBA';
      case 'ukmla_sba': return 'UKMLA SBA';
      case 'mcq': return 'Multiple Choice';
      case 'emq': return 'Extended Matching';
      case 'true_false': return 'True/False';
      case 'ranking': return 'Ranking/Ordering';
      case 'data_interpretation': return 'Data Interpretation';
      case 'osce': return 'OSCE';
      case 'short_answer': return 'Short Answer';
      case 'flashcard': return 'Flashcard';
      case 'essay': return 'Essay';
      case 'mindmap': return 'Mind Map';
      default: return format;
    }
  };
  
  // Helper function to get format icon
  const getFormatIcon = (format: QuestionFormat): JSX.Element => {
    return <></>;  // Return empty fragment for all formats
  };

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white/90 backdrop-blur-2xl rounded-2xl border border-black/[0.08] shadow-2xl max-w-3xl w-full flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 md:px-12 py-6 md:py-8 border-b border-black/[0.06]">
          <div className="h-[1px] w-16 bg-stone-300 mb-4"></div>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-medium text-stone-900 mb-2 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Choose Format
              </h2>
              <p className="text-sm text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                Select how you want to practice {conceptCount} concept{conceptCount !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="h-5 w-5 text-stone-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 md:px-12 py-6 md:py-8 overflow-y-auto flex-1">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allFormats.map(format => {
                const isComingSoon = comingSoonFormats.includes(format);
                return (
                  <button
                    key={format}
                    onClick={() => !isComingSoon && handleFormatToggle(format)}
                    disabled={isComingSoon}
                    className={`relative p-6 rounded-xl transition-all text-left ${
                      isComingSoon
                        ? 'bg-stone-100 border border-stone-200 cursor-not-allowed opacity-60'
                        : selectedFormat === format 
                        ? 'bg-stone-900 text-white shadow-lg border-2 border-stone-900'
                        : 'bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:border-black/[0.12] hover:shadow-md'
                    }`}
                  >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      {format === 'flashcard' ? (
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <span className="text-lg">🎴</span>
                        </div>
                      ) : format === 'sba' ? (
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <span className="text-lg">📝</span>
                        </div>
                      ) : format === 'ukmla_sba' ? (
                        <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                          <span className="text-lg">🧠</span>
                        </div>
                      ) : format === 'emq' ? (
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <span className="text-lg">🔗</span>
                        </div>
                      ) : format === 'true_false' ? (
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <span className="text-lg">✓</span>
                        </div>
                      ) : format === 'ranking' ? (
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-lg">🔢</span>
                        </div>
                      ) : format === 'mindmap' ? (
                        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                          <span className="text-lg">🗺️</span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center">
                          <span className="text-lg">📝</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-base font-medium tracking-tight ${selectedFormat === format ? 'text-white' : 'text-stone-900'}`} style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                          {getFormatDisplayName(format)}
                        </span>
                        {isComingSoon && (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] uppercase tracking-widest rounded-full" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                            Soon
                          </span>
                        )}
                        {selectedFormat === format && !isComingSoon && (
                          <div className="w-5 h-5 rounded-full bg-[#007AFF] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                      <p className={`text-xs font-light leading-relaxed ${selectedFormat === format ? 'text-white/70' : 'text-stone-500'}`} style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {format === 'flashcard' && 'Quick review cards for efficient memorization'}
                        {format === 'sba' && 'Standard single best answer questions'}
                        {format === 'ukmla_sba' && 'Clinical scenarios with detailed explanations'}
                        {format === 'emq' && 'Match multiple scenarios to a list of options'}
                        {format === 'true_false' && 'Evaluate multiple statements as true or false'}
                        {format === 'ranking' && 'Order steps or prioritize management options'}
                        {format === 'mindmap' && 'Visual concept maps showing relationships and connections'}
                      </p>
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
            
            {selectedFormat === null && (
              <p className="text-sm text-stone-500 font-light mt-6 text-center" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Select a format to continue
              </p>
            )}

        </div>

        {/* Footer - Always visible */}
        <div className="px-6 md:px-12 py-6 border-t border-black/[0.06] bg-white/60 backdrop-blur-xl">
          <button
            onClick={selectedFormat ? handleStartPractice : undefined}
            disabled={!selectedFormat}
            className={`w-full px-8 py-4 rounded-full text-[11px] uppercase tracking-widest transition-all duration-300 ${
              selectedFormat
                ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
            style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
          >
            Start Practice
          </button>
        </div>
      </div>
    </div>
  );
};
