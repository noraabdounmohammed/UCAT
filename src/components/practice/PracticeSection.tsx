import { useState, useEffect, useCallback } from 'react';
import { ApplePracticeSession, QuestionData } from './ApplePracticeSession';
import { Target, ArrowRight, Calculator, BookOpen, Brain, Scale, Loader2, CheckCircle, XCircle, Eye, Check, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './animations.css';
import './apple-section-styles.css';
import { getAvailableSections, Question } from '@/utils/questionBank';
import { fetchQuestions, fetchQuestionCounts, fetchDynamicTopicStructure, countFilteredQuestions, clearQuestionCountCache } from '@/lib/questions';
import { getSectionProgress, getTopicProgress, getSkillProgress } from '@/utils/userProgressStorage';
import { toast } from 'sonner';
import { ResetProgressButton } from '@/components/ui/ResetProgressButton';
import { PracticeFilterOptions, MainTopic, DifficultyOption, InteractionStatus } from '@/types/practice';

// Section definitions with icons and descriptions
const SECTION_DETAILS: Record<string, { name: string, icon: LucideIcon, description: string }> = {
  'VR': { name: 'Verbal Reasoning', icon: BookOpen, description: 'Evaluate information presented in written form' },
  'DM': { name: 'Decision Making', icon: Brain, description: 'Make informed decisions based on complex information' },
  'QR': { name: 'Quantitative Reasoning', icon: Calculator, description: 'Test your numerical and analytical skills' },
  'SJ': { name: 'Situational Judgement', icon: Scale, description: 'Respond appropriately to real-world scenarios' },
  'AKT': { name: 'UKMLA AKT Exam', icon: Target, description: 'UK Medical Licensing Assessment Applied Knowledge Test' }
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
    difficulty: ['easy', 'medium', 'hard'] as DifficultyOption[], // All difficulty levels selected by default
    interactionStatus: ['unseen', 'correct', 'incorrect'] as InteractionStatus[], // Skip option removed as we don't have skip functionality yet
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
  
  // Track question counts per section
  const [sectionQuestionCounts, setSectionQuestionCounts] = useState<Record<string, number>>({});
  
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
  
  // We no longer need this since we're using sectionQuestionCounts instead
  // const [sectionQuestionCount, setSectionQuestionCount] = useState(0);
  
  // Calculate initial filtered count on component mount
  useEffect(() => {
    if (filterOptions.section) {
      console.log('Initial filtered count calculation with options:', filterOptions);
      countFilteredQuestions(filterOptions)
        .then(count => {
          console.log('Initial filtered count:', count);
          setFilteredCount(count);
        })
        .catch(error => {
          console.error('Error calculating initial filtered count:', error);
          setFilteredCount(0);
        });
    }
  }, []); // Run only on mount

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
        console.log('Loading available sections...');
        const sections = await getAvailableSections();
        console.log('Available sections:', sections);
        setAvailableSections(sections);
        
        // Set a default section if available and no section is currently selected
        if (sections && sections.length > 0) {
          // Only set default section if none is selected
          if (!activeSection || !sections.includes(activeSection)) {
            console.log('Setting default section to:', sections[0]);
            setActiveSection(sections[0]);
            
            // Update filter options with the selected section
            setFilterOptions(prev => ({
              ...prev,
              section: sections[0]
            }));
          }
          
          // Load question counts for all sections on initial load
          for (const section of sections) {
            const countsData = await fetchQuestionCounts(section);
            if (countsData) {
              setSectionQuestionCounts(prev => ({
                ...prev,
                [section]: countsData.total || 0
              }));
              console.log(`Loaded question count for ${section}: ${countsData.total}`);
            }
          }
        }
        
        // Only mark loading as complete after we've set the active section
        setLoadingSections(false);
      } catch (error) {
        console.error('Error loading sections:', error);
        toast.error('Failed to load available sections');
        setLoadingSections(false);
      }
    };
    
    loadSections();
    refreshProgressData();
  }, [refreshProgressData, activeSection]); // Add activeSection dependency to react to changes
  
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

  // This function is not being used, so we can comment it out
  // const getMicroSkillCount = (skillId: string): { total: number } => {
  //   return { total: questionCounts.skillCounts[skillId] || 0 };
  // };

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
          
          // We no longer need to set this since we're using sectionQuestionCounts instead
          // setSectionQuestionCount(countsData.total || 0);
          
          // Update section-specific question counts
          setSectionQuestionCounts(prev => ({
            ...prev,
            [activeSection]: countsData.total || 0
          }));
          
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
      // Check if user is specifically trying to practice unseen questions only
      const isUnseenOnly = filterOptions.interactionStatus.length === 1 && 
                         filterOptions.interactionStatus.includes('unseen');
      
      // Get the total question count for this section
      const totalSectionQuestions = sectionQuestionCounts[activeSection] || 0;
      
      // Get the number of questions the user has already attempted in this section
      const sectionProgress = getSectionProgressFromStorage(activeSection);
      const attemptedQuestions = sectionProgress.total || 0;
      
      // Calculate how many unseen questions should be available
      const unseenCount = Math.max(0, totalSectionQuestions - attemptedQuestions);
      
      console.log(`Starting practice with filters:`, filterOptions);
      console.log(`Section: ${activeSection}, Total: ${totalSectionQuestions}, Attempted: ${attemptedQuestions}, Unseen: ${unseenCount}`);
      
      // If user is trying to practice unseen questions but there are none left, show a message
      if (isUnseenOnly && unseenCount === 0) {
        toast.error('You have already attempted all questions in this system. Try including other question types in your filter.');
        setIsLoading(false);
        return;
      }
      
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
          // Include table data if present
          table: q.table,
          // Include chart data if present
          chart: q.chart,
          // Keep data_block for backward compatibility
          data_block: q.data_block || {} as Record<string, unknown>,
          data_type: q.data_type || 'none'
        }));
        
        // Cast to QuestionData[] to match ApplePracticeSession props
        setQuestions(questionData as unknown as QuestionData[]);
        setIsPracticing(true);
        
        // Scroll to top of page when starting practice
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }, 100);
        
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
    console.log('Changing section to:', section);
    
    if (section !== activeSection) {
      // Set the active section
      setActiveSection(section);
      
      // Reset filter options for the new section
      // This is important - we need to clear existing topic selections
      setFilterOptions({
        section: section,
        topics: [], // Will be populated when topic structure loads
        microSkills: [], // Will be populated when topic structure loads
        difficulty: ['easy', 'medium', 'hard'] as DifficultyOption[],
        interactionStatus: ['unseen', 'correct', 'incorrect'] as InteractionStatus[]
      });
      
      // Clear topic structure to force reload
      setTopicStructure([]);
      
      // Force refresh progress data for the new section
      setTimeout(() => refreshProgressData(), 100);
      
      console.log('Section changed successfully to:', section);
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
    console.log('Using active section:', activeSection);
    return (
      <ApplePracticeSession
        questions={questions}
        onComplete={handleCompletePractice}
        section={activeSection} // Pass the active section to track progress correctly
      />
    );
  }
  
  // Render practice setup UI
  return (
    <div className="max-w-4xl mx-auto pt-12 px-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="apple-heading-1" data-component-name="PracticeSection">UKMLA Practice</h2>
        <ResetProgressButton />
      </div>
      

      
      <div className="apple-section-container">
        <h3 className="apple-heading-2 mb-4">Select System</h3>
        
        <div className="apple-section-grid">
          {availableSections.map((section) => {
            const SectionIcon = SECTION_DETAILS[section]?.icon || Target;
            const isSelected = activeSection === section;
            
            return (
              <div
                key={section}
                onClick={() => handleSectionChange(section)}
                className={`apple-section-card ${isSelected ? 'selected' : ''}`}
                style={{
                  background: getSectionProgressFromStorage(section).total > 0 ?
                    `linear-gradient(to right, 
                      rgba(16, 185, 129, 0.08) 0%, 
                      rgba(16, 185, 129, 0.08) ${(getSectionProgressFromStorage(section).correct / (sectionQuestionCounts[section] || 1)) * 100}%, 
                      rgba(239, 68, 68, 0.08) ${(getSectionProgressFromStorage(section).correct / (sectionQuestionCounts[section] || 1)) * 100}%, 
                      rgba(239, 68, 68, 0.08) ${((getSectionProgressFromStorage(section).correct + getSectionProgressFromStorage(section).incorrect) / (sectionQuestionCounts[section] || 1)) * 100}%, 
                      var(--card-background) ${((getSectionProgressFromStorage(section).correct + getSectionProgressFromStorage(section).incorrect) / (sectionQuestionCounts[section] || 1)) * 100}%, 
                      var(--card-background) 100%)` :
                    undefined
                }}
              >
                <div className={`apple-section-card-content`}>
                  <div className={`apple-section-card-icon ${isSelected ? 'selected' : ''}`}>
                    <SectionIcon className="h-5 w-5" />
                  </div>
                  <div className="apple-section-card-text">
                    <h4 className="apple-section-card-title">
                      {SECTION_DETAILS[section]?.name || section}
                    </h4>
                    <div className="apple-section-card-subtitle" data-component-name="PracticeSection">
                      {/* Show the number of attempted questions from the section's progress data */}
                      {(getSectionProgressFromStorage(section).correct + getSectionProgressFromStorage(section).incorrect)}/{sectionQuestionCounts[section] || 0} questions attempted
                      {getSectionProgressFromStorage(section).total > 0 && (
                        <div className="mt-1 flex items-center" data-component-name="PracticeSection">
                          <span className="text-xs font-medium text-gray-600">
                            {Math.round((getSectionProgressFromStorage(section).correct / getSectionProgressFromStorage(section).total) * 100)}% correct
                          </span>
                        </div>
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

            {/* Conditions */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <h4 className="apple-heading-2">Conditions</h4>
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
              
              {/* Topic list with gamified, visually engaging UI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterOptions.topics.map((topic) => {
                  // Get all skills/subtopics for this topic
                  const topicData = topicStructure.find((t: {topic: string; skills: Array<{id: string; name: string}>}) => t.topic === topic);
                  const subtopics = topicData?.skills || [];
                  const isExpanded = expandedTopics[topic] || false;
                  const isSelected = isTopicSelected(topic as MainTopic);
                  
                  // Get progress data for visual indicators
                  const topicProgress = getTopicProgressFromStorage(topic);
                  const totalAttempted = topicProgress.total;
                  const hasProgress = totalAttempted > 0;
                  
                  // Calculate background gradient for the entire card
                  const cardBackground = hasProgress ? 
                    `linear-gradient(to right, 
                      rgba(16, 185, 129, 0.08) 0%, 
                      rgba(16, 185, 129, 0.08) ${(topicProgress.correct / getTopicCount(topic)) * 100}%, 
                      rgba(239, 68, 68, 0.08) ${(topicProgress.correct / getTopicCount(topic)) * 100}%, 
                      rgba(239, 68, 68, 0.08) ${((topicProgress.correct + topicProgress.incorrect) / getTopicCount(topic)) * 100}%, 
                      var(--card-bg) ${((topicProgress.correct + topicProgress.incorrect) / getTopicCount(topic)) * 100}%, 
                      var(--card-bg) 100%)` : 
                    (isSelected ? 'var(--selected-bg)' : 'var(--card-bg)');
                    
                  return (
                    <div 
                      key={topic} 
                      className={`rounded-xl border overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md ${isSelected ? 'border-blue-300 ring-2 ring-blue-100 dark:border-gray-500 dark:ring-gray-700' : 'border-gray-200 dark:border-gray-700'}`}
                      style={{ background: cardBackground }}
                    >
                      {/* Topic header */}
                      <div 
                        className="relative p-4 cursor-pointer overflow-hidden"
                        onClick={() => {
                          // Toggle expanded state for this topic
                          setExpandedTopics((prev: Record<string, boolean>) => ({
                            ...prev,
                            [topic]: !prev[topic]
                          }));
                        }}
                      >
                        
                        <div className="flex items-start">
                          {/* Topic checkbox with animated check */}
                          <div 
                            className={`flex-shrink-0 w-6 h-6 rounded-md mr-3 flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-500 text-white dark:bg-gray-500 dark:text-white' 
                                : isTopicPartiallySelected(topic as MainTopic)
                                  ? 'bg-blue-200 border border-blue-300 dark:bg-gray-600 dark:border-gray-500' 
                                  : 'border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                            }`}
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
                              <Check className="h-3 w-3 animate-checkmark" />
                            )}
                            {isTopicPartiallySelected(topic as MainTopic) && (
                              <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                            )}
                          </div>
                          
                          {/* Topic content */}
                          <div className="flex-grow">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-900 dark:text-gray-100">{topic}</h3>
                              <ChevronRight className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`} />
                            </div>
                            
                            <div className="mt-1 flex items-center text-sm text-gray-600 dark:text-gray-400">
                              {/* Count of attempted sub-conditions out of total */}
                              <span className="mr-2" data-component-name="PracticeSection">
                                {subtopics.filter(skill => getSkillProgressFromStorage(skill.id).total > 0).length}/{subtopics.length} sub-conditions
                              </span>
                              <span>•</span>
                              {/* Count of attempted questions out of total */}
                              <span className="mx-2">
                                {totalAttempted}/{getTopicCount(topic)} questions
                              </span>
                            </div>
                            
                            {/* Visual progress indicators */}
                            {/* Progress percentage text removed per user request */}
                            
                            {/* Progress message removed as requested */}
                          </div>
                        </div>
                      </div>
                      
                      {/* Subtopics with animated expansion */}
                      {isExpanded && subtopics.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 animate-slideDown divide-y divide-gray-100 dark:divide-gray-700">
                          {subtopics.map((skill: {id: string; name: string}) => {
                            const isSkillSelected = isMicroSkillSelected(skill.id);
                            
                            return (
                              <div 
                                key={skill.id}
                                className="flex items-center p-3 pl-8 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
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
                                {/* Subtopic checkbox with animated check */}
                                <div 
                                  className={`w-5 h-5 rounded-md flex items-center justify-center mr-3 transition-all duration-200 ${
                                    isSkillSelected 
                                      ? 'bg-blue-500 text-white dark:bg-gray-500 dark:text-white' 
                                      : 'border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                  }`}
                                >
                                  {isSkillSelected && (
                                    <Check className="h-3 w-3 animate-checkmark" />
                                  )}
                                </div>
                                <span className="text-sm text-gray-900 dark:text-gray-100">{skill.name}</span>
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

            {/* Difficulty */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <h4 className="apple-heading-2" data-component-name="PracticeSection">Difficulty</h4>
              </div>
              
              {/* Apple-style segmented control */}
              <div className="flex space-x-2">
                <div 
                  className={`flex-1 p-3 rounded-xl cursor-pointer ${filterOptions.difficulty.includes('easy') ? 'border border-blue-500 bg-blue-50 dark:bg-gray-700 dark:border-gray-500' : 'border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}
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
                        <Check className="h-4 w-4 text-blue-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Easy</div>
                  </div>
                </div>
                
                <div 
                  className={`flex-1 p-3 rounded-xl cursor-pointer ${filterOptions.difficulty.includes('medium') ? 'border border-blue-500 bg-blue-50 dark:bg-gray-700 dark:border-gray-500' : 'border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'} ${filterOptions.difficulty.length === 1 && filterOptions.difficulty.includes('medium') ? 'opacity-90' : ''}`}
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
                        <Check className="h-4 w-4 text-blue-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Medium</div>
                  </div>
                </div>
                
                <div 
                  className={`flex-1 p-3 rounded-xl cursor-pointer ${filterOptions.difficulty.includes('hard') ? 'border border-blue-500 bg-blue-50 dark:bg-gray-700 dark:border-gray-500' : 'border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'} ${filterOptions.difficulty.length === 1 && filterOptions.difficulty.includes('hard') ? 'opacity-90' : ''}`}
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
                        <Check className="h-4 w-4 text-blue-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Hard</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Question History */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <h4 className="apple-heading-2" data-component-name="PracticeSection">Question History</h4>
              </div>
              
              {/* Apple-style list items */}
              <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                <div 
                  className="flex items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
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
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900 dark:text-gray-100">Incorrect</div>
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
                  className="flex items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
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
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900 dark:text-gray-100">Correct</div>
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
                
                
                {/* Skipped filter removed as we don't have skip functionality yet */}
                
                <div 
                  className="flex items-center p-4 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  onClick={() => {
                    const isSelected = filterOptions.interactionStatus.includes('unseen');
                    const updatedStatus = isSelected
                      ? filterOptions.interactionStatus.filter(status => status !== 'unseen')
                      : [...filterOptions.interactionStatus, 'unseen'];
                    handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                    <Eye className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900 dark:text-gray-100">Unseen</div>
                    <div className="text-sm text-gray-500">
                      Questions you haven't seen yet
                      {(() => {
                        // Get all tracked questions for this section
                        const sectionProgress = getSectionProgressFromStorage(activeSection);
                        const totalTracked = sectionProgress.total || 0;
                        
                        // Calculate unseen count - if total tracked is 0 or less than section count, show the difference
                        // Otherwise, there are no unseen questions (all have been seen)
                        const unseenCount = Math.max(0, sectionQuestionCounts[activeSection] - totalTracked);
                        
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
            <button
              onClick={handleStartPractice}
              disabled={isLoading || filteredCount === 0}
              className={`w-full py-3 rounded-xl font-medium text-base transition-all duration-200 flex items-center justify-center gap-2 ${isLoading || filteredCount === 0 ? 'bg-gray-200 text-gray-400' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  Start Practice
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
