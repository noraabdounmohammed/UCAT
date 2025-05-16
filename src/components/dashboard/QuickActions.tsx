import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  LayoutGrid, BookOpen, Calendar, 
  Settings, Zap, BarChart 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  isLoading?: boolean;
}

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  action: () => void;
}

const QuickActions = React.memo(({ isLoading }: QuickActionsProps) => {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  
  const handleActionClick = (label: string, action: () => void) => {
    setActiveAction(label);
    setTimeout(() => {
      action();
      setActiveAction(null);
    }, 500);
  };
  
  const actions: QuickAction[] = [
    {
      icon: <LayoutGrid className="h-4 w-4" />,
      label: 'Dashboard',
      tooltip: 'Return to the main dashboard',
      action: () => console.log('Dashboard action'),
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: 'Question Bank',
      tooltip: 'Browse all available practice questions',
      action: () => console.log('Question Bank action'),
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: 'Study Plan',
      tooltip: 'View and adjust your personalized study plan',
      action: () => console.log('Study Plan action'),
    },
    {
      icon: <BarChart className="h-4 w-4" />,
      label: 'Analytics',
      tooltip: 'In-depth performance analysis and insights',
      action: () => console.log('Analytics action'),
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: 'Settings',
      tooltip: 'Adjust your preferences and account settings',
      action: () => console.log('Settings action'),
    },
  ];
  
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row lg:flex-col gap-2">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))
          ) : (
            actions.map((action) => (
              <TooltipProvider key={action.label}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start w-full",
                        activeAction === action.label && "bg-primary/5"
                      )}
                      onClick={() => handleActionClick(action.label, action.action)}
                      disabled={activeAction !== null}
                    >
                      {activeAction === action.label ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        action.icon
                      )}
                      <span className="ml-2">{action.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
});

QuickActions.displayName = 'QuickActions';

export default QuickActions;