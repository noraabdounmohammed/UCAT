import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Force light mode as default; only respect explicit 'light' saves.
    // Any previously saved 'dark' preference is ignored (reset to light).
    const saved = localStorage.getItem('theme');
    if (saved === 'light') return 'light';
    // Clear any old dark preference so toggle starts fresh
    try { localStorage.removeItem('theme'); } catch {}
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    // Apply theme to document with iOS-specific fixes
    const root = document.documentElement;
    const body = document.body;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      // Force iOS to recognize dark mode — warm Stone palette to match brand
      root.style.colorScheme = 'dark';
      body.style.backgroundColor = '#1c1917'; // stone-900
      body.style.color = '#fafaf9'; // stone-50
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      // Force iOS to recognize light mode
      root.style.colorScheme = 'light';
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#1f2937';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Graceful fallback (e.g. tests that don't wrap in <ThemeProvider />,
    // or components rendered before the provider mounts) — read whatever
    // we can from localStorage and return a no-op toggle. The real
    // provider supersedes this when it mounts.
    let theme: 'light' | 'dark' = 'light';
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
      if (saved === 'light' || saved === 'dark') theme = saved;
      // Default to light; only override if user has explicitly saved a preference
    } catch {
      // localStorage may be unavailable (SSR, private mode); leave as light.
    }
    return { theme, toggleTheme: () => {} };
  }
  return context;
}
