import React, { useState, useEffect } from 'react';
import { ChevronsUpDown, XCircle, Eye, SkipForward, CheckCircle, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Difficulty,
  MainTopic,
  PracticeFilterOptions,
  TopicStructure,
  ProgressData,
  InteractionStatus
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
  userProgress,
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

  const getTopicCount = (topic: MainTopic): { total: number; attempted: number } => {
    const total = questionCounts?.topicCounts[topic] || 0;
    const attempted = Math.min(userProgress?.topics[topic]?.total || 0, total);
    return { total, attempted };
  };

  const getMicroSkillCount = (skillId: string): { total: number; attempted: number } => {
    const total = questionCounts?.skillCounts[skillId] || 0;
    const attempted = Math.min(userProgress?.skills[skillId]?.total || 0, total);
    return { total, attempted };
  };

  // Get all skill IDs for a topic - used for rendering and filtering
  const getSkillIdsForTopic = (topic: MainTopic): string[] => {
    const topicData = topicStructure.find(t => t.topic === topic);
    if (!topicData) return [];
    return topicData.skills.map(skill => skill.id);
  };
  
  // Count selected skills for a topic - used in the UI
  const getSelectedSkillsCount = (topic: MainTopic): { selected: number; total: number } => {
    const skillIds = getSkillIdsForTopic(topic);
    const selectedCount = skillIds.filter(id => filters.microSkills.includes(id)).length;
    return { selected: selectedCount, total: skillIds.length };
  };

  // Check if all skills in a topic are selected
  const checkIfAllSkillsSelected = (topic: MainTopic, skillsArray: string[]): boolean => {
    const topicData = topicStructure.find(t => t.topic === topic);
    if (!topicData || topicData.skills.length === 0) return false;
    
    return topicData.skills.every(skill => skillsArray.includes(skill.id));
  };

  // Toggle functions
  const toggleTopic = (topic: MainTopic) => {
    const selecting = !isTopicSelected(topic);
    let updatedTopics = [...filters.topics];
    const updatedSkills = [...filters.microSkills];
    
    // Update topic selection and its skills
    if (selecting) {
      // Add topic if selecting
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
      // When deselecting a topic, remove it
      updatedTopics = updatedTopics.filter(t => t !== topic);
      
      // Also deselect all skills in this topic
      const skillIds = getSkillIdsForTopic(topic);
      skillIds.forEach(skillId => {
        const index = updatedSkills.indexOf(skillId);
        if (index !== -1) {
          updatedSkills.splice(index, 1);
        }
      });
    }

    onFiltersChange({
      ...filters,
      topics: updatedTopics,
      microSkills: updatedSkills
    });
  };

  const toggleMicroSkill = (skillId: string) => {
    const selecting = !isMicroSkillSelected(skillId);
    const updatedSkills = [...filters.microSkills];
    let updatedTopics = [...filters.topics];
    
    // Find which topic this skill belongs to
    const parentTopic = topicStructure.find(topic => 
      topic.skills.some(skill => skill.id === skillId)
    )?.topic;
    
    if (!parentTopic) {
      console.error(`Could not find parent topic for skill ${skillId}`);
      return; // Safety check
    }
    
    // Update skill selection
    if (selecting) {
      // Add skill if selecting
      if (!updatedSkills.includes(skillId)) {
        updatedSkills.push(skillId);
      }
      
      // Check if all skills in the topic are now selected
      const allSkillsSelected = checkIfAllSkillsSelected(parentTopic, updatedSkills);
      
      // If all skills are selected, also select the topic
      if (allSkillsSelected && !updatedTopics.includes(parentTopic)) {
        updatedTopics.push(parentTopic);
      }
    } else {
      // Remove skill if deselecting
      const skillIndex = updatedSkills.indexOf(skillId);
      if (skillIndex !== -1) {
        updatedSkills.splice(skillIndex, 1);
      }
      
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

  // Toggle interaction status
  const toggleInteractionStatus = (status: InteractionStatus) => {
    console.log(`Toggling interaction status: ${status}`);
    
    // Ensure we have a valid array to work with
    const currentStatuses = filters.interactionStatus || [];
    
    // Check if the status is already included
    const isAlreadySelected = currentStatuses.includes(status);
    console.log(`Status ${status} is already selected: ${isAlreadySelected}`);
    
    // Create the updated array
    const updatedStatuses = isAlreadySelected
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    console.log('Updated statuses:', updatedStatuses);
      
    // Call the filter change handler with the updated filters
    onFiltersChange({
      ...filters,
      interactionStatus: updatedStatuses
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
              onClick={(e) => {
                e.stopPropagation();
                toggleAllTopics();
              }}
            >
              All Topics
            </label>
            {totalQuestionCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {Math.min(
                  Object.values(userProgress?.topics || {}).reduce((sum, data: ProgressData) => sum + (data.total || 0), 0),
                  totalQuestionCount
                )} of {totalQuestionCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Topic filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Topics & Skills</h3>
        </div>
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
                  <div className="flex items-center justify-between">
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
                      {topicCount.total > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {topicCount.attempted} of {topicCount.total}
                        </Badge>
                      )}
                      
                      {/* No skills count badge */}
                    </div>
                    <ChevronsUpDown className={cn("h-4 w-4 transition-transform", {
                      "transform rotate-180": isExpanded
                    })} />
                  </div>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMicroSkill(skill.id);
                              }}
                            >
                              {skill.name}
                            </label>
                            {skillCount.total > 0 && (
                              <Badge variant="outline" className="ml-2">
                                {skillCount.attempted} of {skillCount.total}
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
                  className="text-sm cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDifficulty(difficulty);
                  }}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Question History Filters */}
      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">Question History</h3>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div 
            className="inline-block" 
            onClick={() => toggleInteractionStatus('incorrect')}
          >
            <Badge
              variant={filters.interactionStatus?.includes('incorrect') ? "destructive" : "outline"}
              className={`cursor-pointer select-none transition-colors ${filters.interactionStatus?.includes('incorrect') ? "" : "hover:bg-red-100"}`}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Incorrect
            </Badge>
          </div>
          
          <div 
            className="inline-block" 
            onClick={() => toggleInteractionStatus('unseen')}
          >
            <Badge
              variant={filters.interactionStatus?.includes('unseen') ? "default" : "outline"}
              className={`cursor-pointer select-none transition-colors ${filters.interactionStatus?.includes('unseen') ? "" : "hover:bg-blue-100"}`}
            >
              <Eye className="h-3 w-3 mr-1" />
              Unseen
            </Badge>
          </div>
          
          <div 
            className="inline-block" 
            onClick={() => toggleInteractionStatus('skipped')}
          >
            <Badge
              variant={filters.interactionStatus?.includes('skipped') ? "secondary" : "outline"}
              className={`cursor-pointer select-none transition-colors ${filters.interactionStatus?.includes('skipped') ? "bg-purple-100 text-purple-800" : "hover:bg-purple-100"}`}
            >
              <SkipForward className="h-3 w-3 mr-1" />
              Skipped
            </Badge>
          </div>
          
          <div 
            className="inline-block" 
            onClick={() => toggleInteractionStatus('correct')}
          >
            <Badge
              variant={filters.interactionStatus?.includes('correct') ? "default" : "outline"}
              className={`cursor-pointer select-none transition-colors ${filters.interactionStatus?.includes('correct') ? "bg-green-100 text-green-800" : "hover:bg-green-100"}`}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Correct
            </Badge>
          </div>
          
          <div 
            className="inline-block" 
            onClick={() => toggleInteractionStatus('flagged')}
          >
            <Badge
              variant={filters.interactionStatus?.includes('flagged') ? "secondary" : "outline"}
              className={`cursor-pointer select-none transition-colors ${filters.interactionStatus?.includes('flagged') ? "bg-amber-100 text-amber-800" : "hover:bg-amber-100"}`}
            >
              <Flag className="h-3 w-3 mr-1" />
              Flagged
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export { PracticeFilters };
export default PracticeFilters;
