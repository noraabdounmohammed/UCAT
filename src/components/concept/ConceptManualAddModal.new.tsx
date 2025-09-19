import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Tag, ChevronDown, ArrowLeft } from 'lucide-react';
import { useConceptStore } from '@/contexts/ConceptStoreContext';
import { ConceptNode } from '@/types/conceptTypes';

interface ConceptManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export const ConceptManualAddModal: React.FC<ConceptManualAddModalProps> = ({
  isOpen,
  onClose,
  onBack
}) => {
  const { addConcept, filterOptions } = useConceptStore();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    custom_filters: [] as string[]
  });
  const [newCustomFilter, setNewCustomFilter] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.filter-dropdown')) {
        return;
      }
      if (showFilterDropdown) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.content?.trim()) {
      newErrors.content = 'Content is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        const newConcept: ConceptNode = {
          concept_id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: formData.title.trim(),
          content: formData.content.trim(),
          subject: 'General',
          topic: '',
          tags: [],
          custom_filters: formData.custom_filters,
          mastery_data: {
            mastery_level: 0,
            last_practiced: null,
            attempts: 0,
            correct: 0,
            incorrect: 0
          }
        };

        await addConcept(newConcept);
        
        // Reset form
        setFormData({
          title: '',
          content: '',
          custom_filters: []
        });
        
        onClose();
      } catch (error) {
        console.error('Failed to add concept:', error);
      }
    }
  };

  const handleAddCustomFilter = (filterName?: string) => {
    const filterToAdd = filterName || newCustomFilter.trim();
    
    if (filterToAdd && !formData.custom_filters.includes(filterToAdd)) {
      setFormData({
        ...formData,
        custom_filters: [...formData.custom_filters, filterToAdd]
      });
      if (!filterName) {
        setNewCustomFilter('');
      }
    }
  };

  const handleRemoveCustomFilter = (filterToRemove: string) => {
    setFormData({
      ...formData,
      custom_filters: formData.custom_filters.filter(filter => filter !== filterToRemove)
    });
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center overflow-y-auto py-4" 
      style={{ backdropFilter: 'blur(4px)', pointerEvents: 'auto' }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg my-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Add Concept Manually
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none ${
                    errors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  rows={6}
                  placeholder="Enter all concept information here - description, key facts, clinical context, etc."
                />
                {errors.content && (
                  <p className="text-red-500 text-sm mt-1">{errors.content}</p>
                )}
              </div>
            </div>
          </div>

          {/* Custom Filters */}
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Custom Filters</h3>
            
            <div className="space-y-3">
              {/* Available Filters Dropdown */}
              <div className="relative filter-dropdown">
                <button
                  type="button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Select from available filters...
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
                
                {showFilterDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filterOptions?.custom_filters && filterOptions.custom_filters.length > 0 ? (
                      filterOptions.custom_filters
                        .filter(filter => !formData.custom_filters.includes(filter))
                        .map((filter, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddCustomFilter(filter);
                              setShowFilterDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm flex items-center"
                          >
                            <Tag className="h-3 w-3 mr-2 text-blue-500" />
                            {filter}
                          </button>
                        ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        No available filters found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Add New Filter Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCustomFilter}
                  onChange={(e) => setNewCustomFilter(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Or create a new filter tag..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomFilter()}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomFilter()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {formData.custom_filters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.custom_filters.map((filter, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {filter}
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomFilter(filter)}
                        className="ml-2 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Options
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Add Concept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
