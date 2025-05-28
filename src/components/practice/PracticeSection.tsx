import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PracticeFilters } from './PracticeFilters';
import { ModernPracticeSession, QuestionData } from './ModernPracticeSession';
import { Target, ArrowRight, Calculator, BookOpen, Brain, Scale, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvailableSections, Question } from '@/utils/questionBank';
import { fetchQuestions, fetchQuestionCounts, fetchDynamicTopicStructure, countFilteredQuestions } from '@/lib/questions';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { PracticeFilterOptions, MainTopic, Difficulty, InteractionStatus } from '@/types/practice';
import { ScrollPreservationWrapper } from './ScrollPreservationWrapper';

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
    topics: ['all'] as MainTopic[],
    difficulty: ['easy', 'medium', 'hard'] as Difficulty[],
    interactionStatus: ['unseen', 'correct', 'incorrect'] as InteractionStatus[],
    microSkills: []
  });
  
  // Function to update topic structure - we don't need to track the state
  const setTopicStructure = (structure: Record<string, MainTopic[]>) => {
    // We use the structure to set filters but don't need to track it as state
    console.log('Topic structure updated:', Object.keys(structure).length, 'sections');
  };
  
  // Question counts by topic and skill
  const [questionCounts, setQuestionCounts] = useState<{
    topicCounts: Record<string, number>;
    skillCounts: Record<string, number>;
  }>({
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
  }, [activeSection]); // Include activeSection in dependency array
  
  // Fetch topic structure and question counts when active section changes
  useEffect(() => {
    const fetchSectionData = async () => {
      if (!activeSection) return;
      
      setIsLoading(true);
      try {
        // Fetch topic structure for the active section
        const structure = await fetchDynamicTopicStructure(activeSection);
        
        if (structure && Array.isArray(structure)) {
          // Store topic structure for reference
          const topicsBySection: Record<string, MainTopic[]> = {
            [activeSection]: structure.map(item => item.topic)
          };
          setTopicStructure(topicsBySection);
          
          // Extract topic names for default selection
          const topicNames = structure.map(item => item.topic);
          
          // Set all topics as selected by default
          setFilterOptions(prev => ({
            ...prev,
            section: activeSection,
            topics: topicNames.length > 0 ? topicNames : ['all'] as MainTopic[]
          }));
        }
        
        // Fetch question counts for the active section
        const countsData = await fetchQuestionCounts(activeSection);
        if (countsData) {
          // Ensure counts is the correct type (Record<string, number>)
          const topicCounts: Record<string, number> = {};
          
          // Extract only the numeric counts from the response
          // This handles the case where the API might return a complex object
          if (typeof countsData === 'object' && countsData !== null) {
            // Use a more specific type for the data structure
            const data = countsData as Record<string, unknown>;
            Object.keys(data).forEach(key => {
              // Only include numeric values in our topicCounts
              if (typeof data[key] === 'number') {
                topicCounts[key] = data[key] as number;
              }
            });
          }
          
          setQuestionCounts({
            topicCounts,
            skillCounts: {}
          });
          
          // Set up mock user progress data
          if (structure && Array.isArray(structure)) {
            const topicNames = structure.map(item => item.topic);
            const progressData: Record<string, { correct: number; incorrect: number; total: number }> = {};
            
            topicNames.forEach(topic => {
              const topicKey = String(topic);
              // Safely access the count from topicCounts
              const count = topicKey in topicCounts ? topicCounts[topicKey] : 0;
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
          question_stem: q.question_stem,
          individual_question: q.individual_question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.worked_solution,
          topic: q.main_topic,
          difficulty: q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
          tags: [q.micro_skill] // Use micro_skill as tags
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
  
  // Handle filter changes
  const handleFilterChange = (newFilters: PracticeFilterOptions) => {
    const updatedFilters = {
      ...newFilters,
      section: activeSection
    };
    setFilterOptions(updatedFilters);
    
    // Update filtered count
    countFilteredQuestions(updatedFilters)
      .then(count => {
        setFilteredCount(count);
      })
      .catch(error => {
        console.error('Error counting filtered questions:', error);
        setFilteredCount(0);
      });
  };
  
  // Handle section change
  const handleSectionChange = (section: string) => {
    if (section !== activeSection) {
      setActiveSection(section);
    }
  };
  
  // If loading sections, show skeleton UI
  if (loadingSections) {
    return (
      <div className="max-w-4xl mx-auto p-4">
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
      />
    );
  }
  
  // Render practice setup UI
  return (
    <div className="max-w-4xl mx-auto pt-8">
      
      <div className="flex flex-col space-y-1.5 mb-8">
        <h3 className="tracking-tight text-lg sm:text-xl font-bold flex items-center gap-2">
          <Target className="h-5 w-5" />
          Target Practice
        </h3>
        <p className="text-sm text-muted-foreground">
          Practice questions from specific topics and track your progress
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
          <CardContent className="pb-3 pt-6">
            <ScrollPreservationWrapper>
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
            </ScrollPreservationWrapper>
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
