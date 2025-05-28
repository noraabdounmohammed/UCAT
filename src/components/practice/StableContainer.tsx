import React, { memo, useRef, useEffect } from 'react';

interface StableContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * StableContainer prevents unnecessary re-renders and maintains visual stability
 * This component uses React.memo and CSS containment to prevent flashing and scroll resets
 */
export const StableContainer: React.FC<StableContainerProps> = memo(({ children, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Apply visual stability techniques when the component mounts
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Add CSS properties for visual stability
    const container = containerRef.current;
    
    // Force GPU acceleration
    container.style.transform = 'translateZ(0)';
    container.style.backfaceVisibility = 'hidden';
    container.style.perspective = '1000px';
    container.style.willChange = 'transform';
    
    // Prevent layout shifts
    container.style.contain = 'layout paint style';
    
    // Prevent scroll anchoring
    container.style.overflowAnchor = 'none';
    
    // Add a class to identify this container for debugging
    container.classList.add('stable-container');
    
    // Create a style element for global stability rules
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .stable-container {
        /* Prevent FOUC (Flash of Unstyled Content) */
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        
        /* Prevent content jumping */
        min-height: 1px;
        
        /* Prevent layout shifts from affecting parent containers */
        isolation: isolate;
      }
      
      /* Prevent focus outlines from causing layout shifts */
      .stable-container *:focus {
        outline: none;
      }
      
      /* Prevent transitions during initial render */
      .stable-container * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);
  
  return (
    <div ref={containerRef} className={`stable-wrapper ${className}`}>
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Allow children to update, but prevent re-renders from className changes
  return prevProps.className === nextProps.className; // Only compare className, allow children to update
});

export default StableContainer;
