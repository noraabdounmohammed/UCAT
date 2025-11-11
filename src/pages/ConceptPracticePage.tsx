import React, { useState, useEffect } from 'react';
import { useConceptStore, ConceptStoreProvider } from '@/contexts/ConceptStoreContext';
import { ConceptFilterPanel } from '@/components/concept/ConceptFilterPanel';
import { ConceptGridView } from '@/components/concept/ConceptGridView';
import { TrackDashboard } from '@/components/track/TrackDashboard';
import { ConceptTestView } from '@/components/concept/ConceptTestView';
import { ConceptManagementView } from '@/components/concept/ConceptManagementView';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeConfigModal } from '@/components/practice/PracticeConfigModal';
import { ConceptCreationHub } from '@/components/concept/ConceptCreationHub';
import { ConceptBulkUploadModal } from '@/components/concept/ConceptBulkUploadModal';
import { ConceptManualAddModal } from '@/components/concept/ConceptManualAddModal.new';
import { ConceptKnowledgeBaseModal } from '@/components/concept/ConceptKnowledgeBaseModal';
import { GenerationLoadingScreen } from '@/components/practice/GenerationLoadingScreen';
import { CurriculumDashboard } from '@/components/curriculum/CurriculumDashboard';
import { Plus, ArrowLeft, Grid, BarChart3, X, Filter, Play } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PracticeConfig } from '@/types/practice';
import type { QuestionData } from '@/components/practice/questionTypes';

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

interface ConceptPracticePageProps {
  onBackToCurriculums?: () => void;
  curriculum?: Curriculum;
  onUpdateCurriculum?: (curriculum: Curriculum) => void;
  // Legacy props for backward compatibility
  curriculumName?: string;
  curriculumId?: string;
}

// Internal component that uses the context
const ConceptPracticePageContent: React.FC<Omit<ConceptPracticePageProps, 'curriculumId'>> = ({ 
  onBackToCurriculums,
  curriculum,
  onUpdateCurriculum,
  curriculumName = "UKMLA Cardiology"
}) => {
  const { 
    concepts,
    filteredConcepts,
    isLoading,
    isPracticing,
    practiceQuestions,
    startPractice,
    endPractice,
    updateMastery,
    practiceConfig,
    generatingQuestionCount,
    loadConcepts,
    activeView,
    filterState,
    setActiveView
  } = useConceptStore();
  
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [showCreationHub, setShowCreationHub] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('🎭 Modal states changed:', { showCreationHub, showBulkUpload, showManualAdd, showKnowledgeBase });
  }, [showCreationHub, showBulkUpload, showManualAdd, showKnowledgeBase]);
  const [showFilters, setShowFilters] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [practiceFormat, setPracticeFormat] = useState<'flashcard' | 'sba' | 'ukmla_sba' | 'mindmap'>('flashcard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'dashboard' | 'concepts'>('dashboard');
  
  // State for editable curriculum details
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(curriculum?.name || curriculumName);

  // Load concepts when component mounts
  useEffect(() => {
    loadConcepts();
  }, [loadConcepts]);

  // Set default activeView to grid when entering concepts view
  const normalizedActiveView = activeView as 'simple' | 'grid' | 'mastery';

  // Update local state when curriculum prop changes
  useEffect(() => {
    setEditTitle(curriculum?.name || curriculumName);
  }, [curriculum, curriculumName]);

  const handlePracticeComplete = () => {
    console.log('🎯 handlePracticeComplete called - ending practice session');
    endPractice();
  };

  // Handle saving title
  const handleSaveTitle = () => {
    if (curriculum && onUpdateCurriculum && editTitle.trim()) {
      const updatedCurriculum = { ...curriculum, name: editTitle.trim() };
      onUpdateCurriculum(updatedCurriculum);
    }
    setIsEditingTitle(false);
  };

  // Handle escape key to cancel editing
  const handleKeyDown = (e: React.KeyboardEvent, type: 'title') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditTitle(curriculum?.name || curriculumName);
      setIsEditingTitle(false);
    }
  };
  

  // Handle answer submission
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
  
  // Removed initial loading screen for grid view - concepts load directly
  // Only show loading when generating practice questions/flashcards after clicking Start Practice
  
  // Show loading screen when generating questions (after clicking Start Practice)
  if (isLoading && isPracticing) {
    return (
      <GenerationLoadingScreen 
        format={practiceFormat}
        conceptCount={generatingQuestionCount}
      />
    );
  }
  
  if (isPracticing && practiceQuestions.length > 0) {
    return (
      <ApplePracticeSession
        questions={practiceQuestions}
        onComplete={handlePracticeComplete}
        onAnswerSubmit={handleAnswerSubmit}
        section="UKMLA Concepts"
      />
    );
  }
  
  return (
    <div className="flex flex-col fixed inset-0 overflow-hidden bg-white dark:bg-zinc-900">
      {/* Top Navbar - Curriculum Name */}
      <div className="flex-shrink-0 border-b border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-sm z-20">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (onBackToCurriculums) {
                  onBackToCurriculums();
                }
              }}
              className="flex items-center justify-center w-8 h-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] rounded-full transition-all"
              aria-label="Back to curriculums"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            
            {isEditingTitle ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => handleKeyDown(e, 'title')}
                className="text-[20px] font-semibold text-zinc-900 dark:text-white bg-transparent border-b-2 border-[#007AFF] focus:outline-none px-2 py-1"
                autoFocus
                placeholder="Curriculum name"
              />
            ) : (
              <h1 
                className="text-[20px] font-semibold text-zinc-900 dark:text-white cursor-pointer hover:opacity-70 transition-opacity"
                onClick={() => curriculum && onUpdateCurriculum && setIsEditingTitle(true)}
                title={curriculum && onUpdateCurriculum ? "Click to edit" : ""}
              >
                {curriculum?.name || curriculumName}
              </h1>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

      {/* Main Content - Conditional Rendering */}
      {currentView === 'dashboard' ? (
        <>
          {console.log('🎯 Rendering Dashboard - currentView:', currentView, 'curriculum:', curriculum?.name)}
          <CurriculumDashboard
            curriculum={curriculum}
            onNavigateToView={(view) => {
              console.log('🎯 Navigating to view:', view);
              setCurrentView('concepts');
              setActiveView(view);
            }}
            onStartPractice={() => {
              console.log('🎯 Start practice clicked');
              setShowPracticeConfig(true);
            }}
            onAddConcepts={() => {
              console.log('🎯 Add concepts clicked');
              setShowCreationHub(true);
            }}
          />
        </>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Filter Panel - Apple Liquid Glass */}
          {showFilters && (
            <div className="w-[380px] h-full flex-shrink-0 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl border-r border-black/[0.08] dark:border-white/[0.08] flex flex-col overflow-y-auto">
              <div className="relative px-6 pt-4 pb-2">
                <button
                  onClick={() => setShowFilters(false)}
                  className="absolute top-2 right-2 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                </button>
              </div>
              <div className="px-6 pb-6">
                <ConceptFilterPanel 
                  activeView={normalizedActiveView} 
                  onViewChange={(view: string) => setActiveView(view as 'simple' | 'grid' | 'mastery')}
                  onStartPractice={() => setShowPracticeConfig(true)}
                  selectedCategory={selectedCategory}
                />
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Bar - Apple HIG */}
            <div className="flex-shrink-0 border-b border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
              <div className="px-6 py-3">
                <div className="flex items-center justify-between">
                  {/* Left Actions */}
                  <div className="flex items-center gap-4">
                    {/* Back to Dashboard Button */}
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <ArrowLeft className="h-[16px] w-[16px]" strokeWidth={2} />
                      <span>Dashboard</span>
                    </button>
                    
                    {/* Filter Button - Only show when filters are closed */}
                    {!showFilters && (
                      <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className="p-1.5 rounded-md transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
                        aria-label="Show filters"
                      >
                        <Filter className="h-[18px] w-[18px] text-zinc-600 dark:text-zinc-400" />
                      </button>
                    )}

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveView('grid')}
                        className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                          normalizedActiveView === 'grid'
                            ? 'text-[#007AFF]'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        <Grid className="h-[18px] w-[18px]" strokeWidth={normalizedActiveView === 'grid' ? 2.5 : 2} />
                        <span>Concepts</span>
                      </button>
                      <button
                        onClick={() => setActiveView('mastery')}
                        className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                          normalizedActiveView === 'mastery'
                            ? 'text-[#007AFF]'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        <BarChart3 className="h-[18px] w-[18px]" strokeWidth={normalizedActiveView === 'mastery' ? 2.5 : 2} />
                        <span>Progress</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2">
                    {filteredConcepts.length > 0 && (
                      <button
                        onClick={() => setShowPracticeConfig(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      >
                        <Play className="h-[16px] w-[16px]" strokeWidth={2} />
                        <span>Start Practice</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowCreationHub(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF] hover:opacity-90 text-white rounded-lg text-[13px] font-semibold transition-opacity"
                    >
                      <Plus className="h-[16px] w-[16px]" strokeWidth={2.5} />
                      <span>Add Concepts</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Header - Liquid Glass */}
            {(activeView === 'grid' || activeView === 'mastery') && (
              <div className="border-b border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-[17px] font-semibold text-zinc-900 dark:text-white mb-1">
                        {activeView === 'grid' ? 'Your Concept Library' : 'Progress Dashboard'}
                      </h2>
                      <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                        {activeView === 'grid' 
                          ? 'Build and organize concepts that power all your practice sessions'
                          : 'Track your learning journey and mastery across all concepts'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Active Filters - Show for both grid and progress views */}
                  {(activeView === 'grid' || activeView === 'mastery') && (filterState.mastery_levels.length > 0 || filterState.custom_filters.length > 0) && (
                    <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
                      <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Active filters:</span>
                      
                      {filterState.mastery_levels.map((level) => {
                        const levelLabel = level === 0 ? 'Unseen' : level === 1 ? 'Incorrect' : level === 2 ? 'Correct' : `Level ${level}`;
                        return (
                          <div key={level} className="flex items-center gap-1 px-2.5 py-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl rounded-lg border border-black/[0.08] dark:border-white/[0.08]">
                            <span className="text-[13px] text-zinc-700 dark:text-zinc-300">{levelLabel}</span>
                            <button
                              onClick={() => updateFilterState({ 
                                mastery_levels: filterState.mastery_levels.filter(l => l !== level) 
                              })}
                              className="hover:bg-black/5 dark:hover:bg-white/5 rounded-full p-0.5 transition-colors"
                            >
                              <X className="h-3 w-3 text-zinc-500" />
                            </button>
                          </div>
                        );
                      })}
                      
                      {filterState.custom_filters.map((filter) => (
                        <div key={filter} className="flex items-center gap-1 px-2.5 py-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl rounded-lg border border-black/[0.08] dark:border-white/[0.08]">
                          <span className="text-[13px] text-zinc-700 dark:text-zinc-300">{filter}</span>
                          <button
                            onClick={() => updateFilterState({ 
                              custom_filters: filterState.custom_filters.filter(f => f !== filter) 
                            })}
                            className="hover:bg-black/5 dark:hover:bg-white/5 rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3 text-zinc-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-6 py-6">
                <Tabs value={normalizedActiveView} onValueChange={(value: any) => setActiveView(value)}>

                  {/* Simple View */}
                  <TabsContent value="simple" className="mt-0">
                    <ConceptManagementView 
                      onStartPractice={() => setShowPracticeConfig(true)}
                      onAddConcepts={() => setShowCreationHub(true)}
                    />
                  </TabsContent>

                  {/* Concepts Grid View */}
                  <TabsContent value="grid" className="mt-0">
                    <ConceptGridView 
                      onBulkUploadClick={() => setShowCreationHub(true)} 
                      selectedCategory={selectedCategory}
                      onCategoryChange={setSelectedCategory}
                    />
                  </TabsContent>

                  {/* Track View */}
                  <TabsContent value="mastery" className="mt-0">
                    <TrackDashboard curriculumId={curriculum?.id || curriculumName} onAddConcepts={() => setShowCreationHub(true)} />
                  </TabsContent>

                  {/* Test View */}
                  <TabsContent value="test" className="mt-0">
                    <ConceptTestView 
                      conceptCount={filteredConcepts.length}
                      onStartPractice={() => setShowPracticeConfig(true)}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Practice Config Modal */}
      {showPracticeConfig && (
        <PracticeConfigModal
          isOpen={showPracticeConfig}
          onClose={() => setShowPracticeConfig(false)}
          onStartPractice={(config) => {
            // Track the format for the loading screen
            if (config.target_formats && config.target_formats.length > 0) {
              setPracticeFormat(config.target_formats[0] as 'flashcard' | 'sba' | 'ukmla_sba' | 'mindmap');
            }
            startPractice(config);
            setShowPracticeConfig(false);
          }}
          conceptCount={filteredConcepts.length}
        />
      )}
      
      {/* Concept Creation Hub */}
      <ConceptCreationHub
        isOpen={showCreationHub}
        onClose={() => {
          console.log('🚪 Closing creation hub');
          setShowCreationHub(false);
        }}
        onBulkUpload={() => {
          console.log('📤 Opening bulk upload modal');
          setShowBulkUpload(true);
        }}
        onManualAdd={() => {
          console.log('✍️ Opening manual add modal');
          setShowManualAdd(true);
        }}
        onKnowledgeBaseImport={() => setShowKnowledgeBase(true)}
      />

      {/* Bulk Upload Modal */}
      <ConceptBulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onBack={() => {
          setShowBulkUpload(false);
          setShowCreationHub(true);
        }}
      />

      {/* Manual Add Modal */}
      <ConceptManualAddModal
        isOpen={showManualAdd}
        onClose={() => setShowManualAdd(false)}
        onBack={() => {
          setShowManualAdd(false);
          setShowCreationHub(true);
        }}
      />

      {/* Knowledge Base Import Modal */}
      <ConceptKnowledgeBaseModal
        isOpen={showKnowledgeBase}
        onClose={() => setShowKnowledgeBase(false)}
        onBack={() => {
          setShowKnowledgeBase(false);
          setShowCreationHub(true);
        }}
      />
      </div>
    </div>
  );
};

// Main component that provides the curriculum-specific context
export const ConceptPracticePage: React.FC<ConceptPracticePageProps> = ({ 
  curriculum,
  curriculumId,
  ...props
}) => {
  // Use curriculum.id if available, otherwise fall back to curriculumId or default
  const actualCurriculumId = curriculum?.id || curriculumId || "default";
  
  return (
    <ConceptStoreProvider curriculumId={actualCurriculumId}>
      <ConceptPracticePageContent curriculum={curriculum} {...props} />
    </ConceptStoreProvider>
  );
};
