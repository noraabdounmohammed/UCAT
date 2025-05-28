import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ModernPracticeSession, QuestionData } from './ModernPracticeSession';
import { Target, ArrowRight, Calculator, BookOpen, Brain, Scale, Loader2, CheckCircle, XCircle, Flag, SkipForward, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import './animations.css';
import { getAvailableSections, Question } from '@/utils/questionBank';
import { fetchQuestions, fetchQuestionCounts, fetchDynamicTopicStructure, countFilteredQuestions } from '@/lib/questions';
import { toast } from 'sonner';
import { PracticeFilterOptions, MainTopic, DifficultyOption, InteractionStatus } from '@/types/practice';

// Section definitions with icons and descriptions
const SECTION_DETAILS: Record<string, { name: string, icon: LucideIcon, description: string }> = {
  'VR': { name: 'Verbal Reasoning', icon: BookOpen, description: 'Evaluate information presented in written form' },
  'DM': { name: 'Decision Making', icon: Brain, description: 'Make informed decisions based on complex information' },
  'QR': { name: 'Quantitative Reasoning', icon: Calculator, description: 'Test your numerical and analytical skills' },
  'SJ': { name: 'Situational Judgement', icon: Scale, description: 'Respond appropriately to real-world scenarios' }
};

interface PracticeSectionProps {
  onPracticeStart?: (section: string) => void;
}

export function PracticeSection({ onPracticeStart }: PracticeSectionProps): JSX.Element {
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
    interactionStatus: ['unseen', 'correct', 'incorrect'] as InteractionStatus[],
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
  
  // User progress tracking - used for displaying progress in UI
  const [userProgress, setUserProgress] = useState<{
    topics: Record<string, { correct: number; incorrect: number; total: number }>;
    skills: Record<string, { correct: number; incorrect: number; total: number }>;
  }>({
    topics: {},
    skills: {}
  });
  
  // Use userProgress in a utility function to avoid unused variable warning
  const getTopicProgress = (topic: string) => {
    return userProgress.topics[topic] || { correct: 0, incorrect: 0, total: 0 };
  };
  
  // Track filtered question count
  const [filteredCount, setFilteredCount] = useState(0);
  
  // Fetch available sections on component mount
  useEffect(() => {
    const fetchSections = async () => {
      setLoadingSections(true);
      try {
        const sections = await getAvailableSections();
        setAvailableSections(sections);
        if (sections.length > 0 && !sections.includes(activeSection)) {
          setActiveSection(sections[0]);
        }
      } catch (error) {
        console.error('Error fetching sections:', error);
        toast.error('Failed to load available sections');
      } finally {
        setLoadingSections(false);
      }
    };
    
    fetchSections();
  }, [activeSection]); // Include activeSection in dependency array
  
  // Helper functions for topic and skill selection
  const isTopicSelected = (topic: MainTopic): boolean => {
    // Get all skill IDs for this topic
    const topicData = topicStructure.find((t: {topic: string; skills: Array<{id: string; name: string}>}) => t.topic === topic);
    const skillIds = topicData?.skills.map(skill => skill.id) || [];
    
    // Topic is only considered selected if all its skills are selected
    if (skillIds.length === 0) return false;
    return skillIds.every(skillId => filterOptions.microSkills.includes(skillId));
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
          
          // Set all topics as selected by default
          setFilterOptions(prev => ({
            ...prev,
            section: activeSection,
            topics: topicNames.length > 0 ? topicNames as MainTopic[] : ['Percentages'] as MainTopic[]
          }));
        }
        
        // Fetch question counts for the active section
        const countsData = await fetchQuestionCounts(activeSection);
        if (countsData) {
          // Ensure counts is the correct type (Record<string, number>)
          const topicCounts: Record<string, number> = {};
          
          // Extract only the numeric counts from the response
          // This handles the case where the API might return a complex object
          if (typeof countsData === 'object' && countsData !== null) {
            // Use a more specific type for the data structure
            const data = countsData as Record<string, unknown>;
            Object.keys(data).forEach(key => {
              // Only include numeric values in our topicCounts
              if (typeof data[key] === 'number') {
                topicCounts[key] = data[key] as number;
              }
            });
          }
          
          setQuestionCounts({
            topicCounts,
            skillCounts: {}
          });
          
          // Set up mock user progress data
          if (structure && Array.isArray(structure)) {
            const topicNames = structure.map(item => item.topic);
            const progressData: Record<string, { correct: number; incorrect: number; total: number }> = {};
            
            topicNames.forEach(topic => {
              const topicKey = String(topic);
              // Safely access the count from topicCounts
              const count = topicKey in topicCounts ? topicCounts[topicKey] : 0;
              progressData[topicKey] = { 
                correct: 0, 
                incorrect: 0, 
                total: count
              };
            });
            
            setUserProgress({
              topics: progressData,
              skills: {}
            });
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
    if (!activeSection) return;
    
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
        // Transform questions to the format expected by ModernPracticeSession
        const questionData: QuestionData[] = fetchedQuestions.map((q: Question) => ({
          id: q.id,
          question_stem: q.question_stem,
          individual_question: q.individual_question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.worked_solution,
          topic: q.main_topic,
          difficulty: q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
          tags: [q.micro_skill] // Use micro_skill as tags
        }));
        
        setQuestions(questionData);
        setIsPracticing(true);
        
        // Notify parent component if callback provided
        if (onPracticeStart) {
          onPracticeStart(activeSection);
        }
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
  };
  
  // Handle filter changes
  const handleFilterChange = (newFilters: PracticeFilterOptions) => {
    const updatedFilters = {
      ...newFilters,
      section: activeSection
    };
    setFilterOptions(updatedFilters);
    
    // Update filtered count
    countFilteredQuestions(updatedFilters)
      .then(count => {
        setFilteredCount(count);
      })
      .catch(error => {
        console.error('Error counting filtered questions:', error);
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
    return (
      <ModernPracticeSession
        questions={questions}
        onComplete={handleCompletePractice}
      />
    );
  }
  
  // Render practice setup UI
  return (
    <div className="max-w-4xl mx-auto pt-12 px-6">
      
      <div className="flex flex-col space-y-2 mb-10">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-3">
          <Target className="h-6 w-6 text-blue-500" />
          Target Practice
        </h2>
        <p className="text-base text-gray-500 font-light">
          Practice questions from specific topics and track your progress
        </p>
      </div>
      
      <div className="mb-12">
        <div className="flex items-center mb-4">
          <h3 className="text-xl font-medium text-gray-900">Select Section</h3>
          <div className="ml-auto text-sm text-gray-500 font-light">{availableSections.length} sections available</div>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {availableSections.map((section) => {
            const SectionIcon = SECTION_DETAILS[section]?.icon || Target;
            return (
              <div
                key={section}
                onClick={() => handleSectionChange(section)}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer transition-all duration-200 shadow-sm",
                  activeSection === section
                    ? "bg-blue-50 ring-1 ring-blue-200 shadow-md transform scale-[1.02]" 
                    : "bg-white hover:bg-gray-50 hover:shadow"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-14 h-14 rounded-full mb-3",
                  activeSection === section ? "bg-blue-100" : "bg-gray-100"
                )}>
                  <SectionIcon className={cn(
                    "h-7 w-7",
                    activeSection === section ? "text-blue-600" : "text-gray-500"
                  )} />
                </div>
                <span className={cn(
                  "text-base font-medium",
                  activeSection === section ? "text-blue-700" : "text-gray-800"
                )}>
                  {SECTION_DETAILS[section]?.name || section}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {!isPracticing && (
        <div className="space-y-6">
          {/* Customize Your Practice */}
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <h3 className="text-xl font-medium text-gray-900">Customize Your Practice</h3>
            </div>

            {/* Topics */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <h4 className="text-lg font-medium text-gray-800">Topics</h4>
                <div 
                  className="ml-auto text-sm text-blue-500 font-medium cursor-pointer hover:text-blue-600 transition-colors duration-200"
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
                </div>
              </div>
              
              {/* Topic list with expandable subtopics - Apple-style UI */}
              <div className="space-y-2">
                {filterOptions.topics.map((topic) => {
                  // Get all skills/subtopics for this topic
                  const topicData = topicStructure.find((t: {topic: string; skills: Array<{id: string; name: string}>}) => t.topic === topic);
                  const subtopics = topicData?.skills || [];
                  const isExpanded = expandedTopics[topic] || false;
                  const isSelected = isTopicSelected(topic as MainTopic);
                  
                  return (
                    <div key={topic} className="overflow-hidden">
                      {/* Main topic item - Apple-style */}
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div 
                          className="flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
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
                            className="w-5 h-5 rounded-sm border border-gray-300 flex items-center justify-center bg-white mr-3 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Get all skill IDs for this topic
                              const skillIds = getSkillIdsForTopic(topic as MainTopic);
                              
                              // Toggle selection of the entire topic
                              if (isSelected) {
                                // If all skills are selected, deselect all of them
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
                              <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          
                          {/* Topic icon */}
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 mr-2">
                            <BookOpen className="h-3 w-3 text-blue-500" />
                          </div>
                          
                          {/* Topic name and info */}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{topic}</div>
                            <div className="text-xs text-gray-500">
                              {subtopics.length} subtopics
                              {getTopicProgress(topic).total > 0 && (
                                <span className="ml-2">
                                  • {getTopicProgress(topic).correct} correct
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Disclosure triangle */}
                          <div className="ml-2">
                            <svg 
                              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`} 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <polyline points="9 6 15 12 9 18"></polyline>
                            </svg>
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
                                  <div className="ml-auto text-xs text-gray-500">
                                    {getMicroSkillCount(skill.id).total} questions
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
              
              {/* Apple-style checkbox list */}
              <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div 
                  className="flex items-center p-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => {
                    const isSelected = filterOptions.difficulty.includes('easy');
                    const updatedDifficulty = isSelected
                      ? filterOptions.difficulty.filter((d: DifficultyOption) => d !== 'easy')
                      : [...filterOptions.difficulty, 'easy' as DifficultyOption];
                    handleFilterChange({...filterOptions, difficulty: updatedDifficulty});
                  }}
                >
                  <div className="w-6 h-6 rounded-md border border-gray-300 flex items-center justify-center bg-white mr-3">
                    {filterOptions.difficulty.includes('easy') && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Easy</div>
                    <div className="text-sm text-gray-500">Beginner-level questions</div>
                  </div>
                </div>
                
                <div 
                  className="flex items-center p-4 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => {
                    const isSelected = filterOptions.difficulty.includes('medium');
                    const updatedDifficulty = isSelected
                      ? filterOptions.difficulty.filter((d: DifficultyOption) => d !== 'medium')
                      : [...filterOptions.difficulty, 'medium' as DifficultyOption];
                    handleFilterChange({...filterOptions, difficulty: updatedDifficulty});
                  }}
                >
                  <div className="w-6 h-6 rounded-md border border-gray-300 flex items-center justify-center bg-white mr-3">
                    {filterOptions.difficulty.includes('medium') && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Medium</div>
                    <div className="text-sm text-gray-500">Intermediate-level questions</div>
                  </div>
                </div>
                
                <div 
                  className="flex items-center p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                  onClick={() => {
                    const isSelected = filterOptions.difficulty.includes('hard');
                    const updatedDifficulty = isSelected
                      ? filterOptions.difficulty.filter((d: DifficultyOption) => d !== 'hard')
                      : [...filterOptions.difficulty, 'hard' as DifficultyOption];
                    handleFilterChange({...filterOptions, difficulty: updatedDifficulty});
                  }}
                >
                  <div className="w-6 h-6 rounded-md border border-gray-300 flex items-center justify-center bg-white mr-3">
                    {filterOptions.difficulty.includes('hard') && (
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Hard</div>
                    <div className="text-sm text-gray-500">Advanced-level questions</div>
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
                    const updatedStatus = isSelected
                      ? filterOptions.interactionStatus.filter(status => status !== 'incorrect')
                      : [...filterOptions.interactionStatus, 'incorrect'];
                    handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Incorrect</div>
                    <div className="text-sm text-gray-500">Questions you got wrong</div>
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
                    const updatedStatus = isSelected
                      ? filterOptions.interactionStatus.filter(status => status !== 'correct')
                      : [...filterOptions.interactionStatus, 'correct'];
                    handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Correct</div>
                    <div className="text-sm text-gray-500">Questions you got right</div>
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
                    const updatedStatus = isSelected
                      ? filterOptions.interactionStatus.filter(status => status !== 'flagged')
                      : [...filterOptions.interactionStatus, 'flagged'];
                    handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                    <Flag className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Flagged</div>
                    <div className="text-sm text-gray-500">Questions you marked</div>
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
                    const updatedStatus = isSelected
                      ? filterOptions.interactionStatus.filter(status => status !== 'skipped')
                      : [...filterOptions.interactionStatus, 'skipped'];
                    handleFilterChange({...filterOptions, interactionStatus: updatedStatus as InteractionStatus[]});
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <SkipForward className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900">Skipped</div>
                    <div className="text-sm text-gray-500">Questions you skipped</div>
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
                    <div className="text-sm text-gray-500">Questions you haven't seen</div>
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
