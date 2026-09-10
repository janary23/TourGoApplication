// ─────────────────────────────────────────────────────────────────────────────
// OVERPASS API (OPENSTREETMAP) — SHARED LIVE TAG-BASED PLACE SEARCH
// 100% free, keyless. Unlike a geocoder (Photon), which only matches a
// place's NAME, Overpass queries OSM's actual amenity/tourism/natural tags —
// so "beaches near Boracay" returns real tagged beaches instead of anything
// that merely has the word "beach" in its name.
//
// Shared by freePlacesService.ts (Home search & category rows) and
// destinations.ts (Explore province/municipality browsing).
// ─────────────────────────────────────────────────────────────────────────────

// The free public Overpass tier is run by volunteers and has real capacity
// limits — any single instance can be slow or briefly down. We try each in
// order and every call site already falls back to the existing curated
// Wikipedia/Photon results if all of them fail, so a bad Overpass day never
// breaks search — it just quietly loses the extra coverage for that request.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

export type OverpassVibe = 'adventure' | 'relaxing' | 'culture' | 'nature';
export type OverpassBudget = 'budget' | 'moderate' | 'luxury';
export type OverpassCategoryKey = 'outdoors' | 'heritage' | 'art' | 'parks' | 'food';

export type OverpassTagFilter = { key: string; value?: string };

export const CATEGORY_OVERPASS_TAGS: Record<OverpassCategoryKey, OverpassTagFilter[]> = {
  outdoors: [
    { key: 'natural', value: 'beach' },
    { key: 'natural', value: 'waterfall' },
    { key: 'natural', value: 'hot_spring' },
    { key: 'natural', value: 'cave_entrance' },
    { key: 'leisure', value: 'nature_reserve' },
  ],
  heritage: [
    { key: 'historic' },
    { key: 'amenity', value: 'place_of_worship' },
  ],
  art: [
    { key: 'tourism', value: 'museum' },
    { key: 'tourism', value: 'gallery' },
    { key: 'amenity', value: 'arts_centre' },
  ],
  parks: [
    { key: 'leisure', value: 'park' },
    { key: 'tourism', value: 'theme_park' },
    { key: 'tourism', value: 'zoo' },
    { key: 'leisure', value: 'garden' },
  ],
  food: [
    { key: 'amenity', value: 'restaurant' },
    { key: 'amenity', value: 'cafe' },
    { key: 'amenity', value: 'fast_food' },
  ],
};

// Broad "anything worth sightseeing" set for general location browsing with
// no specific category filter (e.g. Explore tab province/municipality
// lists). Excludes food — dining belongs in a dedicated search, not a
// sightseeing list.
export const ATTRACTION_OVERPASS_TAGS: OverpassTagFilter[] = [
  ...CATEGORY_OVERPASS_TAGS.outdoors,
  ...CATEGORY_OVERPASS_TAGS.heritage,
  ...CATEGORY_OVERPASS_TAGS.art,
  ...CATEGORY_OVERPASS_TAGS.parks,
  { key: 'tourism', value: 'attraction' },
  { key: 'tourism', value: 'viewpoint' },
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

function buildOverpassQuery(
  filters: OverpassTagFilter[],
  lat: number,
  lon: number,
  radiusMeters: number,
  limit: number
): string {
  const clauses = filters
    .map(f => {
      const tagExpr = f.value ? `["${f.key}"="${f.value}"]` : `["${f.key}"]`;
      return `  node${tagExpr}(around:${radiusMeters},${lat},${lon});\n  way${tagExpr}(around:${radiusMeters},${lat},${lon});`;
    })
    .join('\n');
  return `[out:json][timeout:25];\n(\n${clauses}\n);\nout center ${limit};`;
}

// Public Overpass instances occasionally hang or suffer regional rate-limits.
// We query endpoints concurrently with a strict 2.5s timeout using Promise.any.
// The fastest responding instance wins; if all fail or time out, it returns
// empty immediately rather than blocking the application for tens of seconds.
const OVERPASS_REQUEST_TIMEOUT_MS = 2500;

async function fetchFromEndpoint(endpoint: string, ql: string): Promise<any[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OVERPASS_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(ql)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json?.elements)) return json.elements;
    throw new Error('Invalid elements payload');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function queryOverpass(ql: string): Promise<any[]> {
  try {
    return await Promise.any(OVERPASS_ENDPOINTS.map(ep => fetchFromEndpoint(ep, ql)));
  } catch {
    // All endpoints failed or timed out — silently fallback to Wikipedia/Geoapify
    return [];
  }
}

export function classifyOsmElement(tags: Record<string, string> = {}): {
  label: string;
  vibe: OverpassVibe;
  budget: OverpassBudget;
} {
  if (tags.natural === 'beach') return { label: 'Beach', vibe: 'relaxing', budget: 'budget' };
  if (tags.natural === 'waterfall') return { label: 'Waterfall', vibe: 'nature', budget: 'budget' };
  if (tags.natural === 'hot_spring') return { label: 'Hot Spring', vibe: 'relaxing', budget: 'moderate' };
  if (tags.natural === 'cave_entrance') return { label: 'Cave', vibe: 'adventure', budget: 'budget' };
  if (tags.leisure === 'nature_reserve') return { label: 'Nature Reserve', vibe: 'nature', budget: 'budget' };
  if (tags.historic) return { label: 'Heritage Site', vibe: 'culture', budget: 'budget' };
  if (tags.amenity === 'place_of_worship') return { label: 'Church', vibe: 'culture', budget: 'budget' };
  if (tags.tourism === 'museum') return { label: 'Museum', vibe: 'culture', budget: 'moderate' };
  if (tags.tourism === 'gallery') return { label: 'Gallery', vibe: 'culture', budget: 'moderate' };
  if (tags.amenity === 'arts_centre') return { label: 'Art Center', vibe: 'culture', budget: 'moderate' };
  if (tags.leisure === 'park') return { label: 'Park', vibe: 'relaxing', budget: 'budget' };
  if (tags.tourism === 'theme_park') return { label: 'Theme Park', vibe: 'adventure', budget: 'luxury' };
  if (tags.tourism === 'zoo') return { label: 'Zoo', vibe: 'relaxing', budget: 'moderate' };
  if (tags.leisure === 'garden') return { label: 'Garden', vibe: 'relaxing', budget: 'budget' };
  if (tags.tourism === 'attraction') return { label: 'Attraction', vibe: 'relaxing', budget: 'moderate' };
  if (tags.tourism === 'viewpoint') return { label: 'Viewpoint', vibe: 'nature', budget: 'budget' };
  if (tags.amenity === 'restaurant') return { label: 'Restaurant', vibe: 'relaxing', budget: 'moderate' };
  if (tags.amenity === 'cafe') return { label: 'Cafe', vibe: 'relaxing', budget: 'budget' };
  if (tags.amenity === 'fast_food') return { label: 'Fast Food', vibe: 'relaxing', budget: 'budget' };
  return { label: 'Spot', vibe: 'relaxing', budget: 'moderate' };
}

export interface OverpassPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  label: string;
  vibe: OverpassVibe;
  budget: OverpassBudget;
  address: string;
  distanceKm: number;
}

// Generic tag-filtered nearby search, sorted by distance from `coords`.
export async function fetchOverpassPlaces(
  filters: OverpassTagFilter[],
  coords: { latitude: number; longitude: number },
  radiusMeters: number,
  limit = 20
): Promise<OverpassPlace[]> {
  try {
    const ql = buildOverpassQuery(filters, coords.latitude, coords.longitude, radiusMeters, limit * 3);
    const elements = await queryOverpass(ql);

    const seen = new Set<string>();
    const places: OverpassPlace[] = [];
    for (const el of elements) {
      const name = el.tags?.name;
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) continue;

      const { label, vibe, budget } = classifyOsmElement(el.tags);
      const addressParts = [
        el.tags['addr:street'],
        el.tags['addr:city'] || el.tags['addr:town'] || el.tags['addr:municipality'],
        el.tags['addr:province'] || el.tags['addr:state'],
      ].filter(Boolean) as string[];

      places.push({
        id: `osm-${el.type}-${el.id}`,
        name,
        latitude: lat,
        longitude: lon,
        label,
        vibe,
        budget,
        address: addressParts.join(', ') || 'Philippines',
        distanceKm: haversineKm(coords.latitude, coords.longitude, lat, lon),
      });
    }

    places.sort((a, b) => a.distanceKm - b.distanceKm);
    return places.slice(0, limit);
  } catch (err) {
    console.warn('Overpass query failed:', err);
    return [];
  }
}

export async function fetchOverpassCategoryPlaces(
  category: OverpassCategoryKey,
  coords: { latitude: number; longitude: number },
  radiusMeters: number,
  limit = 20
): Promise<OverpassPlace[]> {
  return fetchOverpassPlaces(CATEGORY_OVERPASS_TAGS[category], coords, radiusMeters, limit);
}
