// src/services/authService.ts
// Real Supabase Auth operations — replaces all mock currentUser logic

import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  home_city: string;
}

/** Sign up a new user. Creates an auth account + profile row via DB trigger. */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { error: error.message };
  return { error: null };
}

/** Sign in with email + password. */
export async function signIn(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { error: null };
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Get the current authenticated user's profile from the profiles table. */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name || '',
    email: data.email || user.email || '',
    avatar_url: data.avatar_url || '',
    home_city: data.home_city || '',
  };
}

/** Update the current user's profile (name, home_city, avatar_url). */
export async function updateProfile(
  updates: Partial<Pick<UserProfile, 'name' | 'home_city' | 'avatar_url'>>
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { error: null };
}

/** Get the authenticated user's Supabase UUID. */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
