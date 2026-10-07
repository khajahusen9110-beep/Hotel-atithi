import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

// The app shell works offline, but the menu, prices and orders always need the internet.
export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online) return null;
  return (
    <div role="alert" className="w-full bg-stone-900 text-white py-2 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5 text-orange-400" />
      You're offline. Connect to the internet to see the menu and place orders.
    </div>
  );
};
