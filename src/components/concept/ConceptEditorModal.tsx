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
        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center overflow-y-auto py-4 z-50" 
        style={{ pointerEvents: 'auto' }}
        onClick={handleBackdropClick}
      >
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] backdrop-saturate-150 w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] max-w-3xl max-h-[90vh] overflow-hidden my-4">
          <div className="px-8 py-6 border-b border-stone-200/50">
            <h2 className="text-2xl font-medium text-stone-900 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              Edit Concept
            </h2>
          </div>
          
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-medium text-stone-900 mb-4 uppercase tracking-wider" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-2 uppercase tracking-wider" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 ${
                    errors.title ? 'border-red-500' : 'border-stone-300'
                  }`}
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                  placeholder="e.g., Acute Myocardial Infarction"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-2 uppercase tracking-wider" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                  Content *
                </label>
                <textarea
                  value={formData.content || ''}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl bg-white text-stone-900 resize-none focus:outline-none focus:ring-2 focus:ring-stone-900 ${
                    errors.content ? 'border-red-500' : 'border-stone-300'
                  }`}
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
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
            <h3 className="text-sm font-medium text-stone-900 mb-4 uppercase tracking-wider" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>Custom Filters</h3>
            
            <div className="space-y-3">
              {/* Available Filters Dropdown */}
              <div className="relative filter-dropdown">
                <button
                  type="button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-stone-300 rounded-xl bg-white text-stone-900 hover:bg-stone-50 transition-colors"
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                >
                  <span className="text-sm text-stone-500">
                    Select from available filters...
                  </span>
                  <ChevronDown className="h-4 w-4 text-stone-400" />
                </button>
                
                {showFilterDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-xl border border-stone-300 rounded-xl shadow-lg overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-stone-200">
                      <input
                        type="text"
                        value={filterSearchQuery}
                        onChange={(e) => setFilterSearchQuery(e.target.value)}
                        placeholder="Search filters..."
                        className="w-full px-3 py-1.5 text-sm border border-stone-300 rounded-lg bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                        style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
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
                  className="flex-1 px-4 py-3 border border-stone-300 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                  placeholder="Or create a new filter tag..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomFilter()}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomFilter()}
                  className="px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {formData.custom_filters && formData.custom_filters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.custom_filters.map((filter, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-stone-100 text-stone-900"
                      style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}
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
          <div className="flex justify-between pt-6 border-t border-stone-200/50">
            {/* Delete Button - Left Side */}
            {showDeleteConfirm ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-5 py-2.5 text-sm text-stone-600 hover:text-stone-900 transition-colors uppercase tracking-wider"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors flex items-center text-sm uppercase tracking-wider shadow-lg"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirm Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-5 py-2.5 text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center text-sm uppercase tracking-wider"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
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
                className="px-6 py-2.5 text-stone-700 border border-stone-300 hover:bg-stone-50 rounded-full transition-colors text-sm uppercase tracking-wider"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full transition-colors flex items-center text-sm uppercase tracking-wider shadow-lg"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
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
