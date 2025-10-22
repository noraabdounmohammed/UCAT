import React, { useState, useEffect } from 'react';
import { useConceptStore, ConceptStoreProvider } from '@/contexts/ConceptStoreContext';
import { ConceptFilterPanel } from '@/components/concept/ConceptFilterPanel';
import { TrackDashboard } from '@/components/track/TrackDashboard';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeConfigModal } from '@/components/practice/PracticeConfigModal';
import { ConceptCreationHub } from '@/components/concept/ConceptCreationHub';
import { GenerationLoadingScreen } from '@/components/practice/GenerationLoadingScreen';
import { Plus, ArrowLeft, Play, Sliders, Search, Grid, List, ChevronDown, Edit3, Folder, ChevronRight, Check } from 'lucide-react';
import { ConceptEditorModal } from '@/components/concept/ConceptEditorModal';

interface Curriculum {
  id: string;
  name: string;
  description: string;
  conceptCount: number;
  lastAccessed: Date;
  color: string;
  category: string;
  progress: number;
}

interface ConceptPracticePageLoftProps {
  onBackToCurriculums?: () => void;
  curriculum?: Curriculum;
  onUpdateCurriculum?: (curriculum: Curriculum) => void;
  curriculumName?: string;
  curriculumId?: string;
}

const ConceptPracticePageLoftContent: React.FC<Omit<ConceptPracticePageLoftProps, 'curriculumId'>> = ({ 
  onBackToCurriculums,
  curriculum,
  onUpdateCurriculum,
  curriculumName = "UKMLA Cardiology"
}) => {
  const { 
    isLoading,
    loadConcepts, 
    filteredConcepts, 
    isPracticing, 
    practiceQuestions,
    startPractice,
    endPractice,
    activeView,
    setActiveView,
    filterState
  } = useConceptStore();
  
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [showCreationHub, setShowCreationHub] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedView, setSelectedView] = useState<'concepts' | 'progress'>('concepts');
  const [conceptViewMode, setConceptViewMode] = useState<'grid' | 'list' | 'folder'>('grid');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'mastery' | 'recent'>('title');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [editingConcept, setEditingConcept] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showSortMenu && !target.closest('.sort-menu-container')) {
        setShowSortMenu(false);
      }
      if (showCategoryMenu && !target.closest('.category-menu-container')) {
        setShowCategoryMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu, showCategoryMenu]);

  // Get filter categories from localStorage
  const curriculumId = curriculum?.id || curriculumName;
  const filterCategories = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(`${curriculumId}_filter_categories`) || '[]');
    } catch {
      return [];
    }
  }, [curriculumId]);

  // Filter and sort concepts
  const getDisplayedConcepts = () => {
    let concepts = [...filteredConcepts];

    // Apply category filter
    if (selectedCategory !== 'all') {
      const filterAssignments = JSON.parse(localStorage.getItem(`${curriculumId}_filter_assignments`) || '{}');
      concepts = concepts.filter(concept => {
        const conceptFilters = concept.custom_filters || [];
        return conceptFilters.some(filter => filterAssignments[filter] === selectedCategory);
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      concepts = concepts.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.content.toLowerCase().includes(query) ||
        (c.custom_filters && c.custom_filters.some(f => f.toLowerCase().includes(query)))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'title':
        concepts.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'mastery':
        concepts.sort((a, b) => {
          const masteryA = a.mastery_data?.mastery_level || 0;
          const masteryB = b.mastery_data?.mastery_level || 0;
          return masteryB - masteryA;
        });
        break;
      case 'recent':
        // Sort by most recently added (using concept_id as proxy for creation time)
        concepts.sort((a, b) => b.concept_id.localeCompare(a.concept_id));
        break;
    }

    return concepts;
  };

  const displayedConcepts = getDisplayedConcepts();

  // Override parent background
  useEffect(() => {
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

  useEffect(() => {
    loadConcepts();
  }, [loadConcepts]);

  const handlePracticeComplete = () => {
    endPractice();
  };

  const handleStartPracticeClick = (config?: any) => {
    if (config) {
      startPractice(config);
    }
    setShowPracticeConfig(false);
  };

  // Show generation loading screen
  if (isLoading && isPracticing) {
    return <GenerationLoadingScreen />;
  }

  // Show practice session
  if (isPracticing && practiceQuestions && practiceQuestions.length > 0) {
    return (
      <ApplePracticeSession
        questions={practiceQuestions}
        onComplete={handlePracticeComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] relative -mb-16">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")' }}></div>

      {/* Header */}
      <div className="relative px-8 pt-12 pb-8 border-b border-black/[0.04]" style={{ overflow: 'visible' }}>
        <div className="max-w-6xl mx-auto" style={{ overflow: 'visible' }}>
          {/* Breadcrumb */}
          {onBackToCurriculums && (
            <button
              onClick={onBackToCurriculums}
              className="mb-8 text-[11px] uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors inline-flex items-center gap-2"
              style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Curriculums
            </button>
          )}

          {/* Title Section */}
          <div className="mb-8">
            <div className="h-[1px] w-24 bg-stone-300 mb-6"></div>
            <h1 className="text-5xl font-medium text-stone-900 mb-4 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              {curriculum?.name || curriculumName}
            </h1>
            <p className="text-lg text-stone-600 font-light max-w-2xl" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
              {curriculum?.description || 'Master concepts through evidence-based practice'}
            </p>
          </div>

          {/* Tab Bar - Row 1 */}
          <div className="flex items-center justify-between pb-6 border-b border-black/[0.04]">
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-xl rounded-full p-1 border border-black/[0.06]">
              <button
                onClick={() => setSelectedView('concepts')}
                className={`px-6 py-2 rounded-full text-[11px] uppercase tracking-widest transition-all duration-300 ${
                  selectedView === 'concepts'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                Concepts
              </button>
              <button
                onClick={() => setSelectedView('progress')}
                className={`px-6 py-2 rounded-full text-[11px] uppercase tracking-widest transition-all duration-300 ${
                  selectedView === 'progress'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                Progress
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFiltersPanel(true)}
                className="px-6 py-3 bg-white/60 backdrop-blur-xl border border-black/[0.08] rounded-full text-[11px] uppercase tracking-widest text-stone-900 hover:border-black/[0.16] transition-all duration-700 flex items-center gap-2"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                <Sliders className="h-4 w-4" />
                Filters
              </button>
              {displayedConcepts.length > 0 && (
                <button
                  onClick={() => setShowPracticeConfig(true)}
                  className="px-8 py-3 bg-stone-900 text-white rounded-full text-[11px] uppercase tracking-widest hover:bg-stone-800 transition-all duration-700 flex items-center gap-3"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  <Play className="h-4 w-4" />
                  Start Practice
                </button>
              )}
            </div>
          </div>

          {/* Controls Bar - Row 2 */}
          {selectedView === 'concepts' && (
            <div className="pt-6 flex items-center justify-between gap-4" style={{ overflow: 'visible' }}>
              <div className="flex items-center gap-4 flex-1" style={{ overflow: 'visible' }}>
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search concepts..."
                    className="w-full pl-11 pr-4 py-2 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-full focus:border-black/[0.12] focus:outline-none transition-all text-sm text-stone-900 placeholder:text-stone-400"
                    style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-white/60 backdrop-blur-xl rounded-full p-1 border border-black/[0.06]">
                  <button
                    onClick={() => setConceptViewMode('folder')}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      conceptViewMode === 'folder'
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    title="Folder view"
                  >
                    <Folder className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConceptViewMode('grid')}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      conceptViewMode === 'grid'
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    title="Grid view"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConceptViewMode('list')}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      conceptViewMode === 'list'
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                {/* Category Filter */}
                {filterCategories.length > 0 && (
                  <div className="relative category-menu-container">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Category menu clicked, current state:', showCategoryMenu);
                        setShowCategoryMenu(!showCategoryMenu);
                      }}
                      className="px-4 py-2 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-full text-[11px] uppercase tracking-widest text-stone-900 hover:text-stone-700 transition-all flex items-center gap-2 cursor-pointer"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      {selectedCategory === 'all' 
                        ? 'All Categories' 
                        : filterCategories.find((c: any) => c.id === selectedCategory)?.name || 'Category'
                      }
                      <ChevronDown className={`h-3 w-3 transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showCategoryMenu && (
                      <div 
                        className="absolute top-full mt-2 left-0 bg-white/90 backdrop-blur-2xl border border-black/[0.08] rounded-2xl shadow-xl overflow-hidden min-w-[200px]"
                        style={{ zIndex: 9999 }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategory('all');
                            setShowCategoryMenu(false);
                          }}
                          className={`w-full px-6 py-3 text-left text-[11px] uppercase tracking-widest transition-colors flex items-center justify-between ${
                            selectedCategory === 'all' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                          }`}
                          style={{ fontFamily: "'Unbounded', sans-serif" }}
                        >
                          All Categories
                          {selectedCategory === 'all' && <Check className="h-3 w-3" />}
                        </button>
                        {filterCategories.map((category: any) => (
                          <button
                            key={category.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory(category.id);
                              setShowCategoryMenu(false);
                            }}
                            className={`w-full px-6 py-3 text-left text-[11px] uppercase tracking-widest transition-colors flex items-center justify-between ${
                              selectedCategory === category.id ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                            }`}
                            style={{ fontFamily: "'Unbounded', sans-serif" }}
                          >
                            {category.name}
                            {selectedCategory === category.id && <Check className="h-3 w-3" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sort Menu */}
                <div className="relative sort-menu-container">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Sort menu clicked, current state:', showSortMenu);
                      setShowSortMenu(!showSortMenu);
                    }}
                    className="px-4 py-2 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-full text-[11px] uppercase tracking-widest text-stone-900 hover:text-stone-700 transition-all flex items-center gap-2 cursor-pointer"
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                  >
                    {sortBy === 'title' ? 'A-Z' : sortBy === 'mastery' ? 'Mastery' : 'Recent'}
                    <ChevronDown className={`h-3 w-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showSortMenu && (
                    <div 
                      className="absolute top-full mt-2 left-0 bg-white/90 backdrop-blur-2xl border border-black/[0.08] rounded-2xl shadow-xl overflow-hidden min-w-[200px]"
                      style={{ zIndex: 9999 }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Sort changed to: title');
                          setSortBy('title');
                          setShowSortMenu(false);
                        }}
                        className={`w-full px-6 py-3 text-left text-[11px] uppercase tracking-widest transition-colors ${
                          sortBy === 'title' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                        }`}
                        style={{ fontFamily: "'Unbounded', sans-serif" }}
                      >
                        A-Z (Title)
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Sort changed to: mastery');
                          setSortBy('mastery');
                          setShowSortMenu(false);
                        }}
                        className={`w-full px-6 py-3 text-left text-[11px] uppercase tracking-widest transition-colors ${
                          sortBy === 'mastery' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                        }`}
                        style={{ fontFamily: "'Unbounded', sans-serif" }}
                      >
                        Mastery Level
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Sort changed to: recent');
                          setSortBy('recent');
                          setShowSortMenu(false);
                        }}
                        className={`w-full px-6 py-3 text-left text-[11px] uppercase tracking-widest transition-colors ${
                          sortBy === 'recent' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                        }`}
                        style={{ fontFamily: "'Unbounded', sans-serif" }}
                      >
                        Recently Added
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Concept Count & Add Button */}
              <div className="flex items-center gap-4">
                <div className="text-[11px] uppercase tracking-widest text-stone-500" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                  {displayedConcepts.length} Concepts
                </div>
                <button
                  onClick={() => setShowCreationHub(true)}
                  className="p-2 bg-white/60 backdrop-blur-xl border border-black/[0.08] rounded-full text-stone-900 hover:border-black/[0.16] hover:bg-white/80 transition-all duration-300"
                  title="Add Concept"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {selectedView === 'concepts' && filterState && Object.keys(filterState).some(key => {
        const value = filterState[key as keyof typeof filterState];
        if (key === 'custom_filters') return Array.isArray(value) && value.length > 0;
        if (key === 'search_query') return typeof value === 'string' && value.length > 0;
        if (key === 'mastery_levels') return Array.isArray(value) && value.length > 0;
        return false;
      }) && (
        <div className="relative px-8 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest text-stone-500" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                Active:
              </span>
              {filterState.custom_filters && filterState.custom_filters.map((filter: string) => (
                <span
                  key={filter}
                  className="px-3 py-1 bg-stone-900 text-white rounded-full text-[10px] uppercase tracking-wider"
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  {filter}
                </span>
              ))}
              {filterState.mastery_levels && filterState.mastery_levels.map((level: number) => (
                <span
                  key={level}
                  className="px-3 py-1 bg-stone-900 text-white rounded-full text-[10px] uppercase tracking-wider"
                  style={{ fontFamily: "'Unbounded', sans-serif" }}
                >
                  Level {level}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="relative px-8 py-12">
        <div className="max-w-6xl mx-auto">
          {selectedView === 'concepts' ? (
            displayedConcepts.length === 0 ? (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-stone-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Plus className="h-12 w-12 text-stone-400" />
                  </div>
                  <h3 className="text-2xl font-medium text-stone-900 mb-4" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                    No concepts yet
                  </h3>
                  <p className="text-stone-600 font-light mb-8" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Add concepts to start building your curriculum
                  </p>
                  <button
                    onClick={() => setShowCreationHub(true)}
                    className="px-8 py-4 bg-stone-900 text-white rounded-full text-[11px] uppercase tracking-widest hover:bg-stone-800 transition-all duration-700"
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                  >
                    Add Concepts
                  </button>
                </div>
              </div>
            ) : conceptViewMode === 'folder' ? (
              /* Folder View */
              <div className="space-y-4">
                {(() => {
                  const folderGroups: Record<string, typeof displayedConcepts> = {};
                  
                  displayedConcepts.forEach(concept => {
                    if (concept.custom_filters && concept.custom_filters.length > 0) {
                      concept.custom_filters.forEach(filter => {
                        if (!folderGroups[filter]) {
                          folderGroups[filter] = [];
                        }
                        folderGroups[filter].push(concept);
                      });
                    } else {
                      if (!folderGroups['Uncategorized']) {
                        folderGroups['Uncategorized'] = [];
                      }
                      folderGroups['Uncategorized'].push(concept);
                    }
                  });

                  return Object.entries(folderGroups).sort(([a], [b]) => a.localeCompare(b)).map(([filterName, concepts]) => {
                    const isExpanded = expandedFolders.has(filterName);
                    const unseenCount = concepts.filter(c => c.mastery_data?.mastery_level === 0).length;
                    const incorrectCount = concepts.filter(c => c.mastery_data?.mastery_level === 1).length;
                    const correctCount = concepts.filter(c => (c.mastery_data?.mastery_level || 0) >= 2).length;
                    const total = concepts.length;
                    const progress = total > 0 ? (correctCount / total) * 100 : 0;

                    return (
                      <div key={filterName} className="bg-white/60 backdrop-blur-xl rounded-2xl border border-black/[0.06] overflow-hidden">
                        {/* Folder Header */}
                        <button
                          className="w-full p-6 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
                          onClick={() => {
                            const newExpanded = new Set(expandedFolders);
                            if (isExpanded) {
                              newExpanded.delete(filterName);
                            } else {
                              newExpanded.add(filterName);
                            }
                            setExpandedFolders(newExpanded);
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <ChevronRight className={`h-4 w-4 text-stone-600 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`} />
                            <Folder className="h-5 w-5 text-stone-600" />
                            <div className="text-left">
                              <h3 className="text-base font-medium text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                                {filterName}
                              </h3>
                              <p className="text-xs text-stone-500 mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                {total} concept{total !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            {/* Progress bar */}
                            <div className="flex items-center gap-3">
                              <div className="w-32 h-2 bg-stone-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-stone-900 transition-all duration-700"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-stone-500 w-12 text-right" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                                {Math.round(progress)}%
                              </span>
                            </div>

                            {/* Status counts */}
                            <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                              <span className="text-stone-400">{unseenCount}</span>
                              <span className="text-red-600">{incorrectCount}</span>
                              <span className="text-green-600">{correctCount}</span>
                            </div>
                          </div>
                        </button>

                        {/* Folder Contents */}
                        {isExpanded && (
                          <div className="border-t border-black/[0.04] p-4">
                            <div className="grid grid-cols-1 gap-3">
                              {concepts.map((concept) => {
                                const masteryLevel = concept.mastery_data?.mastery_level || 0;
                                return (
                                  <button
                                    key={concept.concept_id}
                                    onClick={() => {
                                      setEditingConcept(concept);
                                      setShowEditModal(true);
                                    }}
                                    className="text-left p-4 bg-white/40 hover:bg-white/60 rounded-xl border border-black/[0.04] hover:border-black/[0.08] transition-all group"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <h4 className="text-sm font-medium text-stone-900" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                                          {concept.title}
                                        </h4>
                                        <p className="text-xs text-stone-600 mt-1 line-clamp-1" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                                          {concept.content}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 ml-4">
                                        {[...Array(5)].map((_, i) => (
                                          <div
                                            key={i}
                                            className={`h-1 w-4 rounded-full ${
                                              i < masteryLevel ? 'bg-stone-900' : 'bg-stone-200'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className={`gap-6 ${
                conceptViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                'flex flex-col'
              }`}>
              {displayedConcepts.map((concept) => {
                const masteryLevel = concept.mastery_data?.mastery_level || 0;
                const getMasteryLabel = (level: number) => {
                  const labels = ['Unseen', 'Learning', 'Developing', 'Proficient', 'Mastered'];
                  return labels[level] || 'Unseen';
                };
                
                return (
                  <div
                    key={concept.concept_id}
                    className="group bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-black/[0.06] hover:border-black/[0.12] transition-all duration-700 cursor-pointer hover:-translate-y-1 relative"
                    onClick={() => {
                      setEditingConcept(concept);
                      setShowEditModal(true);
                    }}
                  >
                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingConcept(concept);
                        setShowEditModal(true);
                      }}
                      className="absolute top-4 right-4 p-2 bg-stone-100 hover:bg-stone-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit3 className="h-3 w-3 text-stone-600" />
                    </button>
                    {/* Mastery Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] uppercase tracking-widest text-stone-400" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                        {getMasteryLabel(masteryLevel)}
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 w-6 rounded-full transition-all ${
                              i < masteryLevel ? 'bg-stone-900' : 'bg-stone-200'
                            }`}
                          ></div>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-medium text-stone-900 mb-3 line-clamp-2" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                      {concept.title}
                    </h4>

                    {/* Content Preview */}
                    <p className="text-sm text-stone-600 font-light line-clamp-3 mb-4" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                      {concept.content}
                    </p>

                    {/* Tags */}
                    {concept.custom_filters && concept.custom_filters.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {concept.custom_filters.slice(0, 2).map((filter, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-stone-100 rounded-full text-[10px] uppercase tracking-wider text-stone-600"
                            style={{ fontFamily: "'Unbounded', sans-serif" }}
                          >
                            {filter}
                          </span>
                        ))}
                        {concept.custom_filters.length > 2 && (
                          <span className="px-3 py-1 bg-stone-100 rounded-full text-[10px] uppercase tracking-wider text-stone-400">
                            +{concept.custom_filters.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Practice Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPracticeConfig(true);
                      }}
                      className="w-full px-4 py-3 bg-stone-900 text-white rounded-full text-[11px] uppercase tracking-widest hover:bg-stone-800 transition-all duration-300 opacity-0 group-hover:opacity-100"
                      style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                    >
                      Practice
                    </button>
                  </div>
                );
              })}
              </div>
            )
          ) : (
            <TrackDashboard 
              curriculumId={curriculum?.id || curriculumName}
              onAddConcepts={() => setShowCreationHub(true)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showPracticeConfig && (
        <PracticeConfigModal
          isOpen={showPracticeConfig}
          onClose={() => setShowPracticeConfig(false)}
          onStartPractice={handleStartPracticeClick}
          conceptCount={displayedConcepts.length}
        />
      )}

      {showCreationHub && (
        <ConceptCreationHub
          isOpen={showCreationHub}
          onClose={() => setShowCreationHub(false)}
          onBulkUpload={() => {}}
          onManualAdd={() => {}}
          onKnowledgeBaseImport={() => {}}
        />
      )}

      {/* Edit Concept Modal */}
      {showEditModal && editingConcept && (
        <ConceptEditorModal
          isOpen={showEditModal}
          mode="edit"
          concept={editingConcept}
          onClose={() => {
            setShowEditModal(false);
            setEditingConcept(null);
          }}
          onSave={() => {
            // Handle save - the store will handle the update
            setShowEditModal(false);
            setEditingConcept(null);
          }}
        />
      )}

      {/* Filters Side Panel */}
      {showFiltersPanel && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowFiltersPanel(false)}>
          <div 
            className="w-[480px] h-full bg-white/90 backdrop-blur-2xl border-l border-black/[0.08] shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-12">
              <div className="mb-8">
                <div className="h-[1px] w-16 bg-stone-300 mb-6"></div>
                <h2 className="text-3xl font-medium text-stone-900 mb-4" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                  Filters
                </h2>
                <p className="text-sm text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Refine your concept selection
                </p>
              </div>

              <ConceptFilterPanel 
                activeView={activeView} 
                onViewChange={(view: string) => setActiveView(view as 'simple' | 'grid' | 'mastery')}
                onStartPractice={() => {
                  setShowFiltersPanel(false);
                  setShowPracticeConfig(true);
                }}
                selectedCategory={'all'}
              />

              <button
                onClick={() => setShowFiltersPanel(false)}
                className="mt-8 w-full px-6 py-4 border border-black/[0.08] rounded-full text-[11px] uppercase tracking-widest text-stone-600 hover:bg-stone-50 transition-colors"
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrapper with provider
export const ConceptPracticePageLoft: React.FC<ConceptPracticePageLoftProps> = ({
  curriculumId,
  ...props
}) => {
  const id = curriculumId || props.curriculum?.id || 'default';
  
  return (
    <ConceptStoreProvider curriculumId={id}>
      <ConceptPracticePageLoftContent {...props} />
    </ConceptStoreProvider>
  );
};

export default ConceptPracticePageLoft;
