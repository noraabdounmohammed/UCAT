import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { StorageNotification } from '@/components/StorageNotification';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWAUpdateNotification } from '@/components/PWAUpdateNotification';
import '@/styles/font-sizes.css';
import '@/scripts/bulkGenerateQuestions';

const LaunchHomePage = lazy(() => import('@/pages/LaunchHomePage').then(m => ({ default: m.LaunchHomePage })));
const RecommendedPracticePage = lazy(() => import('@/pages/RecommendedPracticePage').then(m => ({ default: m.RecommendedPracticePage })));
const CurriculumLandingPage = lazy(() => import('@/pages/CurriculumLandingPage').then(m => ({ default: m.CurriculumLandingPage })));
const StudyPage = lazy(() => import('@/pages/StudyPage').then(m => ({ default: m.StudyPage })));
const ReviewPage = lazy(() => import('@/pages/ReviewPage').then(m => ({ default: m.ReviewPage })));
const SeedPage = lazy(() => import('@/pages/SeedPage').then(m => ({ default: m.SeedPage })));
const MistakesPage = lazy(() => import('@/pages/MistakesPage').then(m => ({ default: m.MistakesPage })));
const VoicePage = lazy(() => import('@/pages/VoicePage').then(m => ({ default: m.VoicePage })));
const MockPage = lazy(() => import('@/pages/MockPage').then(m => ({ default: m.MockPage })));
const CasesPage = lazy(() => import('@/pages/CasesPage').then(m => ({ default: m.CasesPage })));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const ConceptPracticePage = lazy(() => import('@/pages/ConceptPracticePage.loft').then(m => ({ default: m.ConceptPracticePageLoft })));

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
            <Route path="/" element={<Suspense fallback={<BlankFallback />}><LaunchHomePage /></Suspense>} />
            <Route path="/recommended-practice" element={<Suspense fallback={<BlankFallback />}><RecommendedPracticePage /></Suspense>} />
            <Route path="/concept-practice" element={<Suspense fallback={<BlankFallback />}><ConceptPracticePage /></Suspense>} />
            <Route path="/curriculum/:curriculumId" element={<Navigate to="/study" replace />} />
            <Route path="/curriculums" element={<Suspense fallback={<BlankFallback />}><CurriculumLandingPage /></Suspense>} />
            <Route path="/study" element={<Suspense fallback={<BlankFallback />}><StudyPage /></Suspense>} />
            <Route path="/review" element={<Suspense fallback={<BlankFallback />}><ReviewPage /></Suspense>} />
            <Route path="/seed" element={<Suspense fallback={<BlankFallback />}><SeedPage /></Suspense>} />
            <Route path="/mistakes" element={<Suspense fallback={<BlankFallback />}><MistakesPage /></Suspense>} />
            <Route path="/voice" element={<Suspense fallback={<BlankFallback />}><VoicePage /></Suspense>} />
            <Route path="/mock" element={<Suspense fallback={<BlankFallback />}><MockPage /></Suspense>} />
            <Route path="/cases" element={<Suspense fallback={<BlankFallback />}><CasesPage /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<BlankFallback />}><PrivacyPolicy /></Suspense>} />
            <Route path="/leaderboard" element={<Suspense fallback={<BlankFallback />}><LeaderboardPage /></Suspense>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </FontSizeProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
