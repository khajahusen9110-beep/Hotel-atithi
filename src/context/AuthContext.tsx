import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** true when the visitor is ordering without an account (anonymous Supabase session) */
  isGuest: boolean;
  /** Makes sure there is a session; creates a guest session if the visitor isn't logged in */
  ensureSession: () => Promise<User>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    mobileNumber: string;
  }) => Promise<{ data: any; error: any }>;
  signInWithPassword: (params: {
    email: string;
    password: string;
  }) => Promise<{ data: any; error: any }>;
  signInWithOtp: (phone: string) => Promise<{ error: any }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile row may be in-flight by database trigger; retry once softly without manual insert
        setTimeout(async () => {
          const { data: retryData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (retryData) {
            setProfile(retryData);
          }
        }, 600);
      } else if (data) {
        setProfile(data);
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    // Do NOT await Supabase calls inside this callback: supabase-js holds an auth
    // lock while it runs, so awaiting another query here can deadlock the client.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const uid = session.user.id;
          setTimeout(() => {
            fetchProfile(uid);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({
    email,
    password,
    fullName,
    mobileNumber,
  }: {
    email: string;
    password: string;
    fullName: string;
    mobileNumber: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: fullName, phone: mobileNumber },
      },
    });

    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchProfile(data.user.id);
      }
    }

    return { data, error };
  };

  const signInWithPassword = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data?.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchProfile(data.user.id);
      }
    }

    return { data, error };
  };

  const signInWithOtp = async (phone: string) => {
    // Format phone to E.164 if missing country code
    const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/^0+/, '')}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatted,
    });
    return { error };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/^0+/, '')}`;
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token,
      type: 'sms',
    });

    if (data?.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
    }

    return { error };
  };

  const ensureSession = async (): Promise<User> => {
    const { data: current } = await supabase.auth.getSession();
    if (current.session?.user) return current.session.user;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      console.error('Guest session failed:', error);
      throw new Error(
        'Guest checkout is not available right now. Please sign in to place your order.'
      );
    }
    setSession(data.session);
    setUser(data.user);
    // profile row is created by the database trigger; give it a moment then load it
    setTimeout(() => fetchProfile(data.user!.id), 500);
    return data.user;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not logged in') };
    // Only allow customer-editable fields; never send role/id from the client.
    const safeUpdates: Partial<Profile> = {};
    if (updates.name !== undefined) safeUpdates.name = updates.name.trim();
    if (updates.phone !== undefined) safeUpdates.phone = updates.phone.trim();
    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isGuest: Boolean(user?.is_anonymous),
        ensureSession,
        signUp,
        signInWithPassword,
        signInWithOtp,
        verifyOtp,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
