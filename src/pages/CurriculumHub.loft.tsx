import React, { useState, useEffect } from 'react';
import { Plus, ArrowRight, Edit3, Trash2, Copy, X, Save, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { AuthBar } from '@/components/auth/AuthBar';
import { CurriculumPublishingService } from '@/services/curriculumPublishing';

interface Curriculum {
  id: string;
  name: string;
  description: string;
  conceptCount: number;
  lastAccessed: Date;
  color: string;
  category: string;
  progress: number;
  imageUrl?: string;
  createdBy?: string; // User ID of the creator
}

interface CurriculumHubLoftProps {
  onOpenCurriculum?: (curriculum: Curriculum) => void;
  curriculums?: Curriculum[];
  setCurriculums?: React.Dispatch<React.SetStateAction<Curriculum[]>>;
  onCreateCurriculum?: (curriculum: Curriculum) => void;
}

interface EditCurriculumModalProps {
  curriculum: Curriculum;
  onSave: (curriculum: Curriculum) => void;
  onCancel: () => void;
  onPublish?: () => void;
  isPublished?: boolean;
  canPublish?: boolean;
}

const EditCurriculumModal: React.FC<EditCurriculumModalProps> = ({ 
  curriculum,
  onSave,
  onCancel,
  onPublish,
  isPublished = false,
  canPublish = true
}) => {
  const [formData, setFormData] = useState({
    name: curriculum.name,
    description: curriculum.description,
    category: curriculum.category,
    color: curriculum.color,
    imageUrl: curriculum.imageUrl || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSave({
      ...curriculum,
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category,
      color: formData.color,
      imageUrl: formData.imageUrl.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-12 max-w-2xl w-full border border-black/[0.08] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="h-[1px] w-16 bg-stone-300 mb-4"></div>
            <h3 className="text-3xl font-medium text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif" }}>Edit Curriculum</h3>
          </div>
          <button onClick={onCancel} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-stone-600 mb-3" style={{ fontFamily: "'Unbounded', sans-serif" }}>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-6 py-4 bg-white/60 border rounded-xl focus:border-stone-400 focus:outline-none transition-colors text-stone-900 ${
                errors.name ? 'border-red-500' : 'border-black/[0.08]'
              }`}
              placeholder="Enter curriculum name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-2">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-stone-600 mb-3" style={{ fontFamily: "'Unbounded', sans-serif" }}>Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={`w-full px-6 py-4 bg-white/60 border rounded-xl focus:border-stone-400 focus:outline-none transition-colors text-stone-900 resize-none ${
                errors.description ? 'border-red-500' : 'border-black/[0.08]'
              }`}
              placeholder="Enter curriculum description"
            />
            {errors.description && <p className="text-red-500 text-sm mt-2">{errors.description}</p>}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-stone-600 mb-3" style={{ fontFamily: "'Unbounded', sans-serif" }}>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-6 py-4 bg-white/60 border border-black/[0.08] rounded-xl focus:border-stone-400 focus:outline-none transition-colors text-stone-900"
            >
              <option value="Medical Exam">Medical Exam</option>
              <option value="Medical Specialty">Medical Specialty</option>
              <option value="Basic Sciences">Basic Sciences</option>
              <option value="Clinical Skills">Clinical Skills</option>
              <option value="Research">Research</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-stone-600 mb-3" style={{ fontFamily: "'Unbounded', sans-serif" }}>Image URL</label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              className="w-full px-6 py-4 bg-white/60 border border-black/[0.08] rounded-xl focus:border-stone-400 focus:outline-none transition-colors text-stone-900"
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-stone-500 mt-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Add a link to an image for this curriculum card
            </p>
          </div>

          {/* Action Buttons Section */}
          <div className="mt-12 space-y-4">
            {/* Publish/Update Action */}
            {canPublish && onPublish && (
              <div className="pb-4 border-b border-black/[0.08]">
                <button
                  type="button"
                  onClick={onPublish}
                  className="w-full px-6 py-4 bg-purple-600 text-white rounded-full text-[11px] uppercase tracking-widest hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {isPublished ? 'Update on Expert' : 'Publish to Expert'}
                </button>
              </div>
            )}
            
            {/* Save and Cancel */}
            <div className="flex gap-4">
              <button type="button" onClick={onCancel} className="flex-1 px-6 py-4 border border-black/[0.08] rounded-full text-[11px] uppercase tracking-widest text-stone-600 hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-6 py-4 bg-stone-900 text-white rounded-full text-[11px] uppercase tracking-widest hover:bg-stone-800 transition-colors flex items-center justify-center gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CurriculumHubLoft: React.FC<CurriculumHubLoftProps> = ({ 
  onOpenCurriculum,
  curriculums: propCurriculums,
  setCurriculums: propSetCurriculums,
  onCreateCurriculum
}) => {
  const navigate = useNavigate();
  const { isCreator } = useUserRole();
  const { user } = useAuth();
  
  // Override parent background on mount
  React.useEffect(() => {
    document.body.style.backgroundColor = '#FAFAF9';
    const main = document.querySelector('main');
    if (main) {
      (main as HTMLElement).style.backgroundColor = '#FAFAF9';
      (main as HTMLElement).style.paddingBottom = '0';
    }
    return () => {
      document.body.style.backgroundColor = '';
      if (main) {
        (main as HTMLElement).style.backgroundColor = '';
        (main as HTMLElement).style.paddingBottom = '';
      }
    };
  }, []);
  const [localCurriculums, setLocalCurriculums] = useState<Curriculum[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCurriculum, setDeletingCurriculum] = useState<Curriculum | null>(null);
  const [publishedCurriculums, setPublishedCurriculums] = useState<any[]>([]);
  const [conceptCounts, setConceptCounts] = useState<Record<string, number>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingProgress, setPublishingProgress] = useState(0);

  const curriculums = propCurriculums || localCurriculums;
  const setCurriculums = propSetCurriculums || setLocalCurriculums;

  // Load curriculums from localStorage on mount
  useEffect(() => {
    if (!propCurriculums) {
      const storedCurriculums = localStorage.getItem('curriculums');
      if (storedCurriculums) {
        try {
          const parsed = JSON.parse(storedCurriculums);
          const curriculumsWithDates = parsed.map((c: any) => ({
            ...c,
            lastAccessed: new Date(c.lastAccessed)
          }));
          setLocalCurriculums(curriculumsWithDates);
        } catch (error) {
          console.error('Failed to load curriculums from localStorage:', error);
          setLocalCurriculums([]);
        }
      }
    }
    setIsLoaded(true);
    loadPublishedCurriculums();
  }, [propCurriculums]);

  // Load published curriculums to check if current curriculum is published
  const loadPublishedCurriculums = async () => {
    try {
      const published = await CurriculumPublishingService.getPublishedCurriculums();
      setPublishedCurriculums(published);
    } catch (error) {
      console.error('Failed to load published curriculums:', error);
    }
  };

  // Cache concept counts for all curriculums on mount
  useEffect(() => {
    if (curriculums.length > 0) {
      const counts: Record<string, number> = {};
      curriculums.forEach(curriculum => {
        try {
          const concepts = localStorage.getItem(`${curriculum.id}_user_concepts`);
          counts[curriculum.id] = concepts ? JSON.parse(concepts).length : 0;
        } catch (error) {
          counts[curriculum.id] = 0;
        }
      });
      setConceptCounts(counts);
    }
  }, [curriculums.length]); // Only re-run when curriculum count changes

  // Check if a curriculum is published
  const isPublishedToExpert = (curriculumId: string): string | null => {
    const published = publishedCurriculums.find(p => p.id.includes(curriculumId));
    return published ? published.id : null;
  };

  // Save curriculums to localStorage
  useEffect(() => {
    if (isLoaded && !propCurriculums) {
      localStorage.setItem('curriculums', JSON.stringify(curriculums));
    }
  }, [curriculums, isLoaded, propCurriculums]);

  const handleOpenCurriculum = (curriculum: Curriculum) => {
    if (onOpenCurriculum) {
      onOpenCurriculum(curriculum);
    }
  };

  const handleCreateNew = () => {
    const curriculumId = `curriculum-${Date.now()}`;
    const newCurriculum: Curriculum = {
      id: curriculumId,
      name: 'New Curriculum',
      description: 'A fresh curriculum ready for your content',
      conceptCount: 0,
      lastAccessed: new Date(),
      color: 'bg-blue-500',
      category: 'Other',
      progress: 0,
      createdBy: user?.id // Track the creator
    };

    localStorage.setItem(`${curriculumId}_is_empty`, 'true');

    if (onCreateCurriculum) {
      onCreateCurriculum(newCurriculum);
    } else {
      setCurriculums(prev => [...prev, newCurriculum]);
      if (onOpenCurriculum) {
        onOpenCurriculum(newCurriculum);
      }
    }
  };

  // Get actual concept count from localStorage (now cached in conceptCounts state)
  // This function is kept for potential future use but replaced by cached counts
  // const getActualConceptCount = (curriculumId: string): number => {
  //   try {
  //     const concepts = localStorage.getItem(`${curriculumId}_user_concepts`);
  //     return concepts ? JSON.parse(concepts).length : 0;
  //   } catch (error) {
  //     return 0;
  //   }
  // };

  const navigateToExpertCurriculums = () => {
    navigate('/curriculums');
  };

  const handleEditCurriculum = (curriculum: Curriculum, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingCurriculum(curriculum);
    setShowEditModal(true);
  };

  const handleSaveEdit = (updatedCurriculum: Curriculum) => {
    setCurriculums(prev => prev.map(c => c.id === updatedCurriculum.id ? updatedCurriculum : c));
    setShowEditModal(false);
    setEditingCurriculum(null);
  };

  const handleDuplicateCurriculum = (curriculum: Curriculum, event: React.MouseEvent) => {
    event.stopPropagation();
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
      progress: 0,
      conceptCount: conceptCount,
      createdBy: user?.id // Track the creator of the duplicate
    };
    
    if (originalConcepts) localStorage.setItem(`${newId}_user_concepts`, originalConcepts);
    if (originalFilters) localStorage.setItem(`${newId}_custom_filters`, originalFilters);
    if (originalCategories) localStorage.setItem(`${newId}_filter_categories`, originalCategories);
    
    setCurriculums(prev => [...prev, duplicatedCurriculum]);
  };

  const handleDeleteCurriculum = (curriculum: Curriculum, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeletingCurriculum(curriculum);
    setShowDeleteModal(true);
  };

  const handlePublishCurriculum = async (curriculum: Curriculum) => {
    setIsPublishing(true);
    setPublishingProgress(0);
    
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setPublishingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);
    
    try {
      const publishedId = isPublishedToExpert(curriculum.id);
      console.log('📤 Publishing curriculum:', curriculum.name, curriculum.id);
      
      setPublishingProgress(30);
      const success = await CurriculumPublishingService.publishCurriculum(
        curriculum.id,
        {
          author: 'Anonymous', // You can add user name here if available
          tags: [curriculum.category],
          difficulty: 'Intermediate' as const,
          estimatedHours: 10
        }
      );
      
      clearInterval(progressInterval);
      setPublishingProgress(100);
      
      console.log('✅ Publish result:', success);
      
      if (success) {
        // Small delay to show 100% completion
        await new Promise(resolve => setTimeout(resolve, 500));
        alert(publishedId ? 'Curriculum updated on Expert!' : 'Curriculum published to Expert!');
        setShowEditModal(false);
        setEditingCurriculum(null);
        // Force fresh fetch (bypass cache) to show new curriculum immediately
        const published = await CurriculumPublishingService.getPublishedCurriculums({ useCache: false });
        setPublishedCurriculums(published);
        console.log('🔄 Reloaded published curriculums (bypassed cache):', published.length);
      } else {
        alert('Failed to publish curriculum. Please try again.');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error publishing curriculum:', error);
      alert('Failed to publish curriculum. Please try again.');
    } finally {
      setIsPublishing(false);
      setPublishingProgress(0);
    }
  };

  const handleCancelPublishing = () => {
    setIsPublishing(false);
    setPublishingProgress(0);
    alert('Publishing cancelled. Note: If the process had started, it may still complete in the background.');
  };

  // Delete from Expert functionality - currently not exposed in UI
  // const handleDeleteFromExpert = async (curriculum: Curriculum) => {
  //   try {
  //     const publishedId = isPublishedToExpert(curriculum.id);
  //     if (!publishedId) {
  //       alert('This curriculum is not published to Expert.');
  //       return;
  //     }

  //     const confirmed = window.confirm('Delete this curriculum from Expert? This cannot be undone.');
  //     if (!confirmed) return;

  //     const success = await CurriculumPublishingService.deletePublishedCurriculum(publishedId);
      
  //     if (success) {
  //       alert('Curriculum deleted from Expert!');
  //       setShowEditModal(false);
  //       setEditingCurriculum(null);
  //       // Force fresh fetch (bypass cache) to show deletion immediately
  //       const published = await CurriculumPublishingService.getPublishedCurriculums({ useCache: false });
  //       setPublishedCurriculums(published);
  //     } else {
  //       alert('Failed to delete curriculum from Expert.');
  //     }
  //   } catch (error) {
  //     console.error('Error deleting from Expert:', error);
  //     alert('Failed to delete curriculum from Expert.');
  //   }
  // };

  const confirmDelete = () => {
    if (deletingCurriculum) {
      setCurriculums(prev => prev.filter(c => c.id !== deletingCurriculum.id));
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
      keysToRemove.forEach(key => localStorage.removeItem(key));
      setShowDeleteModal(false);
      setDeletingCurriculum(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] relative -mb-16">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")' }}></div>

      {/* Floating Sign In Button */}
      <div className="fixed top-6 right-6 z-40">
        <AuthBar />
      </div>

      {/* Header */}
      <div className="relative px-4 md:px-8 pt-8 md:pt-16 pb-8 md:pb-12 border-b border-black/[0.04]">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="mb-8 md:mb-12">
            <div className="h-[1px] w-16 md:w-24 bg-stone-300 mb-4 md:mb-6"></div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-medium text-stone-900 mb-3 md:mb-4 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              Your Curriculums
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
              Curated learning paths
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
            {/* Only show Create button for creators */}
            {isCreator && (
              <button
                onClick={handleCreateNew}
                className="px-6 md:px-8 py-3 md:py-4 bg-stone-900 text-white rounded-full text-[11px] uppercase tracking-widest hover:bg-stone-800 transition-all duration-700 flex items-center justify-center gap-2 md:gap-3"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                <Plus className="h-4 w-4" />
                <span>Create New</span>
              </button>
            )}
            <button
              onClick={navigateToExpertCurriculums}
              className="px-6 md:px-8 py-3 md:py-4 bg-white/60 backdrop-blur-xl border border-black/[0.08] rounded-full text-[11px] uppercase tracking-widest text-stone-900 hover:border-black/[0.16] transition-all duration-700 flex items-center justify-center gap-2 md:gap-3"
              style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
            >
              <span className="hidden sm:inline">Browse Expert Curriculums</span>
              <span className="sm:hidden">Browse Expert</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Curriculum Gallery */}
      <div className="relative px-4 md:px-8 pb-12 md:pb-20">
        <div className="max-w-6xl mx-auto">
          {curriculums.length === 0 ? (
            <div className="text-center py-12 md:py-20 px-4">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-stone-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Plus className="h-10 w-10 md:h-12 md:w-12 text-stone-400" />
                </div>
                <h3 className="text-xl md:text-2xl font-medium text-stone-900 mb-3 md:mb-4" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                  No curriculums yet
                </h3>
                <p className="text-sm md:text-base text-stone-600 font-light mb-6 md:mb-8" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {isCreator ? 'Create your first curriculum or browse expert collections' : 'Browse and import expert collections to get started'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                  {/* Only show Create button for creators */}
                  {isCreator && (
                    <button
                      onClick={handleCreateNew}
                      className="px-6 md:px-8 py-3 md:py-4 bg-stone-900 text-white rounded-full text-[11px] uppercase tracking-widest hover:bg-stone-800 transition-all duration-700"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      Create New
                    </button>
                  )}
                  <button
                    onClick={navigateToExpertCurriculums}
                    className="px-6 md:px-8 py-3 md:py-4 bg-white/60 backdrop-blur-xl border border-black/[0.08] rounded-full text-[11px] uppercase tracking-widest text-stone-900 hover:border-black/[0.16] transition-all duration-700"
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                  >
                    Browse Expert
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {curriculums.map((curriculum) => {
                const actualConceptCount = conceptCounts[curriculum.id] ?? 0;
                
                return (
                  <div
                    key={curriculum.id}
                    className="group cursor-pointer"
                    onMouseEnter={() => setHoveredCard(curriculum.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => handleOpenCurriculum(curriculum)}
                  >
                    <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-black/[0.06] hover:border-black/[0.12] transition-all duration-700 hover:-translate-y-1 active:scale-[0.98]">
                      {/* Image/Visual Area */}
                      <div className="aspect-[3/4] bg-gradient-to-br from-stone-100 to-stone-50 rounded-2xl mb-6 relative overflow-hidden">
                        {curriculum.imageUrl ? (
                          <>
                            <img 
                              src={curriculum.imageUrl} 
                              alt={curriculum.name}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to default view if image fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            {/* Overlay with concept count */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-start p-6">
                              <div className="text-5xl font-bold text-white/90" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                                {actualConceptCount}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-7xl font-bold text-stone-200" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                              {actualConceptCount}
                            </div>
                          </div>
                        )}
                        {/* Progress bar at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-stone-200/50">
                          <div 
                            className="h-full bg-stone-900/80 transition-all duration-700"
                            style={{ width: `${curriculum.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Content */}
                      <h3 className="text-lg md:text-xl font-medium text-stone-900 mb-2 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                        {curriculum.name}
                      </h3>
                      <p className="text-xs md:text-sm text-stone-600 font-light mb-4 line-clamp-2" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                        {curriculum.description}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-widest text-stone-500" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                          {actualConceptCount} Concepts
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-stone-400" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                          {curriculum.category}
                        </div>
                      </div>

                      {/* Action buttons - Always visible on mobile, hover on desktop */}
                      <div className={`mt-4 md:mt-6 pt-4 md:pt-6 border-t border-black/[0.04] flex items-center gap-2 transition-opacity duration-700 md:opacity-0 ${hoveredCard === curriculum.id ? 'md:opacity-100' : ''}`}>
                        {/* Only show Edit button for creators */}
                        {isCreator && (
                          <button
                            onClick={(e) => handleEditCurriculum(curriculum, e)}
                            className="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-full text-[10px] uppercase tracking-widest text-stone-700 transition-colors duration-300 flex items-center justify-center gap-2"
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                        {/* Only show Duplicate button for creators */}
                        {isCreator && (
                          <button
                            onClick={(e) => handleDuplicateCurriculum(curriculum, e)}
                            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-full text-[10px] uppercase tracking-widest text-stone-700 transition-colors duration-300"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                        {/* Only show Delete button for creators */}
                        {isCreator && (
                          <button
                            onClick={(e) => handleDeleteCurriculum(curriculum, e)}
                            className="px-4 py-2 bg-stone-100 hover:bg-red-100 rounded-full text-[10px] uppercase tracking-widest text-stone-700 hover:text-red-700 transition-colors duration-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingCurriculum && (
        <EditCurriculumModal
          curriculum={editingCurriculum}
          onSave={handleSaveEdit}
          onCancel={() => {
            setShowEditModal(false);
            setEditingCurriculum(null);
          }}
          onPublish={isCreator ? () => {
            handlePublishCurriculum(editingCurriculum);
          } : undefined}
          isPublished={!!isPublishedToExpert(editingCurriculum.id)}
          canPublish={isCreator}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCurriculum && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-12 max-w-lg w-full border border-black/[0.08] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-8">
              <div className="h-[1px] w-16 bg-stone-300 mb-6"></div>
              <h3 className="text-3xl font-medium text-stone-900 mb-4" style={{ fontFamily: "'Unbounded', sans-serif" }}>Delete Curriculum</h3>
              <p className="text-base text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Are you sure you want to delete "<strong>{deletingCurriculum.name}</strong>"? This will permanently remove the curriculum and all its concepts, progress data, and settings.
              </p>
              <p className="text-sm text-red-600 mt-4 font-medium">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-6 py-4 border border-black/[0.08] rounded-full text-[11px] uppercase tracking-widest text-stone-600 hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 px-6 py-4 bg-red-600 text-white rounded-full text-[11px] uppercase tracking-widest hover:bg-red-700 transition-colors">
                Delete Curriculum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publishing Loading Overlay - Manhattan Loft Aesthetic */}
      {isPublishing && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-12 md:p-16 max-w-md w-full border border-black/[0.04] shadow-2xl">
            <div className="flex flex-col items-center">
              {/* Minimal Line Accent */}
              <div className="h-[1px] w-16 bg-stone-300 mb-8"></div>

              {/* Minimal Icon */}
              <div className="relative mb-10">
                <div className="w-16 h-16 rounded-full border border-black/[0.08] flex items-center justify-center">
                  <Share2 className="h-7 w-7 text-stone-900" />
                </div>
              </div>

              {/* Title - Unbounded Font */}
              <h3 className="text-3xl font-medium text-stone-900 mb-3 text-center tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Publishing to Expert
              </h3>
              
              {/* Description - Manrope Font */}
              <p className="text-sm text-stone-600 text-center font-light mb-10" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                Uploading your curriculum and all concepts...
              </p>

              {/* Minimal Progress Bar */}
              <div className="w-full mb-10">
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-[10px] uppercase tracking-widest text-stone-500" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                    Progress
                  </span>
                  <span className="text-sm text-stone-900 font-medium" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                    {Math.round(publishingProgress)}%
                  </span>
                </div>
                <div className="h-[1px] bg-stone-200 relative overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-stone-900 transition-all duration-500 ease-out"
                    style={{ width: `${publishingProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Minimal Cancel Button */}
              <button
                onClick={handleCancelPublishing}
                className="px-8 py-4 border border-black/[0.08] hover:border-black/[0.16] rounded-full text-[11px] uppercase tracking-widest text-stone-600 hover:text-stone-900 hover:bg-stone-50/50 transition-all duration-700"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumHubLoft;
