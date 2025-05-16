import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Recommendation } from '@/types/dashboard';
import { 
  LightbulbIcon, Clock, X, BookOpen, 
  ArrowRight, PenLine, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  onRecommendationAction: (id: string, action: string) => void;
  isLoading?: boolean;
}

const getRecommendationIcon = (type: Recommendation['type']) => {
  switch (type) {
    case 'practice':
      return <PenLine className="h-4 w-4" />;
    case 'review':
      return <RefreshCw className="h-4 w-4" />;
    case 'learn':
      return <BookOpen className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
};

const getDifficultyColor = (difficulty: Recommendation['difficulty']) => {
  switch (difficulty) {
    case 'easy':
      return 'text-green-500 bg-green-500/10';
    case 'medium':
      return 'text-orange-500 bg-orange-500/10';
    case 'hard':
      return 'text-red-500 bg-red-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

const RecommendationsPanel = React.memo(({ 
  recommendations, 
  onRecommendationAction,
  isLoading
}: RecommendationsPanelProps) => {
  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <LightbulbIcon className="h-5 w-5 text-primary" />
          Personalized Recommendations
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full mb-2" />
            ))
          ) : recommendations.length > 0 ? (
            recommendations.map((rec) => (
              <div 
                key={rec.id} 
                className="group p-3 rounded-lg border border-border hover:border-primary/20 transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1 rounded-md",
                      rec.type === 'practice' ? "bg-blue-500/10 text-blue-500" :
                      rec.type === 'review' ? "bg-purple-500/10 text-purple-500" :
                      "bg-teal-500/10 text-teal-500"
                    )}>
                      {getRecommendationIcon(rec.type)}
                    </div>
                    <h3 className="font-medium">{rec.title}</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRecommendationAction(rec.id, 'dismiss')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs font-normal", getDifficultyColor(rec.difficulty))}
                    >
                      {rec.difficulty}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {rec.estimatedTime}m
                    </span>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => onRecommendationAction(rec.id, 'start')}
                  >
                    Start
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <LightbulbIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Complete more practice sessions to receive personalized recommendations.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

RecommendationsPanel.displayName = 'RecommendationsPanel';

export default RecommendationsPanel;