import { useState, useEffect } from 'react';
import { ApplePracticeSession, QuestionData } from './ApplePracticeSession';
import { Target, BookOpen, Brain, Calculator, Scale, Loader2, Check, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './animations.css';
import './apple-section-styles.css';
import { toast } from 'sonner';
import { ResetProgressButton } from '@/components/ui/ResetProgressButton';
import { ConceptNodeFilterOptions, DifficultyOption, InteractionStatus } from '@/types/practice';

// System definitions with icons and descriptions
const SYSTEM_DETAILS: Record<string, { name: string, icon: LucideIcon, description: string }> = {
  'Cardiovascular': { name: 'Cardiovascular', icon: Target, description: 'Heart, blood vessels, and circulatory disorders' },
  'Respiratory': { name: 'Respiratory', icon: BookOpen, description: 'Lungs, airways, and breathing disorders' },
  'Gastrointestinal': { name: 'Gastrointestinal', icon: Brain, description: 'Digestive system disorders and hepatobiliary conditions' },
  'Neurology': { name: 'Neurology', icon: Calculator, description: 'Brain, spinal cord, and nervous system disorders' },
  'Endocrinology': { name: 'Endocrinology', icon: Scale, description: 'Hormonal and metabolic disorders' }
};

// Define the structure for concept nodes
interface ConceptNode {
  concept_id: string;
  system: string;
  condition: string;
  presentation: string[];
  competency: string;
  decision_rule: string;
  guideline_ref: {
    name: string;
    year: number;
    key_line: string;
  };
  misconceptions: string[];
  variable_schema: {
    must_have: string[];
    optional: string[];
  };
  difficulty: string;
  linked_questions: string[];
}

// Define the structure for condition structure (similar to topic structure)
interface ConditionStructure {
  condition: string;
  competencies: Array<{id: string; name: string}>;
}

export function ConceptNodePracticeSection(): JSX.Element {
  const [activeSystem, setActiveSystem] = useState('Cardiovascular');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSystems, setLoadingSystems] = useState(true);
  const [availableSystems, setAvailableSystems] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isPracticing, setIsPracticing] = useState(false);
  const [filterOptions, setFilterOptions] = useState<ConceptNodeFilterOptions>({
    system: activeSystem,
    conditions: ['ST-elevation Myocardial Infarction'],
    presentations: ['Chest pain'],
    competencies: ['Diagnosis'],
    difficulty: ['easy', 'medium', 'hard'] as DifficultyOption[],
    interactionStatus: ['unseen', 'correct', 'incorrect'] as InteractionStatus[]
  });
  
  // Track available presentations across all concept nodes
  const [availablePresentations, setAvailablePresentations] = useState<string[]>([]);
  
  // State for showing/hiding visualizations
  const [showMatrixView, setShowMatrixView] = useState(true);
  
  // Condition structure state
  const [conditionStructure, setConditionStructure] = useState<Array<ConditionStructure>>([]);
  
  // Expanded conditions tracking
  const [expandedConditions, setExpandedConditions] = useState<Record<string, boolean>>({});
  
  // Question counts by condition and competency
  const [questionCounts, setQuestionCounts] = useState<{
    conditionCounts: Record<string, number>;
    competencyCounts: Record<string, number>;
  }>({
    conditionCounts: {},
    competencyCounts: {}
  });
  
  // Track progress data in state to force re-renders when it changes
  const [progressData, setProgressData] = useState({
    conditions: {} as Record<string, { correct: number; incorrect: number; total: number }>,
    competencies: {} as Record<string, { correct: number; incorrect: number; total: number }>,
    systems: {} as Record<string, { correct: number; incorrect: number; total: number }>
  });
  
  // Track question counts per system
  const [systemQuestionCounts, setSystemQuestionCounts] = useState<Record<string, number>>({});
  
  // Load available systems
  useEffect(() => {
    const loadSystems = async () => {
      try {
        console.log('Loading available systems...');
        // In a real implementation, this would fetch from your API
        const systems = Object.keys(SYSTEM_DETAILS);
        console.log('Available systems:', systems);
        setAvailableSystems(systems);
        
        // Set a default system if available and no system is currently selected
        if (systems && systems.length > 0) {
          // Only set default system if none is selected
          if (!activeSystem || !systems.includes(activeSystem)) {
            console.log('Setting default system to:', systems[0]);
            setActiveSystem(systems[0]);
            
            // Update filter options with the selected system
            setFilterOptions(prev => ({
              ...prev,
              system: systems[0]
            }));
          }
          
          // Set mock question counts for systems
          const mockCounts: Record<string, number> = {};
          systems.forEach(system => {
            mockCounts[system] = system === 'Cardiovascular' ? 5 : 
                               system === 'Respiratory' ? 3 : 
                               system === 'Gastrointestinal' ? 4 : 
                               system === 'Neurology' ? 6 : 2;
          });
          setSystemQuestionCounts(mockCounts);
        }
        
        setLoadingSystems(false);
      } catch (error) {
        console.error('Error loading systems:', error);
        toast.error('Failed to load available systems');
        setLoadingSystems(false);
      }
    };
    
    loadSystems();
  }, [activeSystem]);
  
  // Load condition structure when active system changes
  useEffect(() => {
    const fetchSystemData = async () => {
      if (!activeSystem) return;
      
      setIsLoading(true);
      try {
        // In a real implementation, this would fetch from your API
        // For now, we'll create mock data based on the Concept Node
        const mockConditionStructure: ConditionStructure[] = [];
        
        if (activeSystem === 'Cardiovascular') {
          mockConditionStructure.push({
            condition: 'ST-elevation Myocardial Infarction',
            competencies: [
              { id: 'diagnosis', name: 'Diagnosis' },
              { id: 'management', name: 'Management' }
            ]
          });
          mockConditionStructure.push({
            condition: 'Non-ST-elevation Myocardial Infarction',
            competencies: [
              { id: 'diagnosis', name: 'Diagnosis' },
              { id: 'management', name: 'Management' }
            ]
          });
        } else if (activeSystem === 'Respiratory') {
          mockConditionStructure.push({
            condition: 'Asthma',
            competencies: [
              { id: 'diagnosis', name: 'Diagnosis' },
              { id: 'management', name: 'Management' }
            ]
          });
        }
        
        setConditionStructure(mockConditionStructure);
        
        // Set mock question counts
        const mockConditionCounts: Record<string, number> = {};
        const mockCompetencyCounts: Record<string, number> = {};
        
        mockConditionStructure.forEach(condition => {
          mockConditionCounts[condition.condition] = 3;
          condition.competencies.forEach(competency => {
            mockCompetencyCounts[competency.id] = 2;
          });
        });
        
        setQuestionCounts({
          conditionCounts: mockConditionCounts,
          competencyCounts: mockCompetencyCounts
        });
        
      } catch (error) {
        console.error('Error fetching system data:', error);
        toast.error('Failed to load practice data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSystemData();
  }, [activeSystem]);
  
  // Handle system change
  const handleSystemChange = (system: string) => {
    console.log('Changing system to:', system);
    
    if (system !== activeSystem) {
      // Set the active system
      setActiveSystem(system);
      
      // Reset filter options for the new system
      setFilterOptions({
        system: system,
        conditions: [], // Will be populated when condition structure loads
        presentations: [], // Will be populated when concept nodes load
        competencies: [], // Will be populated when condition structure loads
        difficulty: ['easy', 'medium', 'hard'] as DifficultyOption[],
        interactionStatus: ['unseen', 'correct', 'incorrect'] as InteractionStatus[]
      });
      
      // Clear condition structure to force reload
      setConditionStructure([]);
      
      console.log('System changed successfully to:', system);
    }
  };
  
  // Load available presentations from concept nodes
  useEffect(() => {
    const loadPresentations = async () => {
      try {
        // Fetch concept nodes
        const res = await fetch('/ukmlaDatabase.json');
        const raw = await res.json();
        const nodes: ConceptNode[] = Array.isArray(raw) ? raw : [raw];
        
        // Extract all unique presentations
        const allPresentations = new Set<string>();
        nodes.forEach(node => {
          if (node.system === activeSystem && node.presentation) {
            node.presentation.forEach(p => allPresentations.add(p));
          }
        });
        
        setAvailablePresentations(Array.from(allPresentations).sort());
      } catch (error) {
        console.error('Error loading presentations:', error);
      }
    };
    
    if (activeSystem) {
      loadPresentations();
    }
  }, [activeSystem]);
  
  // Handle starting practice session
  const handleStartPractice = async () => {
    setIsLoading(true);
    try {
      // Fetch concept nodes (support single object or array)
      const res = await fetch('/ukmlaDatabase.json');
      const raw = await res.json();
      const nodes: ConceptNode[] = Array.isArray(raw) ? raw : [raw];

      // Apply basic filtering based on current selections
      const filtered = nodes.filter((n) => {
        const systemOk = !filterOptions.system || n.system === filterOptions.system;
        const conditionOk = filterOptions.conditions.length === 0 || filterOptions.conditions.includes(n.condition);
        
        // Check if any selected presentations match this node's presentations
        const presentationOk = filterOptions.presentations.length === 0 || 
          (n.presentation && n.presentation.some(p => 
            filterOptions.presentations.some(fp => fp.toLowerCase() === p.toLowerCase())
          ));
        
        const competencyOk =
          filterOptions.competencies.length === 0 ||
          filterOptions.competencies.some(c => c.toLowerCase() === (n.competency || '').toLowerCase());
        
        return systemOk && conditionOk && presentationOk && competencyOk;
      });

      if (filtered.length === 0) {
        toast.error('No concept nodes match your filters. Try widening your selection.');
        setIsLoading(false);
        return;
      }

      // Map concept nodes to simple multiple-choice questions
      const generated: QuestionData[] = filtered.map((n, idx) => {
        const id = n.concept_id || `cn-${idx}`;
        const stem = `A ${n.system} case: ${n.condition}. Presentation: ${n.presentation?.join(', ')}.\n\nWhat is the best next step or interpretation?`;

        // Correct option = decision_rule; distractors = misconceptions (up to 3)
        const correct = (n.decision_rule || '').trim() || 'Follow guideline recommendation.';
        const distractors = (n.misconceptions || []).slice(0, 3);
        const options = [correct, ...distractors];
        while (options.length < 4) options.push(`Option ${String.fromCharCode(65 + options.length)}`);

        return {
          id,
          question: stem,
          options,
          correctAnswer: 'A',
          explanation: `Guideline: ${n.guideline_ref?.name || 'N/A'} (${n.guideline_ref?.year || ''}).\n\nKey: ${n.guideline_ref?.key_line || n.decision_rule || ''}`,
          data_block: {
            system: n.system,
            condition: n.condition,
            competency: n.competency,
          }
        };
      });

      setQuestions(generated);
      setIsPracticing(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error starting practice:', error);
      toast.error('Failed to start practice session');
      setIsLoading(false);
    }
  };
  
  // If loading systems, show skeleton UI
  if (loadingSystems) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Render practice or setup UI
  return (
    <div className="max-w-4xl mx-auto pt-12 px-6">
      {!isPracticing ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="apple-heading-1" data-component-name="ConceptNodePracticeSection">UKMLA AKT Practice</h2>
            <ResetProgressButton />
          </div>
          
          <div className="apple-section-container">
            <h3 className="apple-heading-2 mb-4">Select System</h3>
            
            <div className="apple-section-grid">
              {availableSystems.map((system) => {
                const SystemIcon = SYSTEM_DETAILS[system]?.icon || Target;
                const isSelected = activeSystem === system;
                
                // Mock progress data
                const mockProgress = {
                  correct: system === 'Cardiovascular' ? 2 : 1,
                  incorrect: system === 'Cardiovascular' ? 1 : 0,
                  total: system === 'Cardiovascular' ? 3 : 1
                };
                
                return (
                  <div
                    key={system}
                    onClick={() => handleSystemChange(system)}
                    className={`apple-section-card ${isSelected ? 'selected' : ''}`}
                    style={{
                      background: mockProgress.total > 0 ?
                        `linear-gradient(to right, 
                          rgba(16, 185, 129, 0.08) 0%, 
                          rgba(16, 185, 129, 0.08) ${(mockProgress.correct / (systemQuestionCounts[system] || 1)) * 100}%, 
                          rgba(239, 68, 68, 0.08) ${(mockProgress.correct / (systemQuestionCounts[system] || 1)) * 100}%, 
                          rgba(239, 68, 68, 0.08) ${((mockProgress.correct + mockProgress.incorrect) / (systemQuestionCounts[system] || 1)) * 100}%, 
                          var(--card-background) ${((mockProgress.correct + mockProgress.incorrect) / (systemQuestionCounts[system] || 1)) * 100}%, 
                          var(--card-background) 100%)` :
                        undefined
                    }}
                  >
                    <div className={`apple-section-card-content`}>
                      <div className={`apple-section-card-icon ${isSelected ? 'selected' : ''}`}>
                        <SystemIcon className="h-5 w-5" />
                      </div>
                      <div className="apple-section-card-text">
                        <h4 className="apple-section-card-title">
                          {SYSTEM_DETAILS[system]?.name || system}
                        </h4>
                        <div className="apple-section-card-subtitle" data-component-name="ConceptNodePracticeSection">
                          {(mockProgress.correct + mockProgress.incorrect)}/{systemQuestionCounts[system] || 0} questions attempted
                          {mockProgress.total > 0 && (
                            <div className="mt-1 flex items-center" data-component-name="ConceptNodePracticeSection">
                              <span className="text-xs font-medium text-gray-600">
                                {Math.round((mockProgress.correct / mockProgress.total) * 100)}% correct
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="apple-section-card-indicator"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Practice Section Content */}
            <div className="mb-10">
              {/* Concept graph navigation will return in Plan 2 with prerequisite-edge support */}

              {/* Matrix Heatmap */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <h4 className="apple-heading-2">System × Condition Matrix</h4>
                  <button 
                    className="ml-auto apple-button-small"
                    onClick={() => setShowMatrixView(prev => !prev)}
                  >
                    {showMatrixView ? 'Hide Matrix' : 'Show Matrix'}
                  </button>
                </div>
                
                {showMatrixView && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">System</th>
                            {conditionStructure.map(c => (
                              <th key={c.condition} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {c.condition.split(' ').slice(0, 2).join(' ')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {availableSystems.map(system => (
                            <tr key={system} className={system === activeSystem ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                {system}
                              </td>
                              {conditionStructure.map(c => {
                                // Calculate intensity based on question count
                                const count = questionCounts.conditionCounts[c.condition] || 0;
                                const intensity = Math.min(0.8, Math.max(0.1, count / 5));
                                const isSelected = filterOptions.conditions.includes(c.condition);
                                
                                return (
                                  <td 
                                    key={`${system}-${c.condition}`} 
                                    className={`px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 rounded' : ''}`}
                                    style={{ 
                                      backgroundColor: isSelected ? 
                                        `rgba(59, 130, 246, ${intensity})` : 
                                        `rgba(209, 213, 219, ${intensity})`,
                                      color: isSelected ? 'white' : undefined
                                    }}
                                    onClick={() => {
                                      // Toggle this condition in the filter
                                      const updatedConditions = isSelected
                                        ? filterOptions.conditions.filter(cond => cond !== c.condition)
                                        : [...filterOptions.conditions, c.condition];
                                        
                                      setFilterOptions({
                                        ...filterOptions,
                                        conditions: updatedConditions
                                      });
                                    }}
                                  >
                                    {count > 0 ? count : '·'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Presentations Filter */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <h4 className="apple-heading-2">Presentations</h4>
                  <button 
                    className="ml-auto apple-button-small"
                    onClick={() => {
                      // Toggle between all/none presentations
                      if (filterOptions.presentations.length === availablePresentations.length) {
                        setFilterOptions({
                          ...filterOptions,
                          presentations: []
                        });
                      } else {
                        setFilterOptions({
                          ...filterOptions,
                          presentations: [...availablePresentations]
                        });
                      }
                    }}
                  >
                    {filterOptions.presentations.length === availablePresentations.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {availablePresentations.map(presentation => {
                    const isSelected = filterOptions.presentations.includes(presentation);
                    return (
                      <div 
                        key={presentation}
                        onClick={() => {
                          const updatedPresentations = isSelected
                            ? filterOptions.presentations.filter(p => p !== presentation)
                            : [...filterOptions.presentations, presentation];
                            
                          setFilterOptions({
                            ...filterOptions,
                            presentations: updatedPresentations
                          });
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${isSelected ? 
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-1 ring-blue-400' : 
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                      >
                        {presentation}
                      </div>
                    );
                  })}
                  {availablePresentations.length === 0 && (
                    <div className="text-gray-500 italic">No presentations available for this system</div>
                  )}
                </div>
              </div>
              
              {/* Conditions */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <h4 className="apple-heading-2">Conditions</h4>
                  <button 
                    className="ml-auto apple-button-small"
                    onClick={() => {
                      const allCompetencyIds = conditionStructure.flatMap(condition => 
                        condition.competencies.map(competency => competency.id)
                      );
                      const allSelected = allCompetencyIds.every(id => filterOptions.competencies.includes(id));
                      if (allSelected) {
                        setFilterOptions({
                          ...filterOptions,
                          competencies: []
                        });
                      } else {
                        setFilterOptions({
                          ...filterOptions,
                          competencies: allCompetencyIds
                        });
                      }
                    }}
                  >
                    {conditionStructure.flatMap(condition => condition.competencies.map(competency => competency.id)).every(id => filterOptions.competencies.includes(id)) 
                      ? 'Deselect All' 
                      : 'Select All'}
                  </button>
                </div>
                
                {/* Condition list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {conditionStructure.map((conditionData) => {
                    const condition = conditionData.condition;
                    const competencies = conditionData.competencies || [];
                    const isExpanded = expandedConditions[condition] || false;
                    const mockProgress = {
                      correct: condition === 'ST-elevation Myocardial Infarction' ? 2 : 1,
                      incorrect: condition === 'ST-elevation Myocardial Infarction' ? 1 : 0,
                      total: condition === 'ST-elevation Myocardial Infarction' ? 3 : 1
                    };
                    const cardBackground = mockProgress.total > 0 ? 
                      `linear-gradient(to right, 
                        rgba(16, 185, 129, 0.08) 0%, 
                        rgba(16, 185, 129, 0.08) ${(mockProgress.correct / (questionCounts.conditionCounts[condition] || 1)) * 100}%, 
                        rgba(239, 68, 68, 0.08) ${(mockProgress.correct / (questionCounts.conditionCounts[condition] || 1)) * 100}%, 
                        rgba(239, 68, 68, 0.08) ${((mockProgress.correct + mockProgress.incorrect) / (questionCounts.conditionCounts[condition] || 1)) * 100}%, 
                        var(--card-bg) ${((mockProgress.correct + mockProgress.incorrect) / (questionCounts.conditionCounts[condition] || 1)) * 100}%, 
                        var(--card-bg) 100%)` : 
                      'var(--card-bg)';
                    return (
                      <div 
                        key={condition} 
                        className={`rounded-xl border overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md border-blue-300 ring-2 ring-blue-100 dark:border-gray-500 dark:ring-gray-700`}
                        style={{ background: cardBackground }}
                      >
                        <div 
                          className="relative p-4 cursor-pointer overflow-hidden"
                          onClick={() => {
                            setExpandedConditions((prev: Record<string, boolean>) => ({
                              ...prev,
                              [condition]: !prev[condition]
                            }));
                          }}
                        >
                          <div className="flex items-start">
                            <div className="flex-grow">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">{condition}</h3>
                                <ChevronRight className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`} />
                              </div>
                              <div className="mt-1 flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <span className="mr-2" data-component-name="ConceptNodePracticeSection">
                                  {competencies.filter(competency => mockProgress.total > 0).length}/{competencies.length} competencies
                                </span>
                                <span>•</span>
                                <span className="mx-2">
                                  {mockProgress.total}/{questionCounts.conditionCounts[condition] || 0} questions
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {isExpanded && competencies.length > 0 && (
                          <div className="bg-gray-50 dark:bg-gray-800 animate-slideDown divide-y divide-gray-100 dark:divide-gray-700">
                            {competencies.map((competency: {id: string; name: string}) => {
                              const isCompetencySelected = filterOptions.competencies.includes(competency.id);
                              return (
                                <div 
                                  key={competency.id}
                                  className="flex items-center p-3 pl-8 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                                  onClick={() => {
                                    const updatedCompetencies = isCompetencySelected
                                      ? filterOptions.competencies.filter(c => c !== competency.id)
                                      : [...filterOptions.competencies, competency.id];
                                    setFilterOptions({
                                      ...filterOptions,
                                      competencies: updatedCompetencies
                                    });
                                  }}
                                >
                                  <div 
                                    className={`w-5 h-5 rounded-md flex items-center justify-center mr-3 transition-all duration-200 ${
                                      isCompetencySelected 
                                        ? 'bg-blue-500 text-white dark:bg-gray-500 dark:text-white' 
                                        : 'border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                    }`}
                                  >
                                    {isCompetencySelected && (
                                      <Check className="h-3 w-3 animate-checkmark" />
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-900 dark:text-gray-100">{competency.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Start Practice Button */}
              <div className="flex justify-center mt-8">
                <button
                  className="apple-button-primary"
                  onClick={handleStartPractice}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Start Practice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <ApplePracticeSession 
            questions={questions}
            section="UKMLA"
            onComplete={() => {
              setIsPracticing(false);
              setQuestions([]);
              toast.success('Practice session completed');
            }}
          />
        </div>
      )}
    </div>
  );
}
