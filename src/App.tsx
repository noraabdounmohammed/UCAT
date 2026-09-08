import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { StorageNotification } from '@/components/StorageNotification';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWAUpdateNotification } from '@/components/PWAUpdateNotification';
import { LearnerErrorBoundary } from '@/components/LearnerErrorBoundary';
import '@/styles/font-sizes.css';

const LaunchHomePage = lazy(() => import('@/pages/LaunchHomePage').then(m => ({ default: m.LaunchHomePage })));
const RecommendedPracticePage = lazy(() => import('@/pages/RecommendedPracticePage').then(m => ({ default: m.RecommendedPracticePage })));
const CustomPracticePage = lazy(() => import('@/pages/CustomPracticePage').then(m => ({ default: m.CustomPracticePage })));
const SignInPage = lazy(() => import('@/pages/SignInPage').then(m => ({ default: m.SignInPage })));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));

const RouteFallback = () => (
  <main className="flex min-h-screen items-center justify-center bg-[#F4ECDF] px-5 text-[#2A1E16]" aria-live="polite">
    <div className="flex items-center gap-3 text-[14px] font-semibold text-[#8A7560]">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#8FA379]" aria-hidden="true" />
      Opening StudyEdit…
    </div>
  </main>
);

const withFallback = (page: React.ReactNode) => <Suspense fallback={<RouteFallback />}>{page}</Suspense>;

function App() {
  return (
    <LearnerErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <FontSizeProvider>
            <StorageNotification />
            <PWAInstallPrompt />
            <PWAUpdateNotification />
            <Routes>
              <Route path="/" element={withFallback(<LaunchHomePage />)} />
              <Route path="/recommended-practice" element={withFallback(<RecommendedPracticePage />)} />
              <Route path="/concept-practice" element={withFallback(<CustomPracticePage />)} />
              <Route path="/signin" element={withFallback(<SignInPage />)} />
              <Route path="/privacy" element={withFallback(<PrivacyPolicy />)} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </FontSizeProvider>
        </ThemeProvider>
      </AuthProvider>
    </LearnerErrorBoundary>
  );
}

export default App;
