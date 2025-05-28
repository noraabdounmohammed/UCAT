import React, { useEffect, useRef } from 'react';

/**
 * FlashPrevention component that completely prevents page flashing
 * by creating a stable rendering context
 */
export const FlashPrevention: React.FC = () => {
  const initialized = useRef(false);
  
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    // Create a style element with aggressive anti-flash CSS
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      /* Completely disable all transitions and animations */
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        opacity: 1 !important;
      }
      
      /* Force hardware acceleration on everything */
      body, div, button, a, input, select, textarea {
        transform: translateZ(0) !important;
        backface-visibility: hidden !important;
        -webkit-backface-visibility: hidden !important;
        -webkit-font-smoothing: antialiased !important;
        perspective: 1000px !important;
        will-change: transform !important;
      }
      
      /* Prevent any layout shifts */
      body {
        overflow-anchor: none !important;
        scroll-behavior: auto !important;
        overscroll-behavior: none !important;
      }
      
      /* Create a stable rendering context */
      .stable-render {
        contain: strict !important;
        isolation: isolate !important;
      }
      
      /* Prevent any content from changing size */
      .fixed-size {
        contain: size layout !important;
      }
      
      /* Apply to all interactive elements */
      button, a, [role="button"], input, select, textarea, [tabindex] {
        contain: layout style !important;
      }
      
      /* Prevent FOUC (Flash of Unstyled Content) */
      html {
        display: block !important;
      }
      
      /* Disable React's fade effects */
      [data-reactroot], [data-reactid] {
        opacity: 1 !important;
        transition: none !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Apply stable rendering class to main elements
    document.querySelectorAll('.section-selection, .filter-section').forEach(el => {
      el.classList.add('stable-render');
    });
    
    // Apply fixed size class to containers
    document.querySelectorAll('.max-w-6xl, .p-7, .p-6').forEach(el => {
      el.classList.add('fixed-size');
    });
    
    // Create a transparent overlay to prevent interaction during transitions
    const createOverlay = () => {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'transparent';
      overlay.style.zIndex = '9999';
      overlay.style.pointerEvents = 'none';
      overlay.style.display = 'none';
      overlay.id = 'flash-prevention-overlay';
      document.body.appendChild(overlay);
      return overlay;
    };
    
    const overlay = createOverlay();
    
    // Show overlay during interactions to prevent flashing
    const showOverlay = () => {
      overlay.style.display = 'block';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 50); // Hide after a short delay
    };
    
    // Intercept all click events
    const handleClick = () => {
      showOverlay();
    };
    
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      document.head.removeChild(styleEl);
    };
  }, []);
  
  return null; // This component doesn't render anything
};

export default FlashPrevention;
