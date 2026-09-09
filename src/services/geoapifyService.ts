// ─────────────────────────────────────────────────────────────────────────────
// GEOAPIFY PLACES API — hosted, category-tagged place search
// Free tier: 3,000 credits/day, no billing. Requires GEOAPIFY_API_KEY in
// src/config/env.ts (get one free at https://www.geoapify.com/).
//
// Under the hood this is still OpenStreetMap data (same as overpassService.ts)
// — Geoapify just re-hosts it behind a cleaner, more reliable API with better
// category taxonomy and address parsing. In testing, Geoapify responded
// reliably while the free public Overpass mirrors were intermittently down,
// so it's used as the primary source here, with Overpass kept as a fallback
// (and for waterfalls specifically, which Geoapify's category list doesn't
// cover at all).
// ─────────────────────────────────────────────────────────────────────────────
import { GEOAPIFY_API_KEY } from '../config/env';
import type { OverpassCategoryKey, OverpassPlace, OverpassVibe, OverpassBudget } from './overpassService';

const GEOAPIFY_ENDPOINT = 'https://api.geoapify.com/v2/places';
const GEOAPIFY_REQUEST_TIMEOUT_MS = 8000;

export const GEOAPIFY_ENABLED = Boolean(GEOAPIFY_API_KEY && !GEOAPIFY_API_KEY.startsWith('YOUR_'));

// Verified against the live API — Geoapify's category list has no dedicated
// "waterfall" tag, so outdoors relies on Overpass to fill that specific gap.
export const CATEGORY_GEOAPIFY_TAGS: Record<OverpassCategoryKey, string[]> = {
  outdoors: ['beach', 'natural.water.hot_spring', 'natural.mountain.cave_entrance', 'natural.protected_area'],
  heritage: ['heritage', 'tourism.sights', 'religion.place_of_worship'],
  art: ['entertainment.museum', 'entertainment.culture.gallery', 'entertainment.culture.arts_centre'],
  parks: ['leisure.park', 'entertainment.theme_park', 'entertainment.zoo', 'entertainment.water_park'],
  food: ['catering.restaurant', 'catering.cafe', 'catering.fast_food'],
};

export const ATTRACTION_GEOAPIFY_CATEGORIES: string[] = [
  ...CATEGORY_GEOAPIFY_TAGS.outdoors,
  ...CATEGORY_GEOAPIFY_TAGS.heritage,
  ...CATEGORY_GEOAPIFY_TAGS.art,
  ...CATEGORY_GEOAPIFY_TAGS.parks,
  'tourism.attraction',
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function classifyGeoapifyCategories(categories: string[] = []): {
  label: string;
  vibe: OverpassVibe;
  budget: OverpassBudget;
  isUnesco: boolean;
} {
  const has = (c: string) => categories.includes(c);
  const startsWith = (prefix: string) => categories.some(c => c.startsWith(prefix));
  const isUnesco = has('heritage.unesco');

  if (has('beach')) return { label: 'Beach', vibe: 'relaxing', budget: 'budget', isUnesco };
  if (has('natural.water.hot_spring')) return { label: 'Hot Spring', vibe: 'relaxing', budget: 'moderate', isUnesco };
  if (has('natural.mountain.cave_entrance')) return { label: 'Cave', vibe: 'adventure', budget: 'budget', isUnesco };
  if (has('natural.protected_area')) return { label: 'Nature Reserve', vibe: 'nature', budget: 'budget', isUnesco };
  if (startsWith('religion.place_of_worship')) return { label: 'Church', vibe: 'culture', budget: 'budget', isUnesco };
  if (isUnesco || has('heritage') || startsWith('tourism.sights')) return { label: 'Heritage Site', vibe: 'culture', budget: 'budget', isUnesco };
  if (has('entertainment.museum')) return { label: 'Museum', vibe: 'culture', budget: 'moderate', isUnesco };
  if (startsWith('entertainment.culture.gallery')) return { label: 'Gallery', vibe: 'culture', budget: 'moderate', isUnesco };
  if (startsWith('entertainment.culture.arts_centre')) return { label: 'Art Center', vibe: 'culture', budget: 'moderate', isUnesco };
  if (has('leisure.park')) return { label: 'Park', vibe: 'relaxing', budget: 'budget', isUnesco };
  if (has('entertainment.theme_park')) return { label: 'Theme Park', vibe: 'adventure', budget: 'luxury', isUnesco };
  if (has('entertainment.zoo')) return { label: 'Zoo', vibe: 'relaxing', budget: 'moderate', isUnesco };
  if (has('entertainment.water_park')) return { label: 'Water Park', vibe: 'adventure', budget: 'moderate', isUnesco };
  if (has('catering.restaurant')) return { label: 'Restaurant', vibe: 'relaxing', budget: 'moderate', isUnesco };
  if (has('catering.cafe')) return { label: 'Cafe', vibe: 'relaxing', budget: 'budget', isUnesco };
  if (has('catering.fast_food')) return { label: 'Fast Food', vibe: 'relaxing', budget: 'budget', isUnesco };
  if (startsWith('tourism.attraction')) return { label: 'Attraction', vibe: 'relaxing', budget: 'moderate', isUnesco };
  return { label: 'Spot', vibe: 'relaxing', budget: 'moderate', isUnesco };
}

// Generic category-filtered nearby search. Returns [] (never throws) if no
// key is configured, the request fails, or nothing is found — callers fall
// back to Overpass/Wikipedia automatically.
export async function fetchGeoapifyPlaces(
  categories: string[],
  coords: { latitude: number; longitude: number },
  radiusMeters: number,
  limit = 20
): Promise<OverpassPlace[]> {
  if (!GEOAPIFY_ENABLED || categories.length === 0) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOAPIFY_REQUEST_TIMEOUT_MS);
  try {
    const url = `${GEOAPIFY_ENDPOINT}?categories=${encodeURIComponent(categories.join(','))}&filter=circle:${coords.longitude},${coords.latitude},${radiusMeters}&limit=${Math.min(limit * 2, 100)}&apiKey=${GEOAPIFY_API_KEY}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];
    const json = await res.json();
    const features = json?.features;
    if (!Array.isArray(features)) return [];

    const seen = new Set<string>();
    const places: (OverpassPlace & { isUnesco: boolean })[] = [];
    for (const f of features) {
      const props = f?.properties;
      const name = props?.name;
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      // `religion.place_of_worship` covers every registered chapel/prayer
      // room, not just heritage-significant churches — drop the smallest,
      // clearly non-touristic ones so they don't drown out real finds.
      if (key.includes('kingdom hall') || key.includes('prayer room') || key.includes('prayer chapel')) continue;
      seen.add(key);

      const lat = props.lat;
      const lon = props.lon;
      if (lat == null || lon == null) continue;

      const { label, vibe, budget, isUnesco } = classifyGeoapifyCategories(props.categories);
      const addressParts = [props.street, props.city || props.suburb, props.state].filter(Boolean) as string[];

      places.push({
        id: `geoapify-${props.place_id || `${lat}-${lon}`}`,
        name,
        latitude: lat,
        longitude: lon,
        label: isUnesco ? `${label} (UNESCO)` : label,
        vibe,
        budget,
        address: addressParts.join(', ') || props.formatted || 'Philippines',
        distanceKm: haversineKm(coords.latitude, coords.longitude, lat, lon),
        isUnesco,
      });
    }

    // UNESCO-listed sites are a genuine curation signal (unlike a bare OSM
    // tag) — surface those first, then sort the rest by distance.
    places.sort((a, b) => {
      if (a.isUnesco !== b.isUnesco) return a.isUnesco ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });

    return places.slice(0, limit).map(({ isUnesco, ...place }) => place);
  } catch (err) {
    console.warn('Geoapify query failed:', err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchGeoapifyCategoryPlaces(
  category: OverpassCategoryKey,
  coords: { latitude: number; longitude: number },
  radiusMeters: number,
  limit = 20
): Promise<OverpassPlace[]> {
  return fetchGeoapifyPlaces(CATEGORY_GEOAPIFY_TAGS[category], coords, radiusMeters, limit);
}
