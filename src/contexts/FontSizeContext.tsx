import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('fontSize') as FontSize;
    return saved || 'medium';
  });

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize);
    
    // Apply font size to document root
    const root = document.documentElement;
    
    // Remove existing font size classes
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    
    // Add current font size class
    root.classList.add(`font-${fontSize}`);
  }, [fontSize]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
