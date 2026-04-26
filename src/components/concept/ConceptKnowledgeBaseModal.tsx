import React, { useState } from 'react';
import { X, BookOpen, Download, Check, Star, Users, ArrowLeft } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { ConceptNode } from '@/types/conceptTypes';

interface KnowledgeBase {
  id: string;
  title: string;
  description: string;
  category: string;
  conceptCount: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  downloads: number;
  tags: string[];
  concepts: ConceptNode[];
}

interface ConceptKnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export const ConceptKnowledgeBaseModal: React.FC<ConceptKnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  onBack
}) => {
  const { addConcept } = useConceptStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [importedBases, setImportedBases] = useState<Set<string>>(new Set());

  // Mock knowledge bases - in a real app, this would come from an API
  const knowledgeBases: KnowledgeBase[] = [
    {
      id: 'ukmla-cardiology',
      title: 'UKMLA Cardiology Essentials',
      description: 'Comprehensive cardiology concepts covering heart failure, arrhythmias, coronary syndromes, and more.',
      category: 'UKMLA',
      conceptCount: 45,
      difficulty: 'Intermediate',
      rating: 4.8,
      downloads: 1250,
      tags: ['cardiology', 'heart-failure', 'arrhythmias', 'ecg'],
      concepts: [
        {
          concept_id: 'kb_cardio_1',
          title: 'Heart Failure Pathophysiology',
          content: 'Heart failure is a complex clinical syndrome resulting from structural or functional impairment of ventricular filling or ejection of blood. The condition involves multiple compensatory mechanisms including neurohormonal activation, ventricular remodeling, and altered hemodynamics.',
          subject: 'Cardiology',
          topic: 'Heart Failure',
          tags: ['heart-failure', 'pathophysiology'],
          custom_filters: ['cardiology', 'pathophysiology'],
          mastery_data: { mastery_level: 0, last_practiced: null }
        },
        {
          concept_id: 'kb_cardio_2',
          title: 'Atrial Fibrillation Management',
          content: 'Atrial fibrillation is the most common sustained cardiac arrhythmia. Management involves rate control, rhythm control, and anticoagulation based on CHA2DS2-VASc score. Treatment options include beta-blockers, calcium channel blockers, and anticoagulants.',
          subject: 'Cardiology',
          topic: 'Arrhythmias',
          tags: ['atrial-fibrillation', 'arrhythmias'],
          custom_filters: ['cardiology', 'arrhythmias'],
          mastery_data: { mastery_level: 0, last_practiced: null }
        }
      ]
    },
    {
      id: 'ukmla-respiratory',
      title: 'UKMLA Respiratory Medicine',
      description: 'Essential respiratory concepts including asthma, COPD, pneumonia, and pulmonary embolism.',
      category: 'UKMLA',
      conceptCount: 38,
      difficulty: 'Intermediate',
      rating: 4.7,
      downloads: 980,
      tags: ['respiratory', 'asthma', 'copd', 'pneumonia'],
      concepts: [
        {
          concept_id: 'kb_resp_1',
          title: 'Asthma Pathophysiology',
          content: 'Asthma is a chronic inflammatory disorder of the airways characterized by variable airflow obstruction, bronchial hyperresponsiveness, and underlying inflammation. Key features include bronchoconstriction, mucus hypersecretion, and airway remodeling.',
          subject: 'Respiratory Medicine',
          topic: 'Asthma',
          tags: ['asthma', 'pathophysiology'],
          custom_filters: ['respiratory', 'chronic-disease'],
          mastery_data: { mastery_level: 0, last_practiced: null }
        }
      ]
    },
    {
      id: 'emergency-medicine',
      title: 'Emergency Medicine Protocols',
      description: 'Critical emergency medicine concepts covering trauma, cardiac arrest, shock, and acute presentations.',
      category: 'Emergency Medicine',
      conceptCount: 52,
      difficulty: 'Advanced',
      rating: 4.9,
      downloads: 2100,
      tags: ['emergency', 'trauma', 'resuscitation', 'protocols'],
      concepts: [
        {
          concept_id: 'kb_em_1',
          title: 'Sepsis Recognition and Management',
          content: 'Sepsis is a life-threatening organ dysfunction caused by a dysregulated host response to infection. Early recognition using qSOFA criteria and prompt treatment with antibiotics and fluid resuscitation are crucial for patient outcomes.',
          subject: 'Emergency Medicine',
          topic: 'Sepsis',
          tags: ['sepsis', 'infection', 'emergency'],
          custom_filters: ['emergency', 'critical-care'],
          mastery_data: { mastery_level: 0, last_practiced: null }
        }
      ]
    },
    {
      id: 'pharmacology-basics',
      title: 'Clinical Pharmacology Fundamentals',
      description: 'Core pharmacology principles including drug mechanisms, interactions, and therapeutic considerations.',
      category: 'Pharmacology',
      conceptCount: 65,
      difficulty: 'Beginner',
      rating: 4.6,
      downloads: 1800,
      tags: ['pharmacology', 'drug-interactions', 'mechanisms'],
      concepts: [
        {
          concept_id: 'kb_pharm_1',
          title: 'ACE Inhibitor Mechanism',
          content: 'ACE inhibitors block the conversion of angiotensin I to angiotensin II, reducing vasoconstriction and aldosterone secretion. This leads to decreased blood pressure and reduced cardiac afterload, making them effective in treating hypertension and heart failure.',
          subject: 'Pharmacology',
          topic: 'Cardiovascular Drugs',
          tags: ['ace-inhibitors', 'hypertension'],
          custom_filters: ['pharmacology', 'cardiovascular'],
          mastery_data: { mastery_level: 0, last_practiced: null }
        }
      ]
    }
  ];

  const categories = ['all', ...Array.from(new Set(knowledgeBases.map(kb => kb.category)))];

  const filteredKnowledgeBases = selectedCategory === 'all' 
    ? knowledgeBases 
    : knowledgeBases.filter(kb => kb.category === selectedCategory);

  const handleImport = async (knowledgeBase: KnowledgeBase) => {
    setIsImporting(knowledgeBase.id);
    try {
      // Import all concepts from the knowledge base
      for (const concept of knowledgeBase.concepts) {
        await addConcept(concept);
      }
      
      setImportedBases(prev => new Set([...prev, knowledgeBase.id]));
    } catch (error) {
      console.error('Failed to import knowledge base:', error);
    } finally {
      setIsImporting(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (!isOpen) return null;

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
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-8 flex items-center justify-center w-8 h-8 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
          <h2 className="text-[28px] font-semibold text-gray-900 dark:text-white mb-2">
            Import Expert Curriculum
          </h2>
          <p className="text-[15px] text-gray-500 dark:text-gray-400">
            Choose from professionally curated curriculums created by medical educators
          </p>
        </div>

        {/* Category Filter */}
        <div className="px-8 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-full text-[14px] font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {category === 'all' ? 'All Categories' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge Bases Grid */}
        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredKnowledgeBases.map((kb) => {
              const isImported = importedBases.has(kb.id);
              const isCurrentlyImporting = isImporting === kb.id;

              return (
                <div
                  key={kb.id}
                  className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-2xl p-6 border border-black/[0.08] dark:border-white/[0.08] hover:bg-white/80 dark:hover:bg-zinc-800/80 hover:shadow-lg transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-[17px] font-semibold text-zinc-900 dark:text-white mb-1">
                        {kb.title}
                      </h3>
                      <p className="text-[13px] text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed">
                        {kb.description}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(kb.difficulty)}`}>
                      {kb.difficulty}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-[13px] text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {kb.conceptCount} concepts
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 mr-1 text-yellow-500" />
                      {kb.rating}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {kb.downloads.toLocaleString()}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {kb.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100/80 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-[11px] rounded-full backdrop-blur-xl"
                      >
                        {tag}
                      </span>
                    ))}
                    {kb.tags.length > 4 && (
                      <span className="px-2 py-1 bg-zinc-100/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-400 text-[11px] rounded-full backdrop-blur-xl">
                        +{kb.tags.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleImport(kb)}
                    disabled={isImported || isCurrentlyImporting}
                    className={`w-full py-2.5 px-4 rounded-xl text-[15px] font-semibold transition-all flex items-center justify-center ${
                      isImported
                        ? 'bg-green-100/80 dark:bg-green-900/30 text-green-800 dark:text-green-200 cursor-not-allowed backdrop-blur-xl'
                        : isCurrentlyImporting
                        ? 'bg-purple-100/80 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 cursor-not-allowed backdrop-blur-xl'
                        : 'bg-purple-600 text-white hover:opacity-90 shadow-sm'
                    }`}
                  >
                    {isImported ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Imported
                      </>
                    ) : isCurrentlyImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Import {kb.conceptCount} Concepts
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {filteredKnowledgeBases.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No knowledge bases found for the selected category.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
          <div className="flex justify-between items-start">
            <div>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-md transition-colors flex items-center border border-gray-300 dark:border-gray-500"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Options
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex-1 ml-6">
              <p className="mb-2">
                <strong>💡 Pro Tip:</strong> Curriculums are curated by medical education experts and regularly updated.
              </p>
              <p>
                All imported concepts will be added to your collection and can be customized, edited, or removed at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
