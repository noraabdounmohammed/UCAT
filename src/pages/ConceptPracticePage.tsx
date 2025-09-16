import React, { useEffect, useState } from 'react';
import { useConceptStore } from '@/store/conceptStore';
import { ConceptFilterPanel } from '@/components/concept/ConceptFilterPanel';
import { ConceptGridView } from '@/components/concept/ConceptGridView';
import { ConceptMatrixView } from '@/components/concept/ConceptMatrixView';
import { ConceptMasteryView } from '@/components/concept/ConceptMasteryView';
import { ConceptGraphView } from '@/components/concept/ConceptGraphView';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeConfigModal } from '@/components/practice/PracticeConfigModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Grid, BarChart3, Network, Layers, Settings } from 'lucide-react';
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
  const [practiceFormat, setPracticeFormat] = useState<'flashcard' | 'ukmla_sba'>('ukmla_sba');
  
  // Load concepts on mount
  useEffect(() => {
    loadConcepts();
    setIsInitialLoad(false);
  }, [loadConcepts]);
  
  // Handle practice completion
  const handlePracticeComplete = () => {
    endPractice();
  };
  
  // Handle answer submission
  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    // Extract concept_id from question
    const question = practiceQuestions.find(q => q.id === questionId);
    if (question && question.concept_id) {
      console.log(`Updating mastery for concept ${question.concept_id}: ${isCorrect ? 'correct' : 'incorrect'}`);
      updateMastery(question.concept_id, isCorrect);
    } else {
      console.warn('Could not find concept_id for question:', questionId);
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
            UKMLA Concept Practice
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Practice medical concepts across systems, conditions, and presentations. 
            Track your mastery and focus on areas that need improvement.
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
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
                  <ConceptGridView />
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
    </div>
  );
};
