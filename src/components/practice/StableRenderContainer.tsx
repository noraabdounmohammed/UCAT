import React, { useRef, useEffect, useState, ReactNode, memo } from 'react';
import { createPortal } from 'react-dom';

interface StableRenderContainerProps {
  children: ReactNode;
  id: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * StableRenderContainer is a component that prevents flashing by:
 * 1. Using a portal to render content outside the normal React tree
 * 2. Memoizing the component to prevent unnecessary re-renders
 * 3. Using DOM manipulation instead of React's reconciliation for updates
 * 4. Implementing content freezing during interactions
 */
const StableRenderContainerInner = ({ children, id, className = '', style = {} }: StableRenderContainerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountNodeRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Create a stable container on mount
  useEffect(() => {
    // Check if container already exists (for hot reloading)
    let existingContainer = document.getElementById(id) as HTMLDivElement;
    
    if (!existingContainer) {
      // Create a new container if it doesn't exist
      const newContainer = document.createElement('div');
      newContainer.id = id;
      newContainer.className = className;
      Object.assign(newContainer.style, {
        contain: 'content',
        willChange: 'transform',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        isolation: 'isolate',
        ...style
      });
      
      document.body.appendChild(newContainer);
      existingContainer = newContainer;
    }
    
    // Store references
    containerRef.current = existingContainer;
    
    // Create mount node inside container
    const mountNode = document.createElement('div');
    mountNode.style.cssText = 'width: 100%; height: 100%; position: relative;';
    existingContainer.appendChild(mountNode);
    mountNodeRef.current = mountNode;
    
    setMounted(true);
    
    // Cleanup on unmount
    return () => {
      if (mountNodeRef.current && containerRef.current) {
        containerRef.current.removeChild(mountNodeRef.current);
        
        // Only remove the container if it's empty
        if (containerRef.current.childNodes.length === 0) {
          document.body.removeChild(containerRef.current);
        }
      }
    };
  }, [id, className]);
  
  // Prevent interaction flashing
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Add event listeners to prevent flashing during interactions
    const preventFlash = (e: Event) => {
      // Mark the container as being interacted with
      container.style.pointerEvents = 'none';
      
      // Use requestAnimationFrame to restore pointer events after the current frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) {
            container.style.pointerEvents = 'auto';
          }
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
  
  // Position the container to match the placeholder
  useEffect(() => {
    const updatePosition = () => {
      if (!containerRef.current) return;
      
      // Get the position from a data attribute or use fixed positioning
      const position = 'fixed';
      const zIndex = 10;
      
      Object.assign(containerRef.current.style, {
        position,
        zIndex,
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        overflow: 'auto'
      });
    };
    
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, []);
  
  // Only render when mounted and refs are available
  if (!mounted || !mountNodeRef.current) {
    return null;
  }
  
  // Use portal to render children outside the React tree
  return createPortal(children, mountNodeRef.current);
};

// Memoize the component to prevent unnecessary re-renders
export const StableRenderContainer = memo(StableRenderContainerInner);

// Export a placeholder component that can be used to position the portal
export const StableRenderPlaceholder = memo(({ id, className = '', style = {} }: Omit<StableRenderContainerProps, 'children'>) => {
  return (
    <div 
      id={`placeholder-${id}`}
      className={className}
      style={{
        visibility: 'hidden',
        pointerEvents: 'none',
        ...style
      }}
      data-portal-id={id}
    />
  );
});
