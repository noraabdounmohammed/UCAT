import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewPracticeSession } from '@/components/practice/NewPracticeSession';
import { PracticeSection } from '@/components/practice/PracticeSection';
import { fetchQuestions } from '@/lib/questions';
import { PracticeFilterOptions } from '@/types/practice';
import { toast } from 'sonner';
import { ArrowLeft, BarChart, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import '../components/practice/apple-styles.css';

/**
 * SimplePracticePage - A clean, Apple HIG-compliant practice page
 */
export function SimplePracticePage() {
  const navigate = useNavigate();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [filterOptions, setFilterOptions] = useState<PracticeFilterOptions>({
    section: 'QR',
    topics: [],
    microSkills: [],
    difficulty: [],
    interactionStatus: []
  });
  const [showFilters, setShowFilters] = useState(true);
  const [showStats, setShowStats] = useState(false);
  
  // Handlers
  const handleBackToDashboard = () => {
    navigate(-1);
  };
  
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
    if (showStats) setShowStats(false);
  };
  
  const toggleStats = () => {
    setShowStats(prev => !prev);
    if (showFilters) setShowFilters(false);
  };
  
  const handleFilterChange = (newFilters: PracticeFilterOptions) => {
    setFilterOptions(newFilters);
  };
  
  const handleStartPractice = async () => {
    try {
      setIsLoading(true);
      
      // Validate filters
      if (filterOptions.topics.length === 0) {
        toast.error('Please select at least one topic to practice');
        setIsLoading(false);
        return;
      }
      
      // Fetch questions based on filters
      const fetchedQuestions = await fetchQuestions(filterOptions);
      
      if (!fetchedQuestions || fetchedQuestions.length === 0) {
        toast.error('No questions found with the selected filters. Try different filters.');
        setIsLoading(false);
        return;
      }
      
      // Update state
      setQuestions(fetchedQuestions);
      setIsPracticeMode(true);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error starting practice:', error);
      toast.error('Failed to load questions. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handlePracticeComplete = () => {
    setIsPracticeMode(false);
    setQuestions([]);
    toast.success('Practice completed!');
  };
  
  return (
    <div className="h-screen w-full flex flex-col bg-[#F5F5F7]" data-component-name="SimplePracticePage">
      {/* Apple-style Header - only shown when not in practice mode */}
      {!isPracticeMode && (
        <header className="bg-white/80 backdrop-blur-md border-b border-[#E5E5EA] px-4 py-3 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <button 
              className="flex items-center text-[#007AFF] font-medium"
              onClick={handleBackToDashboard}
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span>Back</span>
            </button>
            <h1 className="text-[17px] font-semibold text-[#1D1D1F] ml-2">Practice</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full",
                showStats ? "bg-[#007AFF] text-white" : "bg-[#F2F2F7] text-[#1D1D1F]"
              )}
              onClick={toggleStats}
              aria-label="Statistics"
            >
              <BarChart className="h-4 w-4" />
            </button>
            
            <button
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full",
                showFilters ? "bg-[#007AFF] text-white" : "bg-[#F2F2F7] text-[#1D1D1F]"
              )}
              onClick={toggleFilters}
              aria-label="Filters"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </header>
      )}
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {isPracticeMode ? (
          // Practice mode content
          <div className="h-full w-full relative">
            {/* Exit button at the top-right corner */}
            <div className="absolute top-4 right-4 z-50">
              <button 
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-[#E5E5EA] text-[#1D1D1F] font-medium text-[15px] shadow-sm"
                onClick={handlePracticeComplete}
              >
                Exit Session
              </button>
            </div>
            
            {/* Practice session content */}
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
                <div className="bg-white rounded-[14px] shadow-md p-6 max-w-md text-center">
                  <h2 className="text-[20px] font-semibold text-[#1D1D1F] mb-3">No Questions Available</h2>
                  <p className="text-[17px] text-[#86868B] mb-6">There are no questions available for the selected topics. Please try selecting different topics.</p>
                  <button 
                    onClick={handleBackToDashboard} 
                    className="px-6 py-2 bg-[#007AFF] text-white rounded-lg font-medium text-[15px]"
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
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold text-[#1D1D1F] mb-1">Practice Questions</h1>
              <p className="text-[13px] text-[#86868B]">Select topics and skills to practice</p>
            </div>
            
            {/* Stats Panel */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-3xl mb-6 bg-white rounded-[14px] shadow-md overflow-hidden"
                >
                  <div className="p-4 border-b border-[#E5E5EA] flex justify-between items-center">
                    <h2 className="text-[17px] font-semibold text-[#1D1D1F]">Your Progress</h2>
                    <button 
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2F2F7]" 
                      onClick={() => setShowStats(false)}
                    >
                      <X className="h-4 w-4 text-[#8E8E93]" />
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-[15px] text-[#8E8E93] text-center py-4">
                      No progress data available yet. Start practicing to see your stats!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Main practice configuration card */}
            <div className="w-full max-w-3xl mx-auto bg-white rounded-[14px] shadow-md overflow-hidden">
              <div className="p-4 border-b border-[#E5E5EA]">
                <h2 className="text-[17px] font-semibold text-[#1D1D1F]">Start Your Practice Session</h2>
              </div>
              
              <div className="p-4 space-y-6">
                <p className="text-[17px] text-[#1D1D1F]">
                  Select the topics and skills you want to practice, then click the button below to start your session.
                </p>
                
                {/* Practice Section Component */}
                <PracticeSection
                  filterOptions={filterOptions}
                  onFilterChange={handleFilterChange}
                />
                
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleStartPractice}
                    disabled={isLoading || filterOptions.topics.length === 0}
                    className={cn(
                      "px-6 py-2 rounded-lg font-medium text-[15px]",
                      "bg-[#007AFF] text-white",
                      (isLoading || filterOptions.topics.length === 0) && "opacity-50"
                    )}
                  >
                    {isLoading ? 'Loading...' : 'Start Practice'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
