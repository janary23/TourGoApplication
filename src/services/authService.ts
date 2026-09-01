// src/services/authService.ts
// Real Supabase Auth operations — replaces all mock currentUser logic

import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';

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

// ── Google sign-in ───────────────────────────────────────────────────────────
//
// Requires the Google provider to be enabled in the Supabase dashboard
// (Authentication > Providers > Google) with the redirect URL returned by
// getOAuthRedirectUrl() added to Authentication > URL Configuration.
//
// Uses expo-linking rather than an in-app browser so no extra dependency is
// needed: we open the consent screen in the system browser and catch the
// redirect back into the app as a deep link.

/** The deep link Supabase should send the user back to after Google consent. */
export function getOAuthRedirectUrl(): string {
  return Linking.createURL('auth/callback');
}

/**
 * Start the Google sign-in flow. Resolves once the browser has been opened —
 * the session itself arrives via the deep link handled by completeOAuthSignIn.
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const redirectTo = getOAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) return { error: error.message };
  if (!data?.url) {
    return { error: 'Google sign-in is not configured for this project yet.' };
  }

  const opened = await Linking.canOpenURL(data.url).catch(() => false);
  if (!opened) return { error: 'Could not open the Google sign-in page.' };

  await Linking.openURL(data.url);
  return { error: null };
}

/**
 * Finish the OAuth round trip from the redirect URL.
 *
 * Handles both flows Supabase can use: PKCE (a `code` query param) and the
 * implicit flow (tokens in the URL fragment). Returns handled:false for any
 * unrelated deep link so callers can ignore it.
 */
export async function completeOAuthSignIn(
  url: string
): Promise<{ handled: boolean; error: string | null }> {
  if (!url) return { handled: false, error: null };

  try {
    const [, fragment = ''] = url.split('#');
    const queryString = url.includes('?') ? url.split('?')[1].split('#')[0] : '';

    const fragmentParams = new URLSearchParams(fragment);
    const queryParams = new URLSearchParams(queryString);

    // OAuth provider reported a failure (user cancelled, config error, ...)
    const oauthError = queryParams.get('error_description') || fragmentParams.get('error_description');
    if (oauthError) return { handled: true, error: oauthError };

    // PKCE flow
    const code = queryParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { handled: true, error: error?.message ?? null };
    }

    // Implicit flow — tokens come back in the fragment
    const access_token = fragmentParams.get('access_token');
    const refresh_token = fragmentParams.get('refresh_token');
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      return { handled: true, error: error?.message ?? null };
    }

    return { handled: false, error: null };
  } catch (err: any) {
    return { handled: true, error: err?.message || 'Could not complete Google sign-in.' };
  }
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
