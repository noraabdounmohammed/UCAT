import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

// @ts-ignore - virtual module from vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdateNotification: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('✅ Service Worker registered');
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // Check every hour
      }
    },
    onRegisterError(error: any) {
      console.error('❌ Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowNotification(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowNotification(false);
    setNeedRefresh(false);
  };

  if (!showNotification) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-black/[0.08] px-6 py-4 flex items-center gap-4 max-w-md">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-stone-100/80 backdrop-blur-sm flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-stone-700" />
          </div>
          <div>
            <p className="font-medium text-stone-900 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              New version available
            </p>
            <p className="text-sm text-stone-600 mt-0.5 font-light" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
              Refresh to get the latest updates
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdate}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500 }}
          >
            Refresh
          </button>
          <button
            onClick={handleDismiss}
            className="p-2.5 hover:bg-stone-100/60 rounded-xl transition-all duration-300"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-stone-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
