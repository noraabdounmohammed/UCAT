import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PracticeSection } from '@/components/practice/PracticeSection';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Navigate to the dedicated practice page with section parameter
  const handlePracticeStart = (section: string) => {
    navigate(`/practice?section=${section}`);
  };
  
  return (
    <PracticeSection 
      onPracticeStart={handlePracticeStart}
    />
  );
};

export default Dashboard;