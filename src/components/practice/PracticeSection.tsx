import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PracticeFilters } from './PracticeFilters';
import { PracticeSession } from './PracticeSession';
import { PracticeFilters as FilterType } from '@/types/practice';
import { Target, ArrowRight, Calculator, BookOpen, Brain, Scale, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetchQuestions, fetchQuestionCounts, fetchUserProgress } from '@/lib/questions';
import { toast } from 'sonner';

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
      <Card className="shadow-soft-xl overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent pb-6 md:pb-8 px-4 md:px-6">
          <CardTitle className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10">
                <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="text-xl md:text-2xl font-bold">Target Practice</div>
            </div>
            <p className="text-sm text-muted-foreground font-normal">
              Focus your practice on specific topics and skills to improve your performance
            </p>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-6 md:space-y-8">
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base md:text-lg font-semibold">Select Section</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <Button
                    key={section.id}
                    variant={isActive ? 'default' : 'outline'}
                    className={cn(
                      "h-auto py-3 md:py-4 px-4 md:px-6",
                      "flex items-center justify-start gap-3",
                      "transition-all duration-300",
                      "group hover:shadow-soft-xl",
                      isActive && "shadow-soft-xl bg-primary text-primary-foreground"
                    )}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <div className={cn(
                      "p-2 rounded-md shrink-0 transition-colors",
                      isActive ? "bg-primary-foreground/20" : "bg-muted group-hover:bg-primary/10"
                    )}>
                      <Icon className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-medium text-sm md:text-base truncate">{section.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {section.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {activeSection === 'QR' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base md:text-lg font-semibold">Select Topics</h3>
                <Badge variant="outline" className="font-normal text-xs md:text-sm">
                  Quantitative Reasoning
                </Badge>
              </div>

              <PracticeFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                questionCounts={questionCounts}
                userProgress={userProgress}
                isLoading={isLoading}
              />
            </div>
          )}
          
          <div className="flex justify-end pt-2 md:pt-4">
            <Button
              size="lg"
              disabled={!hasSelectedTopics || isLoading}
              onClick={handleStartClick}
              className={cn(
                "group relative w-full md:w-auto px-4 md:px-8 py-4 md:py-6",
                "text-base md:text-lg font-medium",
                "shadow-soft-xl hover:shadow-soft-2xl",
                "bg-primary hover:bg-primary/90",
                "transition-all duration-300",
                "disabled:opacity-50 disabled:pointer-events-none",
                hasSelectedTopics && !isLoading && "animate-pulse-soft"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Target className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground/80" />
                    Start Practice
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </span>
              
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}