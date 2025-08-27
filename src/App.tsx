import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/components/dashboard/Dashboard';
import { MockExam } from '@/pages/MockExam';
import { QuestionPracticePage } from '@/pages/QuestionPracticePage';
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { ChatInputExample } from '@/components/examples/ChatInputExample';
import '@/styles/font-sizes.css';

// Mock user data removed

function App() {
  
  return (
    <ThemeProvider>
      <FontSizeProvider>
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
        
        {/* Chat Input Demo route */}
        <Route path="/chat-demo" element={<ChatInputExample />} />
        
        {/* Redirect any routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </FontSizeProvider>
    </ThemeProvider>
  );
}

export default App;