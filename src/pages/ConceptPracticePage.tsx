import React, { useEffect, useState } from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { ConceptFilterPanel } from '@/components/concept/ConceptFilterPanel';
import { ConceptGridView } from '@/components/concept/ConceptGridView';
import { ConceptMatrixView } from '@/components/concept/ConceptMatrixView';
import { ConceptMasteryView } from '@/components/concept/ConceptMasteryView';
import { ConceptGraphView } from '@/components/concept/ConceptGraphView';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeConfigModal } from '@/components/practice/PracticeConfigModal';
import { ConceptBulkUploadModal } from '@/components/concept/ConceptBulkUploadModal';
import { CustomFilterManager } from '@/components/concept/CustomFilterManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Grid, BarChart3, Network, Layers, Settings, Filter } from 'lucide-react';
import { GenerationLoadingScreen } from '@/components/practice/GenerationLoadingScreen';
import { ConceptLoadingScreen } from '@/components/concept/ConceptLoadingScreen';

export const ConceptPracticePage: React.FC = () => {
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
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showFilterManager, setShowFilterManager] = useState(false);
  const [practiceFormat, setPracticeFormat] = useState<'flashcard' | 'ukmla_sba'>('ukmla_sba');
  
  // Mock data for custom filters (will be replaced with store integration)
  const [customFilters, setCustomFilters] = useState<any[]>([]);
  const [filterCategories, setFilterCategories] = useState<any[]>([
    { id: 'cat1', name: 'Conditions', color: '#3B82F6', order: 0, created_at: new Date() },
    { id: 'cat2', name: 'Systems', color: '#10B981', order: 1, created_at: new Date() },
    { id: 'cat3', name: 'Procedures', color: '#F59E0B', order: 2, created_at: new Date() }
  ]);
  
  // Load concepts on mount
  useEffect(() => {
    loadConcepts();
    setIsInitialLoad(false);
  }, [loadConcepts]);
  
  // Handle practice completion
  const handlePracticeComplete = () => {
    endPractice();
  };
  
  // Custom filter handlers
  const handleCreateFilter = (filter: any) => {
    const newFilter = {
      ...filter,
      id: `filter_${Date.now()}`,
      created_at: new Date()
    };
    setCustomFilters(prev => [...prev, newFilter]);
  };

  const handleCreateCategory = (category: any) => {
    const newCategory = {
      ...category,
      id: `category_${Date.now()}`,
      created_at: new Date()
    };
    setFilterCategories(prev => [...prev, newCategory]);
  };

  const handleDeleteFilter = (filterId: string) => {
    setCustomFilters(prev => prev.filter(f => f.id !== filterId));
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
  
  if (isInitialLoad || isLoading) {
    return <ConceptLoadingScreen />;
  }
  
  // Show loading screen when generating questions
  if (isPracticing && practiceQuestions.length === 0) {
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
      {/* Header with improved spacing and alignment */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Concept Practice
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Practice and master concepts across various topics and categories.
          </p>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Track your progress and focus on areas that need improvement.
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-3">
          <button
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center shadow-sm"
            onClick={() => setShowFilterManager(true)}
          >
            <Filter className="h-5 w-5 mr-2" />
            Manage Filters
          </button>
          <button
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center shadow-md"
            onClick={() => {
              setShowPracticeConfig(true);
            }}
            disabled={filteredConcepts.length === 0}
          >
            <Settings className="h-5 w-5 mr-2" />
            Start Practice ({filteredConcepts.length} concepts)
          </button>
        </div>
      </div>
      
      {/* Main content with improved layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Filter panel */}
        <div className="lg:col-span-3">
          <ConceptFilterPanel />
        </div>
        
        {/* Main content area with improved tabs */}
        <div className="lg:col-span-9">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-6">
            <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <TabsList className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                  <TabsTrigger value="grid" className="flex items-center px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md">
                    <Grid className="h-4 w-4 mr-2" />
                    <span>Grid</span>
                  </TabsTrigger>
                  <TabsTrigger value="matrix" className="flex items-center px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md">
                    <Layers className="h-4 w-4 mr-2" />
                    <span>Matrix</span>
                  </TabsTrigger>
                  <TabsTrigger value="mastery" className="flex items-center px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    <span>Mastery</span>
                  </TabsTrigger>
                  <TabsTrigger value="graph" className="flex items-center px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm rounded-md">
                    <Network className="h-4 w-4 mr-2" />
                    <span>Graph</span>
                  </TabsTrigger>
                </TabsList>
                
                <div className="text-sm font-medium px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                  {filteredConcepts.length} concepts
                </div>
              </div>
              
              <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <TabsContent value="grid" className="mt-0">
                  <ConceptGridView onBulkUploadClick={() => setShowBulkUpload(true)} />
                </TabsContent>
                
                <TabsContent value="matrix" className="mt-0">
                  <ConceptMatrixView />
                </TabsContent>
                
                <TabsContent value="mastery" className="mt-0">
                  <ConceptMasteryView />
                </TabsContent>
                
                <TabsContent value="graph" className="mt-0">
                  <ConceptGraphView />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Practice Config Modal */}
      {showPracticeConfig && (
        <PracticeConfigModal
          isOpen={showPracticeConfig}
          onClose={() => setShowPracticeConfig(false)}
          onStartPractice={(config) => {
            // Track the format for the loading screen
            if (config.target_formats && config.target_formats.length > 0) {
              setPracticeFormat(config.target_formats[0] as 'flashcard' | 'ukmla_sba');
            }
            startPractice(config);
            setShowPracticeConfig(false);
          }}
          conceptCount={filteredConcepts.length}
        />
      )}
      
      {/* Custom Filter Manager Modal */}
      {showFilterManager && (
        <CustomFilterManager
          isOpen={showFilterManager}
          onClose={() => setShowFilterManager(false)}
          customFilters={customFilters}
          filterCategories={filterCategories}
          onCreateFilter={handleCreateFilter}
          onCreateCategory={handleCreateCategory}
          onDeleteFilter={handleDeleteFilter}
        />
      )}
      
      {/* Bulk Upload Modal */}
      <ConceptBulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
      />
    </div>
  );
};
