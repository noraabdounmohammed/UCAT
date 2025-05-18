
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Download, Save, Upload, Database } from 'lucide-react';
import { Difficulty, MainTopic } from '@/types/practice';
import { 
  loadQuestionDatabase,
  saveQuestionDatabase,
  getDatabaseStats,
  migrateQuestionsToDatabase,
  QuestionDatabase
} from '@/lib/questionDatabase';

const SingleFileQuestionManager: React.FC = () => {
  const navigate = useNavigate();
  const [jsonContent, setJsonContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isMigrated, setIsMigrated] = useState(false);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    topicCounts: {} as Record<MainTopic, number>,
    skillCounts: {} as Record<string, number>,
    difficultyCounts: {} as Record<Difficulty, number>,
    lastUpdated: ''
  });

  // Load database on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load the database
        const database = await loadQuestionDatabase();
        
        // Check if migration has been done (if there are questions in the database)
        const questionCount = Object.keys(database.questions).length;
        setIsMigrated(questionCount > 0);
        
        // Format the database as JSON - but only include the questions
        const questionsOnly = { questions: database.questions };
        setJsonContent(JSON.stringify(questionsOnly, null, 2));
        
        // Load stats
        const statsData = await getDatabaseStats();
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

  // Handle migration of questions from topic-specific files to the centralized database
  const handleMigration = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      // Migrate questions
      const success = await migrateQuestionsToDatabase();
      
      if (success) {
        setSuccessMessage('All questions from topic-specific files have been successfully consolidated into the centralized database. You can now manage all questions from this single interface.');
        setIsMigrated(true);
        
        // Reload the database to show the migrated questions
        const database = await loadQuestionDatabase();
        setJsonContent(JSON.stringify(database, null, 2));
        
        // Update stats
        const statsData = await getDatabaseStats();
        setStats(statsData);
      } else {
        setErrorMessage('Failed to consolidate questions. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error during consolidation:', error);
      setErrorMessage('An error occurred during the consolidation process. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save the database
  const saveDatabase = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      // Parse JSON to validate it
      let database: QuestionDatabase;
      try {
        database = JSON.parse(jsonContent);
      } catch {
        setErrorMessage('Invalid JSON format. Please check your input.');
        setIsLoading(false);
        return;
      }
      
      // Validate database structure - only questions are required
      if (!database.questions) {
        setErrorMessage('Invalid database format. JSON must contain a questions object.');
        setIsLoading(false);
        return;
      }
      
      // Since we're using direct file editing, we'll show instructions for saving
      await saveQuestionDatabase(database);
      
      // Show success message with instructions
      setSuccessMessage(
        'JSON validated successfully. To save your changes permanently:\n' +
        '1. Copy the entire JSON content\n' +
        '2. Open src/data/questionDatabase.json in your editor\n' +
        '3. Replace the file content with your copied JSON\n' +
        '4. Save the file'
      );
      
      // Refresh stats based on the current JSON content
      const statsData = {
        totalQuestions: Object.keys(database.questions).length,
        topicCounts: Object.entries(database.topicIndex).reduce((acc, [topic, ids]) => {
          acc[topic as MainTopic] = ids.length;
          return acc;
        }, {} as Record<MainTopic, number>),
        skillCounts: Object.entries(database.skillIndex).reduce((acc, [skill, ids]) => {
          acc[skill] = ids.length;
          return acc;
        }, {} as Record<string, number>),
        difficultyCounts: Object.entries(database.difficultyIndex).reduce((acc, [difficulty, ids]) => {
          acc[difficulty as Difficulty] = ids.length;
          return acc;
        }, {} as Record<Difficulty, number>),
        lastUpdated: database.lastUpdated || new Date().toISOString()
      };
      setStats(statsData);
    } catch (error) {
      console.error('Error processing database:', error);
      setErrorMessage('An error occurred while processing the database.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download the database as a JSON file
  const downloadJson = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questionDatabase-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Upload a JSON file
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Question Manager</h1>
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
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Question Database Editor</CardTitle>
              <CardDescription>
                Edit the JSON directly to add, modify, or remove questions. All questions are stored in a single file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="font-mono h-[600px] text-sm"
                placeholder="Loading database..."
                disabled={isLoading}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button onClick={saveDatabase} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" onClick={downloadJson} disabled={isLoading}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <div className="relative">
                  <Button variant="outline" disabled={isLoading}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                    <input
                      type="file"
                      accept=".json"
                      onChange={uploadJson}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isLoading}
                    />
                  </Button>
                </div>
              </div>
              
              {!isMigrated && (
                <Button onClick={handleMigration} disabled={isLoading}>
                  <Database className="mr-2 h-4 w-4" />
                  Consolidate All Questions
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Database Statistics</CardTitle>
              <CardDescription>
                Overview of questions in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Total Questions</h3>
                  <p className="text-2xl font-bold">{stats.totalQuestions}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Questions by Topic</h3>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(stats.topicCounts).map(([topic, count]) => (
                      <li key={topic} className="flex justify-between">
                        <span>{topic}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium">Questions by Difficulty</h3>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(stats.difficultyCounts).map(([difficulty, count]) => (
                      <li key={difficulty} className="flex justify-between">
                        <span className="capitalize">{difficulty}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium">Last Updated</h3>
                  <p>{new Date(stats.lastUpdated).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SingleFileQuestionManager;
