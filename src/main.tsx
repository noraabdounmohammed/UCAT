import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Check if we're in development mode without Supabase credentials
const isDevelopmentMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a client based on environment
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
);

// If in development mode, intercept and mock all Supabase calls
if (isDevelopmentMode) {
  // Override fetch to prevent actual network requests to Supabase
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : '';
    
    // If this is a Supabase request, return a mock response
    if (url.includes('supabase.co')) {
      console.log('Intercepted Supabase request:', url);
      return Promise.resolve(new Response(JSON.stringify({ data: [], error: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Otherwise, use the original fetch
    return originalFetch.apply(this, [input, init]);
  };
  
  console.log('Running in offline mode with intercepted Supabase requests');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SessionContextProvider>
  </StrictMode>
);