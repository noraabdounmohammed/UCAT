import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeStripProps {
  name: string;
  targetScore: number;
  currentScore: number;
  streak: number;
  isLoading?: boolean;
}

const WelcomeStrip = React.memo(
  ({ name, targetScore, currentScore, streak, isLoading }: WelcomeStripProps) => {
    // Calculate percentage of target score
    const scorePercentage = Math.min(
      Math.round((currentScore / targetScore) * 100),
      100
    );

    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-3 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-subtle p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="w-full md:w-56">
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-2 w-full" />
                </>
              ) : (
                <>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Current score</span>
                    <span className="font-medium">
                      {currentScore} / {targetScore}
                    </span>
                  </div>
                  <Progress value={scorePercentage} className="h-2" />
                </>
              )}
            </div>
            
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-4 md:mt-0" />
            ) : (
              <div 
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium mt-4 md:mt-0", 
                  streak > 0 ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"
                )}
              >
                <Flame 
                  className={cn(
                    "h-4 w-4",
                    streak > 0 && "animate-pulse"
                  )} 
                />
                <span>{streak} day streak</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

WelcomeStrip.displayName = 'WelcomeStrip';

export default WelcomeStrip;