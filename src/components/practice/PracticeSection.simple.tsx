import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PracticeFilters } from './PracticeFilters';
import { ModernPracticeSession, QuestionData } from './ModernPracticeSession';
import { Target, ArrowRight, Calculator } from 'lucide-react';
import { fetchQuestions, countFilteredQuestions } from '@/lib/questions';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PracticeFilterOptions, MainTopic, Difficulty, InteractionStatus } from '@/types/practice';

interface PracticeSectionProps {
  onPracticeStart?: (section: string) => void;
}

export function PracticeSection({ onPracticeStart }: PracticeSectionProps): JSX.Element {
  const [activeSection, setActiveSection] = useState('QR');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isPracticing, setIsPracticing] = useState(false);
  const [filterOptions, setFilterOptions] = useState<PracticeFilterOptions>({
    section: activeSection,
    topics: [] as MainTopic[], // Empty array instead of invalid conversion
    difficulty: ['easy', 'medium', 'hard'] as Difficulty[],
    interactionStatus: ['unseen', 'correct', 'incorrect'] as InteractionStatus[],
    microSkills: []
  });
  
  const [filteredCount, setFilteredCount] = useState<number>(0);
  
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
          content: q.question_stem,
          question_stem: q.question_stem,
          individual_question: q.individual_question,
          options: q.options,
          correctAnswer: parseInt(q.correct_answer, 10) || 0,
          correct_answer: q.correct_answer,
          explanation: q.worked_solution,
          worked_solution: q.worked_solution,
          data_block: q.data_block ? {} as Record<string, unknown> : null,
          data_type: q.data_type
        };
        
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
        console.error('Error counting filtered questions:', error);
      }
    };
    
    updateFilteredCount();
  };
  
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
      {/* Responsive header */}
      <div className="mb-6 px-4 py-4 bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-full bg-indigo-50">
            <Target className="h-4 w-4 text-indigo-600" />
          </div>
          <h1 className="text-lg font-medium text-gray-900">Target Practice</h1>
        </div>
        <p className="text-xs text-gray-500 max-w-2xl">
          Customize your practice session by selecting topics and difficulty level.
        </p>
        
        {/* Section tabs - simplified to just one section */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          <Button
            onClick={() => setActiveSection('QR')}
            variant="default"
            className="h-8 px-2.5 text-xs rounded-full bg-indigo-500 hover:bg-indigo-600 text-white"
            size="sm"
          >
            <Calculator className="h-3.5 w-3.5 mr-1.5" />
            Quantitative Reasoning
          </Button>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="p-4">
          <h2 className="text-base font-medium text-gray-800 mb-4">
            Quantitative Reasoning Practice
          </h2>
          
          <div className="space-y-6">
            {/* Practice filters */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm text-gray-700">Practice Filters</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Customize your practice session with these filters
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pt-0 pb-4">
                <PracticeFilters
                  section={activeSection}
                  filters={filterOptions}
                  onFiltersChange={handleFilterChange}
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
          </div>
        </div>
      </div>
    </div>
  );
}
