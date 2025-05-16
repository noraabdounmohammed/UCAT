import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionInsights, SectionType } from '@/types/dashboard';
import { 
  HelpCircle, TrendingUp, TrendingDown, Clock, Target, 
  Zap, Play, ArrowRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartSummaryTabsProps {
  insights: SectionInsights;
  isLoading?: boolean;
}

const AccuracyTab = React.memo(({ 
  insights, 
  isLoading 
}: { 
  insights: SectionInsights['accuracy']; 
  isLoading?: boolean;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-1">
        {isLoading ? (
          <>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-2 w-full" />
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Accuracy</span>
              <span className="text-sm font-bold">{insights.overall}%</span>
            </div>
            <Progress value={insights.overall} className="h-2" />
          </>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))
        ) : (
          Object.entries(insights.bySection).map(([section, value]) => (
            <div 
              key={section} 
              className="bg-muted/50 rounded-lg p-3 flex flex-col"
            >
              <div className="text-xs text-muted-foreground mb-1">{section}</div>
              <div className="flex items-end justify-between">
                <span className="text-lg font-bold">{value}%</span>
                {value > 75 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : value > 50 ? (
                  <Target className="h-4 w-4 text-orange-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {!isLoading && (
        <div className="text-xs text-muted-foreground italic">
          <p>Tip: Focus on maintaining above 80% accuracy for optimal scoring.</p>
        </div>
      )}
    </div>
  );
});

AccuracyTab.displayName = 'AccuracyTab';

const TimeTab = React.memo(({ 
  insights, 
  isLoading 
}: { 
  insights: SectionInsights['time']; 
  isLoading?: boolean; 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Time Management Score</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-60">This score rates how effectively you manage your time across all sections. Higher is better.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "text-2xl font-bold",
                  insights.timeManagementScore > 75 ? "text-green-500" : 
                  insights.timeManagementScore > 50 ? "text-orange-500" : 
                  "text-destructive"
                )}
              >
                {insights.timeManagementScore}/100
              </div>
              <Badge
                variant="outline"
                className={cn(
                  insights.timeManagementScore > 75 ? "border-green-500 text-green-500" : 
                  insights.timeManagementScore > 50 ? "border-orange-500 text-orange-500" : 
                  "border-destructive text-destructive"
                )}
              >
                {insights.timeManagementScore > 75 ? "Excellent" : 
                 insights.timeManagementScore > 50 ? "Good" : 
                 "Needs Work"}
              </Badge>
            </div>
          </>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="text-sm font-medium">Average Time per Question</div>
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full mb-2" />
          ))
        ) : (
          Object.entries(insights.averagePerQuestion).map(([section, seconds]) => (
            <div key={section} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {section.charAt(0)}
                </div>
                <span>{section}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{seconds}s</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

TimeTab.displayName = 'TimeTab';

const TopSkillsTab = React.memo(({ 
  insights, 
  isLoading 
}: { 
  insights: SectionInsights['topSkills']; 
  isLoading?: boolean; 
}) => {
  return (
    <div className="space-y-4">
      {isLoading ? (
        Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))
      ) : insights.length > 0 ? (
        insights.map((skill, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{skill.name}</div>
                <div className="text-xs text-muted-foreground">{skill.section}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-bold">{skill.score}%</span>
            </div>
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-muted-foreground">
          Complete more practice to reveal your top skills.
        </div>
      )}
    </div>
  );
});

TopSkillsTab.displayName = 'TopSkillsTab';

const WeakAreasTab = React.memo(({ 
  insights, 
  isLoading 
}: { 
  insights: SectionInsights['weakAreas']; 
  isLoading?: boolean; 
}) => {
  return (
    <div className="space-y-4">
      {isLoading ? (
        Array(3).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full mb-2" />
        ))
      ) : insights.length > 0 ? (
        insights.map((area, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-destructive/10 text-destructive font-bold text-sm">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{area.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {area.section}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {area.score}%
                  </span>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs gap-1 hover:bg-destructive/10 hover:text-destructive"
            >
              <Play className="h-3 w-3" />
              Practice
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        ))
      ) : (
        <div className="p-4 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>Complete more practice to identify your weak areas.</p>
        </div>
      )}
    </div>
  );
});

WeakAreasTab.displayName = 'WeakAreasTab';

const SmartSummaryTabs = React.memo(({ 
  insights, 
  isLoading 
}: SmartSummaryTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>('accuracy');
  
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold">Performance Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="accuracy"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="topSkills">Top Skills</TabsTrigger>
            <TabsTrigger value="weakAreas">Weak Areas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="accuracy" className="mt-0">
            <AccuracyTab insights={insights.accuracy} isLoading={isLoading} />
          </TabsContent>
          
          <TabsContent value="time" className="mt-0">
            <TimeTab insights={insights.time} isLoading={isLoading} />
          </TabsContent>
          
          <TabsContent value="topSkills" className="mt-0">
            <TopSkillsTab insights={insights.topSkills} isLoading={isLoading} />
          </TabsContent>
          
          <TabsContent value="weakAreas" className="mt-0">
            <WeakAreasTab insights={insights.weakAreas} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

SmartSummaryTabs.displayName = 'SmartSummaryTabs';

export default SmartSummaryTabs;