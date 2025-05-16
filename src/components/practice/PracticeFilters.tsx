import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  MainTopic,
  MicroSkill,
  PracticeFilterOptions,
  TOPICS_STRUCTURE
} from '@/types/practice';

interface PracticeFiltersProps {
  filters: PracticeFilterOptions;
  onFiltersChange: (filters: PracticeFilterOptions) => void;
  questionCounts?: {
    topicCounts: Record<string, number>;
    skillCounts: Record<string, number>;
  };
  userProgress?: {
    topics: Record<string, { correct: number; incorrect: number; total: number }>;
    skills: Record<string, { correct: number; incorrect: number; total: number }>;
  };
  isLoading?: boolean;
}

interface Progress {
  correct: number;
  incorrect: number;
  total: number;
}

const getTopicProgress = (topic: MainTopic, userProgress?: PracticeFiltersProps['userProgress']) => {
  if (userProgress?.topics[topic]) {
    return userProgress.topics[topic];
  }
  return { correct: 0, incorrect: 0, total: 0 };
};

const getSkillProgress = (skillId: string, userProgress?: PracticeFiltersProps['userProgress']) => {
  if (userProgress?.skills[skillId]) {
    return userProgress.skills[skillId];
  }
  return { correct: 0, incorrect: 0, total: 0 };
};

const ProgressBar = ({ progress }: { progress: Progress }) => (
  <div className="hidden md:flex items-center gap-2 flex-1 min-w-0">
    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden flex">
      <div 
        className="h-full bg-emerald-500/40 transition-all duration-300"
        style={{ width: `${(progress.correct / progress.total) * 100}%` }}
      />
      <div 
        className="h-full bg-rose-500/40 transition-all duration-300"
        style={{ width: `${(progress.incorrect / progress.total) * 100}%` }}
      />
    </div>
    <div className="text-xs text-muted-foreground whitespace-nowrap">
      <span className="text-emerald-600/70 font-medium">{progress.correct}</span>
      {" "}
      <span className="text-rose-600/70 font-medium">{progress.incorrect}</span>
      {" / "}
      <span className="font-medium">{progress.total}</span>
    </div>
  </div>
);

const ProgressBadge = ({ progress }: { progress: Progress }) => {
  const percentage = Math.round((progress.correct / progress.total) * 100);
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "md:hidden whitespace-nowrap",
        percentage >= 75 ? "text-emerald-600/70 border-emerald-600/30" :
        percentage >= 50 ? "text-amber-600/70 border-amber-600/30" :
        "text-rose-600/70 border-rose-600/30"
      )}
    >
      {percentage}%
    </Badge>
  );
};

const safeTopicsStructure = (Array.isArray(TOPICS_STRUCTURE) ? TOPICS_STRUCTURE : []).map(topic => ({
  ...topic,
  skills: Array.isArray(topic.skills) ? topic.skills : []
}));

export function PracticeFilters({ filters, onFiltersChange, questionCounts, userProgress, isLoading }: PracticeFiltersProps) {
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);

  const availableSkills = React.useMemo(() => {
    if (filters.topics.length === 0) return safeTopicsStructure.flatMap(t => t.skills);
    return safeTopicsStructure
      .filter(t => filters.topics.includes(t.topic))
      .flatMap(t => t.skills);
  }, [filters.topics]);

  const allTopics = React.useMemo(() => 
    safeTopicsStructure.map(t => t.topic), 
    []
  );

  const allSkills = React.useMemo(() => 
    safeTopicsStructure.flatMap(t => t.skills.map(s => s.id)),
    []
  );

  const handleTopicToggle = (topic: MainTopic, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const topicSkills = safeTopicsStructure
      .find(t => t.topic === topic)
      ?.skills.map(s => s.id) || [];
    
    let newTopics: MainTopic[];
    let newSkills: string[];
    
    if (filters.topics.includes(topic)) {
      newTopics = filters.topics.filter(t => t !== topic);
      newSkills = filters.microSkills.filter(s => !topicSkills.includes(s));
    } else {
      newTopics = [...filters.topics, topic];
      newSkills = [...new Set([...filters.microSkills, ...topicSkills])];
      
      if (!expandedTopics.includes(topic)) {
        setExpandedTopics(prev => [...prev, topic]);
      }
    }

    onFiltersChange({
      ...filters,
      topics: newTopics,
      microSkills: newSkills,
    });
  };

  const handleTopicExpand = (topic: string) => {
    setExpandedTopics(prev => 
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const handleSkillToggle = (skillId: string, topic: MainTopic) => {
    const topicSkills = safeTopicsStructure
      .find(t => t.topic === topic)
      ?.skills.map(s => s.id) || [];
    
    let newSkills: string[];
    let newTopics = [...filters.topics];
    
    if (filters.microSkills.includes(skillId)) {
      newSkills = filters.microSkills.filter(s => s !== skillId);
      
      const hasOtherSkillsSelected = topicSkills.some(s => newSkills.includes(s));
      if (!hasOtherSkillsSelected) {
        newTopics = newTopics.filter(t => t !== topic);
      }
    } else {
      newSkills = [...filters.microSkills, skillId];
      
      const allTopicSkillsSelected = topicSkills.every(s => 
        newSkills.includes(s)
      );
      if (allTopicSkillsSelected && !newTopics.includes(topic)) {
        newTopics.push(topic);
      }
    }

    onFiltersChange({
      ...filters,
      topics: newTopics,
      microSkills: newSkills,
    });
  };

  const overallProgress = React.useMemo(() => {
    if (!userProgress) return { correct: 0, incorrect: 0, total: 0 };
    return Object.values(userProgress.topics).reduce(
      (acc, curr) => ({
        correct: acc.correct + curr.correct,
        incorrect: acc.incorrect + curr.incorrect,
        total: acc.total + curr.total
      }),
      { correct: 0, incorrect: 0, total: 0 }
    );
  }, [userProgress]);

  return (
    <Card className="overflow-hidden border shadow-soft-xl">
      <div className="rounded-lg bg-card/50 backdrop-blur-sm divide-y divide-border">
        {/* All QR Topics Section */}
        <div className="bg-muted/20">
          <div className="flex items-center gap-3 w-full p-3 md:p-4">
            <div className="relative">
              <Checkbox
                checked={filters.topics.length === allTopics.length}
                className="transition-transform data-[state=checked]:scale-105"
                onClick={() => {
                  const newTopics = filters.topics.length === allTopics.length ? [] : allTopics;
                  const newSkills = filters.microSkills.length === allSkills.length ? [] : allSkills;
                  onFiltersChange({
                    ...filters,
                    topics: newTopics,
                    microSkills: newSkills,
                  });
                }}
              />
            </div>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <span className="font-semibold text-sm md:text-base w-[140px] md:w-[200px] shrink-0 truncate">All QR Topics</span>
              <ProgressBar progress={overallProgress} />
              <ProgressBadge progress={overallProgress} />
            </div>
          </div>
        </div>

        {/* Individual Topics */}
        {safeTopicsStructure.map((topicGroup) => {
          const topicProgress = getTopicProgress(topicGroup.topic, userProgress);
          const isTopicSelected = filters.topics.includes(topicGroup.topic);
          const isExpanded = expandedTopics.includes(topicGroup.topic);
          
          return (
            <div 
              key={topicGroup.topic}
              className={cn(
                "transition-colors",
                isTopicSelected && "bg-primary/5"
              )}
            >
              <div 
                className={cn(
                  "flex items-center gap-3 w-full p-3 md:p-4 cursor-pointer transition-all",
                  "hover:bg-muted/50 group",
                  isTopicSelected && "bg-primary/5"
                )}
                onClick={() => handleTopicExpand(topicGroup.topic)}
              >
                <div 
                  className="relative"
                  onClick={(e) => handleTopicToggle(topicGroup.topic, e)}
                >
                  <Checkbox
                    checked={isTopicSelected}
                    className="transition-transform data-[state=checked]:scale-105"
                  />
                </div>
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="font-medium text-sm md:text-base w-[140px] md:w-[200px] shrink-0 truncate">
                    {topicGroup.topic}
                  </span>
                  <ProgressBar progress={topicProgress} />
                  <ProgressBadge progress={topicProgress} />
                  <ChevronsUpDown 
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="space-y-1 p-2 md:p-4 bg-muted/30">
                  {topicGroup.skills.map((skill) => {
                    const skillProgress = getSkillProgress(skill.id, userProgress);
                    const isSkillSelected = filters.microSkills.includes(skill.id);
                    
                    return (
                      <div 
                        key={skill.id}
                        className={cn(
                          "group/skill flex items-center gap-3 py-2 px-2 md:px-3 rounded-md transition-all cursor-pointer",
                          "hover:bg-muted/50",
                          isSkillSelected && "bg-primary/5"
                        )}
                        onClick={() => handleSkillToggle(skill.id, topicGroup.topic)}
                      >
                        <div className="relative">
                          <Checkbox
                            checked={isSkillSelected}
                            className="transition-transform group-hover/skill:scale-105"
                          />
                        </div>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <span className="text-xs md:text-sm w-[140px] md:w-[200px] shrink-0 truncate">
                            {skill.name}
                          </span>
                          <ProgressBar progress={skillProgress} />
                          <ProgressBadge progress={skillProgress} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default PracticeFilters;