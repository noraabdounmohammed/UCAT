import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Tag } from 'lucide-react';
import type { ConceptNode, BloomLevel } from '@/types/conceptTypes';
import { Portal } from '@/components/ui/Portal';

interface ConceptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (concept: Partial<ConceptNode>) => void;
  onDelete?: (conceptId: string) => void;
  concept?: ConceptNode | null;
  mode: 'edit';
}

export const ConceptEditorModal: React.FC<ConceptEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  concept,
  mode
}) => {
  const [formData, setFormData] = useState<Partial<ConceptNode>>({
    title: '',
    description: '',
    tags: [],
    bloom_level: 'understand' as BloomLevel,
    knowledge: {
      decision_rule: '',
      key_facts: []
    },
    relationships: [],
    taxonomy: {
      domain: 'Medicine',
      subject: '',
      topic: '',
      subtopic: ''
    }
  });

  const [newTag, setNewTag] = useState('');
  const [newKeyFact, setNewKeyFact] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (concept) {
      setFormData({
        ...concept,
        knowledge: concept.knowledge || { decision_rule: '', key_facts: [] },
        taxonomy: concept.taxonomy || { domain: 'Medicine', subject: '', topic: '', subtopic: '' }
      });
    }
  }, [concept, mode]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.taxonomy?.subject?.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && formData.tags && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(tag => tag !== tagToRemove) || []
    });
  };

  const handleAddKeyFact = () => {
    if (newKeyFact.trim() && formData.knowledge) {
      setFormData({
        ...formData,
        knowledge: {
          ...formData.knowledge,
          key_facts: [...(formData.knowledge.key_facts || []), newKeyFact.trim()]
        }
      });
      setNewKeyFact('');
    }
  };

  const handleRemoveKeyFact = (index: number) => {
    if (formData.knowledge) {
      setFormData({
        ...formData,
        knowledge: {
          ...formData.knowledge,
          key_facts: formData.knowledge.key_facts?.filter((_, i) => i !== index) || []
        }
      });
    }
  };

  const bloomLevels: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

  // Only continue if modal is open
  if (!isOpen) return null;

  // Handle click outside to close the modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the backdrop, not on the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black/30 flex items-center justify-center overflow-y-auto py-4" 
        style={{ backdropFilter: 'blur(4px)', pointerEvents: 'auto' }}
        onClick={handleBackdropClick}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg my-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Edit Concept
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Information */}
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g., Acute Myocardial Infarction"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  rows={3}
                  placeholder="Provide a clear description of the concept..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bloom's Level
                </label>
                <select
                  value={formData.bloom_level || 'understand'}
                  onChange={(e) => setFormData({ ...formData, bloom_level: e.target.value as BloomLevel })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {bloomLevels.map(level => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Taxonomy */}
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Taxonomy</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={formData.taxonomy?.subject || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    taxonomy: { ...formData.taxonomy!, subject: e.target.value }
                  })}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    errors.subject ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g., Cardiology"
                />
                {errors.subject && (
                  <p className="text-red-500 text-sm mt-1">{errors.subject}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Topic
                </label>
                <input
                  type="text"
                  value={formData.taxonomy?.topic || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    taxonomy: { ...formData.taxonomy!, topic: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Acute Coronary Syndrome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subtopic
                </label>
                <input
                  type="text"
                  value={formData.taxonomy?.subtopic || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    taxonomy: { ...formData.taxonomy!, subtopic: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., STEMI"
                />
              </div>
            </div>
          </div>

          {/* Knowledge */}
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Knowledge</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Decision Rule / Key Principle
                </label>
                <textarea
                  value={formData.knowledge?.decision_rule || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    knowledge: { ...formData.knowledge!, decision_rule: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                  rows={2}
                  placeholder="Main principle or decision rule for this concept..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Key Facts
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newKeyFact}
                    onChange={(e) => setNewKeyFact(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyFact()}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Add a key fact..."
                  />
                  <button
                    onClick={handleAddKeyFact}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.knowledge?.key_facts?.map((fact, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{fact}</span>
                      <button
                        onClick={() => handleRemoveKeyFact(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Tags</h3>
            
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Add a tag..."
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {mode === 'edit' && onDelete && concept && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this concept?')) {
                      onDelete(concept.concept_id);
                      onClose();
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Concept
                </button>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
};
