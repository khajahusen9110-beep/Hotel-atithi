import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { Clock, AlertTriangle, Sparkles } from 'lucide-react';

export const StoreStatusBanner: React.FC = () => {
  const { settings, isOpen, loading } = useSettings();

  if (loading || !settings) return null;

  return (
    <div className="w-full bg-stone-900 text-white text-xs border-b border-stone-800">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Kitchen & Store Open
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Store Currently Closed
            </span>
          )}
          <span className="text-stone-400">
            • Hours: {settings.opening_time} - {settings.closing_time}
          </span>
        </div>

        {settings.announcement && (
          <div className="flex items-center gap-1.5 text-amber-300 font-medium text-center sm:text-right">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="line-clamp-1">{settings.announcement}</span>
          </div>
        )}
      </div>
    </div>
  );
};
