import React, { useState, useEffect } from 'react';
import { CurriculumHub } from '@/pages/CurriculumHub';
import { ConceptPracticePage } from '@/pages/ConceptPracticePage';

interface Curriculum {
  id: string;
  name: string;
  description: string;
  conceptCount: number;
  lastAccessed: Date;
  color: string;
  category: string;
  progress: number;
}

export const CurriculumApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<'hub' | 'curriculum'>('hub');
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load curriculums from localStorage on mount
  useEffect(() => {
    const storedCurriculums = localStorage.getItem('curriculums');
    if (storedCurriculums) {
      try {
        const parsed = JSON.parse(storedCurriculums);
        const curriculumsWithDates = parsed.map((c: any) => ({
          ...c,
          lastAccessed: new Date(c.lastAccessed)
        }));
        setCurriculums(curriculumsWithDates);
      } catch (error) {
        console.error('Failed to load curriculums from localStorage:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save curriculums to localStorage whenever they change
  useEffect(() => {
    if (isLoaded && curriculums.length > 0) {
      console.log('CurriculumApp: Saving curriculums to localStorage:', curriculums.length);
      localStorage.setItem('curriculums', JSON.stringify(curriculums));
    }
  }, [curriculums, isLoaded]);

  const handleOpenCurriculum = (curriculum: Curriculum) => {
    setSelectedCurriculum(curriculum);
    setCurrentView('curriculum');
  };

  const handleBackToCurriculums = () => {
    // Reload curriculums from localStorage when returning to hub
    const storedCurriculums = localStorage.getItem('curriculums');
    if (storedCurriculums) {
      try {
        const parsed = JSON.parse(storedCurriculums);
        const curriculumsWithDates = parsed.map((c: any) => ({
          ...c,
          lastAccessed: new Date(c.lastAccessed)
        }));
        setCurriculums(curriculumsWithDates);
        console.log('🔄 Reloaded curriculums from localStorage:', curriculumsWithDates.length);
      } catch (error) {
        console.error('Failed to reload curriculums:', error);
      }
    }
    
    setCurrentView('hub');
    setSelectedCurriculum(null);
  };

  const handleUpdateCurriculum = (updatedCurriculum: Curriculum) => {
    setSelectedCurriculum(updatedCurriculum);
    
    // Update in the curriculums array
    setCurriculums(prev => 
      prev.map(c => c.id === updatedCurriculum.id ? updatedCurriculum : c)
    );
  };

  const handleCreateCurriculum = (newCurriculum: Curriculum) => {
    console.log('CurriculumApp: Creating new curriculum:', newCurriculum);
    setCurriculums(prev => [...prev, newCurriculum]);
    
    // Navigate to the new curriculum
    setSelectedCurriculum(newCurriculum);
    setCurrentView('curriculum');
  };

  if (currentView === 'curriculum' && selectedCurriculum) {
    return (
      <ConceptPracticePage
        onBackToCurriculums={handleBackToCurriculums}
        curriculum={selectedCurriculum}
        onUpdateCurriculum={handleUpdateCurriculum}
      />
    );
  }

  return (
    <CurriculumHub 
      onOpenCurriculum={handleOpenCurriculum}
      curriculums={curriculums}
      setCurriculums={setCurriculums}
      onCreateCurriculum={handleCreateCurriculum}
    />
  );
};
