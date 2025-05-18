import React, { useCallback, useState } from 'react';
import { DashboardProps } from '@/types/dashboard';
import { PracticeSection } from '@/components/practice/PracticeSection';
import { PracticeSession } from '@/components/practice/PracticeSession';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  section: string;
}

const Dashboard: React.FC<Omit<DashboardProps, 'onPracticeStart'>> = ({ 
  userData, 
  isLoading = false
}) => {
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  
  // Note: This function is temporarily unused after the PracticeSection refactoring
  // It will be reintegrated when we implement the practice flow in a future update
  // For now, we're keeping it as a reference for the expected behavior

  const handlePracticeComplete = useCallback(() => {
    setPracticeQuestions([]);
  }, []);
  
  if (practiceQuestions.length > 0) {
    return (
      <PracticeSession 
        questions={practiceQuestions}
        onComplete={handlePracticeComplete}
      />
    );
  }
  
  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
            <h3 className="text-xl font-medium">Loading your dashboard...</h3>
            <p className="text-muted-foreground">Preparing your personalized practice plan for {userData.name}</p>
          </div>
        </div>
      ) : (
        <PracticeSection />
      )}
    </>
  );
};

export default Dashboard;