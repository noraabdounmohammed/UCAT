/**
 * This script prevents the page from scrolling to the top when filters are toggled
 * It works by saving and restoring the scroll position during state updates
 */

// Add this script to the document
(function() {
  // Store the current scroll position
  let lastScrollPosition = 0;
  
  // Function to save the current scroll position
  function saveScrollPosition() {
    lastScrollPosition = window.scrollY;
  }
  
  // Function to restore the saved scroll position
  function restoreScrollPosition() {
    if (lastScrollPosition > 0) {
      window.scrollTo(0, lastScrollPosition);
    }
  }
  
  // Add event listeners to save scroll position on filter interactions
  document.addEventListener('click', function(e) {
    // Check if the click is on a filter element
    if (e.target.closest('.no-scroll-reset')) {
      saveScrollPosition();
      // Use setTimeout to restore position after the state update
      setTimeout(restoreScrollPosition, 0);
    }
  }, true);
  
  // Also handle checkbox changes
  document.addEventListener('change', function(e) {
    if (e.target.closest('.no-scroll-reset')) {
      saveScrollPosition();
      setTimeout(restoreScrollPosition, 0);
    }
  }, true);
  
  console.log('Scroll reset prevention initialized');
})();

export default function loadPreventScrollReset() {
  // This function is just a way to import the script
  // The actual functionality is in the IIFE above
  console.log('Scroll reset prevention loaded');
}
