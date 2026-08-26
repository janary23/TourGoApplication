// src/services/authService.ts
// Real Supabase Auth operations — replaces all mock currentUser logic

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

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

/** Upload an avatar image to Supabase Storage and update the profile. */
export async function uploadAvatar(
  localUri: string
): Promise<{ url: string | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: 'Not authenticated' };

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const filePath = `avatars/${user.id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, bytes, { contentType: mimeType, upsert: true });

  if (uploadError) {
    const msg = uploadError.message.includes('Bucket not found')
      ? 'Storage bucket not found. Run scripts/create_avatars_bucket.sql in Supabase SQL Editor first.'
      : uploadError.message;
    return { url: null, error: msg };
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const cacheBuster = `?t=${Date.now()}`;
  const avatarUrl = urlData?.publicUrl ? urlData.publicUrl + cacheBuster : null;

  if (avatarUrl) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) return { url: null, error: updateError.message };
  }

  return { url: avatarUrl, error: null };
}
