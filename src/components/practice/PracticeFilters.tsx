import React, { useState, useEffect, useRef } from 'react';
import { ChevronsUpDown, XCircle, Eye, SkipForward, CheckCircle, Flag, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import './NoScrollReset.css';
// Import the scroll prevention utility
import loadPreventScrollReset from './preventScrollReset';
import {
  Difficulty,
  MainTopic,
  PracticeFilterOptions,
  TopicStructure,
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
  filteredQuestionCount?: number; // Number of questions that match current filters
  onFilteredCountChange?: (count: number) => void; // Callback to update parent component with filtered count
}

// Progress data type is now handled in the AllTopicsButton component

const PracticeFilters: React.FC<PracticeFiltersProps> = ({
  section,
  filters,
  onFiltersChange,
  questionCounts,
  userProgress,
  isLoading = false,
  filteredQuestionCount = 0,
  onFilteredCountChange
}) => {
  const [topicStructure, setTopicStructure] = useState<TopicStructure[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  
  // Ref to store scroll position
  const scrollPositionRef = useRef<number>(0);
  
  // Function to preserve scroll position
  const preserveScrollPosition = () => {
    // Store current scroll position
    scrollPositionRef.current = window.scrollY;
    
    // Use setTimeout to restore scroll position after state updates
    setTimeout(() => {
      window.scrollTo(0, scrollPositionRef.current);
    }, 0);
  };

  // Update parent component with filtered count when it changes
  useEffect(() => {
    if (onFilteredCountChange) {
      onFilteredCountChange(filteredQuestionCount);
    }
  }, [filteredQuestionCount, onFilteredCountChange]);
  
  // Initialize scroll reset prevention
  useEffect(() => {
    // Load the scroll reset prevention script
    loadPreventScrollReset();
  }, []);
  
  // Initialize all filters when component mounts
  useEffect(() => {
    // Always auto-select all interaction statuses on component mount
    const allStatuses: InteractionStatus[] = ['incorrect', 'unseen', 'skipped', 'correct', 'flagged'];
    onFiltersChange({
      ...filters,
      interactionStatus: allStatuses
    });
    // Only run this effect once on mount, but include dependencies to satisfy the linter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Fetch the dynamic topic structure on component mount or when section changes
  useEffect(() => {
    const loadTopicStructure = async () => {
      setLoadingTopics(true);
      try {
        const structure = await fetchDynamicTopicStructure(section);
        setTopicStructure(structure);
        
        // Initialize expanded state for topics, but preserve existing expanded state
        setExpandedTopics(prev => {
          const newExpandedState = { ...prev };
          structure.forEach(topic => {
            // Only set to false if it doesn't exist yet
            if (newExpandedState[topic.topic] === undefined) {
              newExpandedState[topic.topic] = false;
            }
          });
          return newExpandedState;
        });
        
        // Auto-select all topics and skills if none are currently selected
        if (filters.topics.length === 0) {
          const allTopics = structure.map(topic => topic.topic);
          const allSkills: string[] = [];
          
          // Collect all skills from all topics
          structure.forEach(topic => {
            topic.skills.forEach(skill => {
              allSkills.push(skill.id);
            });
          });
          
          // Update filters with all topics and skills
          onFiltersChange({
            ...filters,
            topics: allTopics,
            microSkills: allSkills
          });
        }
      } catch (error) {
        console.error('Error loading topic structure:', error);
      } finally {
        setLoadingTopics(false);
      }
    };

    loadTopicStructure();
  }, [section, filters, onFiltersChange]); // Re-fetch when section changes

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
  

  // Check if all skills in a topic are selected
  const checkIfAllSkillsSelected = (topic: MainTopic, skillsArray: string[]): boolean => {
    const topicData = topicStructure.find(t => t.topic === topic);
    if (!topicData || topicData.skills.length === 0) return false;
    
    return topicData.skills.every(skill => skillsArray.includes(skill.id));
  };

  // Toggle functions
  const toggleTopic = (topic: MainTopic, event?: React.MouseEvent) => {
    // Prevent default behavior to avoid page scrolling
    if (event) {
      event.preventDefault();
    }
    
    // Save current expansion state before making changes
    const currentExpandedState = { ...expandedTopics };
    
    // Preserve scroll position
    preserveScrollPosition();
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
    
    // Restore expansion state after filter change
    // This is crucial to prevent topics from collapsing when selecting/deselecting
    setTimeout(() => {
      setExpandedTopics(currentExpandedState);
    }, 0);
  };

  const toggleMicroSkill = (skillId: string, event?: React.MouseEvent) => {
    // Prevent default behavior to avoid page scrolling
    if (event) {
      event.preventDefault();
    }
    
    // Save current expansion state before making changes
    const currentExpandedState = { ...expandedTopics };
    
    // Preserve scroll position
    preserveScrollPosition();
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

    // Update filters
    onFiltersChange({
      ...filters,
      topics: updatedTopics,
      microSkills: updatedSkills
    });
    
    // Restore expansion state after filter change
    // This is crucial to prevent topics from collapsing when selecting/deselecting skills
    setTimeout(() => {
      setExpandedTopics(currentExpandedState);
    }, 0);
  };

  // Expand a topic to show its subtopics
  const expandTopic = (topic: MainTopic, event?: React.MouseEvent) => {
    // Prevent default behavior to avoid page scrolling
    if (event) {
      event.preventDefault();
    }
    
    // Preserve scroll position
    preserveScrollPosition();
    setExpandedTopics(prev => ({
      ...prev,
      [topic]: true
    }));
  };
  
  // Collapse a topic to hide its subtopics
  const collapseTopic = (topic: MainTopic, event?: React.MouseEvent) => {
    // Prevent default behavior to avoid page scrolling
    if (event) {
      event.preventDefault();
    }
    
    // Preserve scroll position
    preserveScrollPosition();
    setExpandedTopics(prev => ({
      ...prev,
      [topic]: false
    }));
  };
  
  // Toggle a topic's expansion state - ONLY this function should be able to collapse a topic
  const toggleTopicExpansion = (topic: MainTopic, event?: React.MouseEvent) => {
    // Prevent default behavior to avoid page scrolling
    if (event) {
      event.preventDefault();
    }
    
    // Preserve scroll position
    preserveScrollPosition();
    const isCurrentlyExpanded = expandedTopics[topic] || false;
    
    if (isCurrentlyExpanded) {
      collapseTopic(topic);
    } else {
      expandTopic(topic);
    }
  };

  const toggleDifficulty = (difficulty: Difficulty, event?: React.MouseEvent) => {
    // Prevent default behavior to avoid page scrolling
    if (event) {
      event.preventDefault();
    }
    
    // Preserve scroll position
    preserveScrollPosition();
    // Create a copy of the current difficulties array (or initialize if it's not an array)
    const currentDifficulties = Array.isArray(filters.difficulty) ? [...filters.difficulty] : [];
    
    // Check if the difficulty is already selected
    const isSelected = currentDifficulties.includes(difficulty);
    
    let updatedDifficulties: Difficulty[];
    
    // Special handling for adaptive difficulty (exclusive selection)
    if (difficulty === 'adaptive') {
      // If adaptive is being selected, it should be the only difficulty
      updatedDifficulties = isSelected 
        ? currentDifficulties.filter(d => d !== 'adaptive') // Remove adaptive if already selected
        : ['adaptive' as Difficulty]; // Only select adaptive, removing other difficulties
    } else {
      // For non-adaptive difficulties
      if (isSelected) {
        // Remove the selected difficulty
        updatedDifficulties = currentDifficulties.filter(d => d !== difficulty);
      } else {
        // Add the selected difficulty, but remove adaptive if it's currently selected
        updatedDifficulties = [...currentDifficulties.filter(d => d !== 'adaptive'), difficulty];
      }
    }
    
    // Ensure we always have at least one difficulty selected
    const finalDifficulties: Difficulty[] = updatedDifficulties.length === 0 
      ? ['medium' as Difficulty] 
      : updatedDifficulties as Difficulty[];
    
    onFiltersChange({
      ...filters,
      difficulty: finalDifficulties
    });
  };

  // Toggle interaction status
  const toggleInteractionStatus = (status: InteractionStatus, event?: React.MouseEvent) => {
    // Prevent default behavior to avoid page scrolling
    if (event) {
      event.preventDefault();
    }
    
    // Preserve scroll position
    preserveScrollPosition();
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
  
  // Toggle all interaction statuses at once
  const toggleAllInteractionStatuses = (event?: React.MouseEvent) => {
    // Prevent default behavior to avoid page scrolling
    if (event) {
      event.preventDefault();
    }
    
    // Preserve scroll position
    preserveScrollPosition();
    // Get all possible interaction statuses
    const allStatuses: InteractionStatus[] = ['incorrect', 'unseen', 'skipped', 'correct', 'flagged'];
    
    // Check if all statuses are currently selected
    const currentStatuses = filters.interactionStatus || [];
    const allSelected = allStatuses.every(status => currentStatuses.includes(status));
    
    // If all are selected, clear all; otherwise, select all
    const updatedStatuses = allSelected ? [] : allStatuses;
    
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

  // All Topics functionality has been temporarily removed

  // Render the filters
  return (
    <div className="space-y-3 sm:space-y-4 no-scroll-reset">

      {/* Topic filters */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">
            Topics
          </h3>
        </div>
        
        {/* All Topics option temporarily removed */}
        
        <div className="space-y-1 sm:space-y-2">
          {topicStructure.map((topicData) => {
            const isExpanded = expandedTopics[topicData.topic] || false;
            const topicCount = getTopicCount(topicData.topic);
            
            return (
              <div key={topicData.topic} className="space-y-0.5 sm:space-y-1 border border-gray-100 rounded overflow-hidden">
                <div 
                  className="flex items-center justify-between p-1.5 sm:p-2 bg-gray-50/50 hover:bg-gray-100/50 cursor-pointer transition-colors"
                >
                  <div 
                    className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0"
                  >
                    <div 
                      className="flex items-center gap-1.5 sm:gap-2"
                      onClick={(e) => {
                        // Stop propagation to prevent expansion
                        e.stopPropagation();
                        // Toggle topic selection
                        toggleTopic(topicData.topic, e);
                        // Auto-expand topic when selected
                        if (!isTopicSelected(topicData.topic) && !expandedTopics[topicData.topic]) {
                          expandTopic(topicData.topic);
                        }
                      }}
                    >
                      <Checkbox 
                        id={`topic-${topicData.topic}`}
                        checked={isTopicSelected(topicData.topic)}
                        className="h-3.5 sm:h-4 w-3.5 sm:w-4 flex-shrink-0"
                      />
                      <label 
                        htmlFor={`topic-${topicData.topic}`}
                        className="text-xs sm:text-sm font-medium cursor-pointer truncate flex-1"
                      >
                        {topicData.topic}
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {topicCount.total > 0 && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs h-5 px-1 sm:px-1.5 bg-white">
                        {topicCount.total}
                      </Badge>
                    )}
                    <button 
                      className={cn(
                        "text-gray-400 hover:text-gray-600 transition-colors",
                        isExpanded && "text-gray-600"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTopicExpansion(topicData.topic, e);
                      }}
                      aria-label={isExpanded ? 'Collapse topic' : 'Expand topic'}
                    >
                      <ChevronsUpDown className={cn(
                        "h-3.5 sm:h-4 w-3.5 sm:w-4 transition-transform",
                        isExpanded && "transform rotate-180"
                      )} />
                    </button>
                  </div>
                </div>
                
                {isExpanded && topicData.skills.length > 0 && (
                  <div className="pl-4 sm:pl-6 space-y-0.5 sm:space-y-1 py-1 bg-white">
                    {topicData.skills.map((skill) => {
                      const skillCount = getMicroSkillCount(skill.id);
                      
                      return (
                        <div 
                          key={skill.id}
                          className="flex items-center justify-between p-1 sm:p-1.5 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Toggle the micro-skill selection without affecting expansion state
                              toggleMicroSkill(skill.id, e);
                            }}
                          >
                            <Checkbox 
                              id={`skill-${skill.id}`}
                              checked={isMicroSkillSelected(skill.id)}
                              className="h-3 sm:h-3.5 w-3 sm:w-3.5 flex-shrink-0"
                            />
                            <label 
                              htmlFor={`skill-${skill.id}`}
                              className="text-[10px] sm:text-xs cursor-pointer truncate flex-1"
                            >
                              {skill.name}
                            </label>
                          </div>
                          
                          {skillCount.total > 0 && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 sm:px-2 sm:py-0.5 h-3.5 sm:h-4 font-normal flex-shrink-0">
                              {skillCount.attempted}/{skillCount.total}
                            </Badge>
                          )}
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

      {/* Difficulty filters with improved UI */}
      <div className="space-y-2 sm:space-y-3 mt-4">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">
            Difficulty
          </h3>
        </div>
        <div className="flex flex-row flex-wrap gap-1 sm:gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => {
            const isSelected = Array.isArray(filters.difficulty) && filters.difficulty.includes(difficulty);
            
            // Define difficulty-specific styles
            const difficultyStyles = {
              easy: {
                selected: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200",
                unselected: "border-slate-200 hover:border-emerald-200 hover:bg-emerald-50",
                icon: <CheckCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1 sm:mr-1.5" />
              },
              medium: {
                selected: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
                unselected: "border-slate-200 hover:border-blue-200 hover:bg-blue-50",
                icon: <AlertCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1 sm:mr-1.5" />
              },
              hard: {
                selected: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
                unselected: "border-slate-200 hover:border-orange-200 hover:bg-orange-50",
                icon: <XCircle className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1 sm:mr-1.5" />
              }
            };
            
            const style = difficultyStyles[difficulty as keyof typeof difficultyStyles];
            
            return (
              <div 
                key={difficulty}
                className="inline-block" 
                onClick={(e) => toggleDifficulty(difficulty, e)}
              >
                <Badge
                  variant="outline"
                  className={`cursor-pointer select-none transition-all duration-200 flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-semibold border ${isSelected ? style.selected : style.unselected}`}
                >
                  {style.icon}
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Question History Filters - Mobile responsive */}
      <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-6 pb-2">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">
            Question History
          </h3>
          
          <div 
            className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 cursor-pointer flex items-center transition-colors"
            onClick={(e) => toggleAllInteractionStatuses(e)}
          >
            {(filters.interactionStatus || []).length === 5 ? "Clear all" : "Select all"}
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
          {/* Incorrect */}
          <div 
            className={`flex items-center p-1.5 sm:p-2 rounded border transition-all duration-200 cursor-pointer
              ${filters.interactionStatus?.includes('incorrect') 
                ? "bg-red-50 border-red-200 shadow-sm" 
                : "border-slate-200 hover:border-red-200 hover:bg-red-50"}`}
            onClick={(e) => toggleInteractionStatus('incorrect', e)}
          >
            <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded flex items-center justify-center mr-1.5 sm:mr-2 transition-colors
              ${filters.interactionStatus?.includes('incorrect') ? "bg-red-100" : "bg-slate-100"}`}>
              <XCircle className={`h-3 sm:h-4 w-3 sm:w-4 ${filters.interactionStatus?.includes('incorrect') ? "text-red-600" : "text-slate-400"}`} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium">Incorrect</div>
              <div className="text-[10px] sm:text-xs text-slate-500 line-clamp-1">Questions you got wrong</div>
            </div>
          </div>
          
          {/* Unseen */}
          <div 
            className={`flex items-center p-1.5 sm:p-2 rounded border transition-all duration-200 cursor-pointer
              ${filters.interactionStatus?.includes('unseen') 
                ? "bg-blue-50 border-blue-200 shadow-sm" 
                : "border-slate-200 hover:border-blue-200 hover:bg-blue-50"}`}
            onClick={(e) => toggleInteractionStatus('unseen', e)}
          >
            <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded flex items-center justify-center mr-1.5 sm:mr-2 transition-colors
              ${filters.interactionStatus?.includes('unseen') ? "bg-blue-100" : "bg-slate-100"}`}>
              <Eye className={`h-3 sm:h-4 w-3 sm:w-4 ${filters.interactionStatus?.includes('unseen') ? "text-blue-600" : "text-slate-400"}`} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium">Unseen</div>
              <div className="text-[10px] sm:text-xs text-slate-500 line-clamp-1">New questions</div>
            </div>
          </div>
          
          {/* Skipped */}
          <div 
            className={`flex items-center p-1.5 sm:p-2 rounded border transition-all duration-200 cursor-pointer
              ${filters.interactionStatus?.includes('skipped') 
                ? "bg-amber-50 border-amber-200 shadow-sm" 
                : "border-slate-200 hover:border-amber-200 hover:bg-amber-50"}`}
            onClick={(e) => toggleInteractionStatus('skipped', e)}
          >
            <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded flex items-center justify-center mr-1.5 sm:mr-2 transition-colors
              ${filters.interactionStatus?.includes('skipped') ? "bg-amber-100" : "bg-slate-100"}`}>
              <SkipForward className={`h-3 sm:h-4 w-3 sm:w-4 ${filters.interactionStatus?.includes('skipped') ? "text-amber-600" : "text-slate-400"}`} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium">Skipped</div>
              <div className="text-[10px] sm:text-xs text-slate-500 line-clamp-1">Questions you passed</div>
            </div>
          </div>
          
          {/* Correct */}
          <div 
            className={`flex items-center p-1.5 sm:p-2 rounded border transition-all duration-200 cursor-pointer
              ${filters.interactionStatus?.includes('correct') 
                ? "bg-green-50 border-green-200 shadow-sm" 
                : "border-slate-200 hover:border-green-200 hover:bg-green-50"}`}
            onClick={(e) => toggleInteractionStatus('correct', e)}
          >
            <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded flex items-center justify-center mr-1.5 sm:mr-2 transition-colors
              ${filters.interactionStatus?.includes('correct') ? "bg-green-100" : "bg-slate-100"}`}>
              <CheckCircle className={`h-3 sm:h-4 w-3 sm:w-4 ${filters.interactionStatus?.includes('correct') ? "text-green-600" : "text-slate-400"}`} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium">Correct</div>
              <div className="text-[10px] sm:text-xs text-slate-500 line-clamp-1">Questions you got right</div>
            </div>
          </div>
          
          {/* Flagged */}
          <div 
            className={`flex items-center p-1.5 sm:p-2 rounded border transition-all duration-200 cursor-pointer
              ${filters.interactionStatus?.includes('flagged') 
                ? "bg-purple-50 border-purple-200 shadow-sm" 
                : "border-slate-200 hover:border-purple-200 hover:bg-purple-50"}`}
            onClick={(e) => toggleInteractionStatus('flagged', e)}
          >
            <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded flex items-center justify-center mr-1.5 sm:mr-2 transition-colors
              ${filters.interactionStatus?.includes('flagged') ? "bg-purple-100" : "bg-slate-100"}`}>
              <Flag className={`h-3 sm:h-4 w-3 sm:w-4 ${filters.interactionStatus?.includes('flagged') ? "text-purple-600" : "text-slate-400"}`} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium">Flagged</div>
              <div className="text-[10px] sm:text-xs text-slate-500 line-clamp-1">Marked for review</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { PracticeFilters };
export default PracticeFilters;
