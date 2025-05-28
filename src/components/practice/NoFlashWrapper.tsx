import React, { useEffect, useRef } from 'react';

interface NoFlashWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * NoFlashWrapper prevents visual flashing during re-renders
 * This component applies CSS techniques to prevent flashing without blocking updates
 */
export const NoFlashWrapper: React.FC<NoFlashWrapperProps> = ({ children, className = '' }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!wrapperRef.current) return;
    
    // Create a style element for anti-flash rules
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      /* Anti-flash styles */
      .no-flash-wrapper {
        /* Force hardware acceleration */
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
        -webkit-font-smoothing: antialiased;
        
        /* Prevent layout shifts */
        contain: paint style;
        
        /* Prevent transitions during initial render */
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      /* Prevent flash of unstyled content */
      .no-flash-wrapper * {
        -webkit-backface-visibility: hidden;
        -moz-backface-visibility: hidden;
      }
      
      /* Disable transitions that might cause flashing */
      .no-flash-wrapper button,
      .no-flash-wrapper a,
      .no-flash-wrapper [role="button"],
      .no-flash-wrapper input,
      .no-flash-wrapper select,
      .no-flash-wrapper textarea {
        transition: none !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Apply additional styles directly to the wrapper
    const wrapper = wrapperRef.current;
    wrapper.style.willChange = 'transform';
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);
  
  return (
    <div ref={wrapperRef} className={`no-flash-wrapper ${className}`}>
      {children}
    </div>
  );
};

export default NoFlashWrapper;
