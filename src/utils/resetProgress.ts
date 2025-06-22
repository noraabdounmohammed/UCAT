import { resetUserProgress } from './userProgressStorage';

/**
 * Resets all user progress data
 * @returns Object with success status and message
 */
export function resetAllUserProgress(): { success: boolean, message: string } {
  try {
    // Reset local storage progress
    resetUserProgress();
    return { 
      success: true, 
      message: 'All progress has been reset successfully.' 
    };
  } catch (error) {
    console.error('Error resetting user progress:', error);
    return { 
      success: false, 
      message: 'An error occurred while resetting progress.' 
    };
  }
}
