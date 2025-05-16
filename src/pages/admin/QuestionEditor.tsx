import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Download, Save, Upload } from 'lucide-react';
import { Difficulty, MainTopic, TopicStructure } from '@/types/practice';
import { fetchDynamicTopicStructure } from '@/lib/questions';
import { 
  exportQuestions, 
  importQuestions, 
  getDatabaseStats
} from '@/lib/questionDatabase';

const QuestionEditor: React.FC = () => {
  const navigate = useNavigate();
  const [jsonContent, setJsonContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [topicStructure, setTopicStructure] = useState<TopicStructure[]>([]);
  const [filterOptions, setFilterOptions] = useState({
    topics: [] as MainTopic[],
    skills: [] as string[],
    difficulties: [] as Difficulty[]
  });
  const [stats, setStats] = useState({
    totalQuestions: 0,
    topicCounts: {} as Record<MainTopic, number>,
    skillCounts: {} as Record<string, number>,
    difficultyCounts: {} as Record<Difficulty, number>,
    lastUpdated: ''
  });

  // Load topic structure and stats on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [topicData, statsData] = await Promise.all([
          fetchDynamicTopicStructure(),
          getDatabaseStats()
        ]);
        setTopicStructure(topicData);
        setStats(statsData);
      } catch (error) {
        console.error('Error loading data:', error);
        setErrorMessage('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Load questions based on filters
  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // Only apply filters if they have values
      const options = {
        topics: filterOptions.topics.length > 0 ? filterOptions.topics : undefined,
        skills: filterOptions.skills.length > 0 ? filterOptions.skills : undefined,
        difficulties: filterOptions.difficulties.length > 0 ? filterOptions.difficulties : undefined
      };
      
      const result = await exportQuestions(options);
      
      if (result.count === 0) {
        setJsonContent('{\n  "questions": []\n}');
        setSuccessMessage('No questions found matching the selected filters.');
      } else {
        setJsonContent(JSON.stringify({ questions: result.questions }, null, 2));
        setSuccessMessage(`Loaded ${result.count} questions.`);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setErrorMessage('Failed to load questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save questions
  const saveQuestions = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      // Parse JSON
      let data;
      try {
        data = JSON.parse(jsonContent);
      } catch (err) {
        setErrorMessage('Invalid JSON format. Please check your input.');
        setIsLoading(false);
        return;
      }
      
      // Validate questions array
      if (!data.questions || !Array.isArray(data.questions)) {
        setErrorMessage('Invalid format. JSON must contain a "questions" array.');
        setIsLoading(false);
        return;
      }
      
      // Import questions
      const result = await importQuestions(data.questions);
      
      if (result.failed > 0) {
        setErrorMessage(`${result.failed} questions failed to import. ${result.errors.join('. ')}`);
      }
      
      if (result.success > 0) {
        setSuccessMessage(`Successfully imported ${result.success} questions.`);
        
        // Refresh stats
        const statsData = await getDatabaseStats();
        setStats(statsData);
      } else {
        setErrorMessage('No questions were imported. Please check your input.');
      }
    } catch (error) {
      console.error('Error saving questions:', error);
      setErrorMessage('Failed to save questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download JSON file
  const downloadJson = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Upload JSON file
  const uploadJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonContent(content);
    };
    reader.readAsText(file);
  };

  // Toggle topic filter
  const toggleTopicFilter = (topic: MainTopic) => {
    setFilterOptions(prev => {
      if (prev.topics.includes(topic)) {
        return {
          ...prev,
          topics: prev.topics.filter(t => t !== topic),
          // Also remove skills that belong to this topic
          skills: prev.skills.filter(skillId => {
            const topicData = topicStructure.find(t => t.topic === topic);
            return !topicData?.skills.some(skill => skill.id === skillId);
          })
        };
      } else {
        return {
          ...prev,
          topics: [...prev.topics, topic]
        };
      }
    });
  };

  // Toggle skill filter
  const toggleSkillFilter = (skillId: string) => {
    setFilterOptions(prev => {
      if (prev.skills.includes(skillId)) {
        return {
          ...prev,
          skills: prev.skills.filter(id => id !== skillId)
        };
      } else {
        return {
          ...prev,
          skills: [...prev.skills, skillId]
        };
      }
    });
  };

  // Toggle difficulty filter
  const toggleDifficultyFilter = (difficulty: Difficulty) => {
    setFilterOptions(prev => {
      if (prev.difficulties.includes(difficulty)) {
        return {
          ...prev,
          difficulties: prev.difficulties.filter(d => d !== difficulty)
        };
      } else {
        return {
          ...prev,
          difficulties: [...prev.difficulties, difficulty]
        };
      }
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterOptions({
      topics: [],
      skills: [],
      difficulties: []
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Question Editor</h1>
        <Button onClick={() => navigate('/admin')}>
          Back to Admin
        </Button>
      </div>
      
      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-6 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Select filters to load specific questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Topics</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {topicStructure.map((topicData) => (
                    <div 
                      key={topicData.topic}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id={`topic-${topicData.topic}`}
                        checked={filterOptions.topics.includes(topicData.topic)}
                        onChange={() => toggleTopicFilter(topicData.topic)}
                        className="rounded"
                      />
                      <label 
                        htmlFor={`topic-${topicData.topic}`}
                        className="text-sm"
                      >
                        {topicData.topic} ({stats.topicCounts[topicData.topic] || 0})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Skills</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {topicStructure.flatMap(topicData => 
                    topicData.skills.map(skill => (
                      <div 
                        key={skill.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          id={`skill-${skill.id}`}
                          checked={filterOptions.skills.includes(skill.id)}
                          onChange={() => toggleSkillFilter(skill.id)}
                          className="rounded"
                        />
                        <label 
                          htmlFor={`skill-${skill.id}`}
                          className="text-sm"
                        >
                          {skill.name} ({stats.skillCounts[skill.id] || 0})
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Difficulty</h3>
                <div className="space-y-1">
                  {(['easy', 'medium', 'hard', 'adaptive'] as Difficulty[]).map(difficulty => (
                    <div 
                      key={difficulty}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id={`difficulty-${difficulty}`}
                        checked={filterOptions.difficulties.includes(difficulty)}
                        onChange={() => toggleDifficultyFilter(difficulty)}
                        className="rounded"
                      />
                      <label 
                        htmlFor={`difficulty-${difficulty}`}
                        className="text-sm capitalize"
                      >
                        {difficulty} ({stats.difficultyCounts[difficulty] || 0})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
                <Button 
                  size="sm"
                  onClick={loadQuestions}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load Questions'}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/20 text-xs text-muted-foreground">
              <div>
                Total Questions: {stats.totalQuestions}<br />
                Last Updated: {new Date(stats.lastUpdated).toLocaleString()}
              </div>
            </CardFooter>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>JSON Editor</CardTitle>
              <CardDescription>
                Edit questions directly in JSON format
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <Textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="font-mono h-[500px] resize-none"
                placeholder='{"questions": []}'
              />
            </CardContent>
            <CardFooter className="justify-between border-t pt-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadJson}
                  disabled={!jsonContent}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".json"
                    onChange={uploadJson}
                    className="hidden"
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={saveQuestions}
                disabled={isLoading || !jsonContent}
              >
                <Save className="h-4 w-4 mr-1" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>JSON Format Guide</CardTitle>
            <CardDescription>
              Follow this format when editing or adding questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
{`{
  "questions": [
    {
      "id": "unique-id", // Optional for new questions
      "topic": "Topic Name",
      "microSkill": "skill-id",
      "difficulty": "easy|medium|hard|adaptive",
      "content": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0, // Index of correct option
      "explanation": "Explanation text",
      "timeLimit": 60 // Seconds
    },
    // More questions...
  ]
}`}
            </pre>
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="font-medium">Notes:</p>
              <ul className="list-disc ml-5 space-y-1 mt-2">
                <li>The <code>id</code> field is optional for new questions. If not provided, a unique ID will be generated.</li>
                <li>The <code>topic</code> must match one of the existing topics in the system.</li>
                <li>The <code>microSkill</code> must be a valid skill ID for the specified topic.</li>
                <li>The <code>correctAnswer</code> is the zero-based index of the correct option in the options array.</li>
                <li>All questions are stored in a single database file, making it easy to manage thousands of questions.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuestionEditor;
