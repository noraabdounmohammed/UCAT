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
          custom_filters: formData.custom_filters,
          prerequisites: [],
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
      className="fixed inset-0 bg-black/10 flex items-center justify-center overflow-y-auto py-4 z-50" 
      style={{ backdropFilter: 'blur(12px)', pointerEvents: 'auto' }}
      onClick={handleBackdropClick}
    >
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" /%3E%3C/filter%3E%3Crect width=\"100\" height=\"100\" filter=\"url(%23noise)\" /%3E%3C/svg%3E")' }}></div>
      
      <div className="relative bg-[#FAFAF9]/95 backdrop-blur-2xl border-0 shadow-2xl w-[95%] sm:w-[90%] md:w-[80%] lg:w-[70%] max-w-3xl max-h-[90vh] overflow-hidden my-4" style={{ borderRadius: 0 }}>
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
            Add Manually
          </h2>
          <p className="text-sm text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
            Create individual concepts with full control over content
          </p>
        </div>
        
        <div className="px-12 py-10 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-base font-medium text-stone-900 mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <div className="mb-6">
                <label className="block text-[11px] uppercase tracking-widest font-medium text-stone-900 mb-3" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-3 bg-white/60 backdrop-blur-xl border ${
                    errors.title ? 'border-red-500' : 'border-black/[0.06]'
                  } rounded-none focus:outline-none focus:border-black/[0.12] text-stone-900 font-light transition-all`}
                  placeholder="e.g., Acute Myocardial Infarction"
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-[11px] uppercase tracking-widest font-medium text-stone-900 mb-3" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  className={`w-full px-4 py-3 bg-white/60 backdrop-blur-xl border ${
                    errors.content ? 'border-red-500' : 'border-black/[0.06]'
                  } rounded-none focus:outline-none focus:border-black/[0.12] text-stone-900 font-light resize-none transition-all`}
                  placeholder="Enter all concept information here - description, key facts, clinical context, etc."
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                />
                {errors.content && (
                  <p className="text-red-500 text-sm mt-1">{errors.content}</p>
                )}
              </div>
            </div>
          </div>

          {/* Custom Filters */}
          <div className="mb-6">
            <label className="block text-[11px] uppercase tracking-widest font-medium text-stone-900 mb-3" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>Custom Filters</label>
            
            <div className="space-y-3">
              {/* Available Filters Dropdown */}
              <div className="relative filter-dropdown">
                <button
                  type="button"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-black/[0.06] rounded-none bg-white/60 backdrop-blur-xl text-stone-900 hover:border-black/[0.12] transition-all"
                >
                  <span className="text-sm text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                    Select from available filters...
                  </span>
                  <ChevronDown className="h-4 w-4 text-stone-400" />
                </button>
                
                {showFilterDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-none shadow-2xl max-h-48 overflow-y-auto">
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
                            className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-900 text-sm flex items-center font-light transition-colors" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                          >
                            <Tag className="h-3 w-3 mr-2 text-blue-500" />
                            {filter}
                          </button>
                        ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-stone-500 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
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
                  className="flex-1 px-4 py-3 border border-black/[0.06] rounded-none bg-white/60 backdrop-blur-xl text-stone-900 font-light focus:outline-none focus:border-black/[0.12] transition-all"
                  placeholder="Or create a new filter tag..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomFilter()}
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomFilter()}
                  className="px-4 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full transition-all flex items-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              
              {formData.custom_filters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.custom_filters.map((filter, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider bg-stone-900 text-white"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
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
          <div className="flex justify-between pt-6 mt-6 border-t border-black/[0.04]">
            <div>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-6 py-3 text-stone-600 bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:border-black/[0.12] rounded-full transition-all flex items-center text-[11px] uppercase tracking-widest"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
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
                className="px-6 py-3 text-stone-600 bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:border-black/[0.12] rounded-full transition-all text-[11px] uppercase tracking-widest"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full transition-all flex items-center text-[11px] uppercase tracking-widest"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                <Save className="h-4 w-4 mr-2" />
                Add Concept
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
