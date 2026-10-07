import React, { useState, useEffect } from 'react';
import { AddressFormData } from '../types/database';
import { AddressMapPicker, AutoDetectedAddress } from './AddressMapPicker';
import { User, Phone, MapPin, Building, Home, Briefcase, Tag, Check, Sparkles } from 'lucide-react';
import { soundAndHaptics } from '../utils/soundAndHaptics';

interface AddressFormProps {
  initialData?: Partial<AddressFormData> & { id?: string };
  onSubmit: (data: AddressFormData) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  isEdit?: boolean;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState<AddressFormData>({
    recipient_name: initialData?.recipient_name || '',
    phone: initialData?.phone || '',
    label: initialData?.label || 'Home',
    full_address: initialData?.full_address || '',
    landmark: initialData?.landmark || '',
    city: initialData?.city || 'Sindhanur',
    pincode: initialData?.pincode || '',
    latitude: initialData?.latitude || 15.806135,
    longitude: initialData?.longitude || 76.765092,
    is_default: initialData?.is_default ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFilledNotice, setAutoFilledNotice] = useState<boolean>(false);

  // Sync state if initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        recipient_name: initialData.recipient_name ?? prev.recipient_name,
        phone: initialData.phone ?? prev.phone,
        label: initialData.label ?? prev.label,
        full_address: initialData.full_address ?? prev.full_address,
        landmark: initialData.landmark ?? prev.landmark,
        city: initialData.city ?? prev.city,
        pincode: initialData.pincode ?? prev.pincode,
        latitude: initialData.latitude ?? prev.latitude,
        longitude: initialData.longitude ?? prev.longitude,
        is_default: initialData.is_default ?? prev.is_default,
      }));
    }
  }, [initialData]);

  const handleLocationSelect = (lat: number, lng: number, autoFill?: AutoDetectedAddress) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        latitude: lat,
        longitude: lng,
      };

      if (autoFill) {
        // If address field is empty OR in Add New mode, auto-populate detected details
        if (autoFill.full_address && (!prev.full_address || !isEdit)) {
          updated.full_address = autoFill.full_address;
        }
        if (autoFill.city) {
          updated.city = autoFill.city;
        }
        if (autoFill.pincode) {
          updated.pincode = autoFill.pincode;
        }
        if (autoFill.landmark && !prev.landmark) {
          updated.landmark = autoFill.landmark;
        }
        setAutoFilledNotice(true);
        setTimeout(() => setAutoFilledNotice(false), 5000);
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.recipient_name.trim()) {
      setError('Please provide recipient name');
      soundAndHaptics.triggerHaptic('warning');
      soundAndHaptics.playErrorSound();
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please provide a valid 10-digit mobile phone number');
      soundAndHaptics.triggerHaptic('warning');
      soundAndHaptics.playErrorSound();
      return;
    }

    if (!formData.full_address.trim() || formData.full_address.length < 4) {
      setError('Please enter complete street or flat details');
      soundAndHaptics.triggerHaptic('warning');
      soundAndHaptics.playErrorSound();
      return;
    }

    if (!formData.pincode.trim() || formData.pincode.length < 6) {
      setError('Please provide a valid 6-digit postal pincode');
      soundAndHaptics.triggerHaptic('warning');
      soundAndHaptics.playErrorSound();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      soundAndHaptics.triggerHaptic('pop');
    } catch (err: any) {
      setError(err?.message || 'Failed to save address');
      soundAndHaptics.triggerHaptic('warning');
      soundAndHaptics.playErrorSound();
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveSubmitLabel = submitLabel || (isEdit ? 'Update Address' : 'Save Address');

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
          {error}
        </div>
      )}

      {/* Label Tags */}
      <div>
        <label className="block text-stone-600 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
          Save Address As
        </label>
        <div className="flex items-center gap-2">
          {[
            { label: 'Home', icon: Home },
            { label: 'Work', icon: Briefcase },
            { label: 'Other', icon: Tag },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = formData.label === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, label: item.label });
                  soundAndHaptics.triggerHaptic('light');
                  soundAndHaptics.playTapSound();
                }}
                className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recipient & Contact Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="address-recipient-name" className="block text-stone-600 font-bold mb-1">
            Recipient Name *
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              id="address-recipient-name"
              type="text"
              required
              value={formData.recipient_name}
              onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address-phone" className="block text-stone-600 font-bold mb-1">
            10-Digit Mobile Phone *
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              id="address-phone"
              type="tel"
              required
              maxLength={10}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
              placeholder="e.g. 9876543210"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Map Location Picker */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-stone-600 font-bold">
            Delivery Location on Map *
          </label>
          {autoFilledNotice && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-fade-in">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Address fields filled from map (editable below)</span>
            </span>
          )}
        </div>
        <AddressMapPicker
          initialLat={formData.latitude}
          initialLng={formData.longitude}
          isEdit={isEdit}
          onLocationSelect={handleLocationSelect}
        />
      </div>

      {/* Street Details */}
      <div>
        <label htmlFor="address-full-address" className="block text-stone-600 font-bold mb-1">
          Flat / House No. / Building & Street Details *
        </label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <textarea
            id="address-full-address"
            required
            rows={2}
            value={formData.full_address}
            onChange={(e) => setFormData({ ...formData, full_address: e.target.value })}
            placeholder="e.g. Flat 402, Shanti Heights, Station Road, Near Gandhi Chowk"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium resize-none"
          />
        </div>
      </div>

      {/* Landmark, City, Pincode */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="address-landmark" className="block text-stone-600 font-bold mb-1">
            Nearby Landmark
          </label>
          <input
            id="address-landmark"
            type="text"
            value={formData.landmark}
            onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
            placeholder="Near City Hospital / Bus Stand"
            className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
          />
        </div>

        <div>
          <label htmlFor="address-city" className="block text-stone-600 font-bold mb-1">
            City / Town *
          </label>
          <input
            id="address-city"
            type="text"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Raichur"
            className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
          />
        </div>

        <div>
          <label htmlFor="address-pincode" className="block text-stone-600 font-bold mb-1">
            Pincode *
          </label>
          <input
            id="address-pincode"
            type="text"
            required
            maxLength={6}
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
            placeholder="584101"
            className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
          />
        </div>
      </div>

      {/* Default Checkbox */}
      <label htmlFor="address-is-default" className="flex items-center gap-2 cursor-pointer pt-1">
        <input
          id="address-is-default"
          type="checkbox"
          checked={formData.is_default}
          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
        />
        <span className="text-stone-700 font-medium">Make this my primary delivery address</span>
      </label>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Saving...' : effectiveSubmitLabel}</span>
        </button>
      </div>
    </form>
  );
};
