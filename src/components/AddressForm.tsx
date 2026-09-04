import React, { useState } from 'react';
import { AddressFormData } from '../types/database';
import { AddressMapPicker } from './AddressMapPicker';
import { User, Phone, MapPin, Building, Home, Briefcase, Tag, Check } from 'lucide-react';

interface AddressFormProps {
  initialData?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Save Address',
}) => {
  const [formData, setFormData] = useState<AddressFormData>({
    recipient_name: initialData?.recipient_name || '',
    phone: initialData?.phone || '',
    label: initialData?.label || 'Home',
    full_address: initialData?.full_address || '',
    landmark: initialData?.landmark || '',
    city: initialData?.city || 'Pune',
    pincode: initialData?.pincode || '',
    latitude: initialData?.latitude || 18.5204,
    longitude: initialData?.longitude || 73.8567,
    is_default: initialData?.is_default ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.recipient_name.trim()) {
      setError('Please provide recipient name');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please provide a valid 10-digit phone number');
      return;
    }

    if (!formData.full_address.trim() || formData.full_address.length < 5) {
      setError('Please enter complete street or flat details');
      return;
    }

    if (!formData.pincode.trim() || formData.pincode.length < 6) {
      setError('Please provide a valid 6-digit postal pincode');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err?.message || 'Failed to save address');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                onClick={() => setFormData({ ...formData, label: item.label })}
                className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all ${
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
        <label className="block text-stone-600 font-bold mb-1.5">
          Pin Location on Map (Required for precise delivery)
        </label>
        <AddressMapPicker
          initialLat={formData.latitude}
          initialLng={formData.longitude}
          onLocationSelect={(lat, lng) => setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
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
            placeholder="e.g. Flat 402, Shanti Heights, Shivaji Chowk, MG Road"
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
            placeholder="Near Metro Station"
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
            placeholder="Pune"
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
            placeholder="411001"
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
          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
        />
        <span className="text-stone-700 font-medium">Make this my primary delivery address</span>
      </label>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Saving...' : submitLabel}</span>
        </button>
      </div>
    </form>
  );
};
