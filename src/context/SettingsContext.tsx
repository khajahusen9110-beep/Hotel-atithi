import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, StoreHours } from '../types/database';
import { formatTime12Hour, getCurrentDayOfWeekIST } from '../utils/productAvailability';

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  isOpen: boolean;
  todayHoursText: string;
  todayStoreHours: StoreHours | null;
  refetchSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  id: 'default',
  is_store_open: true,
  opening_time: '07:00',
  closing_time: '23:00',
  announcement: 'Welcome to Hotel Atithi! Delicious pure veg & non-veg dining delivered fast.',
  min_order_amount: 149,
  delivery_fee_base: 0,
  delivery_fee: 0,
  delivery_fee_per_km: 0,
  free_delivery_threshold: 500,
  free_delivery_above: 500,
  hotel_latitude: 15.806135,
  hotel_longitude: 76.765092,
  hotel_name: 'Hotel Atithi',
  hotel_address: 'NH150A, Bassapura, Sindhanur, Raichur, Karnataka 584128',
  hotel_phone: '',
  tax_percent: 0,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [todayStoreHours, setTodayStoreHours] = useState<StoreHours | null>(null);
  const [todayHoursText, setTodayHoursText] = useState<string>('Hours: 7:00 AM - 11:00 PM');

  const fetchSettings = async () => {
    try {
      // The three queries are independent: run them in parallel instead of one after another
      const [settingsRes, openRes, hoursRes] = await Promise.allSettled([
        supabase.from('settings').select('*').limit(1).maybeSingle(),
        supabase.rpc('is_store_open_now'),
        supabase.from('store_hours').select('*'),
      ]);

      // 1. Settings row
      const data =
        settingsRes.status === 'fulfilled' && !settingsRes.value.error ? settingsRes.value.data : null;
      if (data) {
        setSettings(data);
      }

      // 2. is_store_open_now() RPC
      if (openRes.status === 'fulfilled' && !openRes.value.error && typeof openRes.value.data === 'boolean') {
        setIsOpen(openRes.value.data);
      } else {
        if (openRes.status === 'rejected') console.warn('is_store_open_now RPC error:', openRes.reason);
        if (data) setIsOpen(data.is_store_open ?? true);
      }

      // 3. store_hours table for today's hours
      if (hoursRes.status === 'rejected') {
        console.warn('store_hours table query error:', hoursRes.reason);
      } else {
        const { data: hoursData, error: hoursError } = hoursRes.value;
        if (!hoursError && hoursData && hoursData.length > 0) {
          const currentDay = getCurrentDayOfWeekIST();
          const today = hoursData.find((h: StoreHours) => h.day_of_week === currentDay);
          if (today) {
            setTodayStoreHours(today);
            if (today.is_closed) {
              setTodayHoursText('Closed Today');
              setIsOpen(false);
            } else {
              const openFmt = formatTime12Hour(today.open_time);
              const closeFmt = formatTime12Hour(today.close_time);
              setTodayHoursText(`Hours: ${openFmt} - ${closeFmt}`);
            }
          }
        } else if (data) {
          const openFmt = formatTime12Hour(data.opening_time || '07:00:00');
          const closeFmt = formatTime12Hour(data.closing_time || '22:00:00');
          setTodayHoursText(`Hours: ${openFmt} - ${closeFmt}`);
        }
      }
    } catch (e) {
      console.warn('Error loading settings from DB, using fallback defaults:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // Refresh status every 2 minutes
    const interval = setInterval(fetchSettings, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        isOpen,
        todayHoursText,
        todayStoreHours,
        refetchSettings: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
