import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { StorageNotification } from '@/components/StorageNotification';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWAUpdateNotification } from '@/components/PWAUpdateNotification';
import '@/styles/font-sizes.css';

// Eager import for the main app — no spinner on first load
import { CurriculumApp } from '@/components/CurriculumApp';

// Lazy only for secondary routes rarely visited
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const CurriculumLandingPage = lazy(() => import('@/pages/CurriculumLandingPage').then(m => ({ default: m.CurriculumLandingPage })));
const StudyPage = lazy(() => import('@/pages/StudyPage').then(m => ({ default: m.StudyPage })));
const ReviewPage = lazy(() => import('@/pages/ReviewPage').then(m => ({ default: m.ReviewPage })));
const SeedPage = lazy(() => import('@/pages/SeedPage').then(m => ({ default: m.SeedPage })));
const MistakesPage = lazy(() => import('@/pages/MistakesPage').then(m => ({ default: m.MistakesPage })));
const VoicePage = lazy(() => import('@/pages/VoicePage').then(m => ({ default: m.VoicePage })));
const MockPage = lazy(() => import('@/pages/MockPage').then(m => ({ default: m.MockPage })));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));

// Wrapper to extract curriculumId from URL params
const CurriculumRoute = () => {
  const { curriculumId } = useParams<{ curriculumId: string }>();
  return <CurriculumApp initialCurriculumId={curriculumId} />;
};

// Instant blank parchment — replaces the spinning loader for secondary routes
const BlankFallback = () => <div className="h-screen w-screen" style={{ backgroundColor: '#F4EFE8' }} />;

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <FontSizeProvider>
          <StorageNotification />
          <PWAInstallPrompt />
          <PWAUpdateNotification />
          <Routes>
            {/* Landing Page — lazy, shown rarely */}
            <Route path="/" element={
              <Suspense fallback={<BlankFallback />}>
                <LandingPage />
              </Suspense>
            } />

            {/* Main app — eager, instant */}
            <Route path="/concept-practice" element={
              <MainLayout currentPage="concept-practice">
                <CurriculumApp />
              </MainLayout>
            } />

            {/* Curriculum by ID — shareable URL */}
            <Route path="/curriculum/:curriculumId" element={
              <MainLayout currentPage="concept-practice">
                <CurriculumRoute />
              </MainLayout>
            } />

            {/* Expert Curriculums — lazy, shown rarely */}
            <Route path="/curriculums" element={
              <Suspense fallback={<BlankFallback />}>
                <CurriculumLandingPage />
              </Suspense>
            } />

            {/* FSRS Study session — lazy, primary feature route */}
            <Route path="/study" element={
              <Suspense fallback={<BlankFallback />}>
                <StudyPage />
              </Suspense>
            } />

            {/* Atom review queue — lazy, gated on creator role */}
            <Route path="/review" element={
              <Suspense fallback={<BlankFallback />}>
                <ReviewPage />
              </Suspense>
            } />

            {/* Atom seeding form — lazy, gated on creator role */}
            <Route path="/seed" element={
              <Suspense fallback={<BlankFallback />}>
                <SeedPage />
              </Suspense>
            } />

            {/* Mistake deck — lazy, drills recent lapses */}
            <Route path="/mistakes" element={
              <Suspense fallback={<BlankFallback />}>
                <MistakesPage />
              </Suspense>
            } />

            {/* Voice mode — lazy, hands-free retrieval via Web Speech API */}
            <Route path="/voice" element={
              <Suspense fallback={<BlankFallback />}>
                <VoicePage />
              </Suspense>
            } />

            {/* Mock exam — lazy, full timed UKMLA-style mock */}
            <Route path="/mock" element={
              <Suspense fallback={<BlankFallback />}>
                <MockPage />
              </Suspense>
            } />

            {/* Privacy & cookies — lazy, accessible by URL + footer link */}
            <Route path="/privacy" element={
              <Suspense fallback={<BlankFallback />}>
                <PrivacyPolicy />
              </Suspense>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </FontSizeProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
