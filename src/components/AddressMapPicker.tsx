import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

interface AddressMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
  initialLat = 18.5204, // Default Pune
  initialLng = 73.8567,
  onLocationSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Custom pulse pin icon
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
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
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
      zoom: 15,
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

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCoords({ lat: pos.lat, lng: pos.lng });
      onLocationSelect(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
        onLocationSelect(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-xs">
        <div ref={mapContainerRef} className="h-56 w-full z-10" />

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-sm text-stone-800 hover:text-amber-700 text-xs font-bold shadow-md border border-stone-200 flex items-center gap-1.5 transition-all"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>{isLocating ? 'Detecting GPS...' : 'Use My GPS'}</span>
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          Drag the pin or tap anywhere on the map to mark your entrance
        </span>
        <span className="font-mono text-[10px] text-stone-400">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
};
