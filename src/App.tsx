import { useState, useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/components/dashboard/Dashboard';
import { MockExam } from '@/pages/MockExam';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthForm } from '@/components/auth/AuthForm';
import { DashboardProps } from '@/types/dashboard';
import AdminDashboard from '@/pages/admin';
import SingleFileQuestionManager from '@/pages/admin/SingleFileQuestionManager';

// Mock user data
const mockUserData: DashboardProps['userData'] = {
  name: 'Alex',
  targetScore: 2900,
  currentScore: 2650,
  streak: 7,
  sectionProgress: {
    QR: 78,
    VR: 65,
    DM: 89,
    SJ: 72
  },
  insights: {
    accuracy: {
      overall: 76,
      bySection: {
        QR: 82,
        VR: 68,
        DM: 85,
        SJ: 70
      },
      trend: [
        { date: '2023-05-01', value: 65 },
        { date: '2023-05-08', value: 68 },
        { date: '2023-05-15', value: 72 },
        { date: '2023-05-22', value: 76 }
      ]
    },
    time: {
      averagePerQuestion: {
        QR: 58,
        VR: 45,
        DM: 62,
        SJ: 39
      },
      trend: [
        { date: '2023-05-01', value: 68 },
        { date: '2023-05-08', value: 64 },
        { date: '2023-05-15', value: 60 },
        { date: '2023-05-22', value: 58 }
      ],
      timeManagementScore: 78
    },
    topSkills: [
      { name: 'Data Interpretation', score: 92, section: 'QR' },
      { name: 'Logical Reasoning', score: 88, section: 'DM' },
      { name: 'Critical Analysis', score: 84, section: 'VR' },
      { name: 'Ethical Decision Making', score: 80, section: 'SJ' },
      { name: 'Statistical Analysis', score: 78, section: 'QR' }
    ],
    weakAreas: [
      { 
        name: 'Abstract Reasoning', 
        score: 45, 
        section: 'DM', 
        recommendedActions: ['Practice pattern recognition exercises', 'Review advanced logic concepts'] 
      },
      { 
        name: 'Reading Comprehension', 
        score: 58, 
        section: 'VR', 
        recommendedActions: ['Focus on inference questions', 'Practice speed reading techniques'] 
      },
      { 
        name: 'Professional Behavior', 
        score: 62, 
        section: 'SJ', 
        recommendedActions: ['Review GMC guidelines', 'Practice ethical scenario questions'] 
      }
    ]
  },
  recommendations: [
    {
      id: 'rec-1',
      title: 'Abstract Reasoning Bootcamp',
      description: 'Intensive practice on pattern recognition and rule application',
      section: 'DM',
      difficulty: 'hard',
      estimatedTime: 45,
      type: 'practice'
    },
    {
      id: 'rec-2',
      title: 'Speed Reading Techniques',
      description: 'Learn methods to improve reading efficiency without losing comprehension',
      section: 'VR',
      difficulty: 'medium',
      estimatedTime: 30,
      type: 'learn'
    },
    {
      id: 'rec-3',
      title: 'Review Quantitative Practice Test',
      description: 'Analyze mistakes from your most recent QR practice test',
      section: 'QR',
      difficulty: 'easy',
      estimatedTime: 20,
      type: 'review'
    }
  ],
  lastMockData: {
    lastScore: 2680,
    lastDate: '2023-05-20T14:30:00Z',
    history: [
      { date: '2023-04-15T10:00:00Z', score: 2500, type: 'timed' },
      { date: '2023-04-28T13:15:00Z', score: 2580, type: 'untimed' },
      { date: '2023-05-20T14:30:00Z', score: 2680, type: 'timed' }
    ],
    averageScore: 2587
  }
};

function App() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<DashboardProps['userData']>(mockUserData);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'mock'>('dashboard');
  
  // We need the user object for authentication state
  const user = useUser();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  // Handlers
  const handlePracticeStart = (section: string) => {
    console.log(`Starting practice for section: ${section}`);
    alert(`Starting practice for ${section}`);
  };
  
  const handleRecommendationAction = (id: string, action: string) => {
    if (action === 'dismiss') {
      setUserData(prev => ({
        ...prev,
        recommendations: prev.recommendations.filter(rec => rec.id !== id)
      }));
      console.log(`Dismissed recommendation: ${id}`);
    } else if (action === 'start') {
      const rec = userData.recommendations.find(r => r.id === id);
      console.log(`Starting recommendation: ${rec?.title}`);
      alert(`Starting: ${rec?.title}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }
  
  return (
    <Routes>
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/questions" element={<SingleFileQuestionManager />} />
      
      {/* Main App Routes */}
      <Route path="/" element={
        <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
          {currentPage === 'dashboard' ? (
            <Dashboard 
              userData={userData}
              onPracticeStart={handlePracticeStart}
              onMockStart={() => setCurrentPage('mock')}
              onRecommendationAction={handleRecommendationAction}
              isLoading={loading}
            />
          ) : (
            <MockExam />
          )}
        </MainLayout>
      } />
      
      {/* Redirect any unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;