import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Question } from '@/utils/questionBank';

// Section definitions with icons and descriptions
const SECTION_DETAILS: Record<string, { name: string, icon: LucideIcon, description: string }> = {
  'VR': { name: 'Verbal Reasoning', icon: BookOpen, description: 'Evaluate information presented in written form' },
  'DM': { name: 'Decision Making', icon: Brain, description: 'Make informed decisions based on complex information' },
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
    topics: ['Percentages', 'Ratios', 'Rates & Speed'] as MainTopic[], // Using valid MainTopic values
    difficulty: 'adaptive' as Difficulty, // Using a single Difficulty value
    interactionStatus: ['unseen', 'correct', 'incorrect'] as InteractionStatus[],
    microSkills: []
  });
  
  // No need to store topic structure in state since we're using it directly from the API response
  
  // Question counts by topic and skill
  const [questionCounts, setQuestionCounts] = useState<{
    topics: Record<string, number>;
    skills: Record<string, number>;
    total: number;
    topicCounts: Record<string, number>;
    skillCounts: Record<string, number>;
  }>({
    topics: {},
    skills: {},
    total: 0,
    topicCounts: {},
    skillCounts: {}
  });
  
  // User progress tracking
  const [userProgress, setUserProgress] = useState<{
    topics: Record<string, { correct: number; incorrect: number; total: number }>;
    skills: Record<string, { correct: number; incorrect: number; total: number }>;
  }>({
    topics: {},
    skills: {}
  });
  
  // Track filtered question count
  const [filteredCount, setFilteredCount] = useState(0);
  
  // Clean up debounce timeout when component unmounts
  useEffect(() => {
    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current);
      }
    };
  }, []);

  // Clean up debounce timeout when component unmounts
  useEffect(() => {
    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current);
      }
    };
  }, []);

  // Fetch available sections on component mount
  useEffect(() => {
    const fetchSections = async () => {
      setLoadingSections(true);
      try {
        const sections = await getAvailableSections();
        setAvailableSections(sections);
        if (sections.length > 0 && !sections.includes(activeSection)) {
          setActiveSection(sections[0]);
        }
      } catch (error) {
        console.error('Error fetching sections:', error);
        toast.error('Failed to load available sections');
      } finally {
        setLoadingSections(false);
      }
    };
    
    fetchSections();
  }, [activeSection]);
  
  // Fetch topic structure and question counts when active section changes
  useEffect(() => {
    const fetchSectionData = async () => {
      if (!activeSection) return;
      
      setIsLoading(true);
      try {
        // Fetch topic structure for the active section
        const structure = await fetchDynamicTopicStructure(activeSection);
        
        if (structure && Array.isArray(structure)) {
          // Extract topic names for default selection
          const topicNames = structure.map(item => item.topic);
          
          // Set all topics as selected by default
          setFilterOptions(prev => ({
            ...prev,
            section: activeSection,
            topics: topicNames.length > 0 ? topicNames as MainTopic[] : ['Percentages'] as MainTopic[]
          }));
        }
        
        // Fetch question counts for the active section
        const counts = await fetchQuestionCounts(activeSection);
        if (counts) {
          // Update state with all required properties
          setQuestionCounts(counts);
          
          // Set up mock user progress data
          if (structure && Array.isArray(structure)) {
            const topicNames = structure.map(item => item.topic);
            const progressData: Record<string, { correct: number; incorrect: number; total: number }> = {};
            
            topicNames.forEach(topic => {
              const topicKey = String(topic);
              // Access the topics property from counts
              const count = counts.topics[topicKey] || 0;
              progressData[topicKey] = { 
                correct: 0, 
                incorrect: 0, 
                total: count
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
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSectionData();
  }, [activeSection]);
  
  // Handle starting practice session
  const handleStartPractice = async () => {
    if (!activeSection) return;
    
    setIsLoading(true);
    try {
      // Fetch questions based on current filters
      const fetchedQuestions = await fetchQuestions({
        section: activeSection,
        topics: filterOptions.topics,
        difficulty: filterOptions.difficulty,
        interactionStatus: filterOptions.interactionStatus,
        microSkills: filterOptions.microSkills
      });
      
      if (fetchedQuestions && fetchedQuestions.length > 0) {
        // Transform questions to the format expected by ModernPracticeSession
        const questionData: QuestionData[] = fetchedQuestions.map((q: Question) => ({
          id: q.id,
          question: q.question_stem || q.individual_question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.worked_solution,
          topic: q.main_topic,
          difficulty: q.difficulty,
          tags: [q.micro_skill] // Use micro_skill as a tag
        }));
        
        setQuestions(questionData);
        setIsPracticing(true);
        
        // Notify parent component if callback provided
        if (onPracticeStart) {
          onPracticeStart(activeSection);
        }
      } else {
        toast.error('No questions match your filters. Please adjust and try again.');
      }
    } catch (error) {
      console.error('Error starting practice:', error);
      toast.error('Failed to start practice session');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle completing practice session
  const handleCompletePractice = () => {
    setIsPracticing(false);
    setQuestions([]);
  };
  
  // Debounce timer reference for filter updates
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle filter changes with debouncing to prevent flickering
  const handleFilterChange = useCallback((newFilters: PracticeFilterOptions) => {
    const updatedFilters = {
      ...newFilters,
      section: activeSection
    };
    
    // Update filter options immediately without triggering count update
    setFilterOptions(updatedFilters);
    
    // Clear any existing timeout to debounce multiple rapid changes
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }
    
    // Set a new timeout to update the filtered count after a delay
    filterDebounceRef.current = setTimeout(() => {
      // Use the memoized countFilteredQuestions function
      countFilteredQuestions(updatedFilters)
        .then(count => {
          // Only update if the count has actually changed to prevent unnecessary re-renders
          if (count !== filteredCount) {
            setFilteredCount(count);
          }
        })
        .catch((error: Error) => {
          console.error('Error counting filtered questions:', error);
          setFilteredCount(0);
        });
    }, 300); // 300ms debounce delay
  }, [activeSection, filteredCount]);
  
  // Handle section change
  const handleSectionChange = (section: string) => {
    if (section !== activeSection) {
      setActiveSection(section);
    }
  };
  
  // If loading sections, show skeleton UI
  if (loadingSections) {
    return (
      <div className="max-w-4xl mx-auto pt-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Render practice session if practicing
  if (isPracticing && questions.length > 0) {
    return (
      <ModernPracticeSession
        questions={questions}
        onComplete={handleCompletePractice}
        // section prop removed as it's not in PracticeSessionProps interface
      />
    );
  }
  
  // Render practice setup UI
  return (
    <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Practice</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Select a section and customize your practice session
          </p>
        </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {availableSections.map(section => {
          const SectionIcon = SECTION_DETAILS[section]?.icon || Target;
          return (
            <Button
              key={section}
              onClick={() => handleSectionChange(section)}
              variant={section === activeSection ? "default" : "outline"}
              className={cn(
                "h-9 sm:h-10 px-3 sm:px-4 text-sm rounded-md",
                section === activeSection 
                  ? "bg-primary text-primary-foreground" 
                  : "text-foreground"
              )}
            >
              <SectionIcon className="mr-2 h-4 w-4" />
              {SECTION_DETAILS[section]?.name || section}
            </Button>
          );
        })}
      </div>
      
      {!isPracticing && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Target Practice
            </CardTitle>
            <CardDescription>
              Practice questions from specific topics and track your progress
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            <PracticeFilters
              section={activeSection}
              filters={filterOptions}
              onFiltersChange={handleFilterChange}
              questionCounts={questionCounts}
              userProgress={userProgress}
              isLoading={isLoading}
              filteredQuestionCount={filteredCount}
              onFilteredCountChange={setFilteredCount}
            />
          </CardContent>
          <CardFooter className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{filteredCount}</span> questions match your filters
            </div>
            <Button
              onClick={handleStartPractice}
              disabled={isLoading || filteredCount === 0}
              className="bg-primary hover:bg-primary/90 text-white h-9 text-sm rounded flex items-center gap-1.5"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Start Practice
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
