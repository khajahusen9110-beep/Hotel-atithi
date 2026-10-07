import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { AlertTriangle } from 'lucide-react';
import { shortOpening } from '../utils/storeHours';

export const StoreStatusBanner: React.FC = () => {
  const { settings, isOpen, todayHoursText, loading, storeStatus } = useSettings();

  // Reserve the banner's height while loading so the page doesn't jump when it appears
  if (loading || !settings) {
    return (
      <div className="w-full bg-white border-b border-stone-100 py-1.5 px-4" aria-hidden="true">
        <div className="h-4" />
      </div>
    );
  }

  return (
    <div className="w-full bg-white border-b border-stone-100 py-1.5 px-4 text-center">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs font-medium text-stone-700">
        {isOpen ? (
          <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Kitchen & Store Open
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-semibold text-rose-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            Closed now
          </span>
        )}
        <span className="text-stone-300">•</span>
        <span className="text-stone-600">
          {!isOpen && storeStatus.nextOpenAt
            ? `Opens ${shortOpening(storeStatus.nextOpenAt)}`
            : todayHoursText.replace(/^Hours:\s*/, '')}
        </span>
      </div>
    </div>
  );
};


