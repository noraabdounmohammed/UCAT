import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NoFlashContextType {
  preventFlash: () => void;
  isInteracting: boolean;
}

const NoFlashContext = createContext<NoFlashContextType>({
  preventFlash: () => {},
  isInteracting: false
});

interface NoFlashProviderProps {
  children: ReactNode;
}

/**
 * NoFlashProvider provides a context for managing flash prevention throughout the application.
 * It applies aggressive CSS techniques and manages interaction states to prevent visual flashing.
 */
export const NoFlashProvider: React.FC<NoFlashProviderProps> = ({ children }) => {
  const [isInteracting, setIsInteracting] = useState(false);
  
  // Function to prevent flash during interactions
  const preventFlash = () => {
    if (isInteracting) return;
    
    setIsInteracting(true);
    
    // Use double requestAnimationFrame to ensure we're past the current render cycle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsInteracting(false);
      });
    });
  };
  
  // Apply global styles to prevent flashing
  useEffect(() => {
    // Create a style element for global CSS
    const styleElement = document.createElement('style');
    styleElement.id = 'no-flash-global-styles';
    
    // Add aggressive anti-flash CSS
    styleElement.textContent = `
      /* Apply GPU acceleration to the entire body */
      body {
        transform: translateZ(0);
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
        contain: paint;
      }
      
      /* Prevent layout shifts during interactions */
      .no-flash-active * {
        transition: none !important;
        animation: none !important;
      }
      
      /* Force hardware acceleration on interactive elements */
      button, a, input, select, textarea {
        transform: translateZ(0);
        backface-visibility: hidden;
        will-change: transform;
        contain: layout style paint;
        touch-action: manipulation;
      }
      
      /* Prevent iOS Safari tap highlight */
      * {
        -webkit-tap-highlight-color: transparent;
      }
      
      /* Optimize scrolling */
      .scroll-container {
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: none;
        scroll-behavior: auto;
      }
    `;
    
    // Add the style element to the document head
    document.head.appendChild(styleElement);
    
    // Add event listeners to the document to detect interactions
    const handleInteraction = () => {
      document.body.classList.add('no-flash-active');
      
      // Remove the class after the interaction is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.classList.remove('no-flash-active');
        });
      });
    };
    
    document.addEventListener('click', handleInteraction, { passive: true });
    document.addEventListener('touchstart', handleInteraction, { passive: true });
    document.addEventListener('mousedown', handleInteraction, { passive: true });
    
    // Clean up on unmount
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
      
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('mousedown', handleInteraction);
    };
  }, []);
  
  return (
    <NoFlashContext.Provider value={{ preventFlash, isInteracting }}>
      <div 
        className={`no-flash-root ${isInteracting ? 'no-flash-active' : ''}`}
        style={{
          isolation: 'isolate',
          contain: 'content',
        }}
      >
        {children}
      </div>
    </NoFlashContext.Provider>
  );
};

// Custom hook to use the NoFlashContext
export const useNoFlash = () => useContext(NoFlashContext);
