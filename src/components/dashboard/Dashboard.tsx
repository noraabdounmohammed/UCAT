import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardProps } from '@/types/dashboard';
import { PracticeSection } from '@/components/practice/PracticeSection';

const Dashboard: React.FC<DashboardProps> = ({ 
  userData, 
  isLoading = false,
  onMockStart
}) => {
  const navigate = useNavigate();
  
  // Navigate to the dedicated practice page with section parameter
  const handlePracticeStart = (section: string) => {
    navigate(`/practice?section=${section}`);
  };
  
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
        <PracticeSection 
          onMockStart={onMockStart} 
          onPracticeStart={handlePracticeStart}
        />
      )}
    </>
  );
};

export default Dashboard;