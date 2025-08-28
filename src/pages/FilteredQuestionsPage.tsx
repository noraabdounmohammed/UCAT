import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ModernPracticeSession, QuestionData } from '@/components/practice/ModernPracticeSession';
import { fetchQuestions } from '@/lib/questions';
import { PracticeFilterOptions } from '@/types/practice';
import { Question } from '@/utils/questionBank';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * FilteredQuestionsPage displays and allows users to attempt questions
 * that match their selected filters. It handles loading the filtered questions,
 * displaying them in a practice session, and tracking user progress.
 */
export function FilteredQuestionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State for filtered questions and loading status
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Extract filter options from location state
  const filterOptions = location.state?.filterOptions as PracticeFilterOptions | undefined;
  const activeSection = location.state?.activeSection as string | undefined;
  
  // Load filtered questions on component mount
  useEffect(() => {
    // If no filter options were passed, redirect back to practice section
    if (!filterOptions || !activeSection) {
      toast.error('No filter options provided. Redirecting to practice section.');
      navigate('/');
      return;
    }
    
    const loadFilteredQuestions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch questions based on the filter options
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
            tags: [q.micro_skill],
            section: activeSection, // Add section for progress tracking
            // Add required properties for QuestionData interface
            data_block: {}, // Empty object to satisfy the Record<string, unknown> type
            data_type: q.data_type || ''
          }));
          
          setQuestions(questionData);
        } else {
          setError('No questions match your filters. Please adjust and try again.');
        }
      } catch (err) {
        console.error('Error fetching filtered questions:', err);
        setError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFilteredQuestions();
  }, [filterOptions, activeSection, navigate]);
  
  // Handle completion of practice session
  const handleCompletePractice = () => {
    // Navigate back to the practice section
    navigate('/');
    
    // Show completion message
    toast.success('Practice session completed! Your progress has been saved.');
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <MainLayout currentPage="dashboard">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Loading your practice questions...</p>
        </div>
      </MainLayout>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <MainLayout currentPage="dashboard">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">Unable to Load Questions</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/')}>
              Return to Practice Section
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Show practice session with filtered questions
  return (
    <MainLayout currentPage="dashboard" isPracticeSession={questions.length > 0}>
      {questions.length > 0 ? (
        <ModernPracticeSession
          questions={questions as QuestionData[]}
          onComplete={handleComplete}
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">No Questions Found</h2>
            <p className="text-gray-600 mb-6">
              No questions match your current filter criteria. Try adjusting your filters or check back later.
            </p>
            <Button onClick={handleComplete} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
