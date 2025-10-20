import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Plus, ArrowRight, Edit3, Trash2, X, Save, MoreVertical, Copy, BookOpen, Sparkles, FileText, Share2, Grid3x3, List, Upload, Search, ChevronDown, Lock } from 'lucide-react';
import { generateConceptFromSpec, createConceptNode, parseSpecificationWithAI } from '../services/aiCurriculumBuilder';
import { ImportExpertModal } from '@/components/curriculum/ImportExpertModal';
import { PublishCurriculumModal } from '@/components/curriculum/PublishCurriculumModal';
import { CurriculumPublishingService, PublishedCurriculum, WORLD_COUNTRIES, EXAM_CATEGORIES } from '@/services/curriculumPublishing';
import { AuthBar } from '@/components/auth/AuthBar';

interface Curriculum {
  id: string;
  name: string;
  description: string;
  conceptCount: number;
  lastAccessed: Date;
  color: string;
  category: string;
  progress: number; // 0-100
}

interface CurriculumHubProps {
  onOpenCurriculum?: (curriculum: Curriculum) => void;
  curriculums?: Curriculum[];
  setCurriculums?: React.Dispatch<React.SetStateAction<Curriculum[]>>;
  onCreateCurriculum?: (curriculum: Curriculum) => void;
}

interface EditCurriculumModalProps {
  curriculum: Curriculum;
  onSave: (curriculum: Curriculum) => void;
  onCancel: () => void;
}

const EditCurriculumModal: React.FC<EditCurriculumModalProps> = ({
  curriculum,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: curriculum.name,
    description: curriculum.description,
    category: curriculum.category,
    color: curriculum.color
  });

  

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const updatedCurriculum: Curriculum = {
      ...curriculum,
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category,
      color: formData.color
    };

    onSave(updatedCurriculum);
  };

  const colorOptions = [
    { value: 'bg-red-500', label: 'Red', color: 'bg-red-500' },
    { value: 'bg-blue-500', label: 'Blue', color: 'bg-blue-500' },
    { value: 'bg-green-500', label: 'Green', color: 'bg-green-500' },
    { value: 'bg-orange-500', label: 'Orange', color: 'bg-orange-500' },
    { value: 'bg-purple-500', label: 'Purple', color: 'bg-purple-500' },
    { value: 'bg-pink-500', label: 'Pink', color: 'bg-pink-500' },
    { value: 'bg-indigo-500', label: 'Indigo', color: 'bg-indigo-500' },
    { value: 'bg-teal-500', label: 'Teal', color: 'bg-teal-500' }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Edit Curriculum
          </h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter curriculum name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter curriculum description"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Category Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="Medical Exam">Medical Exam</option>
              <option value="Medical Specialty">Medical Specialty</option>
              <option value="Basic Sciences">Basic Sciences</option>
              <option value="Clinical Skills">Clinical Skills</option>
              <option value="Research">Research</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Color Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: option.value }))}
                  className={`w-full h-10 rounded-lg border-2 transition-all ${option.color} ${
                    formData.color === option.value
                      ? 'border-gray-900 dark:border-gray-100 scale-105'
                      : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }`}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CurriculumHub: React.FC<CurriculumHubProps> = ({ 
  onOpenCurriculum, 
  curriculums: propCurriculums, 
  setCurriculums: propSetCurriculums,
  onCreateCurriculum
}) => {
  // Use props if provided, otherwise use local state
  const [localCurriculums, setLocalCurriculums] = useState<Curriculum[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'featured'>('all');
  
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Use curriculums from props or local state (no default expert curriculums)
  const curriculums = propCurriculums || localCurriculums;
  
  const setCurriculums = propSetCurriculums || setLocalCurriculums;

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateChoiceModal, setShowCreateChoiceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportExpertModal, setShowImportExpertModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Published curriculums state
  const [publishedCurriculums, setPublishedCurriculums] = useState<PublishedCurriculum[]>([]);
  const [isLoadingPublished, setIsLoadingPublished] = useState(false);
  const [isPublisherAllowed, setIsPublisherAllowed] = useState(false);
  
  // Expert tab filters
  const [expertSearchQuery, setExpertSearchQuery] = useState('');
  const [expertSelectedCategory, setExpertSelectedCategory] = useState<string>('all');
  const [expertSelectedCountry, setExpertSelectedCountry] = useState<string>('all');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const countryButtonRef = useRef<HTMLButtonElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const [countryPos, setCountryPos] = useState<{top:number; left:number; width:number}>({top:0,left:0,width:0});
  const [categoryPos, setCategoryPos] = useState<{top:number; left:number; width:number}>({top:0,left:0,width:0});
  
  // Form states
  const [createStep, setCreateStep] = useState<'choice' | 'spec_paste' | 'spec_review'>('choice');
  const [specText, setSpecText] = useState('');
  const [parsedSpecItems, setParsedSpecItems] = useState<string[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<boolean[]>([]);
  const [newCurricName, setNewCurricName] = useState('New Curriculum');
  const [newCurricDesc, setNewCurricDesc] = useState('Generated from specification');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  // Edit and action states
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [deletingCurriculum, setDeletingCurriculum] = useState<Curriculum | null>(null);
  const [publishingCurriculum, setPublishingCurriculum] = useState<Curriculum | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Load curriculums from localStorage on mount (only if not using props)
  useEffect(() => {
    if (!propCurriculums) {
      const storedCurriculums = localStorage.getItem('curriculums');
      if (storedCurriculums) {
        try {
          const parsed = JSON.parse(storedCurriculums);
          // Convert date strings back to Date objects
          const curriculumsWithDates = parsed.map((c: any) => ({
            ...c,
            lastAccessed: new Date(c.lastAccessed)
          }));
          
          console.log('Loaded curriculums from localStorage:', curriculumsWithDates.length);
          setLocalCurriculums(curriculumsWithDates);
        } catch (error) {
          console.error('Failed to load curriculums from localStorage:', error);
          setLocalCurriculums([]);
        }
      } else {
        // No stored curriculums, start with empty array
        console.log('No stored curriculums, starting fresh');
        setLocalCurriculums([]);
      }
    }
    setIsLoaded(true);
  }, [propCurriculums]);

  // Allow anyone to publish/delete (no authentication required)
  useEffect(() => {
    setIsPublisherAllowed(true);
  }, []);

  // Load published curriculums when Expert tab is active
  useEffect(() => {
    if (activeTab === 'featured') {
      loadPublishedCurriculums();
    }
  }, [activeTab]);

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the button and the dropdown content
      if (
        countryButtonRef.current && !countryButtonRef.current.contains(target) &&
        countryDropdownRef.current && !countryDropdownRef.current.contains(target)
      ) {
        setCountryDropdownOpen(false);
      }
    };

    if (countryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [countryDropdownOpen]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the button and the dropdown content
      if (
        categoryButtonRef.current && !categoryButtonRef.current.contains(target) &&
        categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)
      ) {
        setCategoryDropdownOpen(false);
      }
    };

    if (categoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [categoryDropdownOpen]);

  const loadPublishedCurriculums = async () => {
    setIsLoadingPublished(true);
    try {
      const published = await CurriculumPublishingService.getPublishedCurriculums();
      setPublishedCurriculums(published);
    } catch (error) {
      console.error('Failed to load published curriculums:', error);
    } finally {
      setIsLoadingPublished(false);
    }
  };

  // Admin: Delete a published curriculum from Expert tab
  async function handleDeletePublishedAdmin(published: PublishedCurriculum, e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      if (!isPublisherAllowed) return;
      if (!CurriculumPublishingService.canDeleteCurriculum(published.id)) {
        alert('This expert curriculum cannot be deleted.');
        return;
      }
      const ok = window.confirm(`Delete expert curriculum "${published.name}"? This cannot be undone.`);
      if (!ok) return;
      setIsLoadingPublished(true);
      const success = await CurriculumPublishingService.deletePublishedCurriculum(published.id);
      if (!success) {
        alert('Failed to delete expert curriculum.');
      }
      await loadPublishedCurriculums();
    } finally {
      setIsLoadingPublished(false);
    }
  }

  // Save curriculums to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      console.log('Saving curriculums to localStorage:', curriculums.length, 'curriculums');
      localStorage.setItem('curriculums', JSON.stringify(curriculums));
    }
  }, [curriculums, isLoaded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const handleOpenCurriculum = (curriculumId: string) => {
    const curriculum = curriculums.find(c => c.id === curriculumId);
    if (curriculum && onOpenCurriculum) {
      onOpenCurriculum(curriculum);
    }
  };

  const handleEditCurriculum = (curriculum: Curriculum, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the curriculum
    setEditingCurriculum(curriculum);
    setShowEditModal(true);
    setOpenDropdown(null);
  };

  const handlePublishCurriculum = (curriculum: Curriculum, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the curriculum
    setPublishingCurriculum(curriculum);
    setShowPublishModal(true);
    setOpenDropdown(null);
  };

  // Get actual concept count from localStorage
  const getActualConceptCount = (curriculumId: string): number => {
    try {
      const concepts = localStorage.getItem(`${curriculumId}_user_concepts`);
      return concepts ? JSON.parse(concepts).length : 0;
    } catch (error) {
      console.error('Error getting concept count:', error);
      return 0;
    }
  };

  const handleSaveEdit = (updatedCurriculum: Curriculum) => {
    setCurriculums(prev => 
      prev.map(c => c.id === updatedCurriculum.id ? updatedCurriculum : c)
    );
    setShowEditModal(false);
    setEditingCurriculum(null);
  };

  const handleDuplicateCurriculum = (curriculum: Curriculum, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Copy concepts from original curriculum
    const originalConcepts = localStorage.getItem(`${curriculum.id}_user_concepts`);
    const originalFilters = localStorage.getItem(`${curriculum.id}_custom_filters`);
    const originalCategories = localStorage.getItem(`${curriculum.id}_filter_categories`);
    
    const newId = `${curriculum.id}-copy-${Date.now()}`;
    const conceptCount = originalConcepts ? JSON.parse(originalConcepts).length : 0;
    
    const duplicatedCurriculum: Curriculum = {
      ...curriculum,
      id: newId,
      name: `${curriculum.name} (Copy)`,
      lastAccessed: new Date(),
      progress: 0, // Reset progress for the copy
      conceptCount: conceptCount
    };
    
    // Copy localStorage data to new curriculum
    if (originalConcepts) {
      localStorage.setItem(`${newId}_user_concepts`, originalConcepts);
    }
    if (originalFilters) {
      localStorage.setItem(`${newId}_custom_filters`, originalFilters);
    }
    if (originalCategories) {
      localStorage.setItem(`${newId}_filter_categories`, originalCategories);
    }
    
    setCurriculums(prev => [...prev, duplicatedCurriculum]);
    setOpenDropdown(null);
  };

  const handleDeleteCurriculum = (curriculum: Curriculum, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeletingCurriculum(curriculum);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const confirmDelete = () => {
    if (deletingCurriculum) {
      setCurriculums(prev => prev.filter(c => c.id !== deletingCurriculum.id));
      
      // Also clean up localStorage for this curriculum
      const keysToRemove = [
        `${deletingCurriculum.id}_user_concepts`,
        `${deletingCurriculum.id}_deleted_concepts`,
        `${deletingCurriculum.id}_custom_filters`,
        `${deletingCurriculum.id}_filter_categories`,
        `${deletingCurriculum.id}_concept-practice-store`,
        `${deletingCurriculum.id}_is_empty`,
        `${deletingCurriculum.id}_spec_generated`,
        `${deletingCurriculum.id}_source_spec`
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      setShowDeleteModal(false);
      setDeletingCurriculum(null);
    }
  };

  const handleCreateFreshCurriculum = () => {
    const curriculumId = `curriculum-${Date.now()}`;
    const newCurriculum: Curriculum = {
      id: curriculumId,
      name: 'New Curriculum',
      description: 'A fresh curriculum ready for your content',
      conceptCount: 0,
      lastAccessed: new Date(),
      color: 'bg-blue-500',
      category: 'Other',
      progress: 0
    };

    // Clear any existing localStorage data for this curriculum to ensure it starts empty
    const keysToRemove = [
      `${curriculumId}_user_concepts`,
      `${curriculumId}_deleted_concepts`,
      `${curriculumId}_custom_filters`,
      `${curriculumId}_filter_categories`,
      `${curriculumId}_concept-practice-store`
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Set a flag to indicate this curriculum should start empty
    localStorage.setItem(`${curriculumId}_is_empty`, 'true');
    console.log(`CurriculumHub: Set empty flag for curriculum ${curriculumId}`);

    console.log('CurriculumHub: Creating new curriculum:', newCurriculum);
    setShowCreateChoiceModal(false);
    
    // Use the callback if provided, otherwise fall back to local state
    if (onCreateCurriculum) {
      onCreateCurriculum(newCurriculum);
    } else {
      setCurriculums(prev => {
        const updated = [...prev, newCurriculum];
        console.log('Updated curriculums array:', updated.length, 'curriculums');
        return updated;
      });
      
      // Navigate to the new curriculum
      if (onOpenCurriculum) {
        onOpenCurriculum(newCurriculum);
      }
    }
  };

  // -------- Spec import helpers (generate-only pipeline) --------

  const startSpecFlow = () => {
    setCreateStep('spec_paste');
    setSpecText('');
    setParsedSpecItems([]);
    setSelectedSpec([]);
    setNewCurricName('New Curriculum');
    setNewCurricDesc('Generated from specification');
  };

  const proceedToSpecReview = async () => {
    setIsParsing(true);
    try {
      const items = await parseSpecificationWithAI(specText);
      console.log('Original text:', specText);
      console.log('AI Parsed items:', items);
      setParsedSpecItems(items);
      setSelectedSpec(items.map(() => true));
      setCreateStep('spec_review');
    } catch (error) {
      console.error('Failed to parse specification:', error);
      alert('Failed to parse specification. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateCurriculumFromSpec = async () => {
    const chosenItems = parsedSpecItems.filter((_, i) => selectedSpec[i]);
    const curriculumId = `curriculum-${Date.now()}`;
    
    setIsGenerating(true);
    
    try {
      // Generate AI concepts for each spec item
      console.log('Generating AI concepts for', chosenItems.length, 'items...');
      const generatedConcepts = await Promise.all(
        chosenItems.map(async (specText: string, idx: number) => {
          try {
            const generated = await generateConceptFromSpec(specText);
            return createConceptNode(generated, specText, idx);
          } catch (error) {
            console.error(`Failed to generate concept for "${specText}":`, error);
            // Fallback to basic concept
            return {
              concept_id: `user_${Date.now()}_${idx}`,
              title: specText.length > 60 ? specText.slice(0, 57) + '...' : specText,
              content: `Learning objective: ${specText}`,
              custom_filters: ['spec-import'],
              prerequisites: [],
              mastery_data: {
                attempts: 0,
                correct: 0,
                incorrect: 0,
                mastery_level: 0,
                last_practiced: null
              },
              created_at: new Date(),
              updated_at: new Date()
            };
          }
        })
      );

      const newCurriculum: Curriculum = {
        id: curriculumId,
        name: newCurricName || 'New Curriculum',
        description: newCurricDesc || 'Generated from specification',
        conceptCount: generatedConcepts.length,
        lastAccessed: new Date(),
        color: 'bg-blue-500',
        category: 'Other',
        progress: 0
      };

      // Clear any existing localStorage data for this curriculum to ensure it starts empty
      const keysToRemove = [
        `${curriculumId}_user_concepts`,
        `${curriculumId}_deleted_concepts`,
        `${curriculumId}_custom_filters`,
        `${curriculumId}_filter_categories`,
        `${curriculumId}_concept-practice-store`
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Set flags to prevent loading default concepts
      localStorage.setItem(`${curriculumId}_is_empty`, 'true');
      localStorage.setItem(`${curriculumId}_spec_generated`, 'true');

      // Persist the AI-generated concepts
      localStorage.setItem(`${curriculumId}_user_concepts`, JSON.stringify(generatedConcepts));
      localStorage.setItem(`${curriculumId}_source_spec`, specText);

      console.log('Generated', generatedConcepts.length, 'AI concepts successfully!');

      // Close modal and create + navigate
      setShowCreateChoiceModal(false);
      setCreateStep('choice');

      if (onCreateCurriculum) {
        onCreateCurriculum(newCurriculum);
      } else {
        setCurriculums(prev => [...prev, newCurriculum]);
        if (onOpenCurriculum) {
          onOpenCurriculum(newCurriculum);
        }
      }
    } catch (error) {
      console.error('Failed to generate curriculum:', error);
      alert('Failed to generate curriculum. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Check if a curriculum has been imported
  const isAlreadyImported = (publishedId: string): boolean => {
    return localCurriculums.some(c => c.id.startsWith(`imported-${publishedId}`));
  };

  // Handle importing a published curriculum
  const handleImportPublished = async (publishedCurriculum: PublishedCurriculum) => {
    try {
      console.log('🔵 Importing curriculum:', publishedCurriculum.name);
      const newCurriculumId = await CurriculumPublishingService.importCurriculum(publishedCurriculum);
      console.log('✅ Import successful, new ID:', newCurriculumId);
      
      // Reload curriculums to show the newly imported one
      const storedCurriculums = localStorage.getItem('curriculums');
      if (storedCurriculums) {
        const parsed = JSON.parse(storedCurriculums);
        console.log('📚 Total curriculums in localStorage:', parsed.length);
        const curriculumsWithDates = parsed.map((c: any) => ({
          ...c,
          lastAccessed: new Date(c.lastAccessed)
        }));
        setLocalCurriculums(curriculumsWithDates);
        console.log('📚 Updated local state with', curriculumsWithDates.length, 'curriculums');
        
        // Find and open the newly imported curriculum
        const importedCurriculum = curriculumsWithDates.find((c: any) => c.id === newCurriculumId);
        console.log('🔍 Found imported curriculum:', importedCurriculum?.name);
        if (importedCurriculum && onOpenCurriculum) {
          console.log('🚀 Opening curriculum:', importedCurriculum.name);
          onOpenCurriculum(importedCurriculum);
        }
      }
    } catch (error) {
      console.error('❌ Failed to import curriculum:', error);
      alert('Failed to import curriculum. Please try again.');
    }
  };

  // Filter helper functions for Expert tab
  const handleCountrySelect = (countryName: string) => {
    setExpertSelectedCountry(countryName);
    setCountryDropdownOpen(false);
    setCountrySearchQuery('');
  };

  const handleCategorySelect = (categoryName: string) => {
    setExpertSelectedCategory(categoryName);
    setCategoryDropdownOpen(false);
  };

  const getSelectedCountryDisplay = () => {
    if (expertSelectedCountry === 'all') return 'Filter by country';
    const country = WORLD_COUNTRIES.find(c => c.name === expertSelectedCountry);
    return country ? `${country.flag} ${country.name}` : expertSelectedCountry;
  };

  const getSelectedCategoryDisplay = () => {
    if (expertSelectedCategory === 'all') return 'Filter by category';
    const category = EXAM_CATEGORIES.find(c => c.name === expertSelectedCategory);
    return category ? `${category.icon} ${category.name}` : expertSelectedCategory;
  };

  // Filter published curriculums for Expert tab
  const filteredPublishedCurriculums = publishedCurriculums.filter(curriculum => {
    const matchesSearch = curriculum.name.toLowerCase().includes(expertSearchQuery.toLowerCase()) ||
                         curriculum.description.toLowerCase().includes(expertSearchQuery.toLowerCase());
    
    const matchesCategory = expertSelectedCategory === 'all' || curriculum.category === expertSelectedCategory;
    const matchesCountry = expertSelectedCountry === 'all' || curriculum.country === expertSelectedCountry;
    
    return matchesSearch && matchesCategory && matchesCountry;
  });

  const filteredCountries = WORLD_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  // Filter curriculums based on active tab
  const getFilteredCurriculums = () => {
    console.log('Filtering curriculums for tab:', activeTab);
    console.log('Total curriculums:', curriculums.length);
    
    switch (activeTab) {
      case 'my':
        // Show user-created curriculums (those with custom IDs)
        const myCurriculums = curriculums.filter(c => c.id.startsWith('curriculum-'));
        console.log('My curriculums:', myCurriculums.length);
        return myCurriculums;
      case 'featured':
        // Show expert curriculums - return empty as we'll show published curriculums instead
        return [];
      case 'all':
      default:
        return curriculums;
    }
  };

  const filteredCurriculums = getFilteredCurriculums();
  
  // Helper: newest first (by lastAccessed)
  const sortByNewest = (list: Curriculum[]) =>
    [...list].sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Tab Navigation - Apple HIG Style */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-all duration-300 ease-out ${
              activeTab === 'all'
                ? 'bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white backdrop-blur-xl shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-all duration-300 ease-out ${
              activeTab === 'my'
                ? 'bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white backdrop-blur-xl shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
            }`}
          >
            My curriculums
          </button>
          <button
            onClick={() => setActiveTab('featured')}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-all duration-300 ease-out ${
              activeTab === 'featured'
                ? 'bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white backdrop-blur-xl shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
            }`}
          >
            Expert curriculums
          </button>
          </div>
          
          {/* Right controls: View Mode Toggle + Auth - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-full p-1 border border-gray-200/50 dark:border-gray-700/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <AuthBar />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        

        {/* Section Title for non-All tabs - Always show */}
        {activeTab !== 'all' && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {activeTab === 'my' && 'My Curriculums'}
            {activeTab === 'featured' && 'Expert Curriculums'}
          </h2>
        )}

        {/* Published Curriculums for Expert Tab */}
        {activeTab === 'featured' && (
          <>
            {/* Search and Filters for Expert Tab */}
            <div className="mb-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-[18px] w-[18px] text-zinc-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search curriculums..."
                    value={expertSearchQuery}
                    onChange={(e) => setExpertSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-[15px] text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                  />
                </div>

                {/* Country Filter */}
                <div className="relative lg:min-w-[220px]" ref={countryDropdownRef}>
                  <button
                    ref={countryButtonRef}
                    onClick={() => {
                      const rect = countryButtonRef.current?.getBoundingClientRect();
                      if (rect) {
                        setCountryPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
                      }
                      setCountryDropdownOpen(!countryDropdownOpen);
                    }}
                    className="w-full px-4 py-3 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-[15px] text-zinc-900 dark:text-white flex items-center justify-between hover:bg-white/90 dark:hover:bg-zinc-800/90 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                  >
                    <span className="truncate">{getSelectedCountryDisplay()}</span>
                    <ChevronDown className="h-[18px] w-[18px] text-zinc-400 dark:text-zinc-500 flex-shrink-0 ml-2" />
                  </button>
                  
                  {countryDropdownOpen && ReactDOM.createPortal(
                    <div
                      ref={countryDropdownRef}
                      className="fixed bg-white/95 dark:bg-zinc-800/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl z-[99999] max-h-80 overflow-hidden"
                      style={{ top: countryPos.top, left: countryPos.left, width: countryPos.width }}
                    >
                      <div className="p-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            placeholder="Search countries..."
                            value={countrySearchQuery}
                            onChange={(e) => setCountrySearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-white/60 dark:bg-zinc-700/60 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] rounded-lg text-[14px] text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all"
                            autoFocus
                          />
                        </div>
                      </div>
                      
                      <div className="max-h-64 overflow-y-auto">
                        <button
                          onClick={() => handleCountrySelect('all')}
                          className="w-full px-4 py-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-zinc-900 dark:text-white text-[15px] transition-colors"
                        >
                          Filter by country
                        </button>
                        {filteredCountries.map(country => (
                          <button
                            key={country.name}
                            onClick={() => handleCountrySelect(country.name)}
                            className="w-full px-4 py-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-zinc-900 dark:text-white text-[15px] flex items-center gap-3 transition-colors"
                          >
                            <span className="text-[16px]">{country.flag}</span>
                            <span className="truncate">{country.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Category Filter */}
                <div className="relative lg:min-w-[220px]" ref={categoryDropdownRef}>
                  <button
                    ref={categoryButtonRef}
                    onClick={() => {
                      const rect = categoryButtonRef.current?.getBoundingClientRect();
                      if (rect) {
                        setCategoryPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
                      }
                      setCategoryDropdownOpen(!categoryDropdownOpen);
                    }}
                    className="w-full px-4 py-3 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-[15px] text-zinc-900 dark:text-white flex items-center justify-between hover:bg-white/90 dark:hover:bg-zinc-800/90 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                  >
                    <span className="truncate">{getSelectedCategoryDisplay()}</span>
                    <ChevronDown className="h-[18px] w-[18px] text-zinc-400 dark:text-zinc-500 flex-shrink-0 ml-2" />
                  </button>
                  
                  {categoryDropdownOpen && ReactDOM.createPortal(
                    <div
                      ref={categoryDropdownRef}
                      className="fixed bg-white/95 dark:bg-zinc-800/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl z-[99999] max-h-80 overflow-hidden"
                      style={{ top: categoryPos.top, left: categoryPos.left, width: categoryPos.width }}
                    >
                      <div className="max-h-64 overflow-y-auto">
                        <button
                          onClick={() => handleCategorySelect('all')}
                          className="w-full px-4 py-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-zinc-900 dark:text-white text-[15px] transition-colors"
                        >
                          Filter by category
                        </button>
                        {EXAM_CATEGORIES.map(category => (
                          <button
                            key={category.name}
                            onClick={() => handleCategorySelect(category.name)}
                            className="w-full px-4 py-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-zinc-900 dark:text-white text-[15px] flex items-center gap-3 transition-colors"
                          >
                            <span className="text-[16px]">{category.icon}</span>
                            <span className="truncate">{category.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              </div>
            </div>

            {isLoadingPublished ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Sparkles className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">Loading expert curriculums...</p>
              </div>
            ) : filteredPublishedCurriculums.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {publishedCurriculums.length === 0 ? 'No expert curriculums available' : 'No curriculums match your filters'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {publishedCurriculums.length === 0 ? 'Expert curriculums will appear here' : 'Try adjusting your search or filters'}
                </p>
              </div>
            ) : (
              <div className={`grid gap-4 ${
                viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
              }`}>
                {filteredPublishedCurriculums.map((published, index) => {
                  const pastelGradients = [
                    'from-blue-800 via-indigo-800 to-purple-800 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900',
                    'from-purple-800 via-pink-800 to-rose-800 dark:from-purple-900 dark:via-pink-900 dark:to-rose-900',
                    'from-green-800 via-emerald-800 to-teal-800 dark:from-green-900 dark:via-emerald-900 dark:to-teal-900',
                    'from-orange-800 via-amber-800 to-yellow-800 dark:from-orange-900 dark:via-amber-900 dark:to-yellow-900',
                    'from-cyan-800 via-sky-800 to-blue-800 dark:from-cyan-900 dark:via-sky-900 dark:to-blue-900',
                    'from-fuchsia-800 via-pink-800 to-rose-800 dark:from-fuchsia-900 dark:via-pink-900 dark:to-rose-900',
                  ];
                  
                  const gradient = pastelGradients[index % pastelGradients.length];
                  
                  return (
                    <div
                      key={published.id}
                      className={`bg-gradient-to-br ${gradient} border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl rounded-2xl border transition-all duration-200 p-6 relative group ${
                        viewMode === 'grid' ? 'h-[200px]' : 'h-auto'
                      } flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-center'} ${
                        published.isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                      }`}
                      onClick={(e) => {
                        // If delete button handled the event, don't open/import
                        if ((e as any).defaultPrevented) return;
                        const target = e.target as HTMLElement;
                        if (target && target.closest('[data-role="delete-published"]')) return;
                        if (!published.isLocked) handleImportPublished(published);
                      }}
                    >
                      {/* Admin delete button - Subtle hover-only */}
                      {isPublisherAllowed && CurriculumPublishingService.canDeleteCurriculum(published.id) && (
                        <button
                          type="button"
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => handleDeletePublishedAdmin(published, e)}
                          className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white/10 hover:bg-red-600/90 backdrop-blur-sm pointer-events-auto"
                          data-role="delete-published"
                          title="Delete expert curriculum"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </button>
                      )}
                      {published.isLocked && (
                        <div className="absolute top-3 right-3 z-10">
                          <Lock className="h-5 w-5 text-white/80" />
                        </div>
                      )}
                      {!published.isLocked && isAlreadyImported(published.id) && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-green-500/90 text-white rounded-md">
                            Imported
                          </span>
                        </div>
                      )}
                      {viewMode === 'grid' ? (
                        <>
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-xl font-semibold tracking-tight pr-8 text-white">
                              {published.name}
                            </h3>
                            {!published.isLocked && <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform text-gray-400" />}
                          </div>
                          <p className="text-sm leading-relaxed mb-4 line-clamp-2 flex-grow text-gray-300">
                            {published.description}
                          </p>

                          <div className="flex items-center justify-between text-sm font-medium mt-auto">
                            <span className="text-gray-300">
                              {published.conceptCount} concepts
                            </span>
                            <span className="text-xs text-gray-400">
                              by {published.author}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 pr-12">
                            <h3 className="text-lg font-semibold tracking-tight mb-1 text-white">
                              {published.name}
                            </h3>
                            <p className="text-sm leading-relaxed line-clamp-1 text-gray-300">
                              {published.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              by {published.author}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-sm font-medium text-gray-300">
                              {published.conceptCount} concepts
                            </span>
                            <ArrowRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}


        {/* Curriculum Grid - Apple Card Style */}
        {activeTab === 'all' ? (
          <>
            {/* Imported Expert Curriculums Section */}
            {filteredCurriculums.filter(c => c.id.startsWith('imported-')).length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Imported Expert Curriculums</h2>
                <div className={`grid gap-4 mb-8 ${
                  viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
                }`}>
                  {filteredCurriculums.filter(c => c.id.startsWith('imported-')).map((curriculum, index) => {
                    const isExpert = true;
            
            // Define gradient colors matching Expert tab
            const expertGradients = [
              'from-blue-700 via-indigo-700 to-purple-700 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900',
              'from-purple-700 via-pink-700 to-rose-700 dark:from-purple-900 dark:via-pink-900 dark:to-rose-900',
              'from-green-700 via-emerald-700 to-teal-700 dark:from-green-900 dark:via-emerald-900 dark:to-teal-900',
              'from-orange-700 via-amber-700 to-yellow-700 dark:from-orange-900 dark:via-amber-900 dark:to-yellow-900',
              'from-cyan-700 via-sky-700 to-blue-700 dark:from-cyan-900 dark:via-sky-900 dark:to-blue-900',
              'from-fuchsia-700 via-pink-700 to-rose-700 dark:from-fuchsia-900 dark:via-pink-900 dark:to-rose-900',
            ];
            
            const gradient = expertGradients[index % expertGradients.length];
            
            return (
            <div
              key={curriculum.id}
              className={`bg-gradient-to-br ${gradient} ${
                isExpert 
                  ? 'border-gray-700' 
                  : 'border-gray-200/50 dark:border-gray-700/50'
              } backdrop-blur-xl rounded-2xl border hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer p-6 relative group ${
                viewMode === 'grid' ? 'h-[200px]' : 'h-auto'
              } flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-center'}`}
              style={{ zIndex: openDropdown === curriculum.id ? 100 : 1 }}
              onClick={() => {
                console.log('Curriculum card clicked for:', curriculum.name);
                handleOpenCurriculum(curriculum.id);
              }}
            >
              {/* Dropdown Menu */}
              <div className="absolute top-3 right-3 z-50">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Menu button clicked for:', curriculum.name);
                    setOpenDropdown(openDropdown === curriculum.id ? null : curriculum.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-200"
                  title="More options"
                  type="button"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {/* Dropdown Menu - Apple Style */}
                {openDropdown === curriculum.id && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-50 overflow-hidden">
                    <button
                      onClick={(e) => handleEditCurriculum(curriculum, e)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 flex items-center transition-colors"
                    >
                      <Edit3 className="h-4 w-4 mr-3 text-blue-500" />
                      <span className="font-medium">Edit Curriculum</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700"></div>
                    <button
                      onClick={(e) => handleDuplicateCurriculum(curriculum, e)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 flex items-center transition-colors"
                    >
                      <Copy className="h-4 w-4 mr-3 text-green-500" />
                      <span className="font-medium">Duplicate</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700"></div>
                    {isPublisherAllowed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPublishingCurriculum(curriculum);
                          setShowPublishModal(true);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 flex items-center transition-colors"
                      >
                        <Share2 className="h-4 w-4 mr-3 text-purple-500" />
                        <span className="font-medium">Publish to Expert</span>
                      </button>
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-700"></div>
                    <button
                      onClick={(e) => handleDeleteCurriculum(curriculum, e)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/30 flex items-center transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-3 text-red-500" />
                      <span className="font-medium">Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {viewMode === 'grid' ? (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className={`text-xl font-semibold tracking-tight pr-8 ${
                      isExpert ? 'text-white' : 'text-gray-900 dark:text-white'
                    }`}>
                      {curriculum.name}
                    </h3>
                    <ArrowRight className={`h-5 w-5 group-hover:translate-x-1 transition-transform ${
                      isExpert ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <p className={`text-sm leading-relaxed mb-4 line-clamp-2 flex-grow ${
                    isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {curriculum.description}
                  </p>

                  <div className="flex items-center text-sm font-medium mt-auto">
                    <span className={isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>
                      {getActualConceptCount(curriculum.id)} concepts
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0 pr-12">
                    <h3 className={`text-lg font-semibold tracking-tight mb-1 ${
                      isExpert ? 'text-white' : 'text-gray-900 dark:text-white'
                    }`}>
                      {curriculum.name}
                    </h3>
                    <p className={`text-sm leading-relaxed line-clamp-1 ${
                      isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {curriculum.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={`text-sm font-medium ${
                      isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {getActualConceptCount(curriculum.id)} concepts
                    </span>
                    <ArrowRight className={`h-5 w-5 ${
                      isExpert ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                  </div>
                </>
              )}
            </div>
            );
          })}
                </div>
              </>
            )}

            {/* My Curriculums Section */}
            {(filteredCurriculums.filter(c => !c.id.startsWith('imported-')).length > 0 || activeTab === 'all') && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Learning Maps</h2>
                <div className={`grid gap-4 mb-8 ${
                  viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
                }`}>
                  {/* Create New Card - Apple Style - First Position */}
                  <div
                    onClick={handleCreateFreshCurriculum}
                    className={`bg-white/50 dark:bg-gray-800/30 backdrop-blur-xl rounded-2xl border-2 border-dashed border-gray-300/60 dark:border-gray-600/60 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-white/80 dark:hover:bg-gray-800/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer p-6 ${
                      viewMode === 'grid' ? 'h-[200px]' : 'h-auto'
                    }`}
                  >
                    <div className={`flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row'} items-center justify-center h-full`}>
                      <div className="w-14 h-14 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mb-4">
                        <Plus className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className={viewMode === 'grid' ? 'text-center' : 'ml-4 flex-1'}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          Create New Curriculum
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Start building a new curriculum
                        </p>
                      </div>
                      {viewMode === 'list' && (
                        <ArrowRight className="h-5 w-5 text-gray-400 ml-4" />
                      )}
                    </div>
                  </div>
                  
                  {sortByNewest(filteredCurriculums.filter(c => !c.id.startsWith('imported-'))).map((curriculum, index) => {
                    const isExpert = false;
            
            // Define gradient colors based on index for variety
            const lightGradients = [
              'from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/15 dark:to-purple-900/20',
              'from-purple-50 via-pink-50 to-rose-50 dark:from-purple-900/20 dark:via-pink-900/15 dark:to-rose-900/20',
              'from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/15 dark:to-teal-900/20',
              'from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/15 dark:to-yellow-900/20',
              'from-cyan-50 via-sky-50 to-blue-50 dark:from-cyan-900/20 dark:via-sky-900/15 dark:to-blue-900/20',
              'from-fuchsia-50 via-pink-50 to-rose-50 dark:from-fuchsia-900/20 dark:via-pink-900/15 dark:to-rose-900/20',
            ];
            
            const darkGradients = [
              'from-slate-900 via-blue-900 to-slate-900',
              'from-slate-900 via-purple-900 to-slate-900',
              'from-slate-900 via-emerald-900 to-slate-900',
              'from-slate-900 via-orange-900 to-slate-900',
              'from-slate-900 via-cyan-900 to-slate-900',
            ];
            
            const gradient = isExpert 
              ? darkGradients[index % darkGradients.length]
              : lightGradients[index % lightGradients.length];
            
            return (
            <div
              key={curriculum.id}
              className={`bg-gradient-to-br ${gradient} ${
                isExpert 
                  ? 'border-gray-700' 
                  : 'border-gray-200/50 dark:border-gray-700/50'
              } backdrop-blur-xl rounded-2xl border hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer p-6 relative group ${
                viewMode === 'grid' ? 'h-[200px]' : 'h-auto'
              } flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-center'}`}
              style={{ zIndex: openDropdown === curriculum.id ? 100 : 1 }}
              onClick={() => {
                console.log('Curriculum card clicked for:', curriculum.name);
                handleOpenCurriculum(curriculum.id);
              }}
            >
              {/* Dropdown Menu */}
              <div className="absolute top-3 right-3 z-50">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Menu button clicked for:', curriculum.name);
                    setOpenDropdown(openDropdown === curriculum.id ? null : curriculum.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-200"
                  title="More options"
                  type="button"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {/* Dropdown Menu - Apple Style */}
                {openDropdown === curriculum.id && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-50 overflow-hidden">
                    <button
                      onClick={(e) => handleEditCurriculum(curriculum, e)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 flex items-center transition-colors"
                    >
                      <Edit3 className="h-4 w-4 mr-3 text-blue-500" />
                      <span className="font-medium">Edit Curriculum</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700"></div>
                    <button
                      onClick={(e) => handleDuplicateCurriculum(curriculum, e)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 flex items-center transition-colors"
                    >
                      <Copy className="h-4 w-4 mr-3 text-green-500" />
                      <span className="font-medium">Duplicate</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700"></div>
                    {isPublisherAllowed && (
                      <button
                        onClick={(e) => handlePublishCurriculum(curriculum, e)}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 flex items-center transition-colors"
                      >
                        <Upload className="h-4 w-4 mr-3 text-purple-500" />
                        <span className="font-medium">Publish to Expert</span>
                      </button>
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-700"></div>
                    <button
                      onClick={(e) => handleDeleteCurriculum(curriculum, e)}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/30 flex items-center transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-3 text-red-500" />
                      <span className="font-medium">Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {viewMode === 'grid' ? (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className={`text-xl font-semibold tracking-tight pr-8 ${
                      isExpert ? 'text-white' : 'text-gray-900 dark:text-white'
                    }`}>
                      {curriculum.name}
                    </h3>
                    <ArrowRight className={`h-5 w-5 group-hover:translate-x-1 transition-transform ${
                      isExpert ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <p className={`text-sm leading-relaxed mb-4 line-clamp-2 flex-grow ${
                    isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {curriculum.description}
                  </p>

                  <div className="flex items-center text-sm font-medium mt-auto">
                    <span className={isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>
                      {getActualConceptCount(curriculum.id)} concepts
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0 pr-12">
                    <h3 className={`text-lg font-semibold tracking-tight mb-1 ${
                      isExpert ? 'text-white' : 'text-gray-900 dark:text-white'
                    }`}>
                      {curriculum.name}
                    </h3>
                    <p className={`text-sm leading-relaxed line-clamp-1 ${
                      isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {curriculum.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={`text-sm font-medium ${
                      isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {getActualConceptCount(curriculum.id)} concepts
                    </span>
                    <ArrowRight className={`h-5 w-5 ${
                      isExpert ? 'text-gray-400' : 'text-gray-400'
                    }`} />
                  </div>
                </>
              )}
            </div>
            );
          })}
                </div>
              </>
            )}
          </>
        ) : (
          <div className={`grid gap-4 ${
              viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
            }`}>
              {/* Create New Card - First Position for My Curriculums tab */}
              {activeTab === 'my' && (
              <div
                onClick={handleCreateFreshCurriculum}
                className={`bg-white/50 dark:bg-gray-800/30 backdrop-blur-xl rounded-2xl border-2 border-dashed border-gray-300/60 dark:border-gray-600/60 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-white/80 dark:hover:bg-gray-800/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer p-6 ${
                  viewMode === 'grid' ? 'h-[200px]' : 'h-auto'
                }`}
              >
                <div className={`flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row'} items-center justify-center h-full`}>
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mb-4">
                    <Plus className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className={viewMode === 'grid' ? 'text-center' : 'ml-4 flex-1'}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Create New Curriculum
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Start building a new curriculum
                    </p>
                  </div>
                  {viewMode === 'list' && (
                    <ArrowRight className="h-5 w-5 text-gray-400 ml-4" />
                  )}
                </div>
              </div>
            )}
            
            {sortByNewest(filteredCurriculums).map((curriculum, index) => {
              const isExpert = curriculum.category === 'Expert' || curriculum.id.startsWith('expert-');
              
              // Define gradient colors based on index for variety
              const lightGradients = [
                'from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/15 dark:to-purple-900/20',
                'from-purple-50 via-pink-50 to-rose-50 dark:from-purple-900/20 dark:via-pink-900/15 dark:to-rose-900/20',
                'from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/15 dark:to-teal-900/20',
                'from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/15 dark:to-yellow-900/20',
                'from-cyan-50 via-sky-50 to-blue-50 dark:from-cyan-900/20 dark:via-sky-900/15 dark:to-blue-900/20',
                'from-fuchsia-50 via-pink-50 to-rose-50 dark:from-fuchsia-900/20 dark:via-pink-900/15 dark:to-rose-900/20',
              ];
              
              const darkGradients = [
                'from-slate-900 via-blue-900 to-slate-900',
                'from-slate-900 via-purple-900 to-slate-900',
                'from-slate-900 via-emerald-900 to-slate-900',
                'from-slate-900 via-orange-900 to-slate-900',
                'from-slate-900 via-cyan-900 to-slate-900',
              ];
              
              const gradient = isExpert 
                ? darkGradients[index % darkGradients.length]
                : lightGradients[index % lightGradients.length];
              
              return (
                <div
                  key={curriculum.id}
                  className={`bg-gradient-to-br ${gradient} ${
                    isExpert 
                      ? 'border-gray-700' 
                      : 'border-gray-200/50 dark:border-gray-700/50'
                  } backdrop-blur-xl rounded-2xl border hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer p-6 relative group ${
                viewMode === 'grid' ? 'h-[200px]' : 'h-auto'
              } flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-center'}`}
                  style={{ zIndex: openDropdown === curriculum.id ? 100 : 1 }}
                  onClick={() => {
                    console.log('Curriculum card clicked for:', curriculum.name);
                    handleOpenCurriculum(curriculum.id);
                  }}
                >
                  {/* Dropdown Menu */}
                  <div className="absolute top-3 right-3 z-50">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Menu button clicked for:', curriculum.name);
                        setOpenDropdown(openDropdown === curriculum.id ? null : curriculum.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-full text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-200"
                      title="More options"
                      type="button"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* Dropdown Menu - Apple Style */}
                    {openDropdown === curriculum.id && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-50 overflow-hidden">
                        <button
                          onClick={(e) => handleEditCurriculum(curriculum, e)}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 flex items-center transition-colors"
                        >
                          <Edit3 className="h-4 w-4 mr-3 text-blue-500" />
                          <span className="font-medium">Edit Curriculum</span>
                        </button>
                        <div className="border-t border-gray-100 dark:border-gray-700"></div>
                        <button
                          onClick={(e) => handleDuplicateCurriculum(curriculum, e)}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 flex items-center transition-colors"
                        >
                          <Copy className="h-4 w-4 mr-3 text-green-500" />
                          <span className="font-medium">Duplicate</span>
                        </button>
                        <div className="border-t border-gray-100 dark:border-gray-700"></div>
                        {isPublisherAllowed && (
                          <button
                            onClick={(e) => handlePublishCurriculum(curriculum, e)}
                            className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 flex items-center transition-colors"
                          >
                            <Upload className="h-4 w-4 mr-3 text-purple-500" />
                            <span className="font-medium">Publish to Expert</span>
                          </button>
                        )}
                        <div className="border-t border-gray-100 dark:border-gray-700"></div>
                        <button
                          onClick={(e) => handleDeleteCurriculum(curriculum, e)}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/30 flex items-center transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-3 text-red-500" />
                          <span className="font-medium">Delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {viewMode === 'grid' ? (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className={`text-xl font-semibold tracking-tight pr-8 ${
                          isExpert ? 'text-white' : 'text-gray-900 dark:text-white'
                        }`}>
                          {curriculum.name}
                        </h3>
                        <ArrowRight className={`h-5 w-5 group-hover:translate-x-1 transition-transform ${
                          isExpert ? 'text-gray-400' : 'text-gray-400'
                        }`} />
                      </div>
                      <p className={`text-sm leading-relaxed mb-4 line-clamp-2 flex-grow ${
                        isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {curriculum.description}
                      </p>

                      <div className="flex items-center text-sm font-medium mt-auto">
                        <span className={isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>
                          {getActualConceptCount(curriculum.id)} concepts
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0 pr-12">
                        <h3 className={`text-lg font-semibold tracking-tight mb-1 ${
                          isExpert ? 'text-white' : 'text-gray-900 dark:text-white'
                        }`}>
                          {curriculum.name}
                        </h3>
                        <p className={`text-sm leading-relaxed line-clamp-1 ${
                          isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {curriculum.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className={`text-sm font-medium ${
                          isExpert ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {getActualConceptCount(curriculum.id)} concepts
                        </span>
                        <ArrowRight className={`h-5 w-5 ${
                          isExpert ? 'text-gray-400' : 'text-gray-400'
                        }`} />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Choice Modal - Apple Style */}
      {showCreateChoiceModal && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50 p-4"
          style={{ backdropFilter: 'blur(20px)' }}
          onClick={() => setShowCreateChoiceModal(false)}
        >
          <div 
            className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 text-center relative">
              <button
                onClick={() => {
                  setShowCreateChoiceModal(false);
                  setCreateStep('choice');
                }}
                className="absolute top-6 right-8 flex items-center justify-center w-8 h-8 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
              <h2 className="text-[28px] font-semibold text-gray-900 dark:text-white mb-2">
                {createStep === 'choice' && 'Create New Curriculum'}
                {createStep === 'spec_paste' && 'Paste Your Specification'}
                {createStep === 'spec_review' && 'Review & Generate'}
              </h2>
              {createStep === 'choice' && (
                <p className="text-[15px] text-gray-500 dark:text-gray-400">
                  How would you like to create your curriculum?
                </p>
              )}
            </div>

            <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>

            {createStep === 'choice' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Import Expert Curriculum */}
              <button
                onClick={() => {
                  setShowCreateChoiceModal(false);
                  setShowImportExpertModal(true);
                }}
                className="p-8 border-2 border-blue-200/50 dark:border-blue-600/50 rounded-2xl hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left backdrop-blur-sm"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 transition-colors">
                    <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Import Expert
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    Choose from professionally curated curriculums
                  </p>
                </div>
              </button>

              {/* From Specification */}
              <button
                onClick={startSpecFlow}
                className="p-8 border-2 border-purple-200/50 dark:border-purple-600/50 rounded-2xl hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 backdrop-blur-sm group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-purple-500/10 dark:bg-purple-500/20 rounded-2xl flex items-center justify-center mb-4 transition-colors">
                    <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    From Specification
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    Paste exam specs and generate concepts automatically
                  </p>
                </div>
              </button>

              {/* Start Fresh */}
              <button
                onClick={handleCreateFreshCurriculum}
                className="p-8 border-2 border-green-200/50 dark:border-green-600/50 rounded-2xl hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 backdrop-blur-sm group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-500/10 dark:bg-green-500/20 rounded-2xl flex items-center justify-center mb-4 transition-colors">
                    <BookOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Start Fresh
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    Create a completely custom curriculum from scratch
                  </p>
                </div>
              </button>
              </div>
            )}

            {/* Step 2: Paste Specification */}
            {createStep === 'spec_paste' && (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  Paste your exam specification or curriculum outline below:
                </p>
                <textarea
                  value={specText}
                  onChange={(e) => setSpecText(e.target.value)}
                  placeholder="Paste your specification here...&#10;&#10;Example:&#10;- Cardiovascular system anatomy&#10;- ECG interpretation&#10;- Heart failure management&#10;- Arrhythmia diagnosis"
                  className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <div className="flex justify-between">
                  <button
                    onClick={() => setCreateStep('choice')}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={proceedToSpecReview}
                    disabled={!specText.trim() || isParsing}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center"
                  >
                    {isParsing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Parsing...
                      </>
                    ) : (
                      'Parse & Review'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Generate */}
            {createStep === 'spec_review' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Curriculum Name
                    </label>
                    <input
                      type="text"
                      value={newCurricName}
                      onChange={(e) => setNewCurricName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newCurricDesc}
                      onChange={(e) => setNewCurricDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Parsed Items ({parsedSpecItems.filter((_, i) => selectedSpec[i]).length} selected):
                  </h4>
                  <div className="space-y-3">
                    {parsedSpecItems.map((item, idx) => (
                      <label key={idx} className="flex items-start space-x-3 p-2 rounded border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSpec[idx]}
                          onChange={(e) => {
                            const newSelected = [...selectedSpec];
                            newSelected[idx] = e.target.checked;
                            setSelectedSpec(newSelected);
                          }}
                          className="mt-1 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCreateStep('spec_paste')}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGenerateCurriculumFromSpec}
                    disabled={parsedSpecItems.filter((_, i) => selectedSpec[i]).length === 0 || isGenerating}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      'Generate Curriculum'
                    )}
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Curriculum</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This would open a form to create a new curriculum...
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Apple Style */}
      {showDeleteModal && deletingCurriculum && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-2xl font-semibold tracking-tight mb-6 text-gray-900 dark:text-white">
              Delete Curriculum
            </h3>
            <p className="text-base text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Are you sure you want to delete "<strong>{deletingCurriculum.name}</strong>"? 
              This will permanently remove the curriculum and all its concepts, progress data, and settings.
            </p>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-8">
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingCurriculum(null);
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-medium transition-colors flex items-center shadow-lg hover:shadow-xl"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingCurriculum && (
        <EditCurriculumModal
          curriculum={editingCurriculum}
          onSave={handleSaveEdit}
          onCancel={() => {
            setShowEditModal(false);
            setEditingCurriculum(null);
          }}
        />
      )}

      {/* Import Expert Modal */}
      <ImportExpertModal
        isOpen={showImportExpertModal}
        onClose={() => setShowImportExpertModal(false)}
        onImport={(curriculumId) => {
          // Refresh the curriculum list
          window.location.reload();
        }}
      />

      {/* Publish Curriculum Modal */}
      {publishingCurriculum && (
        <PublishCurriculumModal
          isOpen={showPublishModal}
          onClose={() => {
            setShowPublishModal(false);
            setPublishingCurriculum(null);
          }}
          curriculum={publishingCurriculum}
        />
      )}
    </div>
  );
};
