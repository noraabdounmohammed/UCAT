import React, { useState, useEffect } from 'react';
import { Play, Plus } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface ConceptTestViewProps {
  onStartPractice: (format: string, templateId?: string) => void;
  conceptCount: number;
}

export const ConceptTestView: React.FC<ConceptTestViewProps> = ({ onStartPractice, conceptCount }) => {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  const [templates, setTemplates] = useState<Record<string, Template[]>>({
    flashcard: [],
    ukmla_sba: []
  });

  // Load templates from localStorage
  useEffect(() => {
    const savedPromptPresets = localStorage.getItem('prompt_presets');
    const savedFlashcardPresets = localStorage.getItem('flashcard_presets');
    
    const ukmlaTemplates: Template[] = [];
    const flashcardTemplates: Template[] = [];

    // Always add default template
    ukmlaTemplates.push({
      id: 'default',
      name: 'Default UKMLA',
      description: 'Standard clinical vignettes with 5...',
      icon: '📋'
    });

    if (savedPromptPresets) {
      const presets = JSON.parse(savedPromptPresets);
      Object.keys(presets).forEach(key => {
        ukmlaTemplates.push({
          id: key,
          name: key,
          description: 'Custom template',
          icon: '📝'
        });
      });
    }

    if (savedFlashcardPresets) {
      const presets = JSON.parse(savedFlashcardPresets);
      Object.keys(presets).forEach(key => {
        flashcardTemplates.push({
          id: key,
          name: key,
          description: 'Custom flashcard template',
          icon: '📝'
        });
      });
    }

    setTemplates({
      flashcard: flashcardTemplates,
      ukmla_sba: ukmlaTemplates
    });
  }, []);

  const formatCards = [
    {
      id: 'flashcard',
      name: 'Flashcard',
      emoji: '⚡',
      description: 'Quick review cards for efficient memorization'
    },
    {
      id: 'ukmla_sba',
      name: 'UKMLA SBA',
      emoji: '🧠',
      description: 'AI-powered clinical scenarios with detailed explanations'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Section: Question Formats */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">📝</span>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Question Formats
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Select which question formats you want to practice:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formatCards.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(selectedFormat === format.id ? null : format.id)}
              className={`group p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all text-left ${
                selectedFormat === format.id 
                  ? 'border-blue-500 dark:border-blue-600 shadow-lg' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`text-3xl transition-transform ${selectedFormat === format.id ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {format.emoji}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {format.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Section: Templates */}
      {selectedFormat && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">{formatCards.find(f => f.id === selectedFormat)?.emoji}</span>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {formatCards.find(f => f.id === selectedFormat)?.name} Generation Templates
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Existing Templates */}
            {templates[selectedFormat as keyof typeof templates]?.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`group p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 transition-all text-left ${
                  selectedTemplate === template.id 
                    ? 'border-blue-500 dark:border-blue-600 shadow-lg' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-2xl transition-transform ${selectedTemplate === template.id ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {template.icon}
                  </span>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {template.name}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {template.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {/* Create New Template */}
            <button
              className="group p-5 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-600 transition-all"
            >
              <div className="flex flex-col items-center justify-center gap-3 py-4">
                <Plus className="h-8 w-8 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                <span className="font-semibold text-gray-600 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                  Create New
                </span>
              </div>
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-6">
            Will generate questions for all {conceptCount} available concepts
          </p>
        </div>
      )}

      {/* Start Practice Button */}
      {selectedFormat && (
        <button
          onClick={() => onStartPractice(selectedFormat, selectedTemplate)}
          disabled={conceptCount === 0}
          className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
        >
          <Play className="h-6 w-6" />
          Start Practice
          {conceptCount > 0 && (
            <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm font-medium">
              {conceptCount} concepts
            </span>
          )}
        </button>
      )}

      {conceptCount === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No concepts match your current filters.
          </p>
        </div>
      )}
    </div>
  );
};
