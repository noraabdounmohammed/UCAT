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
  // Only show Flashcard and UKMLA SBA formats
  const allFormats: QuestionFormat[] = ['flashcard', 'ukmla_sba'];
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
  
  const defaultPrompt = `Create a question with:
1. A realistic clinical vignette (2-3 sentences) with patient demographics, presentation, and relevant history
2. A clear question stem (e.g., "What is the most appropriate next step?" or "What is the most likely diagnosis?")
3. Five options (A-E) that are plausible and similar in length
4. The correct answer should test understanding of the key concept
5. Include a brief explanation of why the correct answer is right`;

  const defaultFlashcardPrompt = `Create a medical flashcard with:
1. A concise, focused question for the front that tests understanding of the key concept
2. A comprehensive answer for the back with 2-3 key points
3. Include clinical relevance where appropriate
4. Make it memorable and easy to review`;

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
      case 'ukmla_sba': return 'UKMLA SBA';
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
    return <></>;  // Return empty fragment for all formats
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" 
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allFormats.map(format => (
                <div
                  key={format}
                  onClick={() => handleFormatToggle(format)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedFormat === format 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {format === 'ukmla_sba' ? (
                      <span className="text-lg">🧠</span>
                    ) : (
                      <span className="text-lg">🎴</span>
                    )}
                    <span className="font-medium text-sm">{getFormatDisplayName(format)}</span>
                    {getFormatIcon(format)}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {format === 'ukmla_sba' && 'AI-powered clinical scenarios with detailed explanations'}
                    {format === 'flashcard' && 'Quick review cards for efficient memorization'}
                  </p>
                </div>
              ))}
            </div>
            {selectedFormat === null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Please select a format to practice
              </p>
            )}
          </div>

          <div>
            {/* UKMLA SBA Prompt Templates */}
            {selectedFormat === 'ukmla_sba' && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                  UKMLA SBA Generation Templates:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  {/* Default Template */}
                  <div 
                    onClick={() => {
                      setCustomPrompt(defaultPrompt);
                      setSelectedPromptPreset('default');
                    }}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedPromptPreset === 'default' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🏥</span>
                      <span className="font-medium text-sm">Default UKMLA</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      Standard clinical vignettes with 5 options and explanations
                    </p>
                  </div>

                  {/* Saved Templates */}
                  {Object.entries(promptPresets).map(([name, prompt]) => (
                    <div 
                      key={name}
                      onClick={() => {
                        setCustomPrompt(prompt);
                        setSelectedPromptPreset(name);
                        localStorage.setItem('last_prompt_preset', name);
                      }}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md group ${
                        selectedPromptPreset === name 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📝</span>
                          <span className="font-medium text-sm truncate">{name}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomPrompt(prompt);
                              setEditingTemplateName(name);
                              setTemplateName(name);
                              setShowPromptEditor(true);
                              setShowUkmlaNameInput(true);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit template"
                          >
                            <span className="text-xs">✏️</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newPresets = { ...promptPresets };
                              delete newPresets[name];
                              setPromptPresets(newPresets);
                              localStorage.setItem('prompt_presets', JSON.stringify(newPresets));
                              if (selectedPromptPreset === name) {
                                setSelectedPromptPreset('default');
                                setCustomPrompt(defaultPrompt);
                              }
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete template"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {prompt.substring(0, 80)}...
                      </p>
                    </div>
                  ))}

                  {/* Create New Template */}
                  <div 
                    onClick={() => {
                      setEditingTemplateName(null);
                      setTemplateName('');
                      setShowPromptEditor(true);
                    }}
                    className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 flex flex-col items-center justify-center min-h-[80px]"
                  >
                    <span className="text-2xl mb-1">➕</span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Create New</span>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Prompt Editor Modal */}
            {showPromptEditor && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Custom UKMLA SBA Prompt</h3>
                    <button
                      onClick={() => setShowPromptEditor(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                    placeholder="Enter custom instructions for UKMLA SBA generation..."
                  />
                  {showUkmlaNameInput && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Template Name
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="Enter template name..."
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && templateName.trim()) {
                              const trimmedName = templateName.trim();
                              const newPresets = { ...promptPresets, [trimmedName]: customPrompt };
                              setPromptPresets(newPresets);
                              localStorage.setItem('prompt_presets', JSON.stringify(newPresets));
                              setSelectedPromptPreset(trimmedName);
                              localStorage.setItem('last_prompt_preset', trimmedName);
                              setShowPromptEditor(false);
                              setShowUkmlaNameInput(false);
                              setTemplateName('');
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (templateName.trim()) {
                              const trimmedName = templateName.trim();
                              let newPresets = { ...promptPresets };
                              
                              // If editing existing template, remove old one first
                              if (editingTemplateName && editingTemplateName !== trimmedName) {
                                delete newPresets[editingTemplateName];
                              }
                              
                              newPresets[trimmedName] = customPrompt;
                              setPromptPresets(newPresets);
                              localStorage.setItem('prompt_presets', JSON.stringify(newPresets));
                              setSelectedPromptPreset(trimmedName);
                              localStorage.setItem('last_prompt_preset', trimmedName);
                              setShowPromptEditor(false);
                              setShowUkmlaNameInput(false);
                              setTemplateName('');
                              setEditingTemplateName(null);
                            }
                          }}
                          disabled={!templateName.trim()}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {editingTemplateName ? 'Update' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setShowUkmlaNameInput(false);
                            setTemplateName('');
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {!showUkmlaNameInput && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => {
                          if (!editingTemplateName) {
                            setTemplateName('');
                          }
                          setShowUkmlaNameInput(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {editingTemplateName ? 'Update Template' : 'Save Template'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPromptPreset('custom');
                          setShowPromptEditor(false);
                        }}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        Use Without Saving
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Flashcard Prompt Templates */}
            {selectedFormat === 'flashcard' && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                  Flashcard Generation Templates:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  {/* Default Template */}
                  <div 
                    onClick={() => {
                      setCustomFlashcardPrompt(defaultFlashcardPrompt);
                      setSelectedFlashcardPreset('default');
                    }}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedFlashcardPreset === 'default' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎴</span>
                      <span className="font-medium text-sm">Default Cards</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      Focused questions with comprehensive answers and clinical relevance
                    </p>
                  </div>

                  {/* Saved Templates */}
                  {Object.entries(flashcardPresets).map(([name, prompt]) => (
                    <div 
                      key={name}
                      onClick={() => {
                        setCustomFlashcardPrompt(prompt);
                        setSelectedFlashcardPreset(name);
                        localStorage.setItem('last_flashcard_preset', name);
                      }}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md group ${
                        selectedFlashcardPreset === name 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          <span className="font-medium text-sm truncate">{name}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomFlashcardPrompt(prompt);
                              setEditingTemplateName(name);
                              setTemplateName(name);
                              setShowFlashcardPromptEditor(true);
                              setShowFlashcardNameInput(true);
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit template"
                          >
                            <span className="text-xs">✏️</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newPresets = { ...flashcardPresets };
                              delete newPresets[name];
                              setFlashcardPresets(newPresets);
                              localStorage.setItem('flashcard_presets', JSON.stringify(newPresets));
                              if (selectedFlashcardPreset === name) {
                                setSelectedFlashcardPreset('default');
                                setCustomFlashcardPrompt(defaultFlashcardPrompt);
                              }
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete template"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {prompt.substring(0, 80)}...
                      </p>
                    </div>
                  ))}

                  {/* Create New Template */}
                  <div 
                    onClick={() => {
                      setEditingTemplateName(null);
                      setTemplateName('');
                      setShowFlashcardPromptEditor(true);
                    }}
                    className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 flex flex-col items-center justify-center min-h-[80px]"
                  >
                    <span className="text-2xl mb-1">➕</span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Create New</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Custom Flashcard Editor Modal */}
            {showFlashcardPromptEditor && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Custom Flashcard Prompt</h3>
                    <button
                      onClick={() => setShowFlashcardPromptEditor(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <textarea
                    value={customFlashcardPrompt}
                    onChange={(e) => setCustomFlashcardPrompt(e.target.value)}
                    className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                    placeholder="Enter custom instructions for flashcard generation..."
                  />
                  {showFlashcardNameInput && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Template Name
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          placeholder="Enter template name..."
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && templateName.trim()) {
                              const trimmedName = templateName.trim();
                              const newPresets = { ...flashcardPresets, [trimmedName]: customFlashcardPrompt };
                              setFlashcardPresets(newPresets);
                              localStorage.setItem('flashcard_presets', JSON.stringify(newPresets));
                              setSelectedFlashcardPreset(trimmedName);
                              localStorage.setItem('last_flashcard_preset', trimmedName);
                              setShowFlashcardPromptEditor(false);
                              setShowFlashcardNameInput(false);
                              setTemplateName('');
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (templateName.trim()) {
                              const trimmedName = templateName.trim();
                              let newPresets = { ...flashcardPresets };
                              
                              // If editing existing template, remove old one first
                              if (editingTemplateName && editingTemplateName !== trimmedName) {
                                delete newPresets[editingTemplateName];
                              }
                              
                              newPresets[trimmedName] = customFlashcardPrompt;
                              setFlashcardPresets(newPresets);
                              localStorage.setItem('flashcard_presets', JSON.stringify(newPresets));
                              setSelectedFlashcardPreset(trimmedName);
                              localStorage.setItem('last_flashcard_preset', trimmedName);
                              setShowFlashcardPromptEditor(false);
                              setShowFlashcardNameInput(false);
                              setTemplateName('');
                              setEditingTemplateName(null);
                            }
                          }}
                          disabled={!templateName.trim()}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          {editingTemplateName ? 'Update' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setShowFlashcardNameInput(false);
                            setTemplateName('');
                          }}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {!showFlashcardNameInput && (
                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!editingTemplateName) {
                            setTemplateName('');
                          }
                          setShowFlashcardNameInput(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
                      >
                        {editingTemplateName ? 'Update Template' : 'Save Template'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFlashcardPreset('custom');
                          setShowFlashcardPromptEditor(false);
                        }}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        Use Without Saving
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ready indicator - Show after format AND template are selected */}
          {selectedFormat && (
            (selectedFormat === 'flashcard' && selectedFlashcardPreset !== '') ||
            (selectedFormat === 'ukmla_sba' && selectedPromptPreset !== '')
          ) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Will generate questions for all {conceptCount} available concepts
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end pt-6">
            <div
              onClick={selectedFormat ? handleStartPractice : undefined}
              className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md flex items-center gap-2 ${
                selectedFormat
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50'
              }`}
            >
              <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-sm text-blue-800 dark:text-blue-200">Start Practice</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
