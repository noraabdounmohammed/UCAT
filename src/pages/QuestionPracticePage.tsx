import { useEffect, useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { PracticeFilters } from '@/components/practice/PracticeFilters';
import { fetchQuestions, fetchDynamicTopicStructure, fetchUserProgress } from '@/lib/questions';
import { PracticeFilterOptions, ProgressData } from '@/types/practice';
import { Question } from '@/utils/questionBank';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FontSizeToggle } from '@/components/ui/FontSizeToggle';
import { ArrowLeft, BarChart, ChevronDown, ChevronUp, Filter, X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '@supabase/auth-helpers-react';
import '../components/practice/apple-styles.css';
import '../components/practice/apple-question-styles.css';
import './apple-page-styles.css';

// Define the state type for our reducer
type PracticeState = {
  isLoading: boolean;
  isStarted: boolean;
  questions: Question[];
  userProgress: {
    topics: Record<string, ProgressData>;
    skills: Record<string, ProgressData>;
  };
  filters: PracticeFilterOptions;
  mode: 'filter' | 'practice';
};

// Define action types
type PracticeAction = 
  | { type: 'SET_LOADING', payload: boolean }
  | { type: 'SET_QUESTIONS', payload: Question[] }
  | { type: 'SET_USER_PROGRESS', payload: { topics: Record<string, ProgressData>; skills: Record<string, ProgressData> } }
  | { type: 'SET_FILTERS', payload: PracticeFilterOptions }
  | { type: 'START_PRACTICE' }
  | { type: 'END_PRACTICE' };

// Reducer function
function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_QUESTIONS':
      return { ...state, questions: action.payload };
    case 'SET_USER_PROGRESS':
      return { ...state, userProgress: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'START_PRACTICE':
      return { ...state, isStarted: true, mode: 'practice' };
    case 'END_PRACTICE':
      return { ...state, isStarted: false, mode: 'filter' };
    default:
      return state;
  }
}

export function QuestionPracticePage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse URL parameters
  const queryParams = new URLSearchParams(location.search);
  const sectionFromUrl = queryParams.get('section');
  
  // Initialize state with useReducer for more predictable state transitions
  const [state, dispatch] = useReducer(practiceReducer, {
    isLoading: true,
    isStarted: false,
    questions: [],
    userProgress: { topics: {}, skills: {} },
    filters: {
      section: sectionFromUrl || 'QR',
      topics: [],
      microSkills: [],
      difficulty: 'adaptive',
      interactionStatus: [] // ['incorrect', 'unseen', 'skipped', 'correct', 'flagged']
    },
    mode: sectionFromUrl ? 'practice' : 'filter' // If section is provided, start in practice mode
  });
  
  const { questions, userProgress, filters, mode } = state;

  // Authentication is handled at the router level
  useUser();

  // Load topic structure and user progress
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Fetch topic structure - we don't need to store this as it's handled by PracticeFilters
        const topicStructure = await fetchDynamicTopicStructure(filters.section);
        
        // Fetch user progress
        const progress = await fetchUserProgress(filters.section);
        dispatch({ type: 'SET_USER_PROGRESS', payload: progress });
        
        // If we have a section from URL, automatically load questions
        if (sectionFromUrl) {
          // Get available topics from the topic structure
          // The topic structure is an array of topics, each with a topic property
          const availableTopics = topicStructure?.map(item => item.topic) || [];
          
          // Take the first 2-3 topics if available, otherwise use all available topics
          const selectedTopics = availableTopics.slice(0, Math.min(3, availableTopics.length));
          
          if (selectedTopics.length === 0) {
            toast.error('No topics available for this section. Please try another section.');
            navigate('/');
            return;
          }
          
          // Update filters with selected topics
          const practiceFilters = {
            ...filters,
            topics: selectedTopics, // These are now MainTopic enum values
          };
          
          dispatch({ type: 'SET_FILTERS', payload: practiceFilters });
          
          // Fetch questions with these filters
          console.log('Fetching questions with filters:', practiceFilters);
          const fetchedQuestions = await fetchQuestions(practiceFilters);
          console.log('Fetched questions:', fetchedQuestions);
          
          if (fetchedQuestions && fetchedQuestions.length > 0) {
            console.log('Setting questions in state:', fetchedQuestions);
            dispatch({ type: 'SET_QUESTIONS', payload: fetchedQuestions });
            dispatch({ type: 'START_PRACTICE' });
          } else {
            console.error('No questions found with filters:', practiceFilters);
            toast.error('No questions found for this section. Please select specific topics.');
            navigate('/');
          }
        }
        
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast.error('Failed to load practice data. Please try again.');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    loadInitialData();
  }, [filters, sectionFromUrl, navigate]);

  // Handle filter changes
  const handleFilterChange = (newFilters: PracticeFilterOptions) => {
    dispatch({ type: 'SET_FILTERS', payload: newFilters });
  };

  // Start practice session
  const handleStartPractice = async () => {
    console.log('handleStartPractice called with filters:', filters);
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Validate filters
      if (filters.topics.length === 0) {
        toast.error('Please select at least one topic to practice');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      console.log('Fetching questions for topics:', filters.topics);
      // Fetch questions based on filters
      const fetchedQuestions = await fetchQuestions(filters);
      console.log('Fetched questions:', fetchedQuestions);
      
      if (!fetchedQuestions || fetchedQuestions.length === 0) {
        toast.error('No questions found with the selected filters. Try different filters.');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      // Update state in a single batch to ensure consistency
      dispatch({ type: 'SET_QUESTIONS', payload: fetchedQuestions });
      dispatch({ type: 'START_PRACTICE' });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      console.log('Practice session started with', fetchedQuestions.length, 'questions');
    } catch (error) {
      console.error('Error starting practice:', error);
      toast.error('Failed to load questions. Please try again.');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Handle practice completion
  const handlePracticeComplete = async () => {
    try {
      // Refresh user progress after completing practice
      const updatedProgress = await fetchUserProgress(filters.section);
      dispatch({ type: 'SET_USER_PROGRESS', payload: updatedProgress });
      
      // Reset to filter selection
      dispatch({ type: 'END_PRACTICE' });
      dispatch({ type: 'SET_QUESTIONS', payload: [] });
      
      toast.success('Practice completed! Your progress has been updated.');
      
      // Instead of navigating back, stay on the page but switch to filter mode
      // This ensures we return to the section and topic selection interface
    } catch (error) {
      console.error('Error updating progress:', error);
      // Even if there's an error updating progress, still reset to filter mode
      dispatch({ type: 'END_PRACTICE' });
      dispatch({ type: 'SET_QUESTIONS', payload: [] });
    }
  };

  // Go back to dashboard
  const handleBackToDashboard = () => {
    // Access the parent component's state through props
    window.history.back();
  };

  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
    if (showStats) setShowStats(false);
  };
  
  const toggleStats = () => {
    setShowStats(prev => !prev);
    if (showFilters) setShowFilters(false);
    if (showAccessibility) setShowAccessibility(false);
  };
  
  const toggleAccessibility = () => {
    setShowAccessibility(prev => !prev);
    if (showFilters) setShowFilters(false);
    if (showStats) setShowStats(false);
  };
  
  return (
    <div className={cn(
      "apple-page",
      mode === 'practice' ? "immersive-mode" : ""
    )} data-component-name="QuestionPracticePage">
      {/* Apple-style Header - only shown when not in practice mode */}
      {mode !== 'practice' && (
        <header className="apple-header">
          <div className="apple-flex apple-items-center apple-gap-md">
            <button 
              className="apple-back-button apple-flex apple-items-center"
              onClick={handleBackToDashboard}
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="apple-header-title">Target Practice</h1>
          </div>
          
          <div className="apple-flex apple-items-center apple-gap-sm">
            <button
              className={cn(
                "apple-button apple-button-icon",
                showStats ? "apple-button-primary" : "apple-button-secondary"
              )}
              onClick={toggleStats}
              aria-label="Statistics"
            >
              <BarChart className="h-4 w-4" />
            </button>
            
            <button
              className={cn(
                "apple-button apple-button-icon",
                showFilters ? "apple-button-primary" : "apple-button-secondary"
              )}
              onClick={toggleFilters}
              aria-label="Filters"
            >
              <Filter className="h-4 w-4" />
            </button>
            
            <button
              className={cn(
                "apple-button apple-button-icon",
                showAccessibility ? "apple-button-primary" : "apple-button-secondary"
              )}
              onClick={toggleAccessibility}
              aria-label="Accessibility"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>
      )}
      
      {/* Main content */}
      <main className="apple-content">
        {mode === 'practice' ? (
          // Practice mode content
          <div className="h-full w-full relative">
            
            {/* Practice session content */}
            
            {/* Only render ApplePracticeSession if we have questions */}
            {questions.length > 0 ? (
              <ApplePracticeSession
                questions={questions.map(q => ({
                  ...q,
                  data_block: q.data_block ? q.data_block as unknown as Record<string, unknown> : null
                }))}
                onComplete={handlePracticeComplete}
              />
            ) : (
              <div className="h-full w-full apple-flex-col apple-items-center justify-center p-6">
                <div className="apple-card apple-p-md max-w-md text-center">
                  <h2 className="apple-heading-1 apple-mb-sm">No Questions Available</h2>
                  <p className="apple-body apple-mb-md">There are no questions available for the selected topics. Please try selecting different topics.</p>
                  <button 
                    onClick={handleBackToDashboard} 
                    className="apple-button apple-button-primary"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Filter mode content
          <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="apple-mb-md">
              <h1 className="apple-heading-1">Practice Questions</h1>
              <p className="apple-caption">Select topics and skills to practice</p>
            </div>
            
            {/* Stats Panel */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-3xl mb-6 apple-card"
                >
                  <div className="apple-card-header">
                    <h2 className="apple-card-title">Your Progress</h2>
                    <button className="apple-button apple-button-icon apple-button-secondary" onClick={() => setShowStats(false)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="apple-card-content">
                    {Object.entries(userProgress.topics).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(userProgress.topics).slice(0, 5).map(([topic, data]) => (
                          <div key={topic} className="space-y-1">
                            <div className="apple-flex apple-justify-between">
                              <span className="apple-body">{topic}</span>
                              <span className="apple-caption">{(data as any).correct}/{(data as any).total} completed</span>
                            </div>
                            <div className="apple-progress-container">
                              <div 
                                className="apple-progress-bar" 
                                style={{ width: `${((data as any).correct / Math.max((data as any).total, 1)) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="apple-caption text-center py-4">
                        No progress data available yet. Start practicing to see your stats!
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Accessibility Panel */}
            <AnimatePresence>
              {showAccessibility && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-3xl mb-6 apple-card"
                >
                  <div className="apple-card-header">
                    <h2 className="apple-card-title">Accessibility Options</h2>
                    <button className="apple-button apple-button-icon apple-button-secondary" onClick={() => setShowAccessibility(false)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="apple-card-content">
                    <div className="space-y-4">
                      <div>
                        <label className="apple-body font-medium mb-2 block">Font Size</label>
                        <FontSizeToggle />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Filters Panel */}
            <AnimatePresence>
              {showFilters ? (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-3xl mb-6 apple-card"
                >
                  <div className="apple-card-header">
                    <h2 className="apple-card-title">Customize Your Practice</h2>
                    <button className="apple-button apple-button-icon apple-button-secondary" onClick={() => setShowFilters(false)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="p-5">
                    <PracticeFilters
                      section={filters.section}
                      filters={{
                        section: filters.section,
                        topics: filters.topics,
                        microSkills: filters.microSkills,
                        difficulty: filters.difficulty,
                        interactionStatus: filters.interactionStatus
                      }}
                      onFiltersChange={handleFilterChange}
                      userProgress={userProgress}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full max-w-3xl mb-6 bg-white rounded-xl shadow-md p-6"
                >
                  <div className="text-center space-y-2 mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">Ready to practice?</h2>
                    <p className="text-slate-600 max-w-lg mx-auto">
                      Customize your practice session with the filters or start with the current selection.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {filters.topics.length > 0 ? (
                      filters.topics.map((topic: string) => (
                        <div key={topic} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                          {topic}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 italic">No topics selected</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Start Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-3xl flex justify-center"
            >
              <Button 
                size="lg" 
                onClick={handleStartPractice}
                disabled={filters.topics.length === 0}
                className="px-10 py-6 text-lg font-medium shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
              >
                Start Practice Session
              </Button>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
