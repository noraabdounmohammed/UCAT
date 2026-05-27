import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useConceptStore, ConceptStoreProvider } from '@/contexts/ConceptStoreContext';
import { ConceptFilterPanel } from '@/components/concept/ConceptFilterPanel';
import { TrackDashboard } from '@/components/track/TrackDashboard.loft';
import { GenerationLoadingScreen } from '@/components/practice/GenerationLoadingScreen';
import { Plus, Sliders, Search, Grid, List, ChevronDown, Folder, ChevronRight, Check, X, Brain } from 'lucide-react';
import { CurriculumDashboard } from '@/components/curriculum/CurriculumDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { useUserRole } from '@/hooks/useUserRole';

// Lazy load heavy components (practice session uses markdown = 295KB)
const ApplePracticeSession = lazy(() => import('@/components/practice/ApplePracticeSession').then(m => ({ default: m.ApplePracticeSession })));
const PracticeConfigModal = lazy(() => import('@/components/practice/PracticeConfigModal').then(m => ({ default: m.PracticeConfigModal })));
const SessionOpeningFrame = lazy(() => import('@/components/practice/SessionOpeningFrame').then(m => ({ default: m.SessionOpeningFrame })));
const ConceptCreationHub = lazy(() => import('@/components/concept/ConceptCreationHub').then(m => ({ default: m.ConceptCreationHub })));
const ConceptEditorModal = lazy(() => import('@/components/concept/ConceptEditorModal').then(m => ({ default: m.ConceptEditorModal })));
const ConceptManualAddModal = lazy(() => import('@/components/concept/ConceptManualAddModal.new').then(m => ({ default: m.ConceptManualAddModal })));

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
  initialView?: 'dashboard' | 'progress' | 'concepts';
}

const ConceptPracticePageLoftContent: React.FC<Omit<ConceptPracticePageLoftProps, 'curriculumId'>> = ({ 
  onBackToCurriculums,
  curriculum,
  curriculumName = "UKMLA AKT",
  initialView = 'dashboard'
}) => {
  const { user } = useAuth();
  const { isCreator } = useUserRole();
  const { 
    isLoading,
    loadConcepts,
    concepts,
    filteredConcepts, 
    isPracticing, 
    practiceQuestions,
    startPractice,
    endPractice,
    activeView,
    setActiveView,
    filterState,
    updateFilterState,
    updateMastery,
    generatingQuestionCount,
    setPracticeSelection,
    practiceSelection,
    practiceError,
    filterCategories: storeFilterCategories,
    curriculumId: storeCurriculumId,
    filterOptions
  } = useConceptStore() as any;
  
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [showSessionFrame, setShowSessionFrame] = useState(false);
  const [showCreationHub, setShowCreationHub] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [userDismissedLoading, setUserDismissedLoading] = useState(false);
  type ViewType = 'dashboard' | 'progress' | 'concepts';
  const [selectedView, setSelectedView] = useState<ViewType>(initialView);
  // Helper to avoid TypeScript type narrowing issues in conditional blocks
  const currentView: ViewType = selectedView;
  
  // Scroll to top when view changes
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated before scrolling
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
  }, [selectedView]);
  const [preselectedFormat, setPreselectedFormat] = useState<string | undefined>(undefined);
  const [preselectedFilter, setPreselectedFilter] = useState<string | undefined>(undefined);
  const [conceptViewMode, setConceptViewMode] = useState<'grid' | 'list' | 'folder'>('grid');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'mastery' | 'recent'>('title');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [editingConcept, setEditingConcept] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingPracticeConfig, setPendingPracticeConfig] = useState<any>(null);
  const [pendingFilteredConcepts, setPendingFilteredConcepts] = useState<any[]>([]);
  const [activeSessionFilter, setActiveSessionFilter] = useState<string | null>(null);
  // Track current practice format for switching during session
  const [currentFormat, setCurrentFormat] = useState<string>('ukmla_sba');
  // Show a loading screen immediately on mount so the dashboard never flashes
  const [pendingAutoStart, setPendingAutoStart] = useState(true);

  // Redirect consumers away from concepts view
  useEffect(() => {
    if (!isCreator && selectedView === 'concepts') {
      setSelectedView('dashboard');
    }
  }, [isCreator, selectedView]);

  // Auto-start: launch 5 UKMLA SBAs as soon as concepts are ready, once per mount
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (hasAutoStarted.current) return;
    if (isPracticing) { hasAutoStarted.current = true; setPendingAutoStart(false); return; }
    // Use filteredConcepts if available, fall back to all concepts
    const available = (filteredConcepts && filteredConcepts.length > 0)
      ? filteredConcepts
      : concepts;
    if (available && available.length > 0) {
      hasAutoStarted.current = true;
      startPractice({ target_formats: [currentFormat], question_count: 5 });
      // pendingAutoStart cleared below once isPracticing becomes true
    }
  }, [filteredConcepts, concepts, isPracticing, currentFormat]);

  // Clear the pending screen once the session is live or an error surfaces
  useEffect(() => {
    if (isPracticing || practiceError) {
      setPendingAutoStart(false);
    }
  }, [isPracticing, practiceError]);

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

  // Use store's curriculumId so localStorage keys match
  const curriculumId = storeCurriculumId || curriculum?.id || 'default';
  const filterCategories = React.useMemo(() => {
    // Prefer store state, fall back to localStorage
    if (storeFilterCategories && storeFilterCategories.length > 0) return storeFilterCategories;
    try {
      const fromStorage = JSON.parse(localStorage.getItem(`${curriculumId}_filter_categories`) || '[]');
      if (fromStorage.length > 0) return fromStorage;
      // Also try with the curriculum name as key (legacy)
      const legacyKey = curriculum?.id || curriculumName;
      return JSON.parse(localStorage.getItem(`${legacyKey}_filter_categories`) || '[]');
    } catch {
      return [];
    }
  }, [curriculumId, storeFilterCategories, curriculum?.id, curriculumName]);

  // Filter and sort concepts
  const getDisplayedConcepts = () => {
    let concepts = [...filteredConcepts];

    // Apply category filter
    if (selectedCategory !== 'all') {
      let filterAssignments = JSON.parse(localStorage.getItem(`${curriculumId}_filter_assignments`) || '{}');
      // Fallback: try legacy key if nothing found
      if (Object.keys(filterAssignments).length === 0) {
        const legacyKey = curriculum?.id || curriculumName;
        filterAssignments = JSON.parse(localStorage.getItem(`${legacyKey}_filter_assignments`) || '{}');
      }
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

  // Removed redundant loadConcepts useEffect - concepts are already loaded by ConceptStoreProvider
  // useEffect(() => {
  //   loadConcepts();
  // }, [loadConcepts]);

  const handlePracticeComplete = () => {
    endPractice();
    setUserDismissedLoading(false); // Reset so the loading screen shows again
    hasAutoStarted.current = false; // Allow auto-start to fire again for next session
  };

  // Handle answer submission to track progress
  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    // Extract concept_id from question
    const question = practiceQuestions.find(q => q.id === questionId);
    
    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 handleAnswerSubmit debug:', {
        questionId,
        isCorrect,
        question_found: !!question,
        concept_id: question?.concept_id
      });
    }
    
    if (question && question.concept_id) {
      console.log(`Updating mastery for concept ${question.concept_id}: ${isCorrect ? 'correct' : 'incorrect'}`);
      updateMastery(question.concept_id, isCorrect);
    } else {
      console.error('❌ Could not find concept_id for question:', {
        questionId,
        question,
        all_questions: practiceQuestions.map(q => ({ id: q.id, concept_id: q.concept_id }))
      });
    }
  };

  const handleStartPracticeClick = (config?: any) => {
    // Check if user is signed in before starting practice
    if (!user) {
      // Save the practice config AND the current filtered concepts
      setPendingPracticeConfig(config);
      setPendingFilteredConcepts(displayedConcepts);
      setShowAuthPrompt(true);
      setShowPracticeConfig(false);
      return;
    }
    
    if (config) {
      startPractice(config);
    }
    setShowPracticeConfig(false);
  };

  // Show loading screen while waiting for auto-start or while generating, OR while ready but user hasn't pressed Begin
  if (pendingAutoStart || (isPracticing && !userDismissedLoading)) {
    // Get the actual concepts being used for this session
    const sessionConcepts = practiceSelection && practiceSelection.length > 0
      ? displayedConcepts.filter((c: any) => practiceSelection.includes(c.concept_id))
      : displayedConcepts;

    return (
      <GenerationLoadingScreen 
        conceptCount={generatingQuestionCount}
        isReady={practiceQuestions && practiceQuestions.length > 0}
        concepts={sessionConcepts}
        onComplete={() => {
          // User clicked "Begin" - dismiss loading screen
          setUserDismissedLoading(true);
        }}
      />
    );
  }

  // Show practice session
  if (isPracticing && practiceQuestions && practiceQuestions.length > 0) {
    return (
      <Suspense fallback={<GenerationLoadingScreen conceptCount={practiceQuestions.length} />}>
        <ApplePracticeSession
          questions={practiceQuestions}
          onComplete={handlePracticeComplete}
          onAnswerSubmit={handleAnswerSubmit}
          availableFilters={(filterOptions?.custom_filters as string[] | undefined) ?? []}
          activeFilter={activeSessionFilter}
          onAnotherFive={(filter?: string) => {
            const chosen = filter ?? null;
            setActiveSessionFilter(chosen);
            if (chosen) {
              updateFilterState({ custom_filters: [chosen] });
            } else {
              updateFilterState({ custom_filters: [] });
            }
            startPractice({ target_formats: [currentFormat], question_count: 5 });
          }}
          section="UKMLA AKT"
          currentFormat={currentFormat}
          onChangeFormat={(format: string) => {
            setCurrentFormat(format);
            // Restart practice with new format - preserves current filter if any
            startPractice({ target_formats: [format], question_count: 5 });
          }}
          onRestartWithFilters={() => {
            // Restart practice with current filters from filterState
            startPractice({ target_formats: [currentFormat], question_count: 5 });
          }}
        />
      </Suspense>
    );
  }

  // Show dashboard by default
  if (selectedView === 'dashboard') {
    return (
      <div className="min-h-screen bg-[#FAFAF9] relative -mb-16">
        {/* Practice error banner */}
        {practiceError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-800 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md">
            <span className="text-sm font-medium">{practiceError}</span>
            <button onClick={() => { /* clear by starting fresh */ }} className="text-red-400 hover:text-red-600 ml-2 text-lg leading-none">&times;</button>
          </div>
        )}
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")' }}></div>

        {/* Header */}
        <div className="relative px-8 pt-4 pb-2">
          <div className="max-w-6xl mx-auto">
            {/* Navigation moved to floating bars */}
          </div>
        </div>

        {/* Dashboard Content */}
        <CurriculumDashboard
          curriculum={curriculum}
          onStartPractice={() => setShowSessionFrame(true)}
          onOpenFilters={(format, filter) => {
            setPreselectedFormat(format);
            setPreselectedFilter(filter);
            setShowPracticeConfig(true);
          }}
          onDirectPracticeStart={(config) => {
            startPractice(config);
          }}
          onPreloadModal={() => {
            // Preload the modal chunk on hover so it's instant when clicked
            import('@/components/practice/PracticeConfigModal');
          }}
        />

        {/* Modals - lazy loaded */}
        <Suspense fallback={null}>
        {/* Session Opening Frame - StudyEdit style */}
        {showSessionFrame && (
          <SessionOpeningFrame
            concepts={displayedConcepts}
            onBegin={() => {
              // Start practice with smart study mode
              setShowSessionFrame(false);
              startPractice({ study_mode: 'smart' });
            }}
            onCustomize={() => {
              // Show config modal for customization
              setShowSessionFrame(false);
              setShowPracticeConfig(true);
            }}
          />
        )}

        {showPracticeConfig && (
          <PracticeConfigModal
            isOpen={showPracticeConfig}
            onClose={() => {
              setShowPracticeConfig(false);
              setPreselectedFormat(undefined);
              setPreselectedFilter(undefined);
            }}
            onStartPractice={(config) => {
              console.log('🚀 onStartPractice called with config:', config);
              console.log('🚀 filteredConcepts count:', filteredConcepts.length, 'displayedConcepts:', displayedConcepts.length, 'practiceSelection:', practiceSelection);
              startPractice(config);
              setShowPracticeConfig(false);
              setPreselectedFormat(undefined);
              setPreselectedFilter(undefined);
            }}
            conceptCount={filteredConcepts.length}
            preselectedFormat={preselectedFormat}
            preselectedFilter={preselectedFilter}
            initialConceptIds={displayedConcepts.map((c: any) => c.concept_id)}
          />
        )}

        {showCreationHub && (
          <ConceptCreationHub
            isOpen={showCreationHub}
            onClose={() => setShowCreationHub(false)}
            onManualAdd={() => setShowManualAdd(true)}
            onKnowledgeBaseImport={() => {}}
          />
        )}

        {/* Modals triggered from Creation Hub while on dashboard */}
        <ConceptManualAddModal
          isOpen={showManualAdd}
          onClose={() => setShowManualAdd(false)}
          onBack={() => {
            setShowManualAdd(false);
            setShowCreationHub(true);
          }}
        />
        </Suspense>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
          <div className="bg-white/90 backdrop-blur-2xl border-t border-black/[0.06]">
            <div className="flex items-center justify-around px-3 py-1.5">
              {/* Curriculum Hub */}
              {onBackToCurriculums && (
                <button
                  onClick={onBackToCurriculums}
                  className="p-2 rounded-full transition-all duration-200 text-stone-600 hover:bg-stone-100 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </button>
              )}

              {/* Practice */}
              <button
                onClick={() => setSelectedView('dashboard')}
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-95 ${
                  currentView === 'dashboard' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <button
                onClick={() => setSelectedView('progress')}
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-95 ${
                  currentView === 'progress' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              {isCreator && (
                <button
                  onClick={() => setSelectedView('concepts')}
                  className={`p-2.5 rounded-full transition-all duration-200 active:scale-95 ${
                    currentView === 'concepts' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </button>
              )}
              
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Navigation */}
        <div className="hidden md:block fixed left-4 lg:left-6 top-1/2 transform -translate-y-1/2 z-50">
          <div className="bg-white/30 backdrop-blur-2xl rounded-3xl p-3 border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] backdrop-saturate-150">
            <div className="flex flex-col items-center gap-2">
              {/* Curriculum Hub */}
              {onBackToCurriculums && (
                <>
                  <button
                    onClick={onBackToCurriculums}
                    className="group relative p-4 rounded-2xl transition-all duration-300 text-stone-600 hover:bg-white/40 hover:backdrop-blur-sm"
                    title="Curriculum Hub"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </button>
                  <div className="w-8 h-[1px] bg-stone-300/30"></div>
                </>
              )}

              {/* Dashboard */}
              <button
                onClick={() => setSelectedView('dashboard')}
                className={`group relative p-4 rounded-2xl transition-all duration-300 ${
                  currentView === 'dashboard' ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-600 hover:bg-white/40 hover:backdrop-blur-sm'
                }`}
                title="Practice Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <div className="w-8 h-[1px] bg-stone-300/30"></div>
              <button
                onClick={() => setSelectedView('progress')}
                className={`group relative p-4 rounded-2xl transition-all duration-300 ${
                  currentView === 'progress' ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-600 hover:bg-white/40 hover:backdrop-blur-sm'
                }`}
                title="Progress"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              {isCreator && (
                <>
                  <div className="w-8 h-[1px] bg-stone-300/30"></div>
                  <button
                    onClick={() => setSelectedView('concepts')}
                    className={`group relative p-4 rounded-2xl transition-all duration-300 ${
                      currentView === 'concepts' ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-600 hover:bg-white/40 hover:backdrop-blur-sm'
                    }`}
                    title="Concepts"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </button>
                </>
              )}
              
            </div>
          </div>
        </div>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] relative -mb-16">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="100" height="100" filter="url(%23noise)" /%3E%3C/svg%3E")' }}></div>

      {/* Header */}
      <div className="relative px-4 sm:px-6 md:px-8 pt-4 sm:pt-8 md:pt-12 pb-4 sm:pb-6 md:pb-8" style={{ overflow: 'visible' }}>
        <div className="max-w-6xl mx-auto" style={{ overflow: 'visible' }}>
          {/* Navigation moved to floating bars */}
          
          {/* Title Section - Dynamic based on view - Hidden on Progress page */}
          {selectedView !== 'progress' && (
            <div className="mb-4 md:mb-0">
              <div className="h-[1px] w-16 md:w-24 bg-stone-300 mb-4 md:mb-6"></div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-stone-900 mb-2 sm:mb-3 md:mb-4 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                {currentView === 'dashboard' ? (
                  (() => {
                    const hour = new Date().getHours();
                    let greeting = '';
                    if (hour < 12) greeting = 'Good morning';
                    else if (hour < 18) greeting = 'Good afternoon';
                    else greeting = 'Good evening';
                    
                    // Get user's first name from metadata or email
                    let userName = '';
                    if (user) {
                      // Try to get first_name from user metadata (set during sign-up)
                      if (user.user_metadata?.first_name) {
                        userName = user.user_metadata.first_name;
                      } else if (user.user_metadata?.name) {
                        userName = user.user_metadata.name.split(' ')[0];
                      } else if (user.email) {
                        // Extract first part of email before @ 
                        // If it contains dots, take first part; if too long, truncate
                        const emailPart = user.email.split('@')[0];
                        const namePart = emailPart.includes('.') ? emailPart.split('.')[0] : emailPart;
                        // Capitalize and limit to reasonable length
                        userName = namePart.charAt(0).toUpperCase() + namePart.slice(1, 15);
                      }
                    }
                    
                    return userName ? `${greeting}, ${userName}` : greeting;
                  })()
                ) : (
                  'Concept Library'
                )}
              </h1>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-stone-600 font-light max-w-2xl md:mb-0" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                {currentView === 'dashboard' ? (
                  <>Ready to continue your journey with <span className="font-medium text-stone-900">{curriculum?.name || curriculumName}</span></>
                ) : (
                  <>Master concepts through evidence-based practice in <span className="font-medium text-stone-900">{curriculum?.name || curriculumName}</span></>
                )}
              </p>
            </div>
          )}

          {/* Removed tabs - now using floating bottom bar */}

          {/* Action Buttons Row with Active Filters - Show on Concepts and Progress views */}
          {(selectedView === 'concepts' || selectedView === 'progress') && (
          <div className="flex items-center justify-start gap-3 md:gap-4 pb-4 md:pb-6 flex-wrap border-b border-black/[0.04]">
            {/* Combined Filters Button with Concept Count Badge */}
            <button
              onClick={() => {
                setShowFiltersPanel(true);
              }}
              className="pl-4 md:pl-5 pr-2 py-2 bg-white/60 backdrop-blur-xl border border-black/[0.08] rounded-full text-[11px] uppercase tracking-widest text-stone-900 hover:border-black/[0.16] hover:bg-white/80 transition-all duration-300 flex items-center justify-center gap-2.5 group"
              style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
            >
              <Sliders className="h-4 w-4 text-stone-600 group-hover:text-stone-900 transition-colors" />
              <span>Filters</span>
              <div className="ml-1 px-2.5 py-1.5 bg-stone-900 rounded-full text-white text-[10px] font-bold group-hover:bg-stone-800 transition-colors">
                {displayedConcepts.length}
              </div>
            </button>
            
            {/* Active Filters */}
            {filterState && (filterState.custom_filters?.length > 0 || filterState.mastery_levels?.length > 0) && (
              <>
                {filterState.custom_filters && filterState.custom_filters.map((filter: string) => (
                  <button
                    key={filter}
                    onClick={() => {
                      const newFilters = filterState.custom_filters.filter((f: string) => f !== filter);
                      updateFilterState({ custom_filters: newFilters });
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-stone-900 text-white rounded-full text-[10px] uppercase tracking-wider hover:bg-stone-800 transition-colors group"
                    style={{ fontFamily: "'Unbounded', sans-serif" }}
                  >
                    <span>{filter}</span>
                    <X className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                {filterState.mastery_levels && filterState.mastery_levels.map((level: number) => {
                  const getLevelLabel = (lvl: number) => {
                    if (lvl === 0) return 'Unseen';
                    if (lvl === 1) return 'Incorrect';
                    return 'Correct'; // Levels 2-4 are all correct
                  };
                  
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        const newLevels = filterState.mastery_levels.filter((l: number) => l !== level);
                        updateFilterState({ mastery_levels: newLevels });
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-stone-900 text-white rounded-full text-[10px] uppercase tracking-wider hover:bg-stone-800 transition-colors group"
                      style={{ fontFamily: "'Unbounded', sans-serif" }}
                    >
                      <span>{getLevelLabel(level)}</span>
                      <X className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </>
            )}
          </div>
          )}

          {/* Controls Bar - Row 2 */}
          {selectedView === 'concepts' && (
            <div className="pt-4 md:pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4" style={{ overflow: 'visible' }}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-1" style={{ overflow: 'visible' }}>
                {/* Search Bar */}
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search concepts..."
                    className="w-full pl-11 pr-4 py-2.5 md:py-2 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-full focus:border-black/[0.12] focus:outline-none transition-all text-sm text-stone-900 placeholder:text-stone-400"
                    style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                  />
                </div>

                {/* View Mode Toggle - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-1 bg-white/60 backdrop-blur-xl rounded-full p-1 border border-black/[0.06] w-full sm:w-auto justify-center">
                  <button
                    onClick={() => setConceptViewMode('folder')}
                    className={`flex-1 sm:flex-none p-2.5 sm:p-2 rounded-full transition-all duration-300 ${
                      conceptViewMode === 'folder'
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    title="Folder view"
                  >
                    <Folder className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setConceptViewMode('grid')}
                    className={`flex-1 sm:flex-none p-2.5 sm:p-2 rounded-full transition-all duration-300 ${
                      conceptViewMode === 'grid'
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    title="Grid view"
                  >
                    <Grid className="h-4 w-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setConceptViewMode('list')}
                    className={`flex-1 sm:flex-none p-2.5 sm:p-2 rounded-full transition-all duration-300 ${
                      conceptViewMode === 'list'
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                    title="List view"
                  >
                    <List className="h-4 w-4 mx-auto" />
                  </button>
                </div>

                {/* Category Filter - Hidden on mobile */}
                {filterCategories.length > 0 && (
                  <div className="hidden md:block relative category-menu-container w-full sm:w-auto" style={{ zIndex: 50 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Category menu clicked, current state:', showCategoryMenu);
                        setShowCategoryMenu(!showCategoryMenu);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 md:py-2 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-full text-[11px] uppercase tracking-widest text-stone-900 hover:text-stone-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                        className="absolute top-full mt-2 left-0 sm:left-0 sm:right-auto bg-white border-2 border-stone-300 rounded-2xl shadow-2xl overflow-hidden min-w-[200px] max-w-[300px]"
                        style={{ zIndex: 100 }}
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

                {/* Sort Menu - Hidden on mobile */}
                <div className="hidden md:block relative sort-menu-container w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Sort menu clicked, current state:', showSortMenu);
                      setShowSortMenu(!showSortMenu);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 md:py-2 bg-white/60 backdrop-blur-xl border border-black/[0.06] rounded-full text-[11px] uppercase tracking-widest text-stone-900 hover:text-stone-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                  >
                    {sortBy === 'title' ? 'A-Z' : sortBy === 'mastery' ? 'Mastery' : 'Recent'}
                    <ChevronDown className={`h-3 w-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showSortMenu && (
                    <div 
                      className="absolute top-full mt-2 left-0 right-0 sm:left-0 sm:right-auto bg-white/90 backdrop-blur-2xl border border-black/[0.08] rounded-2xl shadow-xl overflow-hidden sm:min-w-[200px]"
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

              {/* Right Side - Add Button - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-4">
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

      {/* Content Area */}
      <div className="relative px-4 md:px-8 py-6 md:py-12 pb-32 md:pb-12">
        <div className="max-w-6xl mx-auto">
          {selectedView === 'concepts' ? (
            displayedConcepts.length === 0 ? (
              <div className="text-center py-12 md:py-20 px-4">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-stone-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Plus className="h-10 w-10 md:h-12 md:w-12 text-stone-400" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-medium text-stone-900 mb-3 md:mb-4" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                    No concepts yet
                  </h3>
                  <p className="text-sm md:text-base text-stone-600 font-light mb-6 md:mb-8" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Add concepts to start building your curriculum
                  </p>
                  <button
                    onClick={() => setShowCreationHub(true)}
                    className="px-6 md:px-8 py-3 md:py-4 bg-stone-900 text-white rounded-full text-[11px] uppercase tracking-widest hover:bg-stone-800 transition-all duration-700"
                    style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                  >
                    Add Concepts
                  </button>
                </div>
              </div>
            ) : conceptViewMode === 'folder' ? (
              /* Folder View - Nested: Categories > Filters > Concepts */
              <div className="space-y-4">
                {(() => {
                  // Get filter categories and assignments
                  const storedCategories = JSON.parse(localStorage.getItem(`${curriculumId}_filter_categories`) || '[]');
                  const filterAssignments = JSON.parse(localStorage.getItem(`${curriculumId}_filter_assignments`) || '{}');
                  
                  // Group filters by category, then concepts by filter
                  const categoryToFilters: Record<string, Record<string, typeof displayedConcepts>> = {};
                  
                  displayedConcepts.forEach(concept => {
                    if (concept.custom_filters && concept.custom_filters.length > 0) {
                      concept.custom_filters.forEach(filter => {
                        const category = filterAssignments[filter] || 'Uncategorized';
                        
                        // Initialize category if needed
                        if (!categoryToFilters[category]) {
                          categoryToFilters[category] = {};
                        }
                        
                        // Initialize filter folder if needed
                        if (!categoryToFilters[category][filter]) {
                          categoryToFilters[category][filter] = [];
                        }
                        
                        // Add concept to filter folder (avoid duplicates)
                        if (!categoryToFilters[category][filter].find(c => c.concept_id === concept.concept_id)) {
                          categoryToFilters[category][filter].push(concept);
                        }
                      });
                    } else {
                      // No filters at all
                      if (!categoryToFilters['Uncategorized']) {
                        categoryToFilters['Uncategorized'] = {};
                      }
                      if (!categoryToFilters['Uncategorized']['No Filter']) {
                        categoryToFilters['Uncategorized']['No Filter'] = [];
                      }
                      if (!categoryToFilters['Uncategorized']['No Filter'].find(c => c.concept_id === concept.concept_id)) {
                        categoryToFilters['Uncategorized']['No Filter'].push(concept);
                      }
                    }
                  });

                  // Sort categories based on their order in storedCategories (case-insensitive)
                  const categoryOrder = storedCategories.map((cat: any) => (cat.name || cat.id).toLowerCase());
                  console.log('📁 Category order from localStorage:', categoryOrder);
                  console.log('📁 Categories to display:', Object.keys(categoryToFilters));
                  
                  const sortedCategories = Object.entries(categoryToFilters).sort(([a], [b]) => {
                    const indexA = categoryOrder.indexOf(a.toLowerCase());
                    const indexB = categoryOrder.indexOf(b.toLowerCase());
                    // If both are in the order list, sort by their position
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    // If only A is in the list, it comes first
                    if (indexA !== -1) return -1;
                    // If only B is in the list, it comes first
                    if (indexB !== -1) return 1;
                    // If neither is in the list, sort alphabetically
                    return a.localeCompare(b);
                  });

                  // Render categories as parent folders
                  return sortedCategories.map(([categoryName, filterFolders]) => {
                    const categoryKey = `category_${categoryName}`;
                    const isCategoryExpanded = expandedFolders.has(categoryKey);
                    const totalFilters = Object.keys(filterFolders).length;
                    const totalConcepts = Object.values(filterFolders).reduce((sum, concepts) => sum + concepts.length, 0);

                    return (
                      <div key={categoryName} className="bg-white/40 backdrop-blur-xl rounded-2xl border border-black/[0.06] overflow-hidden">
                        {/* Category Folder Header */}
                        <button
                          className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-black/[0.02] active:bg-black/[0.04] transition-colors"
                          onClick={() => {
                            const newExpanded = new Set(expandedFolders);
                            if (isCategoryExpanded) {
                              newExpanded.delete(categoryKey);
                            } else {
                              newExpanded.add(categoryKey);
                            }
                            setExpandedFolders(newExpanded);
                          }}
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            <ChevronRight className={`h-4 w-4 flex-shrink-0 text-stone-600 transition-transform ${
                              isCategoryExpanded ? 'rotate-90' : ''
                            }`} />
                            <Folder className="h-5 w-5 flex-shrink-0 text-stone-700" />
                            <div className="text-left min-w-0 flex-1">
                              <h3 className="text-sm md:text-base font-medium text-stone-900 truncate" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                                {categoryName}
                              </h3>
                              <p className="text-xs text-stone-500 mt-0.5 md:mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                {totalFilters} folder{totalFilters !== 1 ? 's' : ''} · {totalConcepts} concept{totalConcepts !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Filter Folders (nested inside category) */}
                        {isCategoryExpanded && (
                          <div className="border-t border-black/[0.04] p-3 md:p-4 space-y-2 md:space-y-3 bg-stone-50/50">
                            {Object.entries(filterFolders).sort(([a], [b]) => a.localeCompare(b)).map(([filterName, concepts]) => {
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
                                className="w-full p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 hover:bg-black/[0.02] active:bg-black/[0.04] transition-colors"
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
                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                  <ChevronRight className={`h-4 w-4 flex-shrink-0 text-stone-600 transition-transform ${
                                    isExpanded ? 'rotate-90' : ''
                                  }`} />
                                  <Folder className="h-5 w-5 flex-shrink-0 text-stone-600" />
                                  <div className="text-left min-w-0 flex-1">
                                    <h3 className="text-sm md:text-base font-medium text-stone-900 truncate" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                                      {filterName}
                                    </h3>
                              <p className="text-xs text-stone-500 mt-0.5 md:mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                {total} concept{total !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 pl-11 md:pl-0">
                            {/* Progress bar */}
                            <div className="flex items-center gap-2 md:gap-3 flex-1 md:flex-none">
                              <div className="flex-1 md:w-32 h-2 bg-stone-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-stone-900 transition-all duration-700"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-stone-500 w-10 md:w-12 text-right" style={{ fontFamily: "'Unbounded', sans-serif" }}>
                                {Math.round(progress)}%
                              </span>
                            </div>

                            {/* Status counts */}
                            <div className="flex items-center gap-2 md:gap-3 text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Unbounded', sans-serif" }}>
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
                  })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className={`${
                conceptViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' :
                'flex flex-col gap-0'
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
                    className={`group bg-white/60 backdrop-blur-xl border border-black/[0.06] hover:bg-stone-100 hover:border-stone-300 cursor-pointer relative ${
                      conceptViewMode === 'list' 
                        ? 'rounded-xl p-3' 
                        : 'rounded-2xl p-4 md:p-6'
                    }`}
                    onClick={() => {
                      setEditingConcept(concept);
                      setShowEditModal(true);
                    }}
                  >
                    {conceptViewMode === 'list' ? (
                      /* Compact List View */
                      <div className="flex items-center gap-3">
                        {/* Mastery Indicator */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1 w-4 rounded-full ${
                                i < masteryLevel ? 'bg-stone-900' : 'bg-stone-200'
                              }`}
                            ></div>
                          ))}
                        </div>
                        
                        {/* Title */}
                        <h4 className="text-sm font-medium text-stone-900 flex-1 min-w-0" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                          {concept.title}
                        </h4>
                        
                        {/* Tags - compact, limited width */}
                        {concept.custom_filters && concept.custom_filters.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap max-w-xs justify-end">
                            {concept.custom_filters.slice(0, 3).map((filter, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-stone-100 rounded-full text-[9px] uppercase tracking-wider text-stone-600"
                                style={{ fontFamily: "'Unbounded', sans-serif" }}
                              >
                                {filter}
                              </span>
                            ))}
                            {concept.custom_filters.length > 3 && (
                              <span className="text-[9px] text-stone-400 self-center">+{concept.custom_filters.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Grid View - Full Card */
                      <>
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
                        
                        {/* Tags - Grid View Only */}
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
                      </>
                    )}
                  </div>
                );
              })}
              </div>
            )
          ) : currentView === 'dashboard' ? (
            <CurriculumDashboard
              curriculum={curriculum}
              onStartPractice={() => setShowSessionFrame(true)}
              onOpenFilters={(format, filter) => {
                setPreselectedFormat(format);
                setPreselectedFilter(filter);
                setShowPracticeConfig(true);
              }}
              onDirectPracticeStart={(config) => {
                startPractice(config);
              }}
            />
          ) : (
            <TrackDashboard 
              curriculumId={curriculumId}
              onAddConcepts={() => setShowCreationHub(true)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Session Opening Frame - StudyEdit style */}
      {showSessionFrame && (
        <Suspense fallback={null}>
          <SessionOpeningFrame
            concepts={displayedConcepts}
            onBegin={() => {
              setShowSessionFrame(false);
              startPractice({ study_mode: 'smart' });
            }}
            onCustomize={() => {
              setShowSessionFrame(false);
              setShowPracticeConfig(true);
            }}
          />
        </Suspense>
      )}

      {showPracticeConfig && (
        <PracticeConfigModal
          isOpen={showPracticeConfig}
          onClose={() => {
            setShowPracticeConfig(false);
            setPreselectedFormat(undefined);
            setPreselectedFilter(undefined);
          }}
          onStartPractice={handleStartPracticeClick}
          conceptCount={displayedConcepts.length}
          preselectedFormat={preselectedFormat}
          preselectedFilter={preselectedFilter}
          initialConceptIds={displayedConcepts.map((c: any) => c.concept_id)}
        />
      )}

      {showCreationHub && (
        <ConceptCreationHub
          isOpen={showCreationHub}
          onClose={() => setShowCreationHub(false)}
          onManualAdd={() => setShowManualAdd(true)}
          onKnowledgeBaseImport={() => {}}
        />
      )}

      {/* Modals triggered from Creation Hub while in concepts/progress views */}
      <ConceptManualAddModal
        isOpen={showManualAdd}
        onClose={() => setShowManualAdd(false)}
        onBack={() => {
          setShowManualAdd(false);
          setShowCreationHub(true);
        }}
      />

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

      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => {
            setShowAuthPrompt(false);
            setPendingPracticeConfig(null);
            setPendingFilteredConcepts([]);
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AuthForm onSuccess={() => {
              setShowAuthPrompt(false);
              // After successful sign-in, start practice with saved config
              if (pendingPracticeConfig) {
                // If the store already has a targeted selection (set by the modal), do NOT override it
                if (!practiceSelection || practiceSelection.length === 0) {
                  // Fall back to the snapshot from when Start was clicked
                  if (pendingFilteredConcepts.length > 0) {
                    const conceptIds = pendingFilteredConcepts.map((c: any) => c.concept_id);
                    setPracticeSelection(conceptIds);
                  }
                }
                // Start practice with the saved config
                startPractice(pendingPracticeConfig);
                // Clear pending state
                setPendingPracticeConfig(null);
                setPendingFilteredConcepts([]);
              }
            }} />
          </div>
        </div>
      )}

      {/* Filters Panel - Full-page on mobile, centered modal on desktop */}
      {showFiltersPanel && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-4" onClick={() => setShowFiltersPanel(false)}>
          <div 
            className="bg-white/90 backdrop-blur-2xl rounded-none md:rounded-2xl border-0 md:border md:border-black/[0.08] shadow-2xl w-full h-full md:h-auto md:max-w-4xl flex flex-col overflow-hidden"
            style={{ maxHeight: '100vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with decorative line and close button */}
            <div className="p-6 md:p-12 border-b border-black/[0.04] relative">
              {/* Close button - visible on mobile */}
              <button
                onClick={() => setShowFiltersPanel(false)}
                className="absolute top-4 right-4 md:top-6 md:right-6 w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
                aria-label="Close filters"
              >
                <X className="h-5 w-5 text-stone-600" />
              </button>
              
              <div className="h-[1px] w-16 md:w-24 bg-stone-300 mb-4 md:mb-6"></div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-stone-900 tracking-tight pr-10" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
                Filters
              </h2>
              <p className="text-sm md:text-base text-stone-600 font-light mt-2 md:mt-3" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                Refine your learning experience
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-12">
              <ConceptFilterPanel 
                activeView={activeView} 
                onViewChange={(view: string) => setActiveView(view as 'simple' | 'grid' | 'mastery')}
                onStartPractice={() => {
                  setShowFiltersPanel(false);
                  setShowPracticeConfig(true);
                }}
                selectedCategory={'all'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation - Visible only on small screens */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="bg-white/90 backdrop-blur-2xl border-t border-black/[0.06]">
          <div className="flex items-center justify-around px-3 py-1.5">
            {/* Curriculum Hub */}
            {onBackToCurriculums && (
              <button
                onClick={onBackToCurriculums}
                className="p-2.5 rounded-full transition-all duration-200 text-stone-600 hover:bg-stone-100 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
            )}

            {/* Practice */}
            <button
              onClick={() => setSelectedView('dashboard')}
              className={`p-2.5 rounded-full transition-all duration-200 active:scale-95 ${
                currentView === 'dashboard'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>

            {/* Progress */}
            <button
              onClick={() => setSelectedView('progress')}
              className={`p-2.5 rounded-full transition-all duration-200 active:scale-95 ${
                selectedView === 'progress'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>

            {/* Concepts - Only show for creators */}
            {isCreator && (
              <button
                onClick={() => setSelectedView('concepts')}
                className={`p-2.5 rounded-full transition-all duration-200 active:scale-95 ${
                  selectedView === 'concepts'
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Navigation - Manhattan Loft Aesthetic with Glass Morphism */}
      {/* Hidden on mobile, visible on md and up */}
      <div className="hidden md:block fixed left-4 lg:left-6 top-1/2 transform -translate-y-1/2 z-50">
        <div className="bg-white/30 backdrop-blur-2xl rounded-3xl p-3 border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] backdrop-saturate-150">
          <div className="flex flex-col items-center gap-2">
            {/* Curriculum Hub */}
            {onBackToCurriculums && (
              <>
                <button
                  onClick={onBackToCurriculums}
                  className="group relative p-4 rounded-2xl transition-all duration-300 text-stone-600 hover:bg-white/40 hover:backdrop-blur-sm"
                  title="Curriculum Hub"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </button>
                <div className="w-8 h-[1px] bg-stone-300/30"></div>
              </>
            )}

            {/* Dashboard */}
            <button
              onClick={() => setSelectedView('dashboard')}
              className={`group relative p-4 rounded-2xl transition-all duration-300 ${
                currentView === 'dashboard'
                  ? 'bg-stone-900 text-white shadow-lg'
                  : 'text-stone-600 hover:bg-white/40 hover:backdrop-blur-sm'
              }`}
              title="Practice Dashboard"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>

            {/* Divider */}
            <div className="w-8 h-[1px] bg-stone-300/30"></div>

            {/* Progress */}
            <button
              onClick={() => setSelectedView('progress')}
              className={`group relative p-4 rounded-2xl transition-all duration-300 ${
                selectedView === 'progress'
                  ? 'bg-stone-900 text-white shadow-lg'
                  : 'text-stone-600 hover:bg-white/40 hover:backdrop-blur-sm'
              }`}
              title="Progress"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>

            {/* Concepts - Only show for creators */}
            {isCreator && (
              <>
                {/* Divider */}
                <div className="w-8 h-[1px] bg-stone-300/30"></div>

                <button
                  onClick={() => setSelectedView('concepts')}
                  className={`group relative p-4 rounded-2xl transition-all duration-300 ${
                    selectedView === 'concepts'
                      ? 'bg-stone-900 text-white shadow-lg'
                      : 'text-stone-600 hover:bg-white/40 hover:backdrop-blur-sm'
                  }`}
                  title="Concepts"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
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