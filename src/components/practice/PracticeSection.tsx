import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PracticeFilters } from './PracticeFilters';
import { PracticeSession } from './PracticeSession';
import { Target, ArrowRight, Calculator, BookOpen, Brain, Scale, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
// UI components
import { cn } from '@/lib/utils';
import { getAvailableSections } from '@/utils/questionBank';
import { fetchQuestions, fetchQuestionCounts, fetchUserProgress } from '@/lib/questions';
import { toast } from 'sonner';

import { PracticeFilterOptions } from '@/types/practice';
import { Question } from '@/utils/questionBank';

// Use the PracticeFilterOptions type directly from the practice types
type FilterType = PracticeFilterOptions;

// Section definitions with icons and descriptions
const SECTION_DETAILS: Record<string, { name: string, icon: LucideIcon, description: string }> = {
  'VR': { name: 'Verbal Reasoning', icon: BookOpen, description: 'Evaluate information presented in written form' },
  'DM': { name: 'Decision Making', icon: Brain, description: 'Evaluate information to make informed decisions' },
  'QR': { name: 'Quantitative Reasoning', icon: Calculator, description: 'Test your numerical and analytical skills' },
  'SJ': { name: 'Situational Judgement', icon: Scale, description: 'Respond appropriately to real-world scenarios' }
};

interface PracticeSectionProps {
  onPracticeStart?: (section: string) => void;
  onMockStart?: (type: 'timed' | 'untimed') => void;
  onRecommendationAction?: (id: string, action: string) => void;
}

export function PracticeSection({ onPracticeStart, onMockStart, onRecommendationAction }: PracticeSectionProps): JSX.Element {
  const [activeSection, setActiveSection] = useState('QR');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState(true);
  const [availableSections, setAvailableSections] = useState<{id: string, name: string}[]>([]);
  const [questionCounts, setQuestionCounts] = useState<{
    topicCounts: Record<string, number>;
    skillCounts: Record<string, number>;
  }>();
  const [userProgress, setUserProgress] = useState<{
    topics: Record<string, { correct: number; incorrect: number; total: number }>;
    skills: Record<string, { correct: number; incorrect: number; total: number }>;
  }>();
  const [filters, setFilters] = useState<FilterType>({
    topics: [],
    microSkills: [],
    difficulty: 'medium' // Default to medium difficulty instead of 'all'
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showPractice, setShowPractice] = useState(false);

  // Load available sections from the database
  useEffect(() => {
    const loadSections = async () => {
      setLoadingSections(true);
      try {
        // Get available sections from the database
        const sectionIds = await getAvailableSections();
        
        // Map section IDs to their names and details using SECTION_DETAILS
        const sectionsData = sectionIds.map((id: string) => ({
          id,
          name: SECTION_DETAILS[id]?.name || id
        }));
        
        setAvailableSections(sectionsData);
      } catch (err) {
        console.error('Error loading sections:', err);
        toast.error('Failed to load available sections');
      } finally {
        setLoadingSections(false);
      }
    };

    loadSections();
  }, []);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch question counts
        const counts = await fetchQuestionCounts(activeSection);
        setQuestionCounts(counts);

        // Fetch user progress data
        const progress = await fetchUserProgress(activeSection);
        // Type assertion to ensure compatibility with state type
        setUserProgress(progress as {
          topics: Record<string, { correct: number; incorrect: number; total: number }>;
          skills: Record<string, { correct: number; incorrect: number; total: number }>;
        });
      } catch (err) {
        console.error('Error loading initial data:', err);
        toast.error('Failed to load question data');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [activeSection]);

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  const handleStartPractice = () => {
    setIsLoading(true);
    
    // Call the onPracticeStart prop if provided
    if (onPracticeStart) {
      onPracticeStart(activeSection);
    }
    
    // Fetch questions based on filters
    fetchQuestions({
      section: activeSection,
      topics: filters.topics,
      microSkills: filters.microSkills,
      difficulty: filters.difficulty
    })
      .then((questions) => {
        if (questions.length === 0) {
          toast.error('No questions found with the selected filters. Try adjusting your filters.');
          setIsLoading(false);
          return;
        }
        
        setQuestions(questions);
        setShowPractice(true);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching questions:', error);
        toast.error('Failed to load questions. Please try again.');
        setIsLoading(false);
      });
  };

  const handlePracticeComplete = () => {
    setShowPractice(false);
    setQuestions([]);
  };

  const hasSelectedTopics = filters.topics.length > 0 || filters.microSkills.length > 0;

  if (showPractice && questions.length > 0) {
    return <PracticeSession questions={questions} onComplete={handlePracticeComplete} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Enhanced header with more aesthetic design */}
      <div className="mb-10 px-6 py-8 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100/50 shadow-sm">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 shadow-md">
            <Target className="h-7 w-7 md:h-8 md:w-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">Target Practice</h1>
        </div>
        <p className="text-base md:text-lg text-gray-600 font-normal max-w-2xl">
          Focus your practice on specific topics and skills to improve your performance
        </p>
      </div>

      <div className="space-y-10">
        {/* Section selection with enhanced aesthetics */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg md:text-xl font-medium text-gray-900">Select Section</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            {loadingSections ? (
              <div className="col-span-2 flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-gray-600">Loading available sections...</span>
              </div>
            ) : (
              availableSections.map((section) => {
                const details = SECTION_DETAILS[section.id] || { 
                  name: section.name, 
                  icon: Calculator, // Default icon
                  description: 'Practice questions in this section' 
                };
                const Icon = details.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <Button
                    key={section.id}
                    variant={isActive ? 'default' : 'outline'}
                    className={cn(
                      "h-auto py-5 px-6",
                      "flex items-center justify-start gap-4",
                      "transition-all duration-200",
                      "rounded-xl border",
                      "group hover:shadow-md",
                      isActive 
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent" 
                        : "border-gray-200 bg-white text-gray-800 hover:border-indigo-200 hover:bg-indigo-50/30"
                    )}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <div className={cn(
                      "p-3 rounded-full shrink-0 transition-colors",
                      isActive ? "bg-white/20" : "bg-gray-100 group-hover:bg-indigo-100/30"
                    )}>
                      <Icon className={cn(
                        "h-6 w-6",
                        isActive ? "text-white" : "text-indigo-600"
                      )} />
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-medium text-base md:text-lg">{section.name}</div>
                    </div>
                  </Button>
                );
              })
            )}
          </div>
        </div>

        {/* Recommendations section */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg md:text-xl font-medium text-gray-900">Recommended Practice</h2>
          </div>
          
          <div className="grid gap-4">
            <div className="p-4 border border-indigo-100 rounded-lg bg-indigo-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-medium text-indigo-900">Quantitative Reasoning: Percentages</h3>
                <p className="text-sm text-indigo-700">Improve your percentage calculation skills</p>
              </div>
              <Button 
                onClick={() => onRecommendationAction && onRecommendationAction('rec-1', 'start')}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Practice Now
              </Button>
            </div>
          </div>
        </div>
        
        {/* Topic selection with enhanced aesthetics */}
        {activeSection && (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-lg md:text-xl font-medium text-gray-900">Customize Practice</h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-gray-600">Loading topics and skills...</span>
              </div>
            ) : (
              <>
                <PracticeFilters
                  section={activeSection}
                  questionCounts={questionCounts}
                  userProgress={userProgress}
                  onFiltersChange={handleFiltersChange}
                  filters={filters}
                  isLoading={isLoading}
                />

                <div className="pt-4 border-t border-gray-100 flex justify-between">
                  {/* Mock Exam button */}
                  <Button
                    onClick={() => onMockStart && onMockStart('timed')}
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    Start Mock Exam
                  </Button>
                  
                  {/* Start Practice button */}
                  <Button
                    onClick={handleStartPractice}
                    disabled={!hasSelectedTopics || isLoading}
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Start Practice
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
