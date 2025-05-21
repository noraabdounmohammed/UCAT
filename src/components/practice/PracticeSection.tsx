import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PracticeFilters } from './PracticeFilters';
import { PracticeSession } from './PracticeSession';
import { Target, ArrowRight, Calculator, BookOpen, Brain, Scale, Loader2, ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
// UI components
import { cn } from '@/lib/utils';
import { getAvailableSections } from '@/utils/questionBank';
import { fetchQuestions, fetchQuestionCounts, fetchUserProgress, fetchDynamicTopicStructure } from '@/lib/questions';
import { toast } from 'sonner';

import { PracticeFilterOptions, ProgressData } from '@/types/practice';
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
  onBackToDashboard?: () => void;
}

export function PracticeSection({ onPracticeStart, onMockStart, onBackToDashboard }: PracticeSectionProps): JSX.Element {
  const [activeSection, setActiveSection] = useState('QR');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState(true);
  const [availableSections, setAvailableSections] = useState<{id: string, name: string}[]>([]);
  const [questionCounts, setQuestionCounts] = useState<{
    topicCounts: Record<string, number>;
    skillCounts: Record<string, number>;
  }>();
  const [userProgress, setUserProgress] = useState<{
    topics: Record<string, ProgressData>;
    skills: Record<string, ProgressData>;
  }>();
  const [filters, setFilters] = useState<FilterType>({
    section: 'QR',
    topics: [],
    microSkills: [],
    difficulty: 'medium', // Default to medium difficulty instead of 'all'
    interactionStatus: [] // Initialize with empty array
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showPractice, setShowPractice] = useState(false);
  const [mode, setMode] = useState<'filter' | 'practice'>('filter');

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
        // Fetch dynamic topic structure
        await fetchDynamicTopicStructure(activeSection);
        
        // Fetch question counts
        const counts = await fetchQuestionCounts(activeSection);
        setQuestionCounts(counts);

        // Fetch user progress data
        const progress = await fetchUserProgress(activeSection);
        setUserProgress(progress);
        
        // Reset filters when changing sections
        setFilters({
          section: activeSection,
          topics: [],
          microSkills: [],
          difficulty: 'medium',
          interactionStatus: []
        });
        
        console.log(`Loaded data for section: ${activeSection}`);
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
    // Always ensure the section is set in the filters
    setFilters({
      ...newFilters,
      section: activeSection
    });
  };

  const handleStartPractice = async () => {
    console.log('handleStartPractice called with filters:', filters);
    try {
      setIsLoading(true);
      
      // Validate filters - either topics or skills must be selected
      const hasTopics = filters.topics.length > 0;
      const hasSkills = filters.microSkills.length > 0;
      
      console.log('Filter validation:', { hasTopics, hasSkills, microSkills: filters.microSkills });
      
      if (!hasTopics && !hasSkills) {
        toast.error('Please select at least one topic or skill to practice');
        setIsLoading(false);
        return;
      }
      
      // Call the onPracticeStart prop if provided with all filter information
      if (onPracticeStart) {
        // Convert filters to a serializable format and pass to the callback
        onPracticeStart(activeSection);
        return; // Early return as we're navigating away
      }
      
      console.log('Fetching questions with filters:', {
        section: activeSection,
        topics: filters.topics,
        skills: filters.microSkills,
        difficulty: filters.difficulty
      });
      
      // Fetch questions based on filters
      const fetchedQuestions = await fetchQuestions({...filters, section: activeSection});
      console.log('Fetched questions:', fetchedQuestions);
      
      if (!fetchedQuestions || fetchedQuestions.length === 0) {
        toast.error('No questions found with the selected filters. Try different filters.');
        setIsLoading(false);
        return;
      }
      
      // Update state
      setQuestions(fetchedQuestions);
      setMode('practice');
      setShowPractice(true);
      setIsLoading(false);
      
      console.log('Practice session started with', fetchedQuestions.length, 'questions');
    } catch (error) {
      console.error('Error starting practice:', error);
      toast.error('Failed to load questions. Please try again.');
      setIsLoading(false);
    }
  };

  const handlePracticeComplete = async () => {
    try {
      // Refresh user progress after completing practice
      const updatedProgress = await fetchUserProgress(activeSection);
      setUserProgress(updatedProgress);
      
      // Reset to filter selection
      setMode('filter');
      setShowPractice(false);
      setQuestions([]);
      
      toast.success('Practice completed! Your progress has been updated.');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress. Please try again.');
    }
  };
  
  const handleBackToDashboard = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      // Fallback if no callback provided
      setMode('filter');
      setShowPractice(false);
    }
  };

  // Check if any topics or skills are selected directly in the button's disabled prop

  if (mode === 'practice' && showPractice && questions.length > 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBackToDashboard}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Target Practice</h1>
        </div>
        <PracticeSession 
          questions={questions} 
          onComplete={handlePracticeComplete} 
        />
      </div>
    );
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

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  {/* Start Practice button */}
                  <Button
                    onClick={handleStartPractice}
                    disabled={(filters.topics.length === 0 && filters.microSkills.length === 0) || isLoading}
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
