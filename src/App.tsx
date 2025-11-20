import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { StorageNotification } from '@/components/StorageNotification';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWAUpdateNotification } from '@/components/PWAUpdateNotification';
import '@/styles/font-sizes.css';

// Lazy load components for better performance
const CurriculumApp = lazy(() => import('@/components/CurriculumApp').then(m => ({ default: m.CurriculumApp })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const CurriculumLandingPage = lazy(() => import('@/pages/CurriculumLandingPage').then(m => ({ default: m.CurriculumLandingPage })));

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
          <PWAUpdateNotification />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Curriculum Hub & Practice */}
              <Route path="/concept-practice" element={
                <MainLayout currentPage="concept-practice">
                  <CurriculumApp />
                </MainLayout>
              } />
              
              {/* Expert Curriculums - 3D Carousel */}
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