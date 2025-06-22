import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { resetUserProgress } from '@/utils/userProgressStorage';
import { toast } from 'sonner';
import { RefreshCcw } from 'lucide-react';

export function ResetProgressButton() {
  const [isResetting, setIsResetting] = useState(false);

  const handleResetProgress = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      setIsResetting(true);
      
      try {
        // Reset user progress using the existing function
        resetUserProgress();
        
        // Show success message
        toast.success('All progress has been reset successfully.');
        
        // Reload the page to reflect the changes
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('Error resetting progress:', error);
        toast.error('Failed to reset progress. Please try again.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResetProgress}
      disabled={isResetting}
      className="flex items-center gap-1 bg-white hover:bg-gray-100"
    >
      <RefreshCcw className="h-4 w-4" />
      {isResetting ? 'Resetting...' : 'Reset Progress'}
    </Button>
  );
}
