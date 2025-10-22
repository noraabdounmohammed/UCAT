import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/components/dashboard/Dashboard';
import { MockExam } from '@/pages/MockExam';
import { QuestionPracticePage } from '@/pages/QuestionPracticePage';
import { CurriculumApp } from '@/components/CurriculumApp';
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { ChatInputExample } from '@/components/examples/ChatInputExample';
import DynamicQuestionDemo from '@/components/examples/DynamicQuestionDemo';
import { TestExplanationGenerator } from '@/components/examples/TestExplanationGenerator';
import { ConciseExplanationDemo } from '@/components/examples/ConciseExplanationDemo';
import { ConceptNodePracticeSection } from '@/components/practice/ConceptNodePracticeSection';
import { CurriculumLandingPage } from '@/pages/CurriculumLandingPage';
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
          
          {/* Dynamic Question Demo route */}
          <Route path="/dynamic-demo" element={
            <MainLayout currentPage="dynamic-demo">
              <DynamicQuestionDemo />
            </MainLayout>
          } />
          
          {/* Explanation Generator Test route */}
          <Route path="/explanation-test" element={
            <MainLayout currentPage="explanation-test">
              <TestExplanationGenerator />
            </MainLayout>
          } />
          
          {/* Concise Explanation Demo route */}
          <Route path="/concise-demo" element={
            <MainLayout currentPage="concise-demo">
              <ConciseExplanationDemo />
            </MainLayout>
          } />
          
          {/* Legacy Concept Node Practice route */}
          <Route path="/concept-practice-old" element={
            <MainLayout currentPage="concept-practice-old">
              <ConceptNodePracticeSection />
            </MainLayout>
          } />
          
          {/* New UKMLA Concept Practice route */}
          <Route path="/concept-practice" element={
            <MainLayout currentPage="concept-practice">
              <CurriculumApp />
            </MainLayout>
          } />
          
          {/* Curriculum Landing Page - 3D Carousel */}
          <Route path="/curriculums" element={<CurriculumLandingPage />} />
          
          {/* Redirect any routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </FontSizeProvider>
    </ThemeProvider>
  );
}

export default App;