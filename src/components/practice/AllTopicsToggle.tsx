import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { MainTopic, PracticeFilterOptions } from '@/types/practice';

interface AllTopicsToggleProps {
  topicStructure: { topic: MainTopic; skills: { id: string; name: string }[] }[];
  filters: PracticeFilterOptions;
  onFiltersChange: (filters: PracticeFilterOptions) => void;
  totalQuestionCount: number;
  userProgress?: {
    topics: Record<string, { correct: number; incorrect: number; total: number }>;
  };
}

export const AllTopicsToggle: React.FC<AllTopicsToggleProps> = ({
  topicStructure,
  filters,
  onFiltersChange,
  totalQuestionCount,
  userProgress
}) => {
  // Get all available topics and skills
  const allTopics = topicStructure.map(t => t.topic);
  const allSkills = topicStructure.flatMap(t => t.skills.map(s => s.id));

  // Check if all topics are selected
  const areAllTopicsSelected = 
    topicStructure.length > 0 && 
    allTopics.length > 0 &&
    allTopics.every(topic => filters.topics.includes(topic));

  // Toggle all topics
  const toggleAllTopics = () => {
    console.log('Toggle all topics called, current state:', areAllTopicsSelected);
    
    if (areAllTopicsSelected) {
      // If all topics are currently selected, deselect all
      console.log('Deselecting all topics');
      onFiltersChange({
        ...filters,
        topics: [],
        microSkills: []
      });
    } else {
      // If not all topics are selected, select all
      console.log('Selecting all topics');
      onFiltersChange({
        ...filters,
        topics: [...allTopics],
        microSkills: [...allSkills]
      });
    }
  };

  return (
    <div className="mb-2 sm:mb-3 border-b pb-2">
      <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors">
        <div 
          className="flex items-center gap-1.5 sm:gap-2 flex-1"
          onClick={toggleAllTopics}
        >
          <Checkbox 
            id="all-topics"
            checked={areAllTopicsSelected}
            className="h-3.5 sm:h-4 w-3.5 sm:w-4"
          />
          <label 
            htmlFor="all-topics"
            className="text-xs sm:text-sm font-medium cursor-pointer"
          >
            All Topics
          </label>
        </div>
        {totalQuestionCount > 0 && (
          <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 sm:px-2 sm:py-0.5 h-4 sm:h-5 font-normal">
            {Math.min(
              Object.values(userProgress?.topics || {}).reduce((sum, data) => sum + (data.total || 0), 0),
              totalQuestionCount
            )}/{totalQuestionCount}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default AllTopicsToggle;
