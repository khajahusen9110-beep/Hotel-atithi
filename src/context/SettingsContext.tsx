import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, StoreHours } from '../types/database';
import { formatTime12Hour, getCurrentDayOfWeekIST } from '../utils/productAvailability';
import { StoreStatus } from '../utils/storeHours';

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  isOpen: boolean;
  todayHoursText: string;
  todayStoreHours: StoreHours | null;
  /** All 7 days, for structured data (empty until loaded) */
  storeHours: StoreHours[];
  /** Open / closed with the reason and the next opening time (from get_store_status) */
  storeStatus: StoreStatus;
  refetchSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  id: 'default',
  is_store_open: true,
  opening_time: '07:00',
  closing_time: '23:00',
  announcement: 'Welcome to Hotel Atithi! Delicious veg & non-veg food delivered fast.',
  min_order_amount: 149,
  delivery_fee_base: 0,
  delivery_fee: 0,
  delivery_fee_per_km: 0,
  free_delivery_threshold: 500,
  free_delivery_above: 500,
  // Shown only until the admin settings load; the real values come from the database
  hotel_latitude: 16.2111455,
  hotel_longitude: 77.3572712,
  hotel_name: 'Hotel Atithi',
  hotel_address: 'Raichur, Karnataka',
  hotel_city: 'Raichur',
  hotel_phone: '',
  tax_percent: 0,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [todayStoreHours, setTodayStoreHours] = useState<StoreHours | null>(null);
  const [storeHours, setStoreHours] = useState<StoreHours[]>([]);
  const [todayHoursText, setTodayHoursText] = useState<string>('Hours: 7:00 AM - 11:00 PM');
  const [storeStatus, setStoreStatus] = useState<StoreStatus>({
    isOpen: true,
    reason: 'open',
    message: null,
    closesAt: null,
    nextOpenAt: null,
  });
  const boundaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyHours = (hoursData: StoreHours[], todayDow: number, fallbackSettings: Settings | null) => {
    if (hoursData.length > 0) {
      setStoreHours(hoursData);
      const today = hoursData.find((h) => Number(h.day_of_week) === todayDow);
      if (today) {
        setTodayStoreHours(today);
        setTodayHoursText(
          today.is_closed
            ? 'Closed Today'
            : `Hours: ${formatTime12Hour(today.open_time)} - ${formatTime12Hour(today.close_time)}`
        );
      }
    } else if (fallbackSettings) {
      const openFmt = formatTime12Hour(fallbackSettings.opening_time || '07:00:00');
      const closeFmt = formatTime12Hour(fallbackSettings.closing_time || '22:00:00');
      setTodayHoursText(`Hours: ${openFmt} - ${closeFmt}`);
    }
  };

  // Re-check exactly when the hotel opens or closes, so menus flip without a reload
  const scheduleBoundaryRefresh = (status: StoreStatus) => {
    if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
    const next = status.isOpen ? status.closesAt : status.nextOpenAt;
    if (!next) return;
    const delay = next - Date.now() + 1500;
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      boundaryTimerRef.current = setTimeout(() => fetchSettings(), delay);
    }
  };

  const fetchSettings = async () => {
    try {
      // Independent queries: run them in parallel instead of one after another
      const [settingsRes, statusRes] = await Promise.allSettled([
        supabase.from('settings').select('*').limit(1).maybeSingle(),
        supabase.rpc('get_store_status'),
      ]);

      const data =
        settingsRes.status === 'fulfilled' && !settingsRes.value.error ? settingsRes.value.data : null;
      if (data) {
        setSettings(data);
      }

      const statusData =
        statusRes.status === 'fulfilled' && !statusRes.value.error ? statusRes.value.data : null;

      if (statusData && typeof statusData.is_open === 'boolean') {
        // get_store_status(): one answer for the website and the order check
        const status: StoreStatus = {
          isOpen: statusData.is_open,
          reason: statusData.reason ?? (statusData.is_open ? 'open' : 'hours'),
          message: statusData.message ?? null,
          closesAt: statusData.closes_at_epoch ? Number(statusData.closes_at_epoch) * 1000 : null,
          nextOpenAt: statusData.next_open_epoch ? Number(statusData.next_open_epoch) * 1000 : null,
        };
        setStoreStatus(status);
        setIsOpen(status.isOpen);
        applyHours((statusData.week || []) as StoreHours[], Number(statusData.today_dow ?? getCurrentDayOfWeekIST()), data);
        scheduleBoundaryRefresh(status);
        return;
      }

      // Fallback for a database without get_store_status(): the older open check + hours table
      const [openRes, hoursRes] = await Promise.allSettled([
        supabase.rpc('is_store_open_now'),
        supabase.from('store_hours').select('*'),
      ]);
      let open = data ? !data.store_manually_closed : true;
      if (openRes.status === 'fulfilled' && !openRes.value.error && typeof openRes.value.data === 'boolean') {
        open = openRes.value.data;
      }
      const hoursData =
        hoursRes.status === 'fulfilled' && !hoursRes.value.error ? ((hoursRes.value.data || []) as StoreHours[]) : [];
      applyHours(hoursData, getCurrentDayOfWeekIST(), data);
      setIsOpen(open);
      setStoreStatus({
        isOpen: open,
        reason: open ? 'open' : data?.store_manually_closed ? 'manual' : 'hours',
        message: data?.store_manually_closed ? data.store_closed_message ?? null : null,
        closesAt: null,
        nextOpenAt: null,
      });
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
    return () => {
      clearInterval(interval);
      if (boundaryTimerRef.current) clearTimeout(boundaryTimerRef.current);
    };
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        isOpen,
        todayHoursText,
        todayStoreHours,
        storeHours,
        storeStatus,
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
