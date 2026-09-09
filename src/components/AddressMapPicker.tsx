import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Loader2, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export interface AutoDetectedAddress {
  full_address?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
}

interface AddressMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  isEdit?: boolean;
  onLocationSelect: (lat: number, lng: number, autoFill?: AutoDetectedAddress) => void;
  autoDetectOnMount?: boolean;
}

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
  initialLat,
  initialLng,
  isEdit = false,
  onLocationSelect,
  autoDetectOnMount,
}) => {
  const { settings } = useSettings();
  const hotelLat = settings?.hotel_latitude || 15.3647;
  const hotelLng = settings?.hotel_longitude || 75.1240;

  // Use provided coordinates, or fallback to hotel coordinates
  const startingLat = initialLat || hotelLat;
  const startingLng = initialLng || hotelLng;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: startingLat,
    lng: startingLng,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Reverse geocoding via OpenStreetMap Nominatim
  const performReverseGeocode = async (lat: number, lng: number): Promise<AutoDetectedAddress | null> => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!res.ok) {
        setIsGeocoding(false);
        return null;
      }

      const data = await res.json();
      setIsGeocoding(false);

      if (!data || !data.address) return null;

      const a = data.address;
      const streetComponents = [
        a.house_number || a.building || a.house_name,
        a.road || a.pedestrian || a.street || a.path,
        a.neighbourhood || a.suburb || a.residential || a.quarter,
      ].filter(Boolean);

      let full_address = streetComponents.join(', ');
      if (!full_address && data.display_name) {
        full_address = data.display_name.split(',').slice(0, 3).join(', ').trim();
      }

      const city = a.city || a.town || a.village || a.county || a.state_district || 'Raichur';
      const pincode = a.postcode ? a.postcode.replace(/\D/g, '').slice(0, 6) : '';
      const landmark = a.neighbourhood || a.suburb || a.amenity || a.commercial || '';

      setLocationStatus('Address detected from pin');
      setTimeout(() => setLocationStatus(null), 3500);

      return {
        full_address,
        city,
        pincode,
        landmark,
      };
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
      setIsGeocoding(false);
      return null;
    }
  };

  // High-accuracy GPS location detector
  const detectLocation = (silent: boolean = false) => {
    if (!navigator.geolocation) {
      if (!silent) alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Detecting precise GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
          markerRef.current.setLatLng([lat, lng]);
        }

        const autoFill = await performReverseGeocode(lat, lng);
        onLocationSelect(lat, lng, autoFill || undefined);
        setLocationStatus('High-accuracy GPS acquired');
        setTimeout(() => setLocationStatus(null), 3000);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation failed or permission denied:', err.message);

        // If permission is denied or error, center map on default hotel location without error alert
        if (!isEdit && (!initialLat || !initialLng)) {
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([hotelLat, hotelLng], 15);
            markerRef.current.setLatLng([hotelLat, hotelLng]);
          }
          setCoords({ lat: hotelLat, lng: hotelLng });
          onLocationSelect(hotelLat, hotelLng);
        }

        if (!silent) {
          setLocationStatus('GPS unavailable. Please drag the pin on map.');
          setTimeout(() => setLocationStatus(null), 4000);
        } else {
          setLocationStatus(null);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Custom distinct map marker pin
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="
          background-color: #d97706;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const map = L.map(mapContainerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: isEdit ? 16 : 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], {
      draggable: true,
      icon: customIcon,
    }).addTo(map);

    // On Marker Drag End
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      setCoords({ lat: pos.lat, lng: pos.lng });
      const autoFill = await performReverseGeocode(pos.lat, pos.lng);
      onLocationSelect(pos.lat, pos.lng, autoFill || undefined);
    });

    // On Map Click
    map.on('click', async (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      const autoFill = await performReverseGeocode(e.latlng.lat, e.latlng.lng);
      onLocationSelect(e.latlng.lat, e.latlng.lng, autoFill || undefined);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Invalidate size to ensure clean rendering in modal or expanding layouts
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Auto-detect location on mount:
    // If explicitly requested via autoDetectOnMount, or for Add New form when not editing
    const shouldAutoDetect = autoDetectOnMount !== undefined ? autoDetectOnMount : !isEdit;
    if (shouldAutoDetect) {
      detectLocation(true);
    }

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-xs bg-stone-100">
        <div ref={mapContainerRef} className="h-60 w-full z-10" />

        {/* Floating Controls Bar */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
          <button
            type="button"
            onClick={() => detectLocation(false)}
            disabled={isLocating}
            className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-sm text-stone-800 hover:text-amber-700 text-xs font-bold shadow-md border border-stone-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            title="Auto-detect high-accuracy GPS position"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>{isLocating ? 'Detecting GPS...' : 'Use My GPS'}</span>
          </button>
        </div>

        {/* Live Status Toast inside Map */}
        {(locationStatus || isGeocoding) && (
          <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-stone-900/90 text-white text-[11px] font-medium shadow-md backdrop-blur-sm flex items-center gap-1.5 animate-fade-in">
            {isGeocoding || isLocating ? (
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            )}
            <span>{isGeocoding ? 'Detecting address details...' : locationStatus}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Drag pin or tap map to set exact delivery entrance</span>
        </span>
        <span className="font-mono text-[10px] text-stone-400 shrink-0">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
};
