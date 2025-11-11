import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, HardDrive } from 'lucide-react';
import { StorageManager } from '@/utils/storageManager';

export const StorageNotification: React.FC = () => {
  const [notification, setNotification] = useState<{
    message: string;
    removedCurriculums: string[];
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for cleanup notification on mount
    const cleanupNotif = StorageManager.getCleanupNotification();
    if (cleanupNotif) {
      setNotification(cleanupNotif);
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setNotification(null), 300);
  };

  if (!notification || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <HardDrive className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Storage Cleanup Performed
              </h3>
              <button
                onClick={handleClose}
                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
              Your browser storage was nearly full. We automatically removed{' '}
              <strong>{notification.removedCurriculums.length}</strong> old curriculum(s) to free up space:
            </p>
            
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 mb-3 max-h-32 overflow-y-auto">
              {notification.removedCurriculums.map((name, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400 flex-shrink-0" />
                  {name}
                </li>
              ))}
            </ul>
            
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Your 3 most recently accessed curriculums were kept safe. You can re-import removed curriculums from the Expert library anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
