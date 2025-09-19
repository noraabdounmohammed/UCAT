import React, { useState } from 'react';
import { Plus, Upload, BookOpen, Sparkles, Zap, X } from 'lucide-react';

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
      id: 'knowledge-base',
      title: 'Import Curriculum',
      description: 'Import pre-made concept collections for specific exams and subjects',
      icon: BookOpen,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      onClick: () => {
        onKnowledgeBaseImport();
        onClose();
      },
      features: [
        'UKMLA exam concepts',
        'Medical specialties',
        'Curated content',
        'Expert-reviewed'
      ]
    },
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Sparkles className="h-6 w-6 mr-3 text-blue-600" />
              Add Concepts
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Choose how you'd like to add new concepts to your collection
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {creationOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <div
                  key={option.id}
                  onClick={option.onClick}
                  className="group cursor-pointer bg-gray-50 dark:bg-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                >
                  {/* Icon and Title */}
                  <div className="flex items-center mb-4">
                    <div className={`${option.color} ${option.hoverColor} p-3 rounded-lg transition-colors group-hover:scale-105 transform duration-200`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-3">
                      {option.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed">
                    {option.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2">
                    {option.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Hover indicator */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Click to continue →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};
