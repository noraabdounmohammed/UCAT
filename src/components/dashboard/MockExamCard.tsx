import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MockData } from '@/types/dashboard';
import { 
  Clock, Timer, BadgeCheck, Calendar, 
  Play, LineChart, AlertCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MockExamCardProps {
  mockData: MockData;
  onMockStart: (type: 'timed' | 'untimed') => void;
  isLoading?: boolean;
  className?: string;
}

const MockExamCard = React.memo(({ 
  mockData, 
  onMockStart,
  isLoading,
  className
}: MockExamCardProps) => {
  const [activeMode, setActiveMode] = useState<'timed' | 'untimed'>('timed');
  const hasRecentMock = mockData.lastDate && new Date(mockData.lastDate).getTime() > 0;
  
  const handleStartClick = () => {
    onMockStart(activeMode);
  };
  
  const renderLastScoreSection = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center space-y-2">
          <Skeleton className="h-12 w-20 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      );
    }
    
    if (!hasRecentMock) {
      return (
        <div className="text-center text-muted-foreground">
          <p className="mb-1">No mock exams taken yet</p>
          <p className="text-sm">Take your first mock to establish a baseline score.</p>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2">
          <div className="text-3xl font-bold">{mockData.lastScore}</div>
          {mockData.lastScore > mockData.averageScore && (
            <BadgeCheck className="h-5 w-5 text-green-500" />
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(mockData.lastDate), { addSuffix: true })}</span>
        </div>
      </div>
    );
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-b from-primary/5 to-transparent">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          Mock Exam
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-5">
        <div className="mb-2 py-3">
          {renderLastScoreSection()}
        </div>
        
        <Tabs
          defaultValue="timed"
          value={activeMode}
          onValueChange={(value) => setActiveMode(value as 'timed' | 'untimed')}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="timed" className="gap-1.5">
              <Timer className="h-3.5 w-3.5" />
              Timed
            </TabsTrigger>
            <TabsTrigger value="untimed" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Untimed
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="timed" className="mt-0 text-sm text-muted-foreground">
            <div className="space-y-3">
              <p className="flex items-start gap-2">
                <Timer className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Simulates the real exam with strict time limits per section</span>
              </p>
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Requires 2 hours of uninterrupted time</span>
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="untimed" className="mt-0 text-sm text-muted-foreground">
            <div className="space-y-3">
              <p className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Practice at your own pace without time constraints</span>
              </p>
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Ideal for learning and building confidence</span>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="p-4 pt-1">
        {isLoading ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : (
          <Button 
            onClick={handleStartClick} 
            className="w-full gap-1"
            variant={activeMode === 'timed' ? 'default' : 'outline'}
          >
            <Play className="h-4 w-4" />
            Start {activeMode === 'timed' ? 'Timed' : 'Untimed'} Mock
          </Button>
        )}
      </CardFooter>
    </Card>
  );
});

MockExamCard.displayName = 'MockExamCard';

export default MockExamCard;