// src/services/wishlistSuggestions.ts
// Bridges the existing Wishlist (exploreLog.savedDestinations + wishlist_items)
// into trip planning, so saved places can be dropped straight into an itinerary.
//
// Reuses the existing wishlist storage and catalog — nothing new is persisted.

import { loadExploreLog, type SavedSpotMeta } from './exploreLog';
import { getWishlistCatalog, type SavedSpot } from './wishlistCatalog';
import { resolvePlaceCoords, haversineKm } from './travelEstimate';

export interface WishlistSuggestion {
  id: string;
  name: string;
  image: string;
  locationLabel: string;
  rating?: number;
  bestTime?: string;
  latitude?: number;
  longitude?: number;
  /** Straight-line km from the trip destination, when both are resolvable. */
  distanceKm?: number;
  /** True when the spot is close enough to the destination to be worth doing on this trip. */
  isNearDestination: boolean;
}

/** How far from the destination a saved spot can be and still count as "nearby". */
const NEARBY_RADIUS_KM = 60;

/**
 * Load the user's wishlist as planning suggestions, ranked for a destination.
 *
 * Spots near the destination come first (closest first), then the rest of the
 * wishlist so the user can still pull in anything they've saved. Returns an
 * empty array when the wishlist is empty.
 */
export async function getWishlistSuggestions(destination?: string): Promise<WishlistSuggestion[]> {
  const log = await loadExploreLog();
  const savedIds = log.savedDestinations || [];
  if (savedIds.length === 0) return [];

  const catalog = getWishlistCatalog();
  const byId = new Map<string, SavedSpot>(catalog.map((s) => [s.id, s]));
  const meta: Record<string, SavedSpotMeta> = log.savedDestinationsMeta || {};

  const destCoords = destination ? resolvePlaceCoords(destination) : null;

  const suggestions: WishlistSuggestion[] = savedIds.map((id) => {
    const known = byId.get(id);
    const m = meta[id];

    const name = known?.name ?? m?.name ?? id;
    const latitude = known?.latitude ?? undefined;
    const longitude = known?.longitude ?? undefined;
    const locationLabel = known?.locationLabel ?? m?.locationLabel ?? '';

    // Prefer real coordinates; fall back to resolving the spot's name/label.
    let coords: { latitude: number; longitude: number } | null =
      latitude != null && longitude != null ? { latitude, longitude } : null;
    if (!coords) coords = resolvePlaceCoords(`${name} ${locationLabel}`.trim());

    let distanceKm: number | undefined;
    if (destCoords && coords) distanceKm = haversineKm(destCoords, coords);

    const ratingRaw = known?.rating ?? m?.rating;
    const rating = typeof ratingRaw === 'string' ? parseFloat(ratingRaw) : ratingRaw;

    return {
      id,
      name,
      image: known?.image ?? m?.image ?? '',
      locationLabel,
      rating: Number.isFinite(rating as number) ? (rating as number) : undefined,
      bestTime: known?.bestTime ?? m?.bestTime,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      distanceKm,
      isNearDestination: distanceKm != null && distanceKm <= NEARBY_RADIUS_KM,
    };
  });

  return suggestions.sort((a, b) => {
    if (a.isNearDestination !== b.isNearDestination) return a.isNearDestination ? -1 : 1;
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return a.name.localeCompare(b.name);
  });
}

/** Shape a wishlist spot into an itinerary stop for the given day. */
export function wishlistSpotToStop(
  spot: WishlistSuggestion,
  dayIndex: number,
  time = '10:00 AM'
) {
  return {
    dayIndex,
    time,
    title: spot.name,
    description: spot.bestTime ? `From your wishlist. Best time: ${spot.bestTime}.` : 'Saved from your wishlist.',
    location: spot.locationLabel || spot.name,
    isAiSuggested: false,
  };
}
