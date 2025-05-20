import React, { useState, useEffect } from 'react';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Difficulty, PracticeFilterOptions, MainTopic } from '@/types/practice';
import { loadQuestionIndex } from '@/utils/questionBank';

interface QuestionBankFiltersProps {
  onFiltersChange: (filters: PracticeFilterOptions) => void;
  questionCounts?: {
    topics: Record<string, number>;
    skills: Record<string, number>;
    total: number;
  };

}

const QuestionBankFilters: React.FC<QuestionBankFiltersProps> = ({
  onFiltersChange,
  questionCounts
}) => {
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);
  const [topics, setTopics] = useState<{[section: string]: string[]}>({});
  const [microSkills, setMicroSkills] = useState<{[topic: string]: string[]}>({});
  const [loadingData, setLoadingData] = useState(true);
  
  // Selected filters
  const [selectedSection, setSelectedSection] = useState<string>('QR');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedMicroSkills, setSelectedMicroSkills] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('adaptive');
  
  // Load all data from question bank
  useEffect(() => {
    const loadQuestionData = async () => {
      try {
        setLoadingData(true);
        const index = await loadQuestionIndex();
        
        // Get sections
        const sectionsData = Object.entries(index.sections).map(([id, data]) => ({
          id,
          name: data.name
        }));
        setSections(sectionsData);
        
        // Get topics for each section
        const topicsData: {[section: string]: string[]} = {};
        const microSkillsData: {[topic: string]: string[]} = {};
        
        Object.entries(index.sections).forEach(([sectionId, sectionData]) => {
          topicsData[sectionId] = Object.keys(sectionData.topics);
          
          // Get micro skills for each topic
          Object.entries(sectionData.topics).forEach(([topicName, topicData]) => {
            microSkillsData[topicName] = topicData.microSkills;
          });
        });
        
        setTopics(topicsData);
        setMicroSkills(microSkillsData);
      } catch (error) {
        console.error('Error loading question data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadQuestionData();
  }, []);
  
  // Update available topics when section changes
  useEffect(() => {
    setSelectedTopics([]);
    setSelectedMicroSkills([]);
  }, [selectedSection]);
  
  // Update available micro skills when topics change
  useEffect(() => {
    setSelectedMicroSkills([]);
  }, [selectedTopics]);
  
  // Notify parent component when filters change
  useEffect(() => {
    onFiltersChange({
      section: selectedSection,
      topics: selectedTopics as MainTopic[],
      microSkills: selectedMicroSkills,
      difficulty: selectedDifficulty
    });
  }, [selectedSection, selectedTopics, selectedMicroSkills, selectedDifficulty, onFiltersChange]);
  
  // Get available micro skills for selected topics
  const getAvailableMicroSkills = (): string[] => {
    if (selectedTopics.length === 0) return [];
    
    const availableSkills = new Set<string>();
    selectedTopics.forEach(topic => {
      if (microSkills[topic]) {
        microSkills[topic].forEach(skill => availableSkills.add(skill));
      }
    });
    
    return Array.from(availableSkills);
  };
  
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
    setSelectedTopics(topics[selectedSection] || []);
  };
  
  // Deselect all topics
  const handleDeselectAllTopics = () => {
    setSelectedTopics([]);
  };
  
  // Select all micro skills
  const handleSelectAllMicroSkills = () => {
    setSelectedMicroSkills(getAvailableMicroSkills());
  };
  
  // Deselect all micro skills
  const handleDeselectAllMicroSkills = () => {
    setSelectedMicroSkills([]);
  };
  
  const availableMicroSkills = getAvailableMicroSkills();
  
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Section</h3>
        <select 
          value={selectedSection}
          onChange={handleSectionChange}
          disabled={loadingData}
          className="w-full p-2 border rounded-md"
        >
          {loadingData ? (
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
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Topics</h3>
          <div className="space-x-2">
            <button 
              onClick={handleSelectAllTopics}
              disabled={loadingData || !topics[selectedSection] || topics[selectedSection].length === 0}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Select All
            </button>
            <button 
              onClick={handleDeselectAllTopics}
              disabled={loadingData || selectedTopics.length === 0}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Deselect All
            </button>
          </div>
        </div>
        
        <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-2">
          {loadingData ? (
            <p className="text-gray-500">Loading topics...</p>
          ) : !topics[selectedSection] || topics[selectedSection].length === 0 ? (
            <p className="text-gray-500">No topics available for this section</p>
          ) : (
            topics[selectedSection].map(topic => (
              <label key={topic} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                <Checkbox
                  checked={selectedTopics.includes(topic)}
                  onCheckedChange={() => handleTopicChange(topic)}
                  id={`topic-${topic}`}
                />
                <span className="flex-1">{topic}</span>
                {questionCounts && (
                  <Badge variant="outline" className="ml-auto">
                    {questionCounts.topics[topic] || 0}
                  </Badge>
                )}
              </label>
            ))
          )}
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Micro Skills</h3>
          <div className="space-x-2">
            <button 
              onClick={handleSelectAllMicroSkills}
              disabled={loadingData || availableMicroSkills.length === 0}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Select All
            </button>
            <button 
              onClick={handleDeselectAllMicroSkills}
              disabled={loadingData || selectedMicroSkills.length === 0}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Deselect All
            </button>
          </div>
        </div>
        
        <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-2">
          {loadingData ? (
            <p className="text-gray-500">Loading micro skills...</p>
          ) : availableMicroSkills.length === 0 ? (
            <p className="text-gray-500">No micro skills available for selected topics</p>
          ) : (
            availableMicroSkills.map(skill => (
              <label key={skill} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                <Checkbox
                  checked={selectedMicroSkills.includes(skill)}
                  onCheckedChange={() => handleMicroSkillChange(skill)}
                  id={`skill-${skill}`}
                />
                <span className="flex-1">{skill}</span>
                {questionCounts && (
                  <Badge variant="outline" className="ml-auto">
                    {questionCounts.skills[skill] || 0}
                  </Badge>
                )}
              </label>
            ))
          )}
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Difficulty</h3>
        <div className="grid grid-cols-2 gap-2">
          {['easy', 'medium', 'hard', 'adaptive'].map((level) => (
            <button
              key={level}
              className={`p-2 border rounded-md ${selectedDifficulty === level ? 'bg-primary text-white' : 'bg-white hover:bg-gray-50'}`}
              onClick={() => setSelectedDifficulty(level as Difficulty)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionBankFilters;
