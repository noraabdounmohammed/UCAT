import { useEffect, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LayoutStabilizerProps {
  children: ReactNode;
  className?: string;
}

/**
 * LayoutStabilizer component prevents layout flickering by:
 * 1. Delaying rendering until after initial mount
 * 2. Applying CSS optimizations for rendering
 * 3. Preventing scroll resets and layout shifts
 */
export function LayoutStabilizer({ children, className }: LayoutStabilizerProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame for smoother transitions
    const frame = requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div 
      className={cn(
        "transition-opacity duration-200 ease-in-out",
        isReady ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        willChange: 'contents',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        contain: 'content',
        isolation: 'isolate'
      }}
    >
      {children}
    </div>
  );
}
