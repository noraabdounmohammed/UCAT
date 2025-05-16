import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PracticeFilters } from './PracticeFilters';
import { PracticeSession } from './PracticeSession';
import { Target, ArrowRight, Calculator, BookOpen, Brain, Scale, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetchQuestions, fetchQuestionCounts, fetchUserProgress } from '@/lib/questions';
import { toast } from 'sonner';

interface FilterType {
  topics: string[];
  microSkills: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
}

interface PracticeSectionProps {
  onStartPractice: (questions: any[]) => void;
}

const SECTIONS = [
  { id: 'VR', name: 'Verbal Reasoning', icon: BookOpen, description: 'Evaluate information presented in written form' },
  { id: 'DM', name: 'Decision Making', icon: Brain, description: 'Evaluate information to make informed decisions' },
  { id: 'QR', name: 'Quantitative Reasoning', icon: Calculator, description: 'Test your numerical and analytical skills' },
  { id: 'SJ', name: 'Situational Judgement', icon: Scale, description: 'Respond appropriately to real-world scenarios' }
];

export function PracticeSection({ onStartPractice }: PracticeSectionProps) {
  const [activeSection, setActiveSection] = useState('QR');
  const [isLoading, setIsLoading] = useState(false);
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
    difficulty: 'adaptive'
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const [showPractice, setShowPractice] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [counts, progress] = await Promise.all([
          fetchQuestionCounts(),
          fetchUserProgress()
        ]);
        setQuestionCounts(counts);
        setUserProgress(progress);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load question data');
      }
    };

    loadData();
  }, []);

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  const handleStartClick = async () => {
    try {
      setIsLoading(true);
      const fetchedQuestions = await fetchQuestions(filters);
      
      if (!fetchedQuestions || fetchedQuestions.length === 0) {
        toast.error('No questions found for the selected filters. Please try different filters.');
        return;
      }

      setQuestions(fetchedQuestions);
      setShowPractice(true);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to fetch questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <Button
                  key={section.id}
                  variant={isActive ? 'default' : 'outline'}
                  className={cn(
                    "h-auto py-5 px-6",
                    "flex items-center justify-start gap-5",
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
                  <div className="text-left min-w-0">
                    <div className="font-medium text-base md:text-lg">{section.name}</div>
                    <div className={cn(
                      "text-sm line-clamp-1 mt-1",
                      isActive ? "text-white/80" : "text-gray-500"
                    )}>
                      {section.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Topic selection with enhanced aesthetics */}
        {activeSection === 'QR' && (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-lg md:text-xl font-medium text-gray-900">Select Topics</h2>
              <Badge className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                Quantitative Reasoning
              </Badge>
            </div>

            <div className="pt-2">
              <PracticeFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                questionCounts={questionCounts}
                userProgress={userProgress}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
        
        {/* Enhanced action button */}
        <div className="flex justify-end pt-4 md:pt-6">
          <Button
            disabled={!hasSelectedTopics || isLoading}
            className={cn(
              "relative px-8 py-4 md:px-10 md:py-5",
              "text-base md:text-lg font-medium",
              "rounded-full",
              "transition-all duration-200",
              "shadow-md hover:shadow-lg",
              hasSelectedTopics && !isLoading
                ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            )}
            onClick={handleStartClick}
          >
            <span className="flex items-center justify-center gap-3">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Target className="h-5 w-5 md:h-6 md:w-6" />
                  <span>Start Practice</span>
                  <ArrowRight className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}