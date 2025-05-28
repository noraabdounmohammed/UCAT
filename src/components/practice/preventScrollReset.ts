/**
 * This script prevents the page from scrolling to the top when filters are toggled
 * It works by saving and restoring the scroll position during state updates
 */

// Store the current scroll position
let lastScrollPosition = 0;

// Function to save the current scroll position
function saveScrollPosition(): void {
  lastScrollPosition = window.scrollY;
}

// Function to restore the saved scroll position
function restoreScrollPosition(): void {
  if (lastScrollPosition > 0) {
    window.scrollTo(0, lastScrollPosition);
  }
}

// Initialize the scroll prevention
export default function loadPreventScrollReset(): void {
  // Add event listeners to save scroll position on filter interactions
  document.addEventListener('click', function(e: MouseEvent) {
    // Check if the click is on a filter element
    if (e.target && (e.target as HTMLElement).closest('.no-scroll-reset')) {
      saveScrollPosition();
      // Use setTimeout to restore position after the state update
      setTimeout(restoreScrollPosition, 0);
    }
  }, true);
  
  // Also handle checkbox changes
  document.addEventListener('change', function(e: Event) {
    if (e.target && (e.target as HTMLElement).closest('.no-scroll-reset')) {
      saveScrollPosition();
      setTimeout(restoreScrollPosition, 0);
    }
  }, true);
  
  console.log('Scroll reset prevention initialized');
}
