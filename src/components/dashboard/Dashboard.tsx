import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardProps } from '@/types/dashboard';
import { PracticeSection } from '@/components/practice/PracticeSection';

const Dashboard: React.FC<Omit<DashboardProps, 'userData'>> = ({ 
  onMockStart
}) => {
  const navigate = useNavigate();
  
  // Navigate to the dedicated practice page with section parameter
  const handlePracticeStart = (section: string) => {
    navigate(`/practice?section=${section}`);
  };
  
  return (
    <PracticeSection 
      onMockStart={onMockStart} 
      onPracticeStart={handlePracticeStart}
    />
  );
};

export default Dashboard;