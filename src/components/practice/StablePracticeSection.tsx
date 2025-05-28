import React, { memo, useCallback, useRef, useEffect } from 'react';
import { StableRenderContainer } from './StableRenderContainer';
import { useNoFlash } from './NoFlashProvider';

interface StablePracticeSectionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * StablePracticeSection is a specialized component that wraps the PracticeSection
 * to eliminate flashing and visual instability during interactions.
 * It uses advanced techniques to prevent re-renders and maintain visual stability.
 */
const StablePracticeSectionComponent: React.FC<StablePracticeSectionProps> = ({ 
  children, 
  className = '' 
}) => {
  const { preventFlash } = useNoFlash();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use a stable ID for the render container
  const stableId = 'stable-practice-section';
  
  // Prevent flashing on interaction
  const handleInteraction = useCallback(() => {
    preventFlash();
    
    // Apply additional stability techniques
    if (containerRef.current) {
      // Force GPU acceleration during interaction
      containerRef.current.style.transform = 'translateZ(0)';
      containerRef.current.style.backfaceVisibility = 'hidden';
      
      // Reset after animation frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            // Maintain GPU acceleration but allow normal rendering
            containerRef.current.style.transform = 'translateZ(0)';
          }
        });
      });
    }
  }, [preventFlash]);
  
  // Apply additional stability techniques on mount
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Add event listeners for interaction events
    const container = containerRef.current;
    
    container.addEventListener('click', handleInteraction, { passive: true });
    container.addEventListener('touchstart', handleInteraction, { passive: true });
    container.addEventListener('mousedown', handleInteraction, { passive: true });
    
    // Apply initial stability styles
    Object.assign(container.style, {
      contain: 'content',
      willChange: 'transform',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    });
    
    // Find all interactive elements and apply stability styles
    const interactiveElements = container.querySelectorAll('button, a, input, select');
    interactiveElements.forEach(element => {
      if (element instanceof HTMLElement) {
        Object.assign(element.style, {
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        });
      }
    });
    
    return () => {
      container.removeEventListener('click', handleInteraction);
      container.removeEventListener('touchstart', handleInteraction);
      container.removeEventListener('mousedown', handleInteraction);
    };
  }, [handleInteraction]);
  
  return (
    <div 
      ref={containerRef}
      className={`stable-practice-section-wrapper ${className}`}
      style={{
        position: 'relative',
        isolation: 'isolate',
        contain: 'content',
        willChange: 'transform',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
      data-component-name="StablePracticeSection"
    >
      {children}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const StablePracticeSection = memo(StablePracticeSectionComponent);
