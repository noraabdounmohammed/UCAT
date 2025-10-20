import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App.tsx';
import './index.css';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDevelopmentMode ? (
      <MockSessionContextProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </MockSessionContextProvider>
    ) : (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )}
  </StrictMode>
);