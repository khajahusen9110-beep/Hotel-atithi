import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings } from '../types/database';
import { isStoreCurrentlyOpen } from '../utils/time';

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  isOpen: boolean;
  refetchSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  id: 'default',
  is_store_open: true,
  opening_time: '08:00',
  closing_time: '23:00',
  announcement: 'Welcome to Hotel Atithi! Farm-fresh produce & pure veg dining delivered fast.',
  min_order_amount: 149,
  delivery_fee_base: 30,
  delivery_fee_per_km: 10,
  free_delivery_threshold: 499,
  hotel_latitude: 18.5204,
  hotel_longitude: 73.8567,
  hotel_address: 'Hotel Atithi, Station Road, Pune, Maharashtra 411001',
  hotel_phone: '+91 98765 43210',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setSettings(data);
      }
    } catch (e) {
      console.warn('Error loading settings from DB, using fallback defaults:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const isOpen = isStoreCurrentlyOpen(
    settings.is_store_open,
    settings.opening_time,
    settings.closing_time
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        isOpen,
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
