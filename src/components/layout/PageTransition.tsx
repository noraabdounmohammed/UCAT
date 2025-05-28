import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  appear?: boolean;
}

/**
 * PageTransition component provides a smooth transition between pages
 * by controlling opacity and using proper browser optimization techniques.
 * It prevents the page from flashing during navigation.
 */
export function PageTransition({ 
  children, 
  className,
  appear = true 
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(!appear);

  useEffect(() => {
    if (appear) {
      // Important: Use RAF to ensure browser has painted before transition starts
      const frame = requestAnimationFrame(() => {
        // Use a second RAF to ensure the first has completed
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      
      return () => cancelAnimationFrame(frame);
    }
  }, [appear]);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        willChange: 'opacity, transform',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        perspective: '1000px',
        isolation: 'isolate'
      }}
    >
      {children}
    </div>
  );
}
