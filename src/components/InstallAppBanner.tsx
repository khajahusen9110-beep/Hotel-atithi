import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { usePwaInstall } from '../pwa/usePwaInstall';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

const DISMISS_KEY = 'hotel_atithi_install_dismissed_at';
const DISMISS_DAYS = 14;
const SHOW_AFTER_MS = 8000;

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

// "Install the app" card on the menu. Appears after a few seconds (never over the cart
// bar), and stays away for two weeks once dismissed.
export const InstallAppBanner: React.FC = () => {
  const { canPrompt, iosManual, install } = usePwaInstall();
  const { items } = useCart();
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(recentlyDismissed);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  if (!ready || dismissed || pathname !== '/' || items.length > 0) return null;
  if (!canPrompt && !iosManual) return null;

  const name = settings?.hotel_name?.trim() || 'Hotel Atithi';

  return (
    <div
      role="dialog"
      aria-label="Install app"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 z-40 max-w-md mx-auto bg-white border border-stone-200 rounded-2xl shadow-xl p-4"
    >
      <button
        onClick={dismiss}
        aria-label="Not now"
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3 pr-6">
        <img src="/icons/pwa-192x192.png" alt="" width={44} height={44} className="w-11 h-11 rounded-xl shrink-0" />
        <div className="min-w-0">
          <p className="font-display font-bold text-sm text-stone-900">Install the {name} app</p>
          <p className="text-[11px] text-stone-500">Order in one tap from your home screen. Free, no Play Store needed.</p>
        </div>
      </div>
      {canPrompt ? (
        <button
          onClick={async () => {
            const accepted = await install();
            if (!accepted) dismiss();
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Install App
        </button>
      ) : (
        <p className="mt-3 text-xs text-stone-700 bg-stone-50 rounded-xl p-2.5 flex flex-wrap items-center gap-1">
          Tap <Share className="w-3.5 h-3.5 text-sky-600" /> <strong>Share</strong>, then
          <SquarePlus className="w-3.5 h-3.5 text-stone-700" /> <strong>Add to Home Screen</strong>
        </p>
      )}
    </div>
  );
};
