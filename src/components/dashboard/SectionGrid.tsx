import React, { useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Brain, BookOpen, Calculator, Scale, 
  BarChart2, Clock, Trophy, ChevronRight 
} from 'lucide-react';
import { SectionData, SectionType } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface SectionGridProps {
  sections: Record<SectionType, SectionData>;
  onPracticeStart: (section: string) => void;
  isLoading?: boolean;
}

const getSectionIcon = (iconName: string, className = "h-5 w-5") => {
  const icons = {
    calculator: <Calculator className={className} />,
    brain: <Brain className={className} />,
    book: <BookOpen className={className} />,
    scale: <Scale className={className} />
  };
  
  return icons[iconName as keyof typeof icons] || <BookOpen className={className} />;
};

const SectionCard = React.memo(({ 
  section, 
  onPractice,
  isLoading
}: { 
  section: SectionData; 
  onPractice: () => void;
  isLoading?: boolean;
}) => {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              {getSectionIcon(section.iconName)}
            </div>
            <h3 className="font-bold text-lg">{section.name}</h3>
          </div>
        )}
        
        {isLoading ? (
          <Skeleton className="h-8 w-12 rounded-full" />
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {section.score}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Your current score in {section.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-2 w-full mb-4" />
            <div className="flex justify-between gap-4 mb-1">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{section.completedQuestions}/{section.totalQuestions} questions</span>
            </div>
            <Progress value={section.progress} className="h-2 mb-4" />
            
            <div className="flex justify-between gap-2 text-sm">
              <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
                <BarChart2 className="h-4 w-4 mb-1 text-muted-foreground" />
                <span className="font-medium">{Math.round(section.progress)}%</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
                <Clock className="h-4 w-4 mb-1 text-muted-foreground" />
                <span className="font-medium">14m</span>
              </div>
              <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
                <Trophy className="h-4 w-4 mb-1 text-muted-foreground" />
                <span className="font-medium">{section.score}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Button 
            onClick={onPractice} 
            className="w-full gap-1"
            variant="outline"
          >
            Practice {section.abbr}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
});

SectionCard.displayName = 'SectionCard';

const SectionGrid = React.memo(({ 
  sections, 
  onPracticeStart,
  isLoading 
}: SectionGridProps) => {
  const sectionList = useMemo(() => {
    return Object.values(sections);
  }, [sections]);

  return (
    <>
      {sectionList.map((section) => (
        <SectionCard
          key={section.abbr}
          section={section}
          onPractice={() => onPracticeStart(section.abbr)}
          isLoading={isLoading}
        />
      ))}
    </>
  );
});

SectionGrid.displayName = 'SectionGrid';

export default SectionGrid;