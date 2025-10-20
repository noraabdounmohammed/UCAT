import React, { useEffect, useState } from 'react';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { ConceptFilterPanel } from '@/components/concept/ConceptFilterPanel';
import { ConceptGridView } from '@/components/concept/ConceptGridView';
import { ConceptMasteryView } from '@/components/concept/ConceptMasteryView';
import { ConceptGraphView } from '@/components/concept/ConceptGraphView';
import { ConceptManagementView } from '@/components/concept/ConceptManagementView';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeConfigModal } from '@/components/practice/PracticeConfigModal';
import { ConceptBulkUploadModal } from '@/components/concept/ConceptBulkUploadModal';
import { ConceptCreationHub } from '@/components/concept/ConceptCreationHub';
import { ConceptManualAddModal } from '@/components/concept/ConceptManualAddModal.new';
import { ConceptKnowledgeBaseModal } from '@/components/concept/ConceptKnowledgeBaseModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Grid, BarChart3, Network, Settings, ArrowLeft, Smartphone } from 'lucide-react';
import { GenerationLoadingScreen } from '@/components/practice/GenerationLoadingScreen';

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
    isLoading,
    loadConcepts, 
    filteredConcepts, 
    isPracticing, 
    practiceQuestions,
    startPractice,
    endPractice,
    updateMastery,
    activeView,
    setActiveView
  } = useConceptStore();
  
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [showCreationHub, setShowCreationHub] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [practiceFormat, setPracticeFormat] = useState<'flashcard' | 'ukmla_sba' | 'mindmap'>('ukmla_sba');
  
  // Inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState(curriculum?.name || curriculumName);
  const [editDescription, setEditDescription] = useState(curriculum?.description || "Practice and master concepts across various topics and categories. Track your progress and focus on areas that need improvement.");
  
  // Load concepts on mount
  useEffect(() => {
    loadConcepts();
  }, [loadConcepts]);
  
  // Handle practice completion
  const handlePracticeComplete = () => {
    endPractice();
  };

  // Handle title save
  const handleSaveTitle = () => {
    if (curriculum && onUpdateCurriculum && editTitle.trim()) {
      const updatedCurriculum = {
        ...curriculum,
        name: editTitle.trim()
      };
      onUpdateCurriculum(updatedCurriculum);
    }
    setIsEditingTitle(false);
  };

  // Handle description save
  const handleSaveDescription = () => {
    if (curriculum && onUpdateCurriculum && editDescription.trim()) {
      const updatedCurriculum = {
        ...curriculum,
        description: editDescription.trim()
      };
      onUpdateCurriculum(updatedCurriculum);
    }
    setIsEditingDescription(false);
  };

  // Handle escape key to cancel editing
  const handleKeyDown = (e: React.KeyboardEvent, type: 'title' | 'description') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (type === 'title') {
        handleSaveTitle();
      } else {
        handleSaveDescription();
      }
    } else if (e.key === 'Escape') {
      if (type === 'title') {
        setEditTitle(curriculum?.name || curriculumName);
        setIsEditingTitle(false);
      } else {
        setEditDescription(curriculum?.description || "Practice and master concepts across various topics and categories. Track your progress and focus on areas that need improvement.");
        setIsEditingDescription(false);
      }
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
        conceptCount={filteredConcepts.length}
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Clean header with integrated back - Mobile Optimized */}
      <div className="mb-4 md:mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 shadow-sm">
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:justify-between md:items-center">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={() => {
                if (onBackToCurriculums) {
                  onBackToCurriculums();
                } else {
                  alert('Back to Curriculums - Navigation system not fully connected yet');
                }
              }}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              title="Back to Curriculum Hub"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
            {/* Editable Title */}
            {isEditingTitle ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => handleKeyDown(e, 'title')}
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 w-full"
                style={{ fontSize: '1.5rem', fontFamily: 'inherit', lineHeight: '2rem' }}
                autoFocus
                placeholder="Enter curriculum name"
              />
            ) : (
              <h1 
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => curriculum && onUpdateCurriculum && setIsEditingTitle(true)}
                title={curriculum && onUpdateCurriculum ? "Click to edit title" : ""}
              >
                {curriculum?.name || curriculumName}
              </h1>
            )}

            {/* Editable Description */}
            {isEditingDescription ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onBlur={handleSaveDescription}
                onKeyDown={(e) => handleKeyDown(e, 'description')}
                className="text-gray-600 dark:text-gray-400 max-w-2xl bg-transparent border border-blue-500 rounded-md p-2 focus:outline-none focus:border-blue-600 w-full resize-none"
                rows={3}
                autoFocus
                placeholder="Enter curriculum description"
              />
            ) : (
              <p 
                className="text-gray-600 dark:text-gray-400 max-w-2xl cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => curriculum && onUpdateCurriculum && setIsEditingDescription(true)}
                title={curriculum && onUpdateCurriculum ? "Click to edit description" : ""}
              >
                {curriculum?.description || "Practice and master concepts across various topics and categories. Track your progress and focus on areas that need improvement."}
              </p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setShowCreationHub(true)}
              className="px-4 py-3 sm:py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center min-h-[44px]"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Concepts
            </button>
            <button
              onClick={() => setShowPracticeConfig(true)}
              className="px-4 py-3 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              disabled={filteredConcepts.length === 0}
            >
              <Settings className="h-5 w-5 mr-2" />
              <span className="truncate">Start Practice ({filteredConcepts.length} concepts)</span>
            </button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
          <div className="w-full sm:w-auto overflow-x-auto">
            <TabsList className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex w-full sm:w-auto min-w-max">
              <TabsTrigger value="simple" className="flex items-center px-3 sm:px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md min-h-[44px] whitespace-nowrap">
                <Smartphone className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="text-sm">Simple</span>
              </TabsTrigger>
              <TabsTrigger value="grid" className="flex items-center px-3 sm:px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md min-h-[44px] whitespace-nowrap">
                <Grid className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="text-sm">Grid</span>
              </TabsTrigger>
              <TabsTrigger value="mastery" className="flex items-center px-3 sm:px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md min-h-[44px] whitespace-nowrap">
                <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="text-sm">Mastery</span>
              </TabsTrigger>
              <TabsTrigger value="graph" className="flex items-center px-3 sm:px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md min-h-[44px] whitespace-nowrap">
                <Network className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="text-sm">Graph</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="text-sm font-medium px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
            {filteredConcepts.length} concepts
          </div>
        </div>

        {/* Simple View - Full Width */}
        <TabsContent value="simple" className="mt-0">
          <ConceptManagementView 
            onStartPractice={() => setShowPracticeConfig(true)}
            onAddConcepts={() => setShowCreationHub(true)}
          />
        </TabsContent>

        {/* Advanced Views - With Filter Panel */}
        <TabsContent value="grid" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Filter panel */}
            <div className="lg:col-span-4">
              <ConceptFilterPanel />
            </div>
            
            {/* Main content area */}
            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-6">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <ConceptGridView onBulkUploadClick={() => setShowCreationHub(true)} />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mastery" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Filter panel */}
            <div className="lg:col-span-4">
              <ConceptFilterPanel />
            </div>
            
            {/* Main content area */}
            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-6">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <ConceptMasteryView />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="graph" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Filter panel */}
            <div className="lg:col-span-4">
              <ConceptFilterPanel />
            </div>
            
            {/* Main content area */}
            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-6">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <ConceptGraphView />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Practice Config Modal */}
      {showPracticeConfig && (
        <PracticeConfigModal
          isOpen={showPracticeConfig}
          onClose={() => setShowPracticeConfig(false)}
          onStartPractice={(config) => {
            // Track the format for the loading screen
            if (config.target_formats && config.target_formats.length > 0) {
              setPracticeFormat(config.target_formats[0] as 'flashcard' | 'ukmla_sba' | 'mindmap');
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
        onClose={() => setShowCreationHub(false)}
        onBulkUpload={() => setShowBulkUpload(true)}
        onManualAdd={() => setShowManualAdd(true)}
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
