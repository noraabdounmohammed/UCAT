import React, { useEffect, useRef } from 'react';

/**
 * AbsoluteScrollLock component that forces scroll position preservation
 * using the most aggressive techniques available
 */
export const AbsoluteScrollLock: React.FC = () => {
  // Reference to store scroll position
  const scrollPositionRef = useRef<number>(0);
  // Reference to store the interval ID
  const intervalRef = useRef<number | null>(null);
  // Reference to track if we're currently in a scroll operation
  const isScrollingRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Function to save the current scroll position
    const saveScrollPosition = () => {
      if (!isScrollingRef.current) {
        scrollPositionRef.current = window.scrollY;
      }
    };
    
    // Function to forcefully restore the scroll position
    const forceRestoreScrollPosition = () => {
      if (scrollPositionRef.current > 0) {
        isScrollingRef.current = true;
        window.scrollTo(0, scrollPositionRef.current);
        // Reset the scrolling flag after a short delay
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 50);
      }
    };
    
    // Create a style element with aggressive CSS to prevent scroll resets
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Prevent scroll anchoring */
      * {
        overflow-anchor: none !important;
        scroll-snap-stop: normal !important;
      }
      
      /* Prevent smooth scrolling which can cause visual jumps */
      html, body {
        scroll-behavior: auto !important;
        overscroll-behavior: none !important;
        -webkit-overflow-scrolling: auto !important;
      }
      
      /* Prevent focus styles that might cause scrolling */
      *:focus {
        outline: none !important;
      }
      
      /* Force GPU acceleration for all elements to prevent layout shifts */
      .filter-section, .section-selection, .practice-controls, 
      button, a, [role="button"], input, select, textarea, [tabindex] {
        transform: translateZ(0) !important;
        will-change: transform !important;
        backface-visibility: hidden !important;
        perspective: 1000px !important;
        -webkit-font-smoothing: antialiased !important;
      }
      
      /* Add scroll anchors to key containers */
      .scroll-anchor {
        scroll-snap-align: start;
        contain: layout style paint;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Add scroll anchors to key elements
    const addScrollAnchors = () => {
      const containers = document.querySelectorAll('.filter-section, .section-selection');
      containers.forEach(container => {
        container.classList.add('scroll-anchor');
      });
    };
    
    // Call once on mount
    addScrollAnchors();
    
    // Also periodically check for new elements
    const observerInterval = setInterval(addScrollAnchors, 1000);
    
    // Save position on various events
    window.addEventListener('scroll', saveScrollPosition, { passive: true, capture: true });
    document.addEventListener('click', saveScrollPosition, { capture: true });
    document.addEventListener('mousedown', saveScrollPosition, { capture: true });
    document.addEventListener('touchstart', saveScrollPosition, { capture: true });
    document.addEventListener('keydown', saveScrollPosition, { capture: true });
    
    // Intercept all events that might cause scroll resets
    const handleInteraction = () => {
      saveScrollPosition();
      // Force restore after a small delay to let React finish rendering
      setTimeout(forceRestoreScrollPosition, 0);
      setTimeout(forceRestoreScrollPosition, 50);
      setTimeout(forceRestoreScrollPosition, 100);
    };
    
    // Add event listeners for all interactive events
    document.addEventListener('click', handleInteraction, { capture: true });
    document.addEventListener('change', handleInteraction, { capture: true });
    document.addEventListener('input', handleInteraction, { capture: true });
    document.addEventListener('submit', handleInteraction, { capture: true });
    
    // Use MutationObserver to detect DOM changes
    const observer = new MutationObserver(() => {
      setTimeout(forceRestoreScrollPosition, 0);
      setTimeout(forceRestoreScrollPosition, 50);
      setTimeout(forceRestoreScrollPosition, 100);
    });
    
    // Observe all changes to the DOM
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      characterData: true
    });
    
    // Start an interval to continuously check and restore scroll position
    intervalRef.current = window.setInterval(() => {
      if (document.activeElement && 
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        forceRestoreScrollPosition();
      }
    }, 200) as unknown as number;
    
    // Cleanup function
    return () => {
      // Remove the style element
      document.head.removeChild(styleElement);
      
      // Clear intervals
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      clearInterval(observerInterval);
      
      // Disconnect the observer
      observer.disconnect();
      
      // Remove event listeners
      window.removeEventListener('scroll', saveScrollPosition);
      document.removeEventListener('click', saveScrollPosition, { capture: true });
      document.removeEventListener('mousedown', saveScrollPosition, { capture: true });
      document.removeEventListener('touchstart', saveScrollPosition, { capture: true });
      document.removeEventListener('keydown', saveScrollPosition, { capture: true });
      
      document.removeEventListener('click', handleInteraction, { capture: true });
      document.removeEventListener('change', handleInteraction, { capture: true });
      document.removeEventListener('input', handleInteraction, { capture: true });
      document.removeEventListener('submit', handleInteraction, { capture: true });
    };
  }, []);
  
  return null; // This component doesn't render anything
};

export default AbsoluteScrollLock;
