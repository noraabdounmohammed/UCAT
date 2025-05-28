import React, { useEffect } from 'react';

/**
 * ScrollLock component that prevents scroll resets across the entire application
 * This is a more aggressive approach that ensures consistent behavior
 */
export const ScrollLock: React.FC = () => {
  useEffect(() => {
    // Store the original scroll position
    let lastScrollPosition = window.scrollY;
    
    // Function to save the current scroll position
    const saveScrollPosition = () => {
      lastScrollPosition = window.scrollY;
    };
    
    // Function to restore the scroll position
    const restoreScrollPosition = () => {
      // Only restore if we've scrolled some distance
      if (lastScrollPosition > 0) {
        window.scrollTo({
          top: lastScrollPosition,
          behavior: 'auto' // Use auto to prevent visible scrolling
        });
      }
    };
    
    // Create a style element to add CSS that prevents scroll anchoring
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      * {
        overflow-anchor: none !important;
      }
      
      html, body {
        scroll-behavior: auto !important;
        overscroll-behavior: none !important;
      }
      
      button, a, [role="button"], input, select, textarea, [tabindex] {
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Use MutationObserver to detect DOM changes and restore scroll
    const observer = new MutationObserver(() => {
      setTimeout(restoreScrollPosition, 0);
    });
    
    // Observe all changes to the DOM
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      characterData: true
    });
    
    // Add event listeners for various interactions
    window.addEventListener('scroll', saveScrollPosition, { passive: true });
    document.addEventListener('click', saveScrollPosition, { capture: true });
    document.addEventListener('touchstart', saveScrollPosition, { capture: true });
    document.addEventListener('mousedown', saveScrollPosition, { capture: true });
    document.addEventListener('keydown', saveScrollPosition, { capture: true });
    
    // Intercept all click events on interactive elements
    const handleInteraction = () => {
      // Save position before any interaction
      saveScrollPosition();
      
      // Schedule scroll restoration after the event has been processed
      setTimeout(restoreScrollPosition, 0);
    };
    
    // Add event listeners for all interactive events
    document.addEventListener('click', handleInteraction, { capture: true });
    document.addEventListener('change', handleInteraction, { capture: true });
    document.addEventListener('input', handleInteraction, { capture: true });
    document.addEventListener('submit', handleInteraction, { capture: true });
    
    // Cleanup function
    return () => {
      // Remove the style element
      document.head.removeChild(styleElement);
      
      // Disconnect the observer
      observer.disconnect();
      
      // Remove event listeners
      window.removeEventListener('scroll', saveScrollPosition);
      document.removeEventListener('click', saveScrollPosition, { capture: true });
      document.removeEventListener('touchstart', saveScrollPosition, { capture: true });
      document.removeEventListener('mousedown', saveScrollPosition, { capture: true });
      document.removeEventListener('keydown', saveScrollPosition, { capture: true });
      
      document.removeEventListener('click', handleInteraction, { capture: true });
      document.removeEventListener('change', handleInteraction, { capture: true });
      document.removeEventListener('input', handleInteraction, { capture: true });
      document.removeEventListener('submit', handleInteraction, { capture: true });
    };
  }, []);
  
  return null; // This component doesn't render anything
};

export default ScrollLock;
