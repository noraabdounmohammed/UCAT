import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ApplePracticeSession, QuestionData } from './ApplePracticeSession';
import { Target, ArrowRight, Calculator, BookOpen, Brain, Scale, Loader2, CheckCircle, XCircle, HelpCircle, Flag, SkipForward, Eye, Check, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './animations.css';
import './apple-section-styles.css';
import { getAvailableSections, Question } from '@/utils/questionBank';
import { fetchQuestions, fetchQuestionCounts, fetchDynamicTopicStructure, countFilteredQuestions, clearQuestionCountCache } from '@/lib/questions';
import { getSectionProgress, getTopicProgress, getSkillProgress } from '@/utils/userProgressStorage';
import { toast } from 'sonner';
import { PracticeFilterOptions, MainTopic, DifficultyOption, InteractionStatus } from '@/types/practice';

// Section definitions with icons and descriptions
const SECTION_DETAILS: Record<string, { name: string, icon: LucideIcon, description: string }> = {
  'VR': { name: 'Verbal Reasoning', icon: BookOpen, description: 'Evaluate information presented in written form' },
  'DM': { name: 'Decision Making', icon: Brain, description: 'Make informed decisions based on complex information' },
  'QR': { name: 'Quantitative Reasoning', icon: Calculator, description: 'Test your numerical and analytical skills' },
  'SJ': { name: 'Situational Judgement', icon: Scale, description: 'Respond appropriately to real-world scenarios' }
};

export function PracticeSection(): JSX.Element {
  const [activeSection, setActiveSection] = useState('QR');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState(true);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isPracticing, setIsPracticing] = useState(false);
  const [filterOptions, setFilterOptions] = useState<PracticeFilterOptions>({
    section: activeSection,
    topics: ['Percentages', 'Ratios', 'Rates & Speed'] as MainTopic[], // Using valid MainTopic values
    difficulty: ['medium'] as DifficultyOption[], // Changed to array to support multiple selections
    interactionStatus: ['unseen', 'correct', 'incorrect', 'flagged', 'skipped'] as InteractionStatus[], // All options selected by default
    microSkills: []
  });
  
  // Topic structure state
  const [topicStructure, setTopicStructure] = useState<Array<{topic: string; skills: Array<{id: string; name: string}>}>>([]);
  
  // Expanded topics tracking
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  
  // Question counts by topic and skill - used for displaying counts in the UI
  const [questionCounts, setQuestionCounts] = useState<{
    topicCounts: Record<string, number>;
    skillCounts: Record<string, number>;
  }>({
    topicCounts: {},
    skillCounts: {}
  });
  
  // Track progress data in state to force re-renders when it changes
  const [progressData, setProgressData] = useState({
    topics: {} as Record<string, ReturnType<typeof getTopicProgress>>,
    skills: {} as Record<string, ReturnType<typeof getSkillProgress>>,
    sections: {} as Record<string, ReturnType<typeof getSectionProgress>>
  });
  
  // Force refresh of progress data
  const refreshProgressData = useCallback(() => {
    // Update progress data for current section
    const sectionProgress = getSectionProgress(activeSection);
    
    // Get all topics for the current section
    const topicsProgress: Record<string, ReturnType<typeof getTopicProgress>> = {};
    topicStructure.forEach(topic => {
      topicsProgress[topic.topic] = getTopicProgress(topic.topic);
    });
    
    // Get all skills for the current section
    const skillsProgress: Record<string, ReturnType<typeof getSkillProgress>> = {};
    topicStructure.forEach(topic => {
      topic.skills.forEach(skill => {
        skillsProgress[skill.id] = getSkillProgress(skill.id);
      });
    });
    
    // Update state with new progress data
    setProgressData(prev => ({
      ...prev,
      topics: {...prev.topics, ...topicsProgress},
      skills: {...prev.skills, ...skillsProgress},
      sections: {...prev.sections, [activeSection]: sectionProgress}
    }));
  }, [activeSection, topicStructure]);
  
  // Get topic progress from local storage
  const getTopicProgressFromStorage = (topic: string) => {
    return progressData.topics[topic] || getTopicProgress(topic);
  };
  
  // Get section progress from local storage
  const getSectionProgressFromStorage = (section: string) => {
    return progressData.sections[section] || getSectionProgress(section);
  };
  
  // Get skill progress from local storage
  const getSkillProgressFromStorage = (skill: string) => {
    return progressData.skills[skill] || getSkillProgress(skill);
  };
  
  // Get topic question count directly from the database
  const getTopicCount = (topic: string): number => {
    return questionCounts.topicCounts[topic] || 0;
  };
  
  // Track filtered question count
  const [filteredCount, setFilteredCount] = useState(0);
  
  // Track total question count for the active section
  const [sectionQuestionCount, setSectionQuestionCount] = useState(0);
  
  // Update filtered count whenever filterOptions change
  useEffect(() => {
    // Only run if we have a section specified
    if (filterOptions.section) {
      console.log('Filter options changed, current options:', filterOptions);
      // Update filtered count based on current filter options
      countFilteredQuestions(filterOptions)
        .then(count => {
          console.log('Filtered count after filter change:', count, 'with filters:', JSON.stringify(filterOptions));
          setFilteredCount(count);
        })
        .catch(error => {
          console.error('Error counting filtered questions on filter change:', error);
          setFilteredCount(0);
        });
    }
  }, [filterOptions]);
  
  // Load available sections
  useEffect(() => {
    const loadSections = async () => {
      try {
        const sections = await getAvailableSections();
        setAvailableSections(sections);
        setLoadingSections(false);
      } catch (error) {
        console.error('Error loading sections:', error);
        toast.error('Failed to load available sections');
        setLoadingSections(false);
      }
    };
    
    loadSections();
    refreshProgressData();
  }, [activeSection, refreshProgressData]); 
  
  // Helper functions for topic and skill selection
  const isTopicSelected = (topic: MainTopic): boolean => {
    // Get all skill IDs for this topic
    const topicData = topicStructure.find((t: {topic: string; skills: Array<{id: string; name: string}>}) => t.topic === topic);
    const skillIds = topicData?.skills.map(skill => skill.id) || [];
    
    // Topic is only considered selected if all its skills are selected
    if (skillIds.length === 0) return false;
    return skillIds.every(skillId => filterOptions.microSkills.includes(skillId));
  };
  
  // Check if a topic is partially selected (some but not all skills selected)
  const isTopicPartiallySelected = (topic: MainTopic): boolean => {
    // Get all skill IDs for this topic
    const topicData = topicStructure.find((t: {topic: string; skills: Array<{id: string; name: string}>}) => t.topic === topic);
    const skillIds = topicData?.skills.map(skill => skill.id) || [];
    
    if (skillIds.length === 0) return false;
    
    // Check if at least one skill is selected but not all
    const hasSelected = skillIds.some(skillId => filterOptions.microSkills.includes(skillId));
    const allSelected = skillIds.every(skillId => filterOptions.microSkills.includes(skillId));
    
    return hasSelected && !allSelected;
  };

  const isMicroSkillSelected = (skillId: string): boolean => {
    return filterOptions.microSkills.includes(skillId);
  };

  const getSkillIdsForTopic = (topic: MainTopic): string[] => {
    const topicData = topicStructure.find(t => t.topic === topic);
    return topicData?.skills.map(skill => skill.id) || [];
  };

  const getMicroSkillCount = (skillId: string): { total: number } => {
    return { total: questionCounts.skillCounts[skillId] || 0 };
  };

  // Fetch topic structure and question counts when active section changes
  useEffect(() => {
    const fetchSectionData = async () => {
      if (!activeSection) return;
      
      setIsLoading(true);
      try {
        // Fetch topic structure for the active section
        const structure = await fetchDynamicTopicStructure(activeSection);
        
        if (structure && Array.isArray(structure)) {
          // Store topic structure for reference
          setTopicStructure(structure);
          
          // Extract topic names for default selection
          const topicNames = structure.map(item => item.topic);
          
          // Get all skill IDs from all topics to select them all by default
          const allSkillIds = structure.flatMap(topic => 
            topic.skills.map(skill => skill.id)
          );
          
          // Set all topics and all their skills as selected by default
          setFilterOptions(prev => ({
            ...prev,
            section: activeSection,
            topics: topicNames.length > 0 ? topicNames as MainTopic[] : ['Percentages'] as MainTopic[],
            microSkills: allSkillIds
          }));
        }
        
        // Fetch question counts for the active section
        const countsData = await fetchQuestionCounts(activeSection);
        console.log('Fetched counts data:', countsData);
        
        if (countsData) {
          // Set the question counts directly from the response
          setQuestionCounts({
            topicCounts: countsData.topicCounts || {},
            skillCounts: countsData.skillCounts || {}
          });
          
          // Set the total question count for the section
          setSectionQuestionCount(countsData.total || 0);
          
          // Debug log the question counts
          console.log('Set question counts:', {
            topicCounts: countsData.topicCounts || {},
            skillCounts: countsData.skillCounts || {},
            total: countsData.total || 0
          });
          
          // Load real user progress data from local storage
          if (structure && Array.isArray(structure)) {
            // Now that we have the structure, refresh the progress data
            refreshProgressData();
          }
        }
      } catch (error) {
        console.error('Error fetching section data:', error);
        toast.error('Failed to load practice data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSectionData();
  }, [activeSection]);
  
  // Handle starting practice session
  const handleStartPractice = async () => {
    setIsLoading(true);
    try {
      // Fetch questions based on current filters
      const fetchedQuestions = await fetchQuestions({
        section: activeSection,
        topics: filterOptions.topics,
        difficulty: filterOptions.difficulty,
        interactionStatus: filterOptions.interactionStatus,
        microSkills: filterOptions.microSkills
      });
      
      if (fetchedQuestions && fetchedQuestions.length > 0) {
        // Transform fetched questions to match QuestionData interface expected by ApplePracticeSession
        const questionData = fetchedQuestions.map((q: Question) => ({
          id: q.id,
          question_stem: q.question_stem,
          individual_question: q.individual_question,
          options: q.options.map(option => typeof option === 'string' ? option : option),
          correctAnswer: q.correct_answer,
          explanation: q.worked_solution,
          topic: q.main_topic,
          difficulty: q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
          tags: [q.micro_skill],
          data_block: {} as Record<string, unknown>, // Add empty data_block as Record
          data_type: 'none'
        }));
        
        // Cast to QuestionData[] to match ApplePracticeSession props
        setQuestions(questionData as unknown as QuestionData[]);
        setIsPracticing(true);
        console.log('Filtered questions count:', questionData.length);
      } else {
        toast.error('No questions match your filters. Please adjust and try again.');
      }
    } catch (error) {
      console.error('Error starting practice:', error);
      toast.error('Failed to start practice session');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle completing practice session
  const handleCompletePractice = () => {
    setIsPracticing(false);
    setQuestions([]);
    
    console.log('Practice completed, refreshing progress data');
    // Refresh progress data when practice is completed
    refreshProgressData();
    
    console.log('Current filter options:', JSON.stringify(filterOptions));
    console.log('Current section progress:', getSectionProgressFromStorage(activeSection));
    
    // Clear the question count cache to ensure we get fresh counts
    clearQuestionCountCache(filterOptions);
    
    // Update filtered count to reflect the new progress data
    // Use setTimeout to ensure progress data is updated first
    setTimeout(() => {
      console.log('Re-counting filtered questions with options:', JSON.stringify(filterOptions));
      countFilteredQuestions(filterOptions)
        .then(count => {
          console.log('Updated filtered count after practice:', count);
          console.log('Section progress after timeout:', getSectionProgressFromStorage(activeSection));
          setFilteredCount(count);
        })
        .catch(error => {
          console.error('Error updating filtered count:', error);
          setFilteredCount(0);
        });
    }, 100);
  };
  
  // Handle filter changes
  const handleFilterChange = (newFilters: PracticeFilterOptions) => {
    // Ensure at least one question history option is selected
    if (newFilters.interactionStatus && newFilters.interactionStatus.length === 0) {
      // If no interaction status is selected, keep the current selection
      newFilters.interactionStatus = filterOptions.interactionStatus;
      toast.error('At least one question history option must be selected');
    }
    const updatedFilters = {
      ...newFilters,
      section: activeSection
    };
    
    console.log('Filter change requested:', JSON.stringify(updatedFilters));
    console.log('Current section progress:', getSectionProgressFromStorage(activeSection));
    
    setFilterOptions(updatedFilters);
    
    // Clear the cache for these filters to ensure fresh counts
    clearQuestionCountCache(updatedFilters);
    
    // Update filtered count based on new filters
    console.log('Counting filtered questions with options:', JSON.stringify(updatedFilters));
    countFilteredQuestions(updatedFilters)
      .then(count => {
        console.log('Updated filtered count after filter change:', count);
        setFilteredCount(count);
      })
      .catch(error => {
        console.error('Error updating filtered count:', error);
        setFilteredCount(0);
      });
  };
  
  // Handle section change
  const handleSectionChange = (section: string) => {
    if (section !== activeSection) {
      setActiveSection(section);
    }
  };
  
  // If loading sections, show skeleton UI
  if (loadingSections) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Render practice session if practicing
  if (isPracticing && questions.length > 0) {
    console.log('Starting practice with filtered questions:', questions.length);
    return (
      <ApplePracticeSession
        questions={questions}
        onComplete={handleCompletePractice}
      />
    );
  }
  
  // Render practice setup UI
  return (
    <div className="max-w-4xl mx-auto pt-12 px-6">
      

      
      <div className="apple-section-container">
        <h3 className="apple-heading-2 mb-4">Select Section</h3>
        
        <div className="apple-section-grid">
          {availableSections.map((section) => {
            const SectionIcon = SECTION_DETAILS[section]?.icon || Target;
            const isSelected = activeSection === section;
            
            return (
              <div
                key={section}
                onClick={() => handleSectionChange(section)}
                className={`apple-section-card ${isSelected ? 'selected' : ''}`}
              >
                <div className={`apple-section-card-content`}>
                  <div className={`apple-section-card-icon ${isSelected ? 'selected' : ''}`}>
                    <SectionIcon className="h-5 w-5" />
                  </div>
                  <div className="apple-section-card-text">
                    <h4 className="apple-section-card-title">
                      {SECTION_DETAILS[section]?.name || section}
                    </h4>
                    <div className="apple-section-card-subtitle">
                      {sectionQuestionCount} questions
                      {getSectionProgressFromStorage(section).total > 0 && (
                        <span className="ml-2">
                          • <span className="text-green-600">{getSectionProgressFromStorage(section).correct} correct</span>
                          • <span className="text-red-600">{getSectionProgressFromStorage(section).incorrect} incorrect</span>
                          • <span className="text-amber-600">{getSectionProgressFromStorage(section).skipped} skipped</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="apple-section-card-indicator"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {!isPracticing && (
        <div className="space-y-6">
          {/* Practice Section Content */}
          <div className="mb-10">

            {/* Topics */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <h4 className="apple-heading-2">Topics</h4>
                <button 
                  className="ml-auto apple-button-small"
                  onClick={() => {
                    // Get all skill IDs from all topics
                    const allSkillIds = topicStructure.flatMap(topic => 
                      topic.skills.map(skill => skill.id)
                    );
                    
                    // Check if all skills are already selected
                    const allSelected = allSkillIds.every(id => filterOptions.microSkills.includes(id));
                    
                    if (allSelected) {
                      // If all are selected, deselect all
                      handleFilterChange({
                        ...filterOptions,
                        microSkills: []
                      });
                    } else {
                      // Otherwise, select all
                      handleFilterChange({
                        ...filterOptions,
                        microSkills: allSkillIds
                      });
                    }
                  }}
                >
                  {topicStructure.flatMap(topic => topic.skills.map(skill => skill.id)).every(id => filterOptions.microSkills.includes(id)) 
                    ? 'Deselect All' 
                    : 'Select All'}
                </button>
              </div>
              
              {/* Topic list with expandable subtopics - Apple-style UI */}
              <div className="apple-topic-list">
                {filterOptions.topics.map((topic) => {
                  // Get all skills/subtopics for this topic
                  const topicData = topicStructure.find((t: {topic: string; skills: Array<{id: string; name: string}>}) => t.topic === topic);
                  const subtopics = topicData?.skills || [];
                  const isExpanded = expandedTopics[topic] || false;
                  const isSelected = isTopicSelected(topic as MainTopic);
                  
                  return (
                    <div key={topic} className="apple-topic-item-container">
                      {/* Main topic item - Apple-style */}
                      <div className={`apple-topic-item ${isSelected ? 'selected' : ''}`}>
                        <div 
                          className="apple-topic-header"
                          onClick={() => {
                            // Toggle expanded state for this topic
                            setExpandedTopics((prev: Record<string, boolean>) => ({
                              ...prev,
                              [topic]: !prev[topic]
                            }));
                          }}
                        >
                          {/* Topic checkbox */}
                          <div 
                            className={`apple-checkbox ${isSelected ? 'selected' : ''} ${isTopicPartiallySelected(topic as MainTopic) ? 'partial' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Get all skill IDs for this topic
                              const skillIds = getSkillIdsForTopic(topic as MainTopic);
                              
                              // Toggle selection of the entire topic
                              if (isSelected || isTopicPartiallySelected(topic as MainTopic)) {
                                // If all skills are selected or partially selected, deselect all of them
                                const updatedSkills = filterOptions.microSkills.filter(s => !skillIds.includes(s));
                                handleFilterChange({
                                  ...filterOptions,
                                  microSkills: updatedSkills
                                });
                              } else {
                                // If not all skills are selected, select all of them
                                const updatedSkills = [...new Set([...filterOptions.microSkills, ...skillIds])];
                                handleFilterChange({
                                  ...filterOptions,
                                  microSkills: updatedSkills
                                });
                              }
                            }}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3" />
                            )}
                            {isTopicPartiallySelected(topic as MainTopic) && (
                              <div className="apple-checkbox-partial"></div>
                            )}
                          </div>
                          
                          {/* Topic name and info */}
                          <div className="apple-topic-content">
                            <div className="apple-topic-title">{topic}</div>
                            <div className="apple-topic-subtitle">
                              {subtopics.length} subtopics • {getTopicCount(topic)} questions
                              {getTopicProgressFromStorage(topic).total > 0 && (
                                <div className="mt-1 text-xs">
                                  <span className="text-green-600 mr-2">
                                    <CheckCircle className="inline h-3 w-3 mr-1" /> {getTopicProgressFromStorage(topic).correct} correct
                                  </span>
                                  <span className="text-red-600 mr-2">
                                    <XCircle className="inline h-3 w-3 mr-1" /> {getTopicProgressFromStorage(topic).incorrect} incorrect
                                  </span>
                                  <span className="text-amber-600">
                                    <HelpCircle className="inline h-3 w-3 mr-1" /> {getTopicProgressFromStorage(topic).skipped} skipped
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Disclosure chevron */}
                          <div className="apple-chevron">
                            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`} />
                          </div>
                        </div>
                        
                        {/* Subtopics container - only visible when expanded */}
                        {isExpanded && subtopics.length > 0 && (
                          <div className="border-t border-gray-100 bg-gray-50 animate-slideDown">
                            {subtopics.map((skill: {id: string; name: string}) => {
                              const isSkillSelected = isMicroSkillSelected(skill.id);
                              
                              return (
                                <div 
                                  key={skill.id}
                                  className="flex items-center p-3 pl-10 border-b border-gray-100 last:border-b-0 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                                  onClick={() => {
                                    // Toggle selection of this skill
                                    const updatedSkills = isSkillSelected
                                      ? filterOptions.microSkills.filter(s => s !== skill.id)
                                      : [...filterOptions.microSkills, skill.id];
                                      
                                    handleFilterChange({
                                      ...filterOptions,
                                      microSkills: updatedSkills
                                    });
                                  }}
                                >
                                  {/* Subtopic checkbox */}
                                  <div className="w-5 h-5 rounded-sm border border-gray-300 flex items-center justify-center bg-white mr-3">
                                    {isSkillSelected && (
                                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  
                                  {/* Subtopic name */}
                                  <div className="text-xs font-medium text-gray-800">{skill.name}</div>
                                  
                                  {/* Question count */}
                                  <div className="ml-auto text-xs">
                                    <div className="text-gray-500">{getMicroSkillCount(skill.id).total} questions</div>
                                    {getSkillProgressFromStorage(skill.id).total > 0 && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-green-600 flex items-center">
                                          <CheckCircle className="h-3 w-3 mr-0.5" /> {getSkillProgressFromStorage(skill.id).correct}
                                        </span>
                                        <span className="text-red-600 flex items-center">
                                          <XCircle className="h-3 w-3 mr-0.5" /> {getSkillProgressFromStorage(skill.id).incorrect}
                                        </span>
                                        <span className="text-amber-600 flex items-center">
                                          <HelpCircle className="h-3 w-3 mr-0.5" /> {getSkillProgressFromStorage(skill.id).skipped}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Difficulty */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <h4 className="text-lg font-medium text-gray-800">Difficulty</h4>
              </div>
              
              {/* Apple-style segmented control */}
              <div className="flex space-x-2">
                <div 
                  className={`flex-1 p-3 rounded-xl cursor-pointer ${filterOptions.difficulty.includes('easy') ? 'border border-blue-500 bg-blue-50' : 'border border-gray-200 bg-gray-50'}`}
                  onClick={() => {
                    const isSelected = filterOptions.difficulty.includes('easy');
                    // Only allow deselection if there are other options selected
                    if (isSelected && filterOptions.difficulty.length > 1) {
                      const updatedDifficulty = filterOptions.difficulty.filter((d: DifficultyOption) => d !== 'easy');
                      handleFilterChange({...filterOptions, difficulty: updatedDifficulty});
                    } else if (!isSelected) {
                      const updatedDifficulty = [...filterOptions.difficulty, 'easy' as DifficultyOption];
                      handleFilterChange({...filterOptions, difficulty: updatedDifficulty});
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-6 flex items-center justify-center mb-1">
                      {filterOptions.difficulty.includes('easy') && (
                        <Check className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="text-sm font-medium">Easy</div>
                    <div className="text-xs text-gray-500">Beginner-level</div>
                  </div>
                </div>
                
                <div 
                  className={`flex-1 p-3 rounded-xl cursor-pointer ${filterOptions.difficulty.includes('medium') ? 'border border-blue-500 bg-blue-50' : 'border border-gray-200 bg-gray-50'} ${filterOptions.difficulty.length === 1 && filterOptions.difficulty.includes('medium') ? 'opacity-90' : ''}`}
                  onClick={() => {
                    const isSelected = filterOptions.difficulty.includes('medium');
                    // Only allow deselection if there are other options selected
                    if (isSelected && filterOptions.difficulty.length > 1) {
                      const updatedDifficulty = filterOptions.difficulty.filter((d: DifficultyOption) => d !== 'medium');
                      handleFilterChange({...filterOptions, difficulty: updatedDifficulty});
                    } else if (!isSelected) {
                      const updatedDifficulty = [...filterOptions.difficulty, 'medium' as DifficultyOption];
                      handleFilterChange({...filterOptions, difficulty: updatedDifficulty});
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-6 flex items-center justify-center mb-1">
                      {filterOptions.difficulty.includes('medium') && (
                        <Check className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="text-sm font-medium">Medium</div>
                    <div className="text-xs text-gray-500">Intermediate</div>
                  </div>
                </div>
                
                <div 
                  className={`flex-1 p-3 rounded-xl cursor-pointer ${filterOptions.difficulty.includes('hard') ? 'border border-blue-500 bg-blue-50' : 'border border-gray-200 bg-gray-50'} ${filterOptions.difficulty.length === 1 && filterOptions.difficulty.includes('hard') ? 'opacity-90' : ''}`}
                  onClick={() => {
                    const isSelected = filterOptions.difficulty.includes('hard');
                    // Only allow deselection if there are other options selected
                    if (isSelected && filterOptions.difficulty.length > 1) {
                      const updatedDifficulty = filterOptions.difficulty.filter((d: DifficultyOption) => d !== 'hard');
                      handleFilterChange({...filterOptions, difficulty: updatedDifficulty});
                    } else if (!isSelected) {
                      const updatedDifficulty = [...filterOptions.difficulty, 'hard' as DifficultyOption];
                      handleFilterChange({...filterOptions, difficulty: updatedDifficulty});
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-6 flex items-center justify-center mb-1">
                      {filterOptions.difficulty.includes('hard') && (
                        <Check className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="text-sm font-medium">Hard</div>
                    <div className="text-xs text-gray-500">Advanced</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Question History */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <h4 className="text-lg font-medium text-gray-800">Question History</h4>
              </div>
              
              {/* Apple-style list items */}
              <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div 
                  className="flex items-center p-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => {
                    const isSelected = filterOptions.interactionStatus.includes('incorrect');
                    // Only allow deselection if there are other options selected
                    if (isSelected && filterOptions.interactionStatus.length > 1) {
                      const updatedStatus = filterOptions.interactionStatus.filter(status => status !== 'incorrect');
                      handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                    } else if (!isSelected) {
                      const updatedStatus = [...filterOptions.interactionStatus, 'incorrect'];
                      handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Incorrect</div>
                    <div className="text-sm text-gray-500">
                      Questions you got wrong
                      {getSectionProgressFromStorage(activeSection).incorrect > 0 && (
                        <span className="ml-2 text-red-600 font-medium">
                          ({getSectionProgressFromStorage(activeSection).incorrect})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center">
                    {filterOptions.interactionStatus.includes('incorrect') && (
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                </div>
                
                <div 
                  className="flex items-center p-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => {
                    const isSelected = filterOptions.interactionStatus.includes('correct');
                    // Only allow deselection if there are other options selected
                    if (isSelected && filterOptions.interactionStatus.length > 1) {
                      const updatedStatus = filterOptions.interactionStatus.filter(status => status !== 'correct');
                      handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                    } else if (!isSelected) {
                      const updatedStatus = [...filterOptions.interactionStatus, 'correct'];
                      handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Correct</div>
                    <div className="text-sm text-gray-500">
                      Questions you got right
                      {getSectionProgressFromStorage(activeSection).correct > 0 && (
                        <span className="ml-2 text-green-600 font-medium">
                          ({getSectionProgressFromStorage(activeSection).correct})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center">
                    {filterOptions.interactionStatus.includes('correct') && (
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                </div>
                
                <div 
                  className="flex items-center p-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => {
                    const isSelected = filterOptions.interactionStatus.includes('flagged');
                    // Only allow deselection if there are other options selected
                    if (isSelected && filterOptions.interactionStatus.length > 1) {
                      const updatedStatus = filterOptions.interactionStatus.filter(status => status !== 'flagged');
                      handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                    } else if (!isSelected) {
                      const updatedStatus = [...filterOptions.interactionStatus, 'flagged'];
                      handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                    <Flag className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Flagged</div>
                    <div className="text-sm text-gray-500">
                      Questions you flagged for review
                      {getSectionProgressFromStorage(activeSection).flagged > 0 && (
                        <span className="ml-2 text-indigo-600 font-medium">
                          ({getSectionProgressFromStorage(activeSection).flagged})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center">
                    {filterOptions.interactionStatus.includes('flagged') && (
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                </div>
                
                <div 
                  className="flex items-center p-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => {
                    const isSelected = filterOptions.interactionStatus.includes('skipped');
                    // Only allow deselection if there are other options selected
                    if (isSelected && filterOptions.interactionStatus.length > 1) {
                      const updatedStatus = filterOptions.interactionStatus.filter(status => status !== 'skipped');
                      handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                    } else if (!isSelected) {
                      const updatedStatus = [...filterOptions.interactionStatus, 'skipped'];
                      handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <SkipForward className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Skipped</div>
                    <div className="text-sm text-gray-500">
                      Questions you skipped
                      {getSectionProgressFromStorage(activeSection).skipped > 0 && (
                        <span className="ml-2 text-amber-600 font-medium">
                          ({getSectionProgressFromStorage(activeSection).skipped})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center">
                    {filterOptions.interactionStatus.includes('skipped') && (
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                </div>
                
                <div 
                  className="flex items-center p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => {
                    const isSelected = filterOptions.interactionStatus.includes('unseen');
                    const updatedStatus = isSelected
                      ? filterOptions.interactionStatus.filter(status => status !== 'unseen')
                      : [...filterOptions.interactionStatus, 'unseen'];
                    handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Eye className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Unseen</div>
                    <div className="text-sm text-gray-500">
                      Questions you haven't seen yet
                      {(() => {
                        // Get all tracked questions for this section
                        const sectionProgress = getSectionProgressFromStorage(activeSection);
                        const totalTracked = sectionProgress.total || 0;
                        
                        // Calculate unseen count - if total tracked is 0 or less than section count, show the difference
                        // Otherwise, there are no unseen questions (all have been seen)
                        const unseenCount = Math.max(0, sectionQuestionCount - totalTracked);
                        
                        return unseenCount > 0 ? (
                          <span className="ml-2 text-gray-600 font-medium">({unseenCount})</span>
                        ) : (
                          <span className="ml-2 text-green-600 font-medium">(0 - all seen)</span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center">
                    {filterOptions.interactionStatus.includes('unseen') && (
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer with filtered count and start button */}
          <div className="mt-10 flex flex-col items-center">
            <div className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">{filteredCount}</span> questions match your filters
            </div>
            <Button
              onClick={handleStartPractice}
              disabled={isLoading || filteredCount === 0}
              className={`w-full py-4 rounded-xl font-medium text-base transition-all duration-200 ${isLoading || filteredCount === 0 ? 'bg-gray-200 text-gray-400' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Start Practice
                  <ArrowRight className="h-5 w-5 ml-2" />
                </div>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
