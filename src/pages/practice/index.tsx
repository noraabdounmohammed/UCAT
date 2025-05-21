import React, { useState, useEffect } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import QuestionBankFilters from '../../components/practice/QuestionBankFilters';
import { loadQuestionsForTopics, Question } from '../../utils/questionBank';
import { fetchQuestionCounts } from '../../lib/questions';
import { PracticeFilterOptions } from '@/types/practice';

// Using the standard PracticeFilterOptions type from types/practice.ts

const PracticePage: React.FC = () => {
  // Navigation function to replace router
  const navigateToPage = (path: string) => {
    window.location.href = path;
  };
  const [questionCounts, setQuestionCounts] = useState<{
    topics: Record<string, number>;
    skills: Record<string, number>;
    total: number;
  } | null>(null);
  
  const [filters, setFilters] = useState<PracticeFilterOptions>({
    section: 'QR',
    topics: [],
    microSkills: [],
    difficulty: 'adaptive'
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  // We'll use a different approach for loading state
  const [, setLoadingCounts] = useState(true); // Using empty slot to indicate unused variable
  const [error, setError] = useState<Error | null>(null);
  
  // Load question counts on mount
  useEffect(() => {
    const loadQuestionCounts = async () => {
      try {
        setLoadingCounts(true);
        const counts = await fetchQuestionCounts();
        setQuestionCounts(counts);
      } catch (err) {
        console.error('Error loading question counts:', err);
      } finally {
        setLoadingCounts(false);
      }
    };
    
    loadQuestionCounts();
  }, []);
  
  // Load questions when filters change
  useEffect(() => {
    const fetchQuestions = async () => {
      // Only fetch if at least one topic is selected
      if (filters.topics.length === 0) {
        setQuestions([]);
        return;
      }
      
      setLoading(true);
      try {
        // Ensure section is not undefined
        const section = filters.section || 'QR';
        const loadedQuestions = await loadQuestionsForTopics(section, filters.topics);
        
        // Filter by micro skills if any are selected
        const filteredQuestions = filters.microSkills.length > 0
          ? loadedQuestions.filter(q => filters.microSkills.includes(q.micro_skill))
          : loadedQuestions;
        
        setQuestions(filteredQuestions);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestions();
  }, [filters]);
  
  // Handle filter changes from the QuestionBankFilters component
  const handleFiltersChange = (newFilters: PracticeFilterOptions) => {
    setFilters(newFilters);
  };
  
  // Start practice session with the filtered questions
  const handleStartPractice = () => {
    if (questions.length === 0) {
      alert('Please select at least one topic to practice');
      return;
    }
    
    // Store questions in session storage or context for the practice session
    sessionStorage.setItem('practiceQuestions', JSON.stringify(questions));
    
    // Navigate to the practice session page
    navigateToPage('/practice/session');
  };
  
  // Function to handle navigation between pages
  const handleNavigate = (page: 'dashboard' | 'mock') => {
    if (page === 'dashboard') {
      navigateToPage('/practice');
    } else if (page === 'mock') {
      navigateToPage('/mock-exams');
    }
  };
  
  return (
    <MainLayout 
      currentPage="dashboard" 
      onNavigate={handleNavigate}>
      <div className="practice-page">
        <div className="practice-header">
          <h1>Target Practice</h1>
          <p>Select topics and skills to practice</p>
        </div>
        
        <div className="practice-content">
          <div className="filters-container">
            <QuestionBankFilters 
              onFiltersChange={handleFiltersChange}
              questionCounts={questionCounts || undefined}
            />
          </div>
          
          <div className="questions-summary">
            <h2>Selected Questions</h2>
            {loading ? (
              <p>Loading questions...</p>
            ) : error ? (
              <p className="error">Error loading questions: {error.message}</p>
            ) : questions.length === 0 ? (
              <p>No questions match your current selection. Please select at least one topic.</p>
            ) : (
              <>
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-value">{questions.length}</span>
                    <span className="stat-label">Questions</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{new Set(questions.map(q => q.main_topic)).size}</span>
                    <span className="stat-label">Topics</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{new Set(questions.map(q => q.micro_skill)).size}</span>
                    <span className="stat-label">Skills</span>
                  </div>
                </div>
                
                <div className="difficulty-breakdown">
                  <h3>Difficulty Breakdown</h3>
                  <div className="difficulty-bars">
                    {['Easy', 'Medium', 'Hard'].map(level => {
                      const count = questions.filter(q => q.difficulty === level).length;
                      const percentage = Math.round((count / questions.length) * 100);
                      
                      return (
                        <div key={level} className="difficulty-bar">
                          <div className="difficulty-label">{level}</div>
                          <div className="bar-container">
                            <div 
                              className={`bar-fill ${level.toLowerCase()}`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="difficulty-count">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <button 
                  className="start-practice-btn"
                  onClick={handleStartPractice}
                  disabled={questions.length === 0}
                >
                  Start Practice
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .practice-page {
          padding: 2rem;
        }
        
        .practice-header {
          margin-bottom: 2rem;
        }
        
        .practice-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        .practice-content {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 2rem;
        }
        
        .filters-container {
          background-color: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .questions-summary {
          background-color: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .questions-summary h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }
        
        .error {
          color: #dc3545;
        }
        
        .summary-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2rem;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          width: 30%;
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #0d6efd;
        }
        
        .stat-label {
          font-size: 0.875rem;
          color: #6c757d;
        }
        
        .difficulty-breakdown {
          margin-bottom: 2rem;
        }
        
        .difficulty-breakdown h3 {
          margin-bottom: 1rem;
          font-size: 1.25rem;
        }
        
        .difficulty-bars {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .difficulty-bar {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .difficulty-label {
          width: 80px;
          font-weight: 500;
        }
        
        .bar-container {
          flex: 1;
          height: 12px;
          background-color: #e9ecef;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .bar-fill {
          height: 100%;
          border-radius: 6px;
        }
        
        .bar-fill.easy {
          background-color: #28a745;
        }
        
        .bar-fill.medium {
          background-color: #ffc107;
        }
        
        .bar-fill.hard {
          background-color: #dc3545;
        }
        
        .difficulty-count {
          width: 40px;
          text-align: right;
          font-weight: 500;
        }
        
        .start-practice-btn {
          display: block;
          width: 100%;
          padding: 0.75rem;
          background-color: #0d6efd;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .start-practice-btn:hover {
          background-color: #0b5ed7;
        }
        
        .start-practice-btn:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
          .practice-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </MainLayout>
  );
};

export default PracticePage;
