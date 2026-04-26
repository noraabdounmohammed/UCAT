import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt Component
 * Shows a custom install prompt for users to add the app to their home screen
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user has dismissed the prompt before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        // Show prompt after 10 seconds
        setTimeout(() => setShowPrompt(true), 10000);
      }
    };

    // Suppress the console warning about preventDefault
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('beforeinstallprompt')) {
        return; // Suppress PWA install prompt warnings
      }
      originalError.apply(console, args);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      console.error = originalError;
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal for 7 days
    const dismissedUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa-install-dismissed', dismissedUntil.toString());
  };

  // Check if dismissed time has passed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedUntil = parseInt(dismissed);
      if (Date.now() > dismissedUntil) {
        localStorage.removeItem('pwa-install-dismissed');
      }
    }
  }, []);

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[9999] animate-in slide-in-from-bottom duration-300">
      <div className="relative bg-[#FAFAF9]/95 backdrop-blur-2xl border border-black/[0.04] shadow-2xl overflow-hidden">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}></div>

        <div className="relative px-6 py-5">
          {/* Decorative line */}
          <div className="h-[1px] w-12 bg-stone-300 mb-4"></div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-stone-900 flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 
                className="text-lg font-medium tracking-tight text-stone-900 mb-2" 
                style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
              >
                Install Study Edit
              </h3>
              <p 
                className="text-sm text-stone-600 mb-4 leading-relaxed" 
                style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
              >
                Add to your home screen for quick access and offline use
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleInstall}
                  className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full transition-all duration-300 text-[11px] uppercase tracking-widest font-medium"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-6 py-3 bg-white/60 hover:bg-white/80 text-stone-600 hover:text-stone-900 border border-black/[0.06] rounded-full transition-all duration-300 text-[11px] uppercase tracking-widest font-medium"
                  style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}
                >
                  Not now
                </button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-2 text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
