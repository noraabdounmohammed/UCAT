import React from 'react';
import { Plus, Zap, X } from 'lucide-react';

interface ConceptCreationHubProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkUpload: () => void;
  onManualAdd: () => void;
  onKnowledgeBaseImport: () => void;
}

export const ConceptCreationHub: React.FC<ConceptCreationHubProps> = ({
  isOpen,
  onClose,
  onBulkUpload,
  onManualAdd,
  onKnowledgeBaseImport
}) => {
  if (!isOpen) return null;

  const creationOptions = [
    {
      id: 'bulk',
      title: 'Generate with AI',
      description: 'Auto-generate multiple concepts from text, URLs, or documents using AI',
      icon: Zap,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      onClick: () => {
        onBulkUpload();
        onClose();
      },
      features: [
        'AI-powered text extraction',
        'URL content fetching',
        'Automatic concept generation',
        'Custom AI prompts'
      ]
    },
    {
      id: 'manual',
      title: 'Add Manually',
      description: 'Create individual concepts one at a time with full control over content',
      icon: Plus,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      onClick: () => {
        onManualAdd();
        onClose();
      },
      features: [
        'Complete content control',
        'Custom tags and categories',
        'Rich text formatting',
        'Immediate preview'
      ]
    }
  ];

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(20px)' }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-8 flex items-center justify-center w-8 h-8 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Add Concepts
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose how you'd like to add new concepts to your collection
          </p>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {creationOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={option.onClick}
                  className="p-8 border-2 border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left backdrop-blur-sm"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-6">
                    <IconComponent className={`h-8 w-8 ${option.id === 'bulk' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`} strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
