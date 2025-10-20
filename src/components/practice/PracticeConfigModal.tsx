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
      case 'ukmla_sba': return 'Clinical SBA';
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
      className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50 p-4" 
      style={{ backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-zinc-900 dark:text-white">
              Practice Configuration
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Question Formats */}
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <FileText className="h-[18px] w-[18px] mr-2 text-[#007AFF]" />
              <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                Question Formats
              </h3>
            </div>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mb-4">
              Select which question formats you want to practice:
            </p>
            
            <div className="space-y-3">
              {allFormats.map(format => {
                const isComingSoon = comingSoonFormats.includes(format);
                return (
                  <div
                    key={format}
                    onClick={() => handleFormatToggle(format)}
                    className={`p-4 rounded-xl transition-all border-2 ${
                      isComingSoon
                        ? 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-60'
                        : selectedFormat === format 
                        ? 'bg-[#007AFF]/10 border-[#007AFF]/30 shadow-sm cursor-pointer'
                        : 'bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl border-black/[0.08] dark:border-white/[0.08] hover:bg-white/80 dark:hover:bg-zinc-800/80 cursor-pointer'
                    }`}
                  >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
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
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[15px] text-zinc-900 dark:text-white">
                          {getFormatDisplayName(format)}
                        </span>
                        {isComingSoon && (
                          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium rounded-full">
                            Coming Soon
                          </span>
                        )}
                        {selectedFormat === format && !isComingSoon && (
                          <div className="w-5 h-5 rounded-full bg-[#007AFF] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
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
                </div>
                );
              })}
            </div>
            
            {selectedFormat === null && (
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-3 text-center">
                Please select a format to practice
              </p>
            )}
          </div>

          <div>
            {/* UKMLA SBA Prompt Templates - Only show if there are custom templates */}
            {selectedFormat === 'ukmla_sba' && Object.keys(promptPresets).length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                  Custom UKMLA SBA Templates:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
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
                    className="p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 flex flex-col items-center justify-center min-h-[80px]"
                  >
                    <span className="text-2xl mb-1">➕</span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Create New</span>
                  </div>
                </div>
              </div>
            )}

            {/* Add Custom Template Button - Show when UKMLA SBA is selected but no custom templates exist */}
            {selectedFormat === 'ukmla_sba' && Object.keys(promptPresets).length === 0 && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setEditingTemplateName(null);
                    setTemplateName('');
                    setShowPromptEditor(true);
                  }}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 flex flex-col items-center justify-center"
                >
                  <span className="text-2xl mb-2">➕</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Create Custom Template</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">Optional: Customize how UKMLA SBA questions are generated</span>
                </button>
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
                  
                  {/* Built-in Template Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quick Templates
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setCustomPrompt(builtInSBAPrompts['clinical'])}
                        className="p-3 text-left border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">🏥 Clinical</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Medical scenarios with patient vignettes</div>
                      </button>
                      <button
                        onClick={() => setCustomPrompt(builtInSBAPrompts['academic'])}
                        className="p-3 text-left border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">📚 Academic</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Educational content and concepts</div>
                      </button>
                      <button
                        onClick={() => setCustomPrompt(builtInSBAPrompts['professional'])}
                        className="p-3 text-left border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">💼 Professional</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Workplace and certification scenarios</div>
                      </button>
                      <button
                        onClick={() => setCustomPrompt(builtInSBAPrompts['factual'])}
                        className="p-3 text-left border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">📖 Factual</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Direct knowledge-based questions</div>
                      </button>
                    </div>
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
            
            {/* Flashcard Prompt Templates - Only show if there are custom templates */}
            {selectedFormat === 'flashcard' && Object.keys(flashcardPresets).length > 0 && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                  Custom Flashcard Templates:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
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

            {/* Add Custom Template Button - Show when flashcard is selected but no custom templates exist */}
            {selectedFormat === 'flashcard' && Object.keys(flashcardPresets).length === 0 && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    setEditingTemplateName(null);
                    setTemplateName('');
                    setShowFlashcardPromptEditor(true);
                  }}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-all hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 flex flex-col items-center justify-center"
                >
                  <span className="text-2xl mb-2">➕</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Create Custom Template</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">Optional: Customize how flashcards are generated</span>
                </button>
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
                  
                  {/* Built-in Template Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quick Templates
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setCustomFlashcardPrompt(builtInFlashcardPrompts['clinical'])}
                        className="p-3 text-left border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">🏥 Clinical</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Medical flashcards with clinical relevance</div>
                      </button>
                      <button
                        onClick={() => setCustomFlashcardPrompt(builtInFlashcardPrompts['academic'])}
                        className="p-3 text-left border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">📚 Academic</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Educational flashcards with examples</div>
                      </button>
                      <button
                        onClick={() => setCustomFlashcardPrompt(builtInFlashcardPrompts['professional'])}
                        className="p-3 text-left border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">💼 Professional</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Practical flashcards for workplace skills</div>
                      </button>
                      <button
                        onClick={() => setCustomFlashcardPrompt(builtInFlashcardPrompts['factual'])}
                        className="p-3 text-left border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">📖 Factual</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Direct knowledge-based flashcards</div>
                      </button>
                    </div>
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

          {/* Ready indicator */}
          {selectedFormat && (
            <div className="mt-6 text-center py-3 px-4 bg-emerald-50/60 dark:bg-emerald-900/15 backdrop-blur-xl rounded-xl border border-emerald-200/30 dark:border-emerald-800/30">
              <p className="text-[13px] text-emerald-600 dark:text-emerald-400 font-medium">
                Ready to generate questions for {conceptCount} concepts
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/[0.08] dark:border-white/[0.08] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl">
          <button
            onClick={selectedFormat ? handleStartPractice : undefined}
            disabled={!selectedFormat}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-[15px] transition-all ${
              selectedFormat
                ? 'bg-[#007AFF] hover:bg-[#0056CC] text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Brain className="h-[18px] w-[18px]" />
            <span>Start Practice</span>
          </button>
        </div>
      </div>
    </div>
  );
};
