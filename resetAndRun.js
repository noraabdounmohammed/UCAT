// Script to reset user progress and run the app
console.log('Resetting user progress...');

// Clear localStorage data
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('medicu_user_progress');
  console.log('User progress has been reset successfully.');
} else {
  console.log('localStorage not available in this environment.');
}

// This script is meant to be run in the browser console
console.log('Please run the app with "npm run dev" in your terminal');
