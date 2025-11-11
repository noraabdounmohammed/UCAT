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
  console.log('🎨 ConceptCreationHub render:', { 
    isOpen, 
    hasOnBulkUpload: !!onBulkUpload, 
    hasOnManualAdd: !!onManualAdd,
    onBulkUploadType: typeof onBulkUpload,
    onManualAddType: typeof onManualAdd
  });
  
  // Test calling the functions directly
  if (isOpen) {
    console.log('🧪 Testing function calls:');
    console.log('  - onBulkUpload:', onBulkUpload);
    console.log('  - onManualAdd:', onManualAdd);
  }
  
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
        console.log('🔵 Generate with AI clicked - calling onBulkUpload');
        onBulkUpload();
        console.log('🔵 Generate with AI - calling onClose');
        onClose();
        console.log('🔵 Generate with AI - done');
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
        console.log('🟢 Add Manually clicked');
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
      className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(12px)' }}
      onClick={handleBackdropClick}
    >
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")' }}></div>
      
      <div className="relative bg-[#FAFAF9]/95 backdrop-blur-2xl border-0 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" style={{ borderRadius: 0 }}>
        {/* Header */}
        <div className="px-12 py-10 border-b border-black/[0.04] relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-stone-400" />
          </button>
          
          <div className="h-[1px] w-16 bg-stone-300 mb-6"></div>
          
          <h2 className="text-3xl font-medium text-stone-900 mb-3 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
            Add Concepts
          </h2>
          <p className="text-sm text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
            Choose how you'd like to add new concepts to your collection
          </p>
        </div>

        {/* Content */}
        <div className="px-12 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {creationOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    option.onClick();
                  }}
                  className="group p-8 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-none hover:border-black/[0.12] hover:bg-white/80 transition-all duration-300 text-left"
                >
                  <div className="w-14 h-14 rounded-full bg-stone-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="h-6 w-6 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-medium text-stone-900 mb-2 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                    {option.title}
                  </h3>
                  <p className="text-sm text-stone-600 font-light leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
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
