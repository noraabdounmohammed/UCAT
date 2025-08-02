import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/components/dashboard/Dashboard';
import { MockExam } from '@/pages/MockExam';
import { QuestionPracticePage } from '@/pages/QuestionPracticePage';
import { MainLayout } from '@/components/layout/MainLayout';

// Mock user data removed

function App() {
  
  return (
    <Routes>
      {/* Dashboard route */}
      <Route path="/" element={
        <MainLayout currentPage="dashboard">
          <Dashboard />
        </MainLayout>
      } />
      
      {/* Mock exam route */}
      <Route path="/mock" element={
        <MainLayout currentPage="mock">
          <MockExam />
        </MainLayout>
      } />
      
      {/* Dedicated route for Question Practice without sidebar */}
      <Route path="/practice" element={<QuestionPracticePage />} />
      
      {/* Redirect any routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;