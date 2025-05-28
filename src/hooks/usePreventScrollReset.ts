import { useEffect, useRef } from 'react';

/**
 * A custom hook that prevents scroll position resets when components re-render
 * or when interactive elements are clicked.
 * 
 * @returns An object with the current scroll position
 */
export function usePreventScrollReset() {
  const scrollPosition = useRef<number>(0);

  // Save scroll position on all relevant events
  useEffect(() => {
    // Function to save the current scroll position
    const saveScrollPosition = () => {
      scrollPosition.current = window.scrollY;
    };

    // Function to prevent default behavior on anchor clicks
    const preventDefaultOnLinks = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedElement = target.closest('a, button, [role="button"], input, select, textarea, [tabindex]');
      
      if (clickedElement) {
        // Save the scroll position before the click is processed
        saveScrollPosition();
      }
    };

    // Function to restore scroll position after state changes
    const restoreScrollPosition = () => {
      if (scrollPosition.current > 0) {
        window.scrollTo(0, scrollPosition.current);
      }
    };

    // Save position on scroll
    window.addEventListener('scroll', saveScrollPosition, { passive: true });
    
    // Save position before clicks
    document.addEventListener('click', preventDefaultOnLinks, true);
    document.addEventListener('click', saveScrollPosition, true);
    
    // Save position on other interactions
    document.addEventListener('change', saveScrollPosition, true);
    document.addEventListener('input', saveScrollPosition, true);
    
    // Restore position after any state changes
    window.addEventListener('load', restoreScrollPosition);
    
    // Use MutationObserver to detect DOM changes and restore scroll
    const observer = new MutationObserver(() => {
      restoreScrollPosition();
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Cleanup function
    return () => {
      window.removeEventListener('scroll', saveScrollPosition);
      document.removeEventListener('click', preventDefaultOnLinks, true);
      document.removeEventListener('click', saveScrollPosition, true);
      document.removeEventListener('change', saveScrollPosition, true);
      document.removeEventListener('input', saveScrollPosition, true);
      window.removeEventListener('load', restoreScrollPosition);
      observer.disconnect();
    };
  }, []);

  return { scrollPosition: scrollPosition.current };
}
