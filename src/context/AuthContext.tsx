// src/context/AuthContext.tsx
// Global auth state — wraps the app so any screen can read user/profile

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '../services/supabase';
import {
  signIn as _signIn,
  signUp as _signUp,
  signOut as _signOut,
  getCurrentProfile,
  UserProfile,
} from '../services/authService';
import type { Session } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const p = await getCurrentProfile();
    setProfile(p);
  }, []);

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile().finally(() => setIsLoading(false));
      else setIsLoading(false);
    });

    // Listen for auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        loadProfile();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    return _signIn(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    return _signUp(email, password, name);
  }, []);

  const signOut = useCallback(async () => {
    await _signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access auth context from any component. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
