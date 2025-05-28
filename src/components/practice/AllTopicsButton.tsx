import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MainTopic, PracticeFilterOptions } from '@/types/practice';

interface AllTopicsButtonProps {
  topicStructure: { topic: MainTopic; skills: { id: string; name: string }[] }[];
  filters: PracticeFilterOptions;
  onFiltersChange: (filters: PracticeFilterOptions) => void;
  totalQuestionCount: number;
  userProgress?: {
    topics: Record<string, { correct: number; incorrect: number; total: number }>;
  };
}

export const AllTopicsButton: React.FC<AllTopicsButtonProps> = ({
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
    if (areAllTopicsSelected) {
      // If all topics are currently selected, deselect all
      onFiltersChange({
        ...filters,
        topics: [],
        microSkills: []
      });
    } else {
      // If not all topics are selected, select all
      onFiltersChange({
        ...filters,
        topics: [...allTopics],
        microSkills: [...allSkills]
      });
    }
  };

  return (
    <div className="mb-2 sm:mb-3 border-b pb-2">
      <button 
        type="button"
        onClick={toggleAllTopics}
        className="flex items-center justify-between p-2 w-full rounded hover:bg-gray-50 cursor-pointer transition-colors text-left"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
          <div className={`h-3.5 sm:h-4 w-3.5 sm:w-4 border rounded flex items-center justify-center ${areAllTopicsSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
            {areAllTopicsSelected && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 sm:h-3 w-2.5 sm:w-3 text-white">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
          <span className="text-xs sm:text-sm font-medium">All Topics</span>
        </div>
        
        {totalQuestionCount > 0 && (
          <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 sm:px-2 sm:py-0.5 h-4 sm:h-5 font-normal">
            {Math.min(
              Object.values(userProgress?.topics || {}).reduce((sum, data) => sum + (data.total || 0), 0),
              totalQuestionCount
            )}/{totalQuestionCount}
          </Badge>
        )}
      </button>
    </div>
  );
};

export default AllTopicsButton;
