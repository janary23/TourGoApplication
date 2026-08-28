import { DESTINATIONS } from './destinations';
import { HOME_SPOTS } from './homeSpots';

// Normalized shape used by the Wishlist UI so saved destinations can come
// from multiple sources (Explore catalog, Home national/fallback spots).
export interface SavedSpot {
  id: string;
  name: string;
  image: string;
  rating: number;
  bestTime: string;
  provinceId?: string;
  municipalityId?: string;
  latitude?: number;
  longitude?: number;
  locationLabel: string;
}

export function getWishlistCatalog(): SavedSpot[] {
  const catalog: SavedSpot[] = [];

  // 1. Hardcoded PH destination catalog
  for (const d of DESTINATIONS) {
    catalog.push({
      id: d.id,
      name: d.name,
      image: d.image,
      rating: parseFloat(d.rating),
      bestTime: d.bestTime,
      provinceId: d.provinceId,
      municipalityId: d.municipalityId,
      latitude: d.latitude,
      longitude: d.longitude,
      locationLabel: d.address ?? d.name,
    });
  }

  // 2. Home "national picks" + fallback hero spots (nat-*, slide-*)
  for (const s of HOME_SPOTS) {
    catalog.push({
      id: s.id,
      name: s.name,
      image: s.image,
      rating: s.rating,
      bestTime: 'Year-round',
      latitude: s.latitude,
      longitude: s.longitude,
      locationLabel: s.location,
    });
  }

  // Deduplicate by id just in case ids ever collide
  const seen = new Set<string>();
  return catalog.filter(item => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}