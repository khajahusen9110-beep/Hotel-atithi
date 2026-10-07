import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Address, AddressFormData } from '../types/database';
import { AddressForm } from '../components/AddressForm';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  LogOut,
  CheckCircle2,
  Loader2,
  Volume2,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { soundAndHaptics } from '../utils/soundAndHaptics';

export const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Profile fields editing
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // App Experience preferences
  const [soundActive, setSoundActive] = useState(() => soundAndHaptics.isSoundEnabled());
  const [hapticsActive, setHapticsActive] = useState(() => soundAndHaptics.isHapticsEnabled());

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (profile) {
      setName(profile.name || '');
      setEmail(user.email || '');
    }
  }, [user, profile, navigate]);

  const fetchAddresses = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false });

      if (!error && data) {
        setAddresses(data);
      }
    } catch (e) {
      console.warn('Error fetching addresses:', e);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      if (!name.trim()) throw new Error('Please enter your name');
      const { error } = await updateProfile({ name });
      if (error) throw error;
      success('Profile updated successfully');
    } catch (err: any) {
      toastError(err?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveAddress = async (formData: AddressFormData) => {
    if (!user) return;
    try {
      if (formData.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('customer_id', user.id);
      }

      if (editingAddress) {
        const { error } = await supabase
          .from('addresses')
          .update({
            recipient_name: formData.recipient_name,
            phone: formData.phone,
            label: formData.label,
            full_address: formData.full_address,
            landmark: formData.landmark,
            city: formData.city,
            pincode: formData.pincode,
            latitude: formData.latitude,
            longitude: formData.longitude,
            is_default: formData.is_default,
          })
          .eq('id', editingAddress.id);

        if (error) throw error;
        success('Address updated successfully');
        setEditingAddress(null);
      } else {
        const { error } = await supabase.from('addresses').insert({
          customer_id: user.id,
          recipient_name: formData.recipient_name,
          phone: formData.phone,
          label: formData.label,
          full_address: formData.full_address,
          landmark: formData.landmark,
          city: formData.city,
          pincode: formData.pincode,
          latitude: formData.latitude,
          longitude: formData.longitude,
          is_default: formData.is_default,
        });

        if (error) throw error;
        success('Address saved successfully');
        setIsAddingAddress(false);
      }
      await fetchAddresses();
    } catch (err: any) {
      toastError(err?.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;
      success('Address removed');
      await fetchAddresses();
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('customer_id', user.id);

      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      await fetchAddresses();
      success('Primary address updated');
    } catch (err: any) {
      toastError('Failed to update primary address');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
            My Account
          </h1>
          <p className="text-stone-500">Manage profile and saved delivery locations</p>
        </div>

        <button
          onClick={handleSignOut}
          className="px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-rose-50 hover:text-rose-600 font-bold text-stone-700 flex items-center gap-1.5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Details Form */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h2 className="font-bold text-stone-900 text-sm flex items-center gap-2 pb-2 border-b border-stone-100">
              <User className="w-4 h-4 text-amber-600" />
              Personal Info
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block font-bold text-stone-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  placeholder="Not set"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  disabled
                  value={profile?.phone || user?.phone || 'Not verified'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-amber-600 text-white font-bold transition-all shadow-xs"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          {/* App Experience & Feedback Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h2 className="font-bold text-stone-900 text-sm flex items-center gap-2 pb-2 border-b border-stone-100">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Experience & Feedback</span>
            </h2>

            <div className="space-y-3">
              {/* Sound Effects Toggle */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-xs">Sound Effects</p>
                    <p className="text-[10px] text-stone-400">Pleasant clicks & chimes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundActive;
                    setSoundActive(next);
                    soundAndHaptics.setSoundEnabled(next);
                    if (next) soundAndHaptics.playTapSound();
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    soundActive ? 'bg-amber-500' : 'bg-stone-300'
                  }`}
                  aria-label="Toggle Sound Effects"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      soundActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Haptic Vibration Toggle */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-xs">Vibration / Haptics</p>
                    <p className="text-[10px] text-stone-400">Tactile buzz on tap</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !hapticsActive;
                    setHapticsActive(next);
                    soundAndHaptics.setHapticsEnabled(next);
                    if (next) soundAndHaptics.triggerHaptic('medium');
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                    hapticsActive ? 'bg-emerald-500' : 'bg-stone-300'
                  }`}
                  aria-label="Toggle Haptic Feedback"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      hapticsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Test Button */}
              <button
                type="button"
                onClick={() => {
                  soundAndHaptics.triggerHaptic('pop');
                  soundAndHaptics.playAddToCartSound();
                }}
                className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Test Vibration & Sound</span>
              </button>
            </div>
          </div>
        </div>

        {/* Saved Addresses Section */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                Saved Delivery Addresses
              </h2>
              {!isAddingAddress && !editingAddress && (
                <button
                  onClick={() => {
                    setEditingAddress(null);
                    setIsAddingAddress(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold hover:bg-amber-100 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New</span>
                </button>
              )}
            </div>

            {isAddingAddress || editingAddress ? (
              <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200">
                <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-1.5">
                  {editingAddress ? (
                    <>
                      <Pencil className="w-4 h-4 text-amber-600" />
                      <span>Edit Delivery Address ({editingAddress.label})</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-amber-600" />
                      <span>Add New Delivery Address</span>
                    </>
                  )}
                </h3>
                <AddressForm
                  initialData={editingAddress || undefined}
                  isEdit={!!editingAddress}
                  submitLabel={editingAddress ? 'Update Address' : 'Save Address'}
                  onSubmit={handleSaveAddress}
                  onCancel={() => {
                    setIsAddingAddress(false);
                    setEditingAddress(null);
                  }}
                />
              </div>
            ) : loadingAddresses ? (
              <div className="py-12 flex items-center justify-center text-stone-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Loading addresses...</span>
              </div>
            ) : addresses.length === 0 ? (
              <div className="py-10 text-center text-stone-400 space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-stone-300" />
                <p>No addresses saved yet. Add your home or office address!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 hover:bg-stone-50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 uppercase text-[10px] px-2 py-0.5 rounded bg-white border border-stone-200">
                          {addr.label}
                        </span>
                        {addr.is_default && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-stone-700 space-y-1">
                        {addr.recipient_name && (
                          <p className="font-bold text-stone-900">{addr.recipient_name}</p>
                        )}
                        <p className="line-clamp-2 text-[11px]">{addr.full_address}</p>
                        {addr.landmark && (
                          <p className="text-[10px] text-stone-500">
                            Landmark: {addr.landmark}
                          </p>
                        )}
                        <p className="text-[10px] text-stone-500 font-medium">
                          {addr.city}, {addr.pincode} • {addr.phone}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between">
                      {!addr.is_default ? (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-[11px] font-bold text-stone-600 hover:text-amber-700 cursor-pointer"
                        >
                          Make Primary
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 font-medium">Default Address</span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingAddress(false);
                            setEditingAddress(addr);
                          }}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                          title="Edit this address"
                          aria-label="Edit address"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete address"
                          aria-label="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
