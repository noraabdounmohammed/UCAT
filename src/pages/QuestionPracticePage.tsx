import { useEffect, useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NewPracticeSession } from '@/components/practice/NewPracticeSession';
import { PracticeFilters } from '@/components/practice/PracticeFilters';
import { fetchQuestions, fetchDynamicTopicStructure, fetchUserProgress } from '@/lib/questions';
import { PracticeFilterOptions, ProgressData } from '@/types/practice';
import { Question } from '@/utils/questionBank';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, BarChart, ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '@supabase/auth-helpers-react';

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
      
      // Navigate back to the previous page
      navigate(-1);
    } catch (error) {
      console.error('Error updating progress:', error);
      // Even if there's an error updating progress, still navigate back
      navigate(-1);
    }
  };

  // Go back to dashboard
  const handleBackToDashboard = () => {
    // Access the parent component's state through props
    window.history.back();
  };

  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
    if (showStats) setShowStats(false);
  };
  
  const toggleStats = () => {
    setShowStats(prev => !prev);
    if (showFilters) setShowFilters(false);
  };
  
  return (
    <div className={cn(
      "h-screen w-full flex flex-col bg-slate-50 overflow-hidden",
      mode === 'practice' ? "immersive-mode" : ""
    )} data-component-name="QuestionPracticePage">
      {/* Minimal Header - only shown when not in practice mode */}
      {mode !== 'practice' && (
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBackToDashboard}
              className="rounded-full hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </Button>
            <h1 className="text-xl font-bold text-slate-800">Target Practice</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleStats}
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                showStats ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "text-slate-600"
              )}
            >
              <BarChart className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
              {showStats ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFilters}
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                showFilters ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "text-slate-600"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </header>
      )}
      
      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        {mode === 'practice' ? (
          // Practice mode content
          <div className="h-full w-full relative">
            {/* Exit button at the top-right corner */}
            <div className="absolute top-4 right-4 z-50">
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1.5 bg-white"
                onClick={handlePracticeComplete}
              >
                Exit Session
              </Button>
            </div>
            
            {/* Practice session content */}
            
            {/* Only render NewPracticeSession if we have questions */}
            {questions.length > 0 ? (
              <NewPracticeSession
                questions={questions.map(q => ({
                  ...q,
                  data_block: q.data_block ? q.data_block as unknown as Record<string, unknown> : null
                }))}
                onComplete={handlePracticeComplete}
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center p-6">
                <div className="bg-white rounded-xl shadow-md p-8 max-w-md text-center">
                  <h2 className="text-xl font-semibold text-slate-800 mb-4">No Questions Available</h2>
                  <p className="text-slate-600 mb-6">There are no questions available for the selected topics. Please try selecting different topics.</p>
                  <Button 
                    onClick={handleBackToDashboard} 
                    className="px-6"
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Filter mode content
          <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Practice Questions</h1>
              <p className="text-slate-500">Select topics and skills to practice</p>
            </div>
            {/* Stats Panel */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-3xl mb-6 bg-white rounded-xl shadow-md overflow-hidden"
                >
                  <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-800">Your Progress</h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowStats(false)}>
                      <X className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    {Object.entries(userProgress.topics).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(userProgress.topics).slice(0, 5).map(([topic, data]) => (
                          <div key={topic} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-slate-700">{topic}</span>
                              <span className="text-slate-500">{data.correct}/{data.total} completed</span>
                            </div>
                            <Progress value={(data.correct / Math.max(data.total, 1)) * 100} className="h-2" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-4">
                        No progress data available yet. Start practicing to see your stats!
                      </p>
                    )}
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
                  className="w-full max-w-3xl mb-6 bg-white rounded-xl shadow-md overflow-hidden"
                >
                  <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-800">Customize Your Practice</h2>
                    <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                      <X className="h-4 w-4 text-slate-500" />
                    </Button>
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
                      filters.topics.map(topic => (
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
