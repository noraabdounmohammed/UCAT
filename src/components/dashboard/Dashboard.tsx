import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PracticeSection } from '@/components/practice/PracticeSection';
import { QuestionFormatSelector } from '@/components/dashboard/QuestionFormatSelector';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFormat, setSelectedFormat] = useState<string>('sba');
  
  // Load saved format preference from localStorage
  useEffect(() => {
    const savedFormat = localStorage.getItem('preferredQuestionFormat');
    if (savedFormat) {
      setSelectedFormat(savedFormat);
    }
  }, []);
  
  // Save format preference when it changes
  const handleFormatChange = (formatId: string) => {
    setSelectedFormat(formatId);
    localStorage.setItem('preferredQuestionFormat', formatId);
  };
  
  // Navigate to the dedicated practice page with section and format parameters
  const handlePracticeStart = (section: string) => {
    navigate(`/practice?section=${section}&format=${selectedFormat}`);
  };
  
  return (
    <div className="space-y-8">
      <QuestionFormatSelector 
        selectedFormat={selectedFormat}
        onFormatChange={handleFormatChange}
      />
      
      <PracticeSection 
        onPracticeStart={handlePracticeStart}
      />
    </div>
  );
};

export default Dashboard;