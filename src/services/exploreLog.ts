import { storageGet, storageSet } from './storage';
import { supabase } from './supabase';

const STORAGE_KEY = 'tourgo:explore-log';
const LEGACY_KEY = 'tourgo:visited-ph';

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

// Scopes the local storage key to the currently logged in user ID to prevent account leak
async function getStorageKey(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return `${STORAGE_KEY}:${user.id}`;
    }
  } catch (e) {
    // fail gracefully
  }
  return STORAGE_KEY;
}

export async function loadExploreLog(): Promise<ExploreLog> {
  let localLog: ExploreLog = EMPTY;
  const storageKey = await getStorageKey();

  // 1. Load local log first (scoped to user)
  try {
    const raw = await storageGet(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      localLog = {
        visitedProvinces: Array.isArray(parsed?.visitedProvinces) ? parsed.visitedProvinces : [],
        visitedDestinations: Array.isArray(parsed?.visitedDestinations) ? parsed.visitedDestinations : [],
        savedDestinations: Array.isArray(parsed?.savedDestinations) ? parsed.savedDestinations : [],
        savedProvinces: Array.isArray(parsed?.savedProvinces) ? parsed.savedProvinces : [],
        savedDestinationsMeta: (parsed?.savedDestinationsMeta && typeof parsed.savedDestinationsMeta === 'object')
          ? parsed.savedDestinationsMeta
          : undefined,
      };
    } else {
      // Fallback/migration from anonymous legacy key
      const rawLegacy = await storageGet(STORAGE_KEY);
      if (rawLegacy) {
        const parsed = JSON.parse(rawLegacy);
        localLog = {
          visitedProvinces: Array.isArray(parsed?.visitedProvinces) ? parsed.visitedProvinces : [],
          visitedDestinations: Array.isArray(parsed?.visitedDestinations) ? parsed.visitedDestinations : [],
          savedDestinations: Array.isArray(parsed?.savedDestinations) ? parsed.savedDestinations : [],
          savedProvinces: Array.isArray(parsed?.savedProvinces) ? parsed.savedProvinces : [],
          savedDestinationsMeta: (parsed?.savedDestinationsMeta && typeof parsed.savedDestinationsMeta === 'object')
            ? parsed.savedDestinationsMeta
            : undefined,
        };
      } else {
        const legacy = await storageGet(LEGACY_KEY);
        if (legacy) {
          const ids: string[] = JSON.parse(legacy);
          localLog = {
            ...EMPTY,
            visitedProvinces: Array.isArray(ids) ? ids : [],
          };
        }
      }
    }
  } catch (err) {
    console.warn('Error reading local explore log:', err);
  }

  // 2. Sync with Supabase wishlist_items if authenticated
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: dbWishlist, error } = await supabase
        .from('wishlist_items')
        .select('destination_id')
        .eq('user_id', user.id);

      if (!error && dbWishlist) {
        const dbIds = dbWishlist.map((item: any) => item.destination_id);
        
        // Merge local and database saved destinations
        const mergedSet = new Set([...localLog.savedDestinations, ...dbIds]);
        const mergedSaved = Array.from(mergedSet);

        // If local had items not in DB, sync them up to DB
        const missingInDb = localLog.savedDestinations.filter(id => !dbIds.includes(id));
        if (missingInDb.length > 0) {
          const insertRows = missingInDb.map(id => ({
            user_id: user.id,
            destination_id: id
          }));
          await supabase.from('wishlist_items').insert(insertRows);
        }

        localLog.savedDestinations = mergedSaved;
        await storageSet(storageKey, JSON.stringify(localLog));
      }
    }
  } catch (err) {
    // Fail silently if table doesn't exist yet or connection is offline
    console.log('Graceful database sync fallback: table wishlist_items may not exist yet.', err);
  }

  return localLog;
}

export async function saveExploreLog(log: ExploreLog): Promise<void> {
  const storageKey = await getStorageKey();
  
  // 1. Save locally first (scoped to user)
  await storageSet(storageKey, JSON.stringify(log));

  // 2. Sync with Supabase if authenticated
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Get current items from database
      const { data: dbWishlist, error } = await supabase
        .from('wishlist_items')
        .select('destination_id')
        .eq('user_id', user.id);

      if (!error && dbWishlist) {
        const dbIds = dbWishlist.map((item: any) => item.destination_id);
        const localIds = log.savedDestinations;

        // Find items to insert
        const toInsert = localIds.filter(id => !dbIds.includes(id));
        if (toInsert.length > 0) {
          const insertRows = toInsert.map(id => ({
            user_id: user.id,
            destination_id: id
          }));
          await supabase.from('wishlist_items').insert(insertRows);
        }

        // Find items to delete
        const toDelete = dbIds.filter(id => !localIds.includes(id));
        if (toDelete.length > 0) {
          await supabase
            .from('wishlist_items')
            .delete()
            .eq('user_id', user.id)
            .in('destination_id', toDelete);
        }
      }
    }
  } catch (err) {
    console.log('Graceful database save fallback: table wishlist_items may not exist yet.', err);
  }
}
