import React, { useCallback, useState } from 'react';
import { DashboardProps } from '@/types/dashboard';
import DashboardLayout from './DashboardLayout';
import { PracticeSection } from '@/components/practice/PracticeSection';
import { PracticeSession } from '@/components/practice/PracticeSession';
import { PracticeFilters } from '@/types/practice';

const Dashboard: React.FC<DashboardProps> = ({ 
  userData, 
  onPracticeStart, 
  isLoading = false
}) => {
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);
  
  const handlePracticeStart = useCallback(
    async (questions: any[]) => {
      setPracticeQuestions(questions);
    },
    []
  );

  const handlePracticeComplete = useCallback(() => {
    setPracticeQuestions([]);
  }, []);
  
  return (
    <DashboardLayout>
      <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {practiceQuestions.length > 0 ? (
            <PracticeSession 
              questions={practiceQuestions}
              onComplete={handlePracticeComplete}
            />
          ) : (
            <PracticeSection onStartPractice={handlePracticeStart} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;