import React, { useState, useEffect } from 'react';
import { Plus, ArrowRight, Edit3, Trash2, X, Save, MoreVertical, Copy, BookOpen, Sparkles, FileText } from 'lucide-react';
import { generateConceptFromSpec, createConceptNode, parseSpecificationWithAI } from '../services/aiCurriculumBuilder';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Edit Curriculum
          </h3>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
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
  // Default curriculums
  const defaultCurriculums: Curriculum[] = [
    {
      id: 'ukmla-cardiology',
      name: 'UKMLA Cardiology',
      description: 'Comprehensive cardiology concepts for UKMLA preparation',
      conceptCount: 18,
      lastAccessed: new Date('2024-01-15'),
      color: 'bg-red-500',
      category: 'Medical Exam',
      progress: 65
    },
    {
      id: 'respiratory-medicine',
      name: 'Respiratory Medicine',
      description: 'Complete respiratory system concepts and pathology',
      conceptCount: 24,
      lastAccessed: new Date('2024-01-10'),
      color: 'bg-blue-500',
      category: 'Medical Specialty',
      progress: 40
    },
    {
      id: 'emergency-medicine',
      name: 'Emergency Medicine',
      description: 'Critical care and emergency protocols',
      conceptCount: 32,
      lastAccessed: new Date('2024-01-08'),
      color: 'bg-orange-500',
      category: 'Medical Specialty',
      progress: 80
    }
  ];

  // Use props if provided, otherwise use local state
  const [localCurriculums, setLocalCurriculums] = useState<Curriculum[]>(defaultCurriculums);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const curriculums = propCurriculums || localCurriculums;
  const setCurriculums = propSetCurriculums || setLocalCurriculums;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateChoiceModal, setShowCreateChoiceModal] = useState(false);
  const [createStep, setCreateStep] = useState<'choice' | 'spec_paste' | 'spec_review'>('choice');
  const [specText, setSpecText] = useState('');
  const [parsedSpecItems, setParsedSpecItems] = useState<string[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<boolean[]>([]);
  const [newCurricName, setNewCurricName] = useState('New Curriculum');
  const [newCurricDesc, setNewCurricDesc] = useState('Generated from specification');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCurriculum, setDeletingCurriculum] = useState<Curriculum | null>(null);
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
          setLocalCurriculums(curriculumsWithDates);
        } catch (error) {
          console.error('Failed to load curriculums from localStorage:', error);
          setLocalCurriculums(defaultCurriculums);
        }
      }
    }
    setIsLoaded(true);
  }, [propCurriculums]);

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

  const handleSaveEdit = (updatedCurriculum: Curriculum) => {
    setCurriculums(prev => 
      prev.map(c => c.id === updatedCurriculum.id ? updatedCurriculum : c)
    );
    setShowEditModal(false);
    setEditingCurriculum(null);
  };

  const handleDuplicateCurriculum = (curriculum: Curriculum, event: React.MouseEvent) => {
    event.stopPropagation();
    const duplicatedCurriculum: Curriculum = {
      ...curriculum,
      id: `${curriculum.id}-copy-${Date.now()}`,
      name: `${curriculum.name} (Copy)`,
      lastAccessed: new Date(),
      progress: 0, // Reset progress for the copy
      conceptCount: 0 // Will be updated when concepts are actually copied
    };
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Simple Header */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          My Curriculums
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Choose a curriculum to start practicing
        </p>
      </div>

      <div className="max-w-7xl mx-auto">

        {/* Curriculum Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {curriculums.map((curriculum) => (
            <div
              key={curriculum.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer p-6 relative group"
              onClick={() => {
                console.log('Curriculum card clicked for:', curriculum.name); // Debug log
                handleOpenCurriculum(curriculum.id);
              }}
            >
              {/* Dropdown Menu */}
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Menu button clicked for:', curriculum.name); // Debug log
                    setOpenDropdown(openDropdown === curriculum.id ? null : curriculum.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  title="More options"
                  type="button"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {/* Dropdown Menu */}
                {openDropdown === curriculum.id && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                    <button
                      onClick={(e) => handleEditCurriculum(curriculum, e)}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors"
                    >
                      <Edit3 className="h-4 w-4 mr-3 text-blue-500" />
                      <span className="font-medium">Edit Curriculum</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700"></div>
                    <button
                      onClick={(e) => handleDuplicateCurriculum(curriculum, e)}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors"
                    >
                      <Copy className="h-4 w-4 mr-3 text-green-500" />
                      <span className="font-medium">Duplicate</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700"></div>
                    <button
                      onClick={(e) => handleDeleteCurriculum(curriculum, e)}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-3 text-red-500" />
                      <span className="font-medium">Delete</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-8">
                  {curriculum.name}
                </h3>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:opacity-0 transition-opacity" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {curriculum.description}
              </p>

              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span>{curriculum.conceptCount} concepts</span>
                <span>{curriculum.progress}% complete</span>
              </div>
            </div>
          ))}

          {/* Create New Card */}
          <div
            onClick={() => setShowCreateChoiceModal(true)}
            className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer p-6"
          >
            <div className="flex flex-col items-center justify-center h-full min-h-[140px]">
              <Plus className="h-8 w-8 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-1">
                Create New Curriculum
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
                Start building a new curriculum
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Choice Modal */}
      {showCreateChoiceModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowCreateChoiceModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center">
                {createStep === 'choice' && 'Create New Curriculum'}
                {createStep === 'spec_paste' && 'Paste Your Specification'}
                {createStep === 'spec_review' && 'Review & Generate'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateChoiceModal(false);
                  setCreateStep('choice');
                }}
                className="absolute top-0 right-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {createStep === 'choice' && (
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                How would you like to create your curriculum?
              </p>
            )}

            {createStep === 'choice' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Import Expert Curriculum */}
              <button
                onClick={() => {
                  setShowCreateChoiceModal(false);
                  // TODO: Open expert curriculum selection
                  alert('Expert curriculum selection coming soon!');
                }}
                className="p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                    <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Import Expert
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose from professionally curated curriculums
                  </p>
                </div>
              </button>

              {/* From Specification */}
              <button
                onClick={startSpecFlow}
                className="p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                    <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    From Specification
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Paste exam specs and generate concepts automatically
                  </p>
                </div>
              </button>

              {/* Start Fresh */}
              <button
                onClick={handleCreateFreshCurriculum}
                className="p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
                    <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Start Fresh
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCurriculum && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Delete Curriculum
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "<strong>{deletingCurriculum.name}</strong>"? 
              This will permanently remove the curriculum and all its concepts, progress data, and settings.
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingCurriculum(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
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
    </div>
  );
};
