import React, { memo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ImmersiveContainerProps {
  children: React.ReactNode;
  className?: string;
  preventScroll?: boolean;
}

/**
 * ImmersiveContainer creates a stable rendering environment that prevents flashing
 * by applying advanced CSS techniques and controlling the rendering lifecycle.
 * 
 * This component is based on the techniques used in the MockExam page that successfully
 * prevents flashing during interactions.
 */
const ImmersiveContainerComponent: React.FC<ImmersiveContainerProps> = ({
  children,
  className = '',
  preventScroll = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Apply stability techniques on mount
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Apply GPU acceleration and other stability properties
    Object.assign(container.style, {
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      willChange: 'transform',
      isolation: 'isolate',
      contain: 'content',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    });
    
    // Prevent scroll if needed
    if (preventScroll) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [preventScroll]);
  
  // Apply event handlers to prevent flashing during interactions
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    const preventFlash = () => {
      // Add a class that disables transitions and animations during interaction
      container.classList.add('interacting');
      
      // Use double requestAnimationFrame to ensure we're past the current render cycle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.classList.remove('interacting');
        });
      });
    };
    
    // Add event listeners for common interaction events
    container.addEventListener('click', preventFlash, { passive: true });
    container.addEventListener('touchstart', preventFlash, { passive: true });
    container.addEventListener('mousedown', preventFlash, { passive: true });
    
    return () => {
      container.removeEventListener('click', preventFlash);
      container.removeEventListener('touchstart', preventFlash);
      container.removeEventListener('mousedown', preventFlash);
    };
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'immersive-container',
        className
      )}
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        overflow: preventScroll ? 'hidden' : 'auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .immersive-container {
          transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          will-change: transform;
          isolation: isolate;
          contain: content;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .immersive-container.interacting * {
          transition: none !important;
          animation: none !important;
        }
      `}} />
      {children}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ImmersiveContainer = memo(ImmersiveContainerComponent);
