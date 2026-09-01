import { storageGet, storageSet } from './storage';
import { supabase } from './supabase';

const STORAGE_KEY = 'tourgo:explore-log';

// Lightweight display metadata saved alongside a wishlisted destination id so
// the Wishlist screen can render spots that aren't part of the offline catalog
// (e.g. Google Places spots saved from the Home tab).
export interface SavedSpotMeta {
  name: string;
  image?: string;
  rating?: number | string;
  bestTime?: string;
  locationLabel?: string;
}

export interface ExploreLog {
  visitedProvinces: string[];
  visitedDestinations: string[];
  savedDestinations: string[];
  savedProvinces: string[];
  savedDestinationsMeta?: Record<string, SavedSpotMeta>;
}

const EMPTY: ExploreLog = {
  visitedProvinces: [],
  visitedDestinations: [],
  savedDestinations: [],
  savedProvinces: [],
};

// Scopes the local storage key to the currently logged in user ID to prevent cross-account leakage
async function getStorageKey(): Promise<{ key: string; userId: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id) {
      return { key: `${STORAGE_KEY}:${user.id}`, userId: user.id };
    }
  } catch (e) {
    // fail gracefully
  }
  return { key: `${STORAGE_KEY}:guest`, userId: null };
}

/**
 * Load explore log and user's Wishlist.
 * For authenticated users, Supabase `wishlist_items` is the single source of truth.
 */
export async function loadExploreLog(): Promise<ExploreLog> {
  const { key: storageKey, userId } = await getStorageKey();

  let localLog: ExploreLog = {
    visitedProvinces: [],
    visitedDestinations: [],
    savedDestinations: [],
    savedProvinces: [],
    savedDestinationsMeta: {},
  };

  // 1. For authenticated users, fetch Wishlist items directly from Supabase
  if (userId) {
    try {
      const { data: dbWishlist, error } = await supabase
        .from('wishlist_items')
        .select('destination_id')
        .eq('user_id', userId);

      if (!error && dbWishlist) {
        localLog.savedDestinations = dbWishlist.map((item: any) => item.destination_id);
      }
    } catch (err) {
      console.warn('Error fetching wishlist from Supabase:', err);
    }
  }

  // 2. Load cached local metadata/provinces scoped strictly to this user
  try {
    const raw = await storageGet(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!userId) {
        // Only for guest do we take savedDestinations from storage
        localLog.savedDestinations = Array.isArray(parsed?.savedDestinations) ? parsed.savedDestinations : [];
      }
      localLog.savedProvinces = Array.isArray(parsed?.savedProvinces) ? parsed.savedProvinces : [];
      localLog.savedDestinationsMeta = (parsed?.savedDestinationsMeta && typeof parsed.savedDestinationsMeta === 'object')
        ? parsed.savedDestinationsMeta
        : undefined;
    }
  } catch (err) {
    console.warn('Error reading local explore log cache:', err);
  }

  return localLog;
}

/**
 * Save explore log and sync wishlist_items to Supabase for the authenticated user.
 */
export async function saveExploreLog(log: ExploreLog): Promise<void> {
  const { key: storageKey, userId } = await getStorageKey();
  
  // 1. Save user-scoped cache locally
  await storageSet(storageKey, JSON.stringify(log));

  // 2. Sync wishlist_items in Supabase strictly for this user
  if (userId) {
    try {
      const { data: dbWishlist, error } = await supabase
        .from('wishlist_items')
        .select('destination_id')
        .eq('user_id', userId);

      if (!error && dbWishlist) {
        const dbIds: string[] = dbWishlist.map((item: any) => item.destination_id);
        const targetIds: string[] = log.savedDestinations || [];

        // Insert newly wishlisted items
        const toInsert = targetIds.filter(id => !dbIds.includes(id));
        if (toInsert.length > 0) {
          const insertRows = toInsert.map(id => ({
            user_id: userId,
            destination_id: id,
          }));
          await supabase.from('wishlist_items').insert(insertRows);
        }

        // Delete un-wishlisted items
        const toDelete = dbIds.filter(id => !targetIds.includes(id));
        if (toDelete.length > 0) {
          await supabase
            .from('wishlist_items')
            .delete()
            .eq('user_id', userId)
            .in('destination_id', toDelete);
        }
      }
    } catch (err) {
      console.warn('Error syncing wishlist to Supabase:', err);
    }
  }
}
