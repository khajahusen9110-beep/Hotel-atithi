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
  Trash2,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // Profile fields editing
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (profile) {
      setName(profile.name || '');
      setEmail(profile.email || '');
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
      const { error } = await updateProfile({ name, email });
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
      fetchAddresses();
    } catch (err: any) {
      toastError(err?.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;
      success('Address removed');
      setAddresses((prev) => prev.filter((a) => a.id !== id));
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

      await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id);

      fetchAddresses();
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
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
        </div>

        {/* Saved Addresses Section */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                Saved Delivery Addresses
              </h2>
              {!isAddingAddress && (
                <button
                  onClick={() => setIsAddingAddress(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold hover:bg-amber-100 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New</span>
                </button>
              )}
            </div>

            {isAddingAddress ? (
              <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200">
                <h3 className="font-bold text-stone-900 mb-3">Add New Address</h3>
                <AddressForm
                  onSubmit={handleSaveAddress}
                  onCancel={() => setIsAddingAddress(false)}
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
                          className="text-[11px] font-bold text-stone-600 hover:text-amber-700"
                        >
                          Make Primary
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400">Default Address</span>
                      )}

                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
