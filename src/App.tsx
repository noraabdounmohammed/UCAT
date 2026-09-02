import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { StorageNotification } from '@/components/StorageNotification';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { PWAUpdateNotification } from '@/components/PWAUpdateNotification';
import '@/styles/font-sizes.css';

const LaunchHomePage = lazy(() => import('@/pages/LaunchHomePage').then(m => ({ default: m.LaunchHomePage })));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));

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
            <Route path="/recommended-practice" element={<Navigate to="/" replace />} />
            <Route path="/concept-practice" element={<Navigate to="/?choose=1" replace />} />
            <Route path="/privacy" element={<Suspense fallback={<BlankFallback />}><PrivacyPolicy /></Suspense>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </FontSizeProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
