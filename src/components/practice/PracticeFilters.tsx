import React, { useState, useEffect } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Difficulty,
  MainTopic,
  PracticeFilterOptions,
  TopicStructure
} from '@/types/practice';
import { fetchDynamicTopicStructure } from '@/lib/questions';

interface PracticeFiltersProps {
  section?: string; // Added section prop for filtering by section
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

// Progress data types will be implemented in a future update

const PracticeFilters: React.FC<PracticeFiltersProps> = ({
  section,
  filters,
  onFiltersChange,
  questionCounts,
  isLoading = false
}) => {
  const [topicStructure, setTopicStructure] = useState<TopicStructure[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Fetch the dynamic topic structure on component mount or when section changes
  useEffect(() => {
    const loadTopicStructure = async () => {
      setLoadingTopics(true);
      try {
        const structure = await fetchDynamicTopicStructure(section);
        setTopicStructure(structure);
        
        // Initialize expanded state for topics
        const initialExpandedState: Record<string, boolean> = {};
        structure.forEach(topic => {
          initialExpandedState[topic.topic] = false;
        });
        setExpandedTopics(initialExpandedState);
      } catch (error) {
        console.error('Error loading topic structure:', error);
      } finally {
        setLoadingTopics(false);
      }
    };

    loadTopicStructure();
  }, [section]); // Re-fetch when section changes

  // Helper functions
  const isTopicSelected = (topic: MainTopic): boolean => {
    return filters.topics.includes(topic);
  };

  const isMicroSkillSelected = (skillId: string): boolean => {
    return filters.microSkills.includes(skillId);
  };

  const getTopicCount = (topic: MainTopic): number => {
    return questionCounts?.topicCounts[topic] || 0;
  };

  const getMicroSkillCount = (skillId: string): number => {
    return questionCounts?.skillCounts[skillId] || 0;
  };

  // This function checks if all skills in a topic are selected
  // Currently used internally by the toggleMicroSkill function
  const checkIfAllSkillsSelected = (topic: MainTopic, skillsArray: string[]): boolean => {
    const topicData = topicStructure.find(t => t.topic === topic);
    if (!topicData || topicData.skills.length === 0) return false;
    
    return topicData.skills.every(skill => skillsArray.includes(skill.id));
  };

  // Get all skill IDs for a topic
  const getSkillIdsForTopic = (topic: MainTopic): string[] => {
    const topicData = topicStructure.find(t => t.topic === topic);
    if (!topicData) return [];
    return topicData.skills.map(skill => skill.id);
  };

  // Toggle functions
  const toggleTopic = (topic: MainTopic) => {
    const selecting = !isTopicSelected(topic);
    let updatedTopics = [...filters.topics];
    let updatedSkills = [...filters.microSkills];
    
    // Update topic selection
    if (selecting) {
      if (!updatedTopics.includes(topic)) {
        updatedTopics.push(topic);
      }
      
      // When selecting a topic, also select all its skills
      const skillIds = getSkillIdsForTopic(topic);
      skillIds.forEach(skillId => {
        if (!updatedSkills.includes(skillId)) {
          updatedSkills.push(skillId);
        }
      });
    } else {
      // When deselecting a topic, remove it and all its skills
      updatedTopics = updatedTopics.filter(t => t !== topic);
      const skillIds = getSkillIdsForTopic(topic);
      updatedSkills = updatedSkills.filter(id => !skillIds.includes(id));
    }

    onFiltersChange({
      ...filters,
      topics: updatedTopics,
      microSkills: updatedSkills
    });
  };

  const toggleMicroSkill = (skillId: string) => {
    const selecting = !isMicroSkillSelected(skillId);
    let updatedSkills = [...filters.microSkills];
    let updatedTopics = [...filters.topics];
    
    // Find which topic this skill belongs to
    const parentTopic = topicStructure.find(topic => 
      topic.skills.some(skill => skill.id === skillId)
    )?.topic;
    
    if (!parentTopic) return; // Safety check
    
    // Update skill selection
    if (selecting) {
      // Add skill if selecting
      if (!updatedSkills.includes(skillId)) {
        updatedSkills.push(skillId);
      }
      
      // Check if all skills in topic are now selected, if so, select the topic too
      const tempSkills = [...updatedSkills];
      if (!tempSkills.includes(skillId)) {
        tempSkills.push(skillId);
      }
      
      const allSelected = checkIfAllSkillsSelected(parentTopic, tempSkills);
      if (allSelected && !updatedTopics.includes(parentTopic)) {
        updatedTopics.push(parentTopic);
      }
    } else {
      // Remove skill if deselecting
      updatedSkills = updatedSkills.filter(id => id !== skillId);
      
      // If deselecting a skill, also deselect its parent topic
      updatedTopics = updatedTopics.filter(t => t !== parentTopic);
    }

    onFiltersChange({
      ...filters,
      topics: updatedTopics,
      microSkills: updatedSkills
    });
  };

  const toggleTopicExpansion = (topic: MainTopic) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topic]: !prev[topic]
    }));
  };

  const toggleDifficulty = (difficulty: Difficulty) => {
    onFiltersChange({
      ...filters,
      difficulty
    });
  };

  // Render loading state
  if (loadingTopics || isLoading) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">Loading topics and skills...</p>
      </div>
    );
  }

  // Render no topics state
  if (topicStructure.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">No topics available. Please check the question bank.</p>
      </div>
    );
  }

  // Calculate total question count and check if all topics are selected
  // These calculations must be done after the loading checks to avoid conditional hooks
  const totalQuestionCount = Object.values(questionCounts?.topicCounts || {}).reduce((sum, count) => sum + count, 0);
  
  const areAllTopicsSelected = topicStructure.length > 0 && 
    topicStructure.every(topicData => isTopicSelected(topicData.topic));

  // Toggle all topics
  const toggleAllTopics = () => {
    const allTopics = topicStructure.map(t => t.topic);
    const allSkills = topicStructure.flatMap(t => t.skills.map(s => s.id));
    
    if (areAllTopicsSelected) {
      // Deselect all topics and skills
      onFiltersChange({
        ...filters,
        topics: [],
        microSkills: []
      });
    } else {
      // Select all topics and skills
      onFiltersChange({
        ...filters,
        topics: allTopics,
        microSkills: allSkills
      });
    }
  };

  // Render the filters
  return (
    <div className="space-y-4">
      {/* All Topics section */}
      <div className="space-y-2">
        <div 
          className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
          onClick={toggleAllTopics}
        >
          <div className="flex items-center gap-2">
            <Checkbox 
              id="all-topics"
              checked={areAllTopicsSelected}
              onCheckedChange={toggleAllTopics}
              onClick={(e) => e.stopPropagation()}
            />
            <label 
              htmlFor="all-topics"
              className="text-sm font-medium cursor-pointer"
            >
              All Topics
            </label>
            {totalQuestionCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {totalQuestionCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Topic filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Topics</h3>
        <div className="space-y-1">
          {topicStructure.map((topicData) => {
            const isExpanded = expandedTopics[topicData.topic] || false;
            const topicCount = getTopicCount(topicData.topic);
            
            return (
              <div key={topicData.topic} className="space-y-1">
                <div 
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                  onClick={() => toggleTopicExpansion(topicData.topic)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id={`topic-${topicData.topic}`}
                      checked={isTopicSelected(topicData.topic)}
                      onCheckedChange={() => toggleTopic(topicData.topic)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label 
                      htmlFor={`topic-${topicData.topic}`}
                      className="text-sm font-medium cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTopic(topicData.topic);
                      }}
                    >
                      {topicData.topic}
                    </label>
                    {topicCount > 0 && (
                      <Badge variant="outline" className="ml-2">
                        {topicCount}
                      </Badge>
                    )}
                  </div>
                  <ChevronsUpDown className={cn("h-4 w-4 transition-transform", {
                    "transform rotate-180": isExpanded
                  })} />
                </div>
                
                {isExpanded && topicData.skills.length > 0 && (
                  <div className="pl-6 space-y-1 mt-1">
                    {topicData.skills.map((skill) => {
                      const skillCount = getMicroSkillCount(skill.id);
                      
                      return (
                        <div 
                          key={skill.id}
                          className="flex items-center p-1 rounded-md hover:bg-accent cursor-pointer"
                          onClick={() => toggleMicroSkill(skill.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              id={`skill-${skill.id}`}
                              checked={isMicroSkillSelected(skill.id)}
                              onCheckedChange={() => toggleMicroSkill(skill.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <label 
                              htmlFor={`skill-${skill.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {skill.name}
                            </label>
                            {skillCount > 0 && (
                              <Badge variant="outline" className="ml-2">
                                {skillCount}
                              </Badge>
                            )}
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
      </div>

      {/* Difficulty filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Difficulty</h3>
        <div className="space-y-1">
          {(['easy', 'medium', 'hard', 'adaptive'] as Difficulty[]).map((difficulty) => (
            <div 
              key={difficulty}
              className="flex items-center p-2 rounded-md hover:bg-accent cursor-pointer"
              onClick={() => toggleDifficulty(difficulty)}
            >
              <div className="flex items-center gap-2">
                <Checkbox 
                  id={`difficulty-${difficulty}`}
                  checked={filters.difficulty === difficulty}
                  onCheckedChange={() => toggleDifficulty(difficulty)}
                  onClick={(e) => e.stopPropagation()}
                />
                <label 
                  htmlFor={`difficulty-${difficulty}`}
                  className="text-sm cursor-pointer capitalize"
                >
                  {difficulty}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { PracticeFilters };
export default PracticeFilters;
