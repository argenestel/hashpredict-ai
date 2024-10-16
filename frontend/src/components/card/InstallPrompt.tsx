import React, { useState, useEffect } from 'react';
import { X, Plus, Share } from 'lucide-react';

const InstallPrompt = () => {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const android = /Android/.test(navigator.userAgent);
    setIsIOS(ios);
    setIsAndroid(android);

    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For debugging, show the prompt after a short delay
    const timer = setTimeout(() => setShowInstallPrompt(true), 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleCloseClick = () => {
    setShowInstallPrompt(false);
  };

  if (isStandalone || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-0">
      <div className="bg-white dark:bg-navy-800 rounded-t-2xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-navy-700 transition-all duration-300 max-w-lg mx-auto">
        <div className="p-4 flex items-start justify-between">
          <div className="flex-grow">
            <h3 className="text-lg font-bold text-navy-700 dark:text-white mb-2">
              Install HashPredict App
            </h3>
            {isIOS ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                To install, tap <Share className="inline w-4 h-4 mx-1" /> and then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Install our app for a better experience!
              </p>
            )}
          </div>
          <button 
            onClick={handleCloseClick}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {!isIOS && (
          <div className="px-4 pb-4">
            <button 
              onClick={handleInstallClick}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-2 px-4 text-sm font-medium transition-colors flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" /> Install App
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;