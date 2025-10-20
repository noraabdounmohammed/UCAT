import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Tag, ChevronDown, Trash2 } from 'lucide-react';
import { ConceptNode } from '@/types/conceptTypes';
import { Portal } from '@/components/ui/Portal';
import { useConceptStore } from '@/contexts/ConceptStoreContext';

interface ConceptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (concept: Partial<ConceptNode>) => void;
  concept?: ConceptNode | null;
  mode: 'edit';
}

export const ConceptEditorModal: React.FC<ConceptEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  concept,
  mode
}) => {
  const [formData, setFormData] = useState<Partial<ConceptNode>>({
    title: '',
    content: '',
    custom_filters: [],
    prerequisites: []
  });

  const [newCustomFilter, setNewCustomFilter] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Get available filters and delete function from store
  const { filterOptions, deleteConcept } = useConceptStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the dropdown
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

  useEffect(() => {
    if (concept) {
      setFormData({
        title: concept.title || '',
        content: concept.content || '',
        custom_filters: concept.custom_filters || [],
        prerequisites: concept.prerequisites || []
      });
    }
  }, [concept, mode]);

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

  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleAddCustomFilter = (filterName?: string) => {
    const filterToAdd = filterName || newCustomFilter.trim();
    
    if (filterToAdd && formData.custom_filters && !formData.custom_filters.includes(filterToAdd)) {
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
      custom_filters: formData.custom_filters?.filter(filter => filter !== filterToRemove) || []
    });
  };

  const handleDelete = () => {
    if (concept && concept.concept_id) {
      deleteConcept(concept.concept_id);
      onClose();
    }
  };


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
        className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center overflow-y-auto py-4 z-50" 
        style={{ backdropFilter: 'blur(20px)', pointerEvents: 'auto' }}
        onClick={handleBackdropClick}
      >
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] max-w-3xl max-h-[90vh] overflow-hidden my-4">
          <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-zinc-900 dark:text-white">
                Edit Concept
              </h2>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>

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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content *
                </label>
                <textarea
                  value={formData.content || ''}
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
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                      <input
                        type="text"
                        value={filterSearchQuery}
                        onChange={(e) => setFilterSearchQuery(e.target.value)}
                        placeholder="Search filters..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    {/* Filter List */}
                    <div className="max-h-48 overflow-y-auto">
                      {filterOptions.custom_filters && filterOptions.custom_filters.length > 0 ? (
                        (() => {
                          const availableFilters = filterOptions.custom_filters
                            .filter(filter => !formData.custom_filters?.includes(filter))
                            .filter(filter => filter.toLowerCase().includes(filterSearchQuery.toLowerCase()));
                          
                          if (availableFilters.length === 0) {
                            return (
                              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                {filterSearchQuery ? 'No filters match your search' : 'All available filters are already selected'}
                              </div>
                            );
                          }
                          
                          return availableFilters.map((filter, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddCustomFilter(filter);
                                setShowFilterDropdown(false);
                                setFilterSearchQuery('');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm flex items-center"
                            >
                              <Tag className="h-3 w-3 mr-2 text-blue-500" />
                              {filter}
                            </button>
                          ));
                        })()
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          No available filters found
                        </div>
                      )}
                    </div>
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
              
              {formData.custom_filters && formData.custom_filters.length > 0 && (
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

          {/* Prerequisites */}
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">Prerequisites</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              Prerequisite concept selection will be implemented in a future update.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Delete Button - Left Side */}
            {showDeleteConfirm ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirm Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex items-center"
                title="Delete this concept"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            )}

            {/* Save/Cancel Buttons - Right Side */}
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
        </div>
        </div>
      </div>
    </Portal>
  );
};
