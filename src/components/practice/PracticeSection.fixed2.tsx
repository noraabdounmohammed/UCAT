import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PracticeFilters } from './PracticeFilters';
import { ModernPracticeSession, QuestionData } from './ModernPracticeSession';
import { Target, ArrowRight, Calculator, BookOpen, Brain, Scale, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvailableSections } from '@/utils/questionBank';
import { fetchQuestions, fetchQuestionCounts, fetchDynamicTopicStructure, countFilteredQuestions } from '@/lib/questions';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PracticeFilterOptions, MainTopic, Difficulty, InteractionStatus } from '@/types/practice';

// Section definitions with icons and descriptions
const SECTION_DETAILS: Record<string, { name: string, icon: LucideIcon, description: string }> = {
  'VR': { name: 'Verbal Reasoning', icon: BookOpen, description: 'Evaluate information presented in written form' },
  'DM': { name: 'Decision Making', icon: Brain, description: 'Evaluate information to make informed decisions' },
  'QR': { name: 'Quantitative Reasoning', icon: Calculator, description: 'Test your numerical and analytical skills' },
  'SJ': { name: 'Situational Judgement', icon: Scale, description: 'Respond appropriately to real-world scenarios' }
};

interface PracticeSectionProps {
  onPracticeStart?: (section: string) => void;
}

export function PracticeSection({ onPracticeStart }: PracticeSectionProps): JSX.Element {
  const [activeSection, setActiveSection] = useState('QR');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState(true);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isPracticing, setIsPracticing] = useState(false);
  const [filterOptions, setFilterOptions] = useState<PracticeFilterOptions>({
    section: activeSection,
    topics: [] as MainTopic[], // Empty array instead of invalid conversion
    difficulty: ['easy', 'medium', 'hard'] as Difficulty[],
    interactionStatus: ['unseen', 'correct', 'incorrect'] as InteractionStatus[],
    microSkills: []
  });
  // Store topic structure for reference (not directly used in rendering)
  const [topicStructure, setTopicStructure] = useState<Record<string, MainTopic[]>>({});
  const [questionCounts, setQuestionCounts] = useState<{
    topicCounts: Record<string, number>;
    skillCounts: Record<string, number>;
  }>({
    topicCounts: {},
    skillCounts: {}
  });
  const [userProgress, setUserProgress] = useState<{
    topics: Record<string, { correct: number; incorrect: number; total: number }>;
    skills: Record<string, { correct: number; incorrect: number; total: number }>;
  }>({
    topics: {},
    skills: {}
  });
  const [filteredCount, setFilteredCount] = useState<number>(0);
  
  // Fetch available sections on component mount
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const sections = await getAvailableSections();
        setAvailableSections(sections.length > 0 ? sections : ['QR']);
        
        if (sections.length > 0) {
          setActiveSection(sections[0]);
        }
        
        setLoadingSections(false);
      } catch (error) {
        console.error('Error fetching available sections:', error);
        toast.error('Failed to load practice sections');
        setLoadingSections(false);
      }
    };
    
    fetchSections();
  }, []);
  
  // Fetch topic structure and question counts when active section changes
  useEffect(() => {
    const fetchSectionData = async () => {
      if (!activeSection) return;
      
      try {
        // Update section in filter options
        setFilterOptions(prev => ({
          ...prev,
          section: activeSection
        }));
        
        // Fetch topic structure for the active section
        const structure = await fetchDynamicTopicStructure(activeSection);
        if (structure && Array.isArray(structure)) {
          // Extract topic names from structure
          const topicNames = structure.map(item => item.topic) as MainTopic[];
          setTopicStructure({ [activeSection]: topicNames });
          
          // Set all topics as selected by default
          setFilterOptions(prev => ({
            ...prev,
            section: activeSection,
            topics: topicNames.length > 0 ? topicNames : [] as MainTopic[] // Empty array instead of invalid conversion
          }));
        }
        
        // Fetch question counts for the active section
        const counts = await fetchQuestionCounts(activeSection);
        if (counts) {
          // Make sure we're working with a proper Record<string, number>
          // Extract only the simple key-value pairs that match our expected type
          const typedCounts: Record<string, number> = {};
          
          // Only copy properties that are numbers
          Object.entries(counts).forEach(([key, value]) => {
            if (typeof value === 'number') {
              typedCounts[key] = value;
            }
          });
          
          setQuestionCounts({
            topicCounts: typedCounts,
            skillCounts: {}
          });
          
          // Mock user progress for now
          if (structure && Array.isArray(structure)) {
            const topicNames = structure.map(item => item.topic);
            const progressData: Record<string, { correct: number; incorrect: number; total: number }> = {};
            
            topicNames.forEach(topic => {
              const topicKey = String(topic);
              progressData[topicKey] = { 
                correct: 0, 
                incorrect: 0, 
                total: counts && typeof counts === 'object' ? 
                  // Safely access the counts object with proper type checking
                  (Object.prototype.hasOwnProperty.call(counts, topicKey) ? 
                    Number(counts[topicKey as keyof typeof counts]) : 0) : 0 
              };
            });
            
            setUserProgress({
              topics: progressData,
              skills: {}
            });
          }
        }
      } catch (error) {
        console.error('Error fetching section data:', error);
        toast.error('Failed to load practice data');
      }
    };
    
    fetchSectionData();
  }, [activeSection]);
  
  // Handle starting practice session
  const handleStartPractice = async () => {
    if (!activeSection) return;
    
    setIsLoading(true);
    
    try {
      // Make sure section is included in filter options
      const updatedFilters = {
        ...filterOptions,
        section: activeSection
      };
      
      const fetchedQuestions = await fetchQuestions(updatedFilters);
      
      if (fetchedQuestions.length === 0) {
        toast.error('No questions found with the selected filters');
        setIsLoading(false);
        return;
      }
      
      // Convert Question[] to QuestionData[] format expected by ModernPracticeSession
      const questionData = fetchedQuestions.map((q) => {
        // Create a compatible QuestionData object
        const questionData: QuestionData = {
          id: q.id,
          // Map question fields to QuestionData format
          content: q.question_stem,
          question_stem: q.question_stem,
          individual_question: q.individual_question,
          options: q.options,
          correctAnswer: parseInt(q.correct_answer, 10) || 0,
          correct_answer: q.correct_answer,
          explanation: q.worked_solution,
          worked_solution: q.worked_solution,
          // Convert data_block to a compatible format
          data_block: q.data_block ? {} as Record<string, unknown> : null,
          data_type: q.data_type
        };
        
        // Add any additional properties
        return questionData;
      });
      
      setQuestions(questionData);
      setIsPracticing(true);
      
      // Notify parent component if callback provided
      if (onPracticeStart) {
        onPracticeStart(activeSection);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load practice questions');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle completing practice session
  const handleCompletePractice = () => {
    setIsPracticing(false);
    setQuestions([]);
  };
  
  // Handle filter changes
  const handleFilterChange = (newFilters: PracticeFilterOptions) => {
    // Make sure section is included in filter options
    const updatedFilters = {
      ...newFilters,
      section: activeSection
    };
    
    setFilterOptions(updatedFilters);
    
    // Update filtered count when filters change
    const updateFilteredCount = async () => {
      try {
        const count = await countFilteredQuestions(updatedFilters);
        setFilteredCount(count);
      } catch (error) {
        console.error('COUNT ERROR: Error counting filtered questions:', error);
      }
    };
    
    updateFilteredCount();
  };
  
  // If loading sections, show skeleton UI
  if (loadingSections) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8 px-4 sm:px-6 py-4 sm:py-6 bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="h-6 w-40 bg-gray-200 animate-pulse"></div>
          </div>
          <div className="h-4 w-full max-w-md mb-6 bg-gray-200 animate-pulse"></div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-20 rounded-full bg-gray-200 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // If practicing, show practice session
  if (isPracticing && questions.length > 0) {
    return (
      <ModernPracticeSession 
        questions={questions} 
        onComplete={handleCompletePractice} 
      />
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Responsive, aesthetic header */}
      <div className="mb-6 sm:mb-8 px-4 sm:px-6 py-4 sm:py-6 bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="p-1.5 sm:p-2 rounded-full bg-indigo-50">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
          </div>
          <h1 className="text-lg sm:text-xl font-medium text-gray-900">Target Practice</h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 max-w-2xl">
          Customize your practice session by selecting a section, topics, and difficulty level. 
          Focus on areas you need to improve or test your knowledge across all topics.
        </p>
        
        {/* Section tabs */}
        <div className="mt-4 sm:mt-5 flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
          {availableSections.map(section => {
            const SectionIcon = SECTION_DETAILS[section]?.icon || Target;
            return (
              <Button
                key={section}
                onClick={() => setActiveSection(section)}
                variant={section === activeSection ? "default" : "outline"}
                className={cn(
                  "h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm rounded-full",
                  section === activeSection 
                    ? "bg-indigo-500 hover:bg-indigo-600 text-white" 
                    : "text-gray-600 border-gray-200"
                )}
                size="sm"
              >
                <SectionIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                {SECTION_DETAILS[section]?.name || section}
              </Button>
            );
          })}
        </div>
      </div>
      
      {/* Main content area */}
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-800 mb-4 sm:mb-5">
            {SECTION_DETAILS[activeSection]?.name || activeSection} Practice
          </h2>
          
          <div className="space-y-6">
            {/* Practice filters */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm sm:text-base text-gray-700">Practice Filters</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Customize your practice session with these filters
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pt-0 pb-4">
                <PracticeFilters
                  section={activeSection}
                  filters={filterOptions}
                  onFiltersChange={handleFilterChange}
                  questionCounts={questionCounts}
                  userProgress={userProgress}
                  isLoading={isLoading}
                  filteredQuestionCount={filteredCount}
                />
              </CardContent>
              <CardFooter className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{filteredCount}</span> questions match your filters
                </div>
                <Button
                  onClick={handleStartPractice}
                  disabled={isLoading || filteredCount === 0}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white h-8 text-xs rounded flex items-center gap-1.5"
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Start Practice
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Section information */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">About {SECTION_DETAILS[activeSection]?.name || activeSection}</h3>
              <p className="text-xs text-gray-600 mb-3">{SECTION_DETAILS[activeSection]?.description || "Practice questions for this section"}</p>
              
              {/* Topic stats */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-600">Topics Available:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topicStructure[activeSection]?.map((topic, index) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded p-2 text-xs border border-gray-100">
                      <span className="text-gray-700">{topic}</span>
                      <span className="text-gray-500 font-medium">
                        {questionCounts.topicCounts[String(topic)] || 0} questions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
