console.log('🚀 MAIN.TSX LOADED - JavaScript is running!');

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App.tsx';
import { initSentry } from '@/instrumentation/sentry';
import { initPosthog } from '@/instrumentation/posthog';
import { hasConsented } from '@/instrumentation/consent';
import { CookieConsent } from '@/components/consent/CookieConsent';
import { installClinicalClueHighlighting } from '@/utils/clinicalClueHighlighting';
import { installNativeMobileSelectionGuard } from '@/utils/nativeMobileSelectionGuard';
import { installOptionLongPressElimination } from '@/utils/optionLongPressElimination';
import './index.css';
import './styles/native-selection-explain.css';
import './styles/clinical-clue-highlighting.css';
import './styles/option-long-press.css';

// Telemetry is consent-gated. initSentry / initPosthog already no-op when
// their env vars are missing, so this is two layers of opt-in: env + consent.
function initTelemetryIfConsented() {
  if (!hasConsented()) return;
  initSentry().catch(() => {});
  initPosthog().catch(() => {});
}
initTelemetryIfConsented();

// Re-fire init when the user accepts the banner mid-session.
if (typeof window !== 'undefined') {
  window.addEventListener('cookie-consent-change', (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail === 'accepted') initTelemetryIfConsented();
  });
}

console.log('✅ All imports loaded successfully');

// Check if we're in development mode without Supabase credentials
const isDevelopmentMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mock SessionContextProvider for development
const MockSessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

if (isDevelopmentMode) {
  // Block all Supabase requests completely
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url || '';
    
    if (url.includes('supabase.co') || url.includes('vkzqbwoithtkgbvvtbpm')) {
      return Promise.resolve(new Response(JSON.stringify({ 
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: { id: 'mock-user-id', email: 'user@example.com' }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    return originalFetch.apply(this, [input, init]);
  };
  
  console.log('🔧 Running in offline mode - Supabase completely disabled');
}

console.log('📦 About to render React app...');
console.log('📦 Root element exists:', !!document.getElementById('root'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDevelopmentMode ? (
      <MockSessionContextProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <CookieConsent />
          </AuthProvider>
        </BrowserRouter>
      </MockSessionContextProvider>
    ) : (
      <BrowserRouter>
        <AuthProvider>
          <App />
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    )}
  </StrictMode>
);

installNativeMobileSelectionGuard();
installClinicalClueHighlighting();
installOptionLongPressElimination();
