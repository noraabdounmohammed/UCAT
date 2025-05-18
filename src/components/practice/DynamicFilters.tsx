import React, { useState, useEffect } from 'react';
import { useSections, useTopics } from '../../utils/questionBank';
import { QuestionIndex } from '../../utils/questionBank';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Difficulty, PracticeFilterOptions } from '@/types/practice';

interface DynamicFiltersProps {
  onFiltersChange: (filters: PracticeFilterOptions) => void;
  defaultSection?: string;
  questionCounts?: {
    topics: Record<string, number>;
    skills: Record<string, number>;
    total: number;
  };
  isLoading?: boolean;
}

const DynamicFilters: React.FC<DynamicFiltersProps> = ({
  onFiltersChange,
  defaultSection = 'QR',
  questionCounts,
  isLoading = false,
}) => {
  const [selectedSection, setSelectedSection] = useState<string>(defaultSection);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedMicroSkills, setSelectedMicroSkills] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('adaptive');
  
  // Get dynamic data from our JSON files
  const { sections, loading: sectionsLoading } = useSections();
  const { topics, loading: topicsLoading } = useTopics(selectedSection);
  
  // Get micro skills for all selected topics
  const [availableMicroSkills, setAvailableMicroSkills] = useState<string[]>([]);
  const [microSkillsLoading, setMicroSkillsLoading] = useState(true);
  
  // When section changes, reset topics and micro skills
  useEffect(() => {
    setSelectedTopics([]);
    setSelectedMicroSkills([]);
  }, [selectedSection]);
  
  // When topics change, update available micro skills
  useEffect(() => {
    const fetchMicroSkills = async () => {
      setMicroSkillsLoading(true);
      
      try {
        if (selectedTopics.length === 0) {
          setAvailableMicroSkills([]);
          setMicroSkillsLoading(false);
          return;
        }
        
        // Collect micro skills from all selected topics
        const allMicroSkills = new Set<string>();
        const indexModule = await import('../../data/questions/index.json');
        const index = indexModule.default as QuestionIndex;
        
        for (const topic of selectedTopics) {
          if (index.sections[selectedSection] && 
              index.sections[selectedSection].topics[topic] && 
              index.sections[selectedSection].topics[topic].microSkills) {
            const microSkills = index.sections[selectedSection].topics[topic].microSkills;
            microSkills.forEach((skill: string) => allMicroSkills.add(skill));
          }
        }
        
        setAvailableMicroSkills(Array.from(allMicroSkills));
      } catch (error) {
        console.error('Error fetching micro skills:', error);
      } finally {
        setMicroSkillsLoading(false);
      }
    };
    
    fetchMicroSkills();
  }, [selectedSection, selectedTopics]);
  
  // Notify parent component when filters change
  useEffect(() => {
    onFiltersChange({
      section: selectedSection,
      topics: selectedTopics as any[],
      microSkills: selectedMicroSkills,
      difficulty: selectedDifficulty,
    });
  }, [selectedSection, selectedTopics, selectedMicroSkills, selectedDifficulty, onFiltersChange]);
  
  // Handle section change
  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(e.target.value);
  };
  
  // Handle topic selection/deselection
  const handleTopicChange = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };
  
  // Handle micro skill selection/deselection
  const handleMicroSkillChange = (skill: string) => {
    setSelectedMicroSkills(prev => 
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };
  
  // Select all topics
  const handleSelectAllTopics = () => {
    setSelectedTopics(topics);
  };
  
  // Deselect all topics
  const handleDeselectAllTopics = () => {
    setSelectedTopics([]);
  };
  
  // Select all micro skills
  const handleSelectAllMicroSkills = () => {
    setSelectedMicroSkills(availableMicroSkills);
  };
  
  // Deselect all micro skills
  const handleDeselectAllMicroSkills = () => {
    setSelectedMicroSkills([]);
  };
  
  return (
    <div className="dynamic-filters">
      <div className="filter-section">
        <h3>Section</h3>
        <select 
          value={selectedSection}
          onChange={handleSectionChange}
          disabled={sectionsLoading}
          className="w-full p-2 border rounded-md"
        >
          {sectionsLoading ? (
            <option>Loading sections...</option>
          ) : (
            sections.map(section => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))
          )}
        </select>
      </div>
      
      <div className="filter-section">
        <div className="filter-header">
          <h3>Topics</h3>
          <div className="filter-actions">
            <button 
              onClick={handleSelectAllTopics}
              disabled={topicsLoading || topics.length === 0}
              className="filter-action-btn"
            >
              Select All
            </button>
            <button 
              onClick={handleDeselectAllTopics}
              disabled={topicsLoading || selectedTopics.length === 0}
              className="filter-action-btn"
            >
              Deselect All
            </button>
          </div>
        </div>
        
        <div className="filter-options">
          {topicsLoading ? (
            <p>Loading topics...</p>
          ) : topics.length === 0 ? (
            <p>No topics available for this section</p>
          ) : (
            topics.map(topic => (
              <label key={topic} className="filter-option">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedTopics.includes(topic)}
                    onCheckedChange={() => handleTopicChange(topic)}
                    id={`topic-${topic}`}
                  />
                  <span>{topic}</span>
                  {questionCounts && (
                    <Badge variant="outline" className="ml-auto">
                      {questionCounts.topics[topic] || 0}
                    </Badge>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
      </div>
      
      <div className="filter-section">
        <div className="filter-header">
          <h3>Micro Skills</h3>
          <div className="filter-actions">
            <button 
              onClick={handleSelectAllMicroSkills}
              disabled={microSkillsLoading || availableMicroSkills.length === 0}
              className="filter-action-btn"
            >
              Select All
            </button>
            <button 
              onClick={handleDeselectAllMicroSkills}
              disabled={microSkillsLoading || selectedMicroSkills.length === 0}
              className="filter-action-btn"
            >
              Deselect All
            </button>
          </div>
        </div>
        
        <div className="filter-options">
          {microSkillsLoading ? (
            <p>Loading micro skills...</p>
          ) : availableMicroSkills.length === 0 ? (
            <p>No micro skills available for selected topics</p>
          ) : (
            availableMicroSkills.map(skill => (
              <label key={skill} className="filter-option">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedMicroSkills.includes(skill)}
                    onCheckedChange={() => handleMicroSkillChange(skill)}
                    id={`skill-${skill}`}
                  />
                  <span>{skill}</span>
                  {questionCounts && (
                    <Badge variant="outline" className="ml-auto">
                      {questionCounts.skills[skill] || 0}
                    </Badge>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
      </div>
      
      <div className="filter-section">
        <h3>Difficulty</h3>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {['easy', 'medium', 'hard', 'adaptive'].map((level) => (
            <button
              key={level}
              className={`p-2 border rounded-md ${selectedDifficulty === level ? 'bg-primary text-white' : 'bg-background'}`}
              onClick={() => setSelectedDifficulty(level as Difficulty)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <style>{`
        .dynamic-filters {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .filter-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .filter-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .filter-action-btn {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          background-color: #e9ecef;
          border: 1px solid #ced4da;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .filter-action-btn:hover {
          background-color: #dee2e6;
        }
        
        .filter-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .filter-options {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
          padding: 0.5rem;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background-color: white;
        }
        
        .filter-option {
          display: flex;
          align-items: center;
        
        h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default DynamicFilters;
