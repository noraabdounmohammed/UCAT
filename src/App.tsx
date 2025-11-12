import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { StorageNotification } from '@/components/StorageNotification';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import '@/styles/font-sizes.css';

// Lazy load heavy components for better performance
const Dashboard = lazy(() => import('@/components/dashboard/Dashboard'));
const MockExam = lazy(() => import('@/pages/MockExam').then(m => ({ default: m.MockExam })));
const QuestionPracticePage = lazy(() => import('@/pages/QuestionPracticePage').then(m => ({ default: m.QuestionPracticePage })));
const CurriculumApp = lazy(() => import('@/components/CurriculumApp').then(m => ({ default: m.CurriculumApp })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const CurriculumLandingPage = lazy(() => import('@/pages/CurriculumLandingPage').then(m => ({ default: m.CurriculumLandingPage })));
const ChatInputExample = lazy(() => import('@/components/examples/ChatInputExample').then(m => ({ default: m.ChatInputExample })));
const DynamicQuestionDemo = lazy(() => import('@/components/examples/DynamicQuestionDemo'));
const TestExplanationGenerator = lazy(() => import('@/components/examples/TestExplanationGenerator').then(m => ({ default: m.TestExplanationGenerator })));
const ConciseExplanationDemo = lazy(() => import('@/components/examples/ConciseExplanationDemo').then(m => ({ default: m.ConciseExplanationDemo })));
const ConceptNodePracticeSection = lazy(() => import('@/components/practice/ConceptNodePracticeSection').then(m => ({ default: m.ConceptNodePracticeSection })));

// Loading component
const PageLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-stone-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-sm text-stone-600" style={{ fontFamily: "'Manrope', sans-serif" }}>Loading...</p>
    </div>
  </div>
);

// Mock user data removed

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <FontSizeProvider>
          <StorageNotification />
          <PWAInstallPrompt />
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Landing Page - Elevated Learning */}
            <Route path="/" element={<LandingPage />} />
          
          {/* Dashboard route */}
          <Route path="/dashboard" element={
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
          </Suspense>
        </FontSizeProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;