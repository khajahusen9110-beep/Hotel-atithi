import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

// Registers the service worker. When a new version is deployed, the customer gets an
// "Update" button instead of the app swapping itself mid-order.
export const PwaUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Long-lived installed apps rarely reload, so look for new versions every hour
      setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => {});
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(error) {
      console.warn('Service worker registration failed:', error);
    },
  });

  // Picking up the new version right away is safe while nobody is mid-checkout
  useEffect(() => {
    if (!needRefresh) return;
    const path = window.location.pathname;
    if (path !== '/checkout' && path !== '/cart' && document.visibilityState === 'hidden') {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto bg-stone-900 text-white rounded-2xl shadow-xl p-3 pl-4 flex items-center gap-3"
    >
      <RefreshCw className="w-4 h-4 text-orange-400 shrink-0" />
      <p className="flex-1 text-xs font-semibold">A new version of the app is available.</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer"
      >
        Update
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Later"
        className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-white cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
