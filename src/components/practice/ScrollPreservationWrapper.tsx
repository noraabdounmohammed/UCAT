import React, { useEffect, useRef, useLayoutEffect } from 'react';
import './NoScrollReset.css';

interface ScrollPreservationWrapperProps {
  children: React.ReactNode;
}

/**
 * A wrapper component that preserves scroll position when its children update.
 * This helps prevent the page from jumping to the top when filters are toggled.
 * Enhanced to prevent flashing and improve smoothness of interactions.
 */
export const ScrollPreservationWrapper: React.FC<ScrollPreservationWrapperProps> = ({ children }) => {
  const scrollPositionRef = useRef<number>(0);
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Save scroll position before updates using capture phase
  useEffect(() => {
    // Function to save current scroll position
    const saveScrollPosition = () => {
      scrollPositionRef.current = window.scrollY;
    };
    
    // Add event listeners with capture phase to ensure we catch events before they bubble
    document.addEventListener('click', saveScrollPosition, { capture: true });
    document.addEventListener('change', saveScrollPosition, { capture: true });
    document.addEventListener('input', saveScrollPosition, { capture: true });
    document.addEventListener('submit', saveScrollPosition, { capture: true });
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('click', saveScrollPosition, { capture: true });
      document.removeEventListener('change', saveScrollPosition, { capture: true });
      document.removeEventListener('input', saveScrollPosition, { capture: true });
      document.removeEventListener('submit', saveScrollPosition, { capture: true });
    };
  }, []);
  
  // Restore scroll position after updates using useLayoutEffect for synchronous execution
  // before browser paint to prevent flashing
  useLayoutEffect(() => {
    if (scrollPositionRef.current > 0) {
      window.scrollTo({
        top: scrollPositionRef.current,
        behavior: 'instant' // Use instant instead of smooth to prevent visible scrolling
      });
    }
  });
  
  return (
    <div ref={elementRef} className="scroll-preservation-container">
      {children}
    </div>
  );
};

export default ScrollPreservationWrapper;
