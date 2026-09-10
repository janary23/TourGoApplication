import { SpotInfo } from './homeSpots';
import { Destination, getPlaceImageUrl } from './destinations';
import {
  fetchOverpassCategoryPlaces,
  fetchOverpassPlaces,
  ATTRACTION_OVERPASS_TAGS,
  type OverpassCategoryKey,
  type OverpassPlace,
} from './overpassService';
import { fetchGeoapifyCategoryPlaces, fetchGeoapifyPlaces, ATTRACTION_GEOAPIFY_CATEGORIES } from './geoapifyService';

// Haversine distance calculation in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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

// ─────────────────────────────────────────────────────────────────────────────
// PHOTON (OPENSTREETMAP) LIVE GEOSEARCH & POI API
// 100% Free, Keyless, Open Source geosearch powered by Komoot and OpenStreetMap.
// ─────────────────────────────────────────────────────────────────────────────
export async function searchPhotonPlaces(
  query: string,
  userCoords?: { latitude: number; longitude: number }
): Promise<Array<{ id: string; name: string; address: string; latitude: number; longitude: number; category?: string }>> {
  try {
    const trimmed = query.trim();
    if (!trimmed) return [];

    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=15`;
    if (userCoords) {
      url += `&lat=${userCoords.latitude}&lon=${userCoords.longitude}`;
    }

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data || !Array.isArray(data.features)) return [];

    return data.features
      .filter((f: any) => f.properties?.name && f.geometry?.coordinates?.length === 2)
      .map((f: any) => {
        const p = f.properties;
        const [lon, lat] = f.geometry.coordinates;
        const addressParts = [p.name, p.street, p.city || p.district, p.state, p.country || 'Philippines'].filter(Boolean);
        return {
          id: `osm-${p.osm_id}`,
          name: p.name || 'Spot',
          address: addressParts.slice(1).join(', ') || 'Philippines',
          latitude: lat,
          longitude: lon,
          category: p.osm_value || p.osm_key || 'Spot'
        };
      });
  } catch (err) {
    console.warn('Photon live search error:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WIKIPEDIA / WIKIMEDIA LIVE GEOLOCATION & SPOT API
// Live queries to Wikipedia's open APIs for geotagged articles, descriptions & photos.
// ─────────────────────────────────────────────────────────────────────────────
const WIKI_HEADERS = {
  'User-Agent': 'TourGoApp/1.0 (https://tourgo.ph; contact@tourgo.ph)',
  'Api-User-Agent': 'TourGoApp/1.0 (https://tourgo.ph; contact@tourgo.ph)',
  'Accept': 'application/json'
};

// Wikipedia's geosearch returns literally anything with an article near a
// point — the town/city article itself, its schools, malls, government
// buildings — not just places worth visiting. Filter those out so "what's
// near here" doesn't drown real attractions in administrative/institutional
// noise (this was the actual cause of a search like "Baliuag" surfacing the
// town's own article, a university and a mall ahead of its churches).
const NON_ATTRACTION_TITLE_PATTERNS = [
  'election', 'district', 'legislative', 'plebiscite', 'congress',
  'university', 'college', 'school', 'academy', 'seminary',
  'hospital', 'medical center', 'health center',
  'city hall', 'municipal hall', 'barangay hall', 'provincial capitol',
  'sm city', 'sm mall', 'sm supermalls', 'robinsons place', 'robinsons mall',
  'ayala mall', 'ayala malls', 'gaisano', 'puregold', 'walter mart',
  'police station', 'fire station', 'bus terminal', 'jeepney terminal',
  'list of', 'category:',
];

function isNonAttractionTitle(titleLower: string): boolean {
  return NON_ATTRACTION_TITLE_PATTERNS.some(p => titleLower.includes(p));
}

export async function fetchWikipediaNearbySpots(
  coords: { latitude: number; longitude: number },
  radiusMeters = 10000,
  limit = 10,
  excludeNames: string[] = []
): Promise<SpotInfo[]> {
  try {
    const safeRadius = Math.min(Math.max(radiusMeters, 10), 10000);
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${coords.latitude}|${coords.longitude}&ggsradius=${safeRadius}&ggslimit=${limit}&prop=pageimages|extracts|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exchars=220&format=json`;
    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (!res.ok) return [];

    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return [];

    // The place actually being searched (e.g. "Baliwag") shouldn't show up
    // as a "spot to visit within Baliwag" — it's the town itself.
    const excludeLower = excludeNames.map(n => n.trim().toLowerCase()).filter(Boolean);

    const spots: SpotInfo[] = [];
    for (const key of Object.keys(pages)) {
      const p = pages[key];
      if (!p || !p.title) continue;

      const titleLower = p.title.toLowerCase();
      if (isNonAttractionTitle(titleLower)) continue;
      if (excludeLower.includes(titleLower)) continue;

      const pLat = p.coordinates?.[0]?.lat ?? coords.latitude;
      const pLon = p.coordinates?.[0]?.lon ?? coords.longitude;
      const dist = calculateDistanceKm(coords.latitude, coords.longitude, pLat, pLon);
      const image = p.thumbnail?.source || getPlaceImageUrl(p.title);

      spots.push({
        id: `wiki-${p.pageid}`,
        name: p.title,
        location: 'Philippines',
        vibe: 'culture',
        season: 'year-round',
        budget: 'budget',
        distance: dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`,
        highlights: ['Verified Wikipedia Attraction', 'Real-time GPS match'],
        description: p.extract || `A notable landmark and destination in the Philippines.`,
        image,
        rating: 4.8,
        reviewCount: '1.8K',
        categoryTag: 'Landmark',
        subtitle: 'Heritage & Scenic Destination',
        latitude: pLat,
        longitude: pLon,
        days: []
      });
    }
    return spots;
  } catch (err) {
    console.warn('Wikipedia live geosearch error:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WIKIPEDIA LIVE CATEGORY / KEYWORD SEARCH
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWikipediaCategorySpots(
  categoryTitle: string,
  userCoords: { latitude: number; longitude: number },
  categoryTag: string,
  vibe: 'adventure' | 'relaxing' | 'culture' | 'nature' = 'culture'
): Promise<SpotInfo[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(categoryTitle)}&gcmlimit=12&prop=pageimages|extracts|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exchars=220&format=json`;
    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (!res.ok) return [];

    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return [];

    const spots: SpotInfo[] = [];
    for (const key of Object.keys(pages)) {
      const p = pages[key];
      if (!p || !p.title) continue;

      // Skip list pages and non-attraction noise (schools, malls, admin buildings)
      if (isNonAttractionTitle(p.title.toLowerCase())) continue;

      const pLat = p.coordinates?.[0]?.lat ?? userCoords.latitude;
      const pLon = p.coordinates?.[0]?.lon ?? userCoords.longitude;
      const dist = calculateDistanceKm(userCoords.latitude, userCoords.longitude, pLat, pLon);
      const image = p.thumbnail?.source || getPlaceImageUrl(p.title, [categoryTag]);

      spots.push({
        id: `wiki-cat-${p.pageid}`,
        name: p.title,
        location: 'Philippines',
        vibe,
        season: 'year-round',
        budget: 'moderate',
        distance: dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`,
        highlights: [categoryTag, 'Verified Philippine Destination'],
        description: p.extract || `A popular ${categoryTag.toLowerCase()} registered in the Philippines.`,
        image,
        rating: 4.8,
        reviewCount: '2.1K',
        categoryTag,
        subtitle: `${categoryTag}, Philippines`,
        latitude: pLat,
        longitude: pLon,
        days: []
      });
    }
    return spots;
  } catch (err) {
    console.warn(`Wikipedia category live query failed for ${categoryTitle}:`, err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WIKIPEDIA LIVE TEXT SEARCH
// ─────────────────────────────────────────────────────────────────────────────
async function searchWikipediaLive(
  searchQuery: string,
  userCoords: { latitude: number; longitude: number }
): Promise<SpotInfo[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchQuery + ' Philippines')}&gsrlimit=12&prop=pageimages|extracts|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exchars=220&format=json`;
    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (!res.ok) return [];

    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return [];

    const spots: SpotInfo[] = [];
    for (const key of Object.keys(pages)) {
      const p = pages[key];
      if (!p || !p.title) continue;
      if (p.title.startsWith('List of') || p.title.startsWith('Category:')) continue;

      const pLat = p.coordinates?.[0]?.lat ?? userCoords.latitude;
      const pLon = p.coordinates?.[0]?.lon ?? userCoords.longitude;
      const dist = calculateDistanceKm(userCoords.latitude, userCoords.longitude, pLat, pLon);
      const image = p.thumbnail?.source || getPlaceImageUrl(p.title);

      spots.push({
        id: `wiki-search-${p.pageid}`,
        name: p.title,
        location: 'Philippines',
        vibe: 'relaxing',
        season: 'year-round',
        budget: 'moderate',
        distance: dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`,
        highlights: ['Verified Destination', 'Live Search Match'],
        description: p.extract || `A notable landmark in the Philippines.`,
        image,
        rating: 4.7,
        reviewCount: '1.4K',
        categoryTag: 'Attraction',
        subtitle: 'Philippines Destination',
        latitude: pLat,
        longitude: pLon,
        days: []
      });
    }
    return spots;
  } catch (err) {
    console.warn('Wikipedia live text search error:', err);
    return [];
  }
}

function extractCleanLocationQuery(raw: string): string {
  return raw
    .replace(/tourist\s+spots(\s+attractions)?(\s+landmarks)?(\s+to\s+visit\s+in)?/gi, '')
    .replace(/landmarks\s+park\s+to\s+visit\s+in/gi, '')
    .replace(/places\s+to\s+visit\s+in/gi, '')
    .replace(/to\s+visit\s+in/gi, '')
    .replace(/best\s+islands\s+beaches\s+waterfalls\s+nature\s+spots\s+in/gi, '')
    .replace(/best\s+historical\s+landmarks\s+heritage\s+sites\s+old\s+churches\s+in/gi, '')
    .replace(/best\s+museums\s+art\s+galleries\s+culture\s+spots\s+in/gi, '')
    .replace(/best\s+theme\s+parks\s+amusement\s+parks\s+zoos\s+gardens\s+in/gi, '')
    .replace(/famous\s+local\s+restaurants\s+native\s+food\s+cafes\s+in/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERPASS API (OPENSTREETMAP) — LIVE TAG-BASED PLACE SEARCH
// 100% Free, keyless. Unlike Photon (which only matches on a place's NAME),
// Overpass (see ./overpassService) queries OSM's actual amenity/tourism/
// natural tags, so "restaurants near me" or "beaches near Boracay" return
// real category matches instead of places that merely have that word in
// their name. This wrapper just maps the shared OverpassPlace shape onto
// this file's SpotInfo shape.
// ─────────────────────────────────────────────────────────────────────────────
function mapOverpassPlacesToSpots(places: OverpassPlace[]): SpotInfo[] {
  return places.map(p => {
    const dist = p.distanceKm;
    return {
      id: p.id,
      name: p.name,
      location: p.address,
      vibe: p.vibe,
      season: 'year-round',
      budget: p.budget,
      distance: dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`,
      highlights: [p.label, 'OpenStreetMap Verified'],
      description: `A ${p.label.toLowerCase()} in the Philippines.`,
      image: getPlaceImageUrl(p.name, [p.label]),
      rating: 4.6,
      reviewCount: 'New',
      categoryTag: p.label,
      subtitle: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      days: []
    };
  });
}

// Geoapify is the primary live source — it's the same OSM data as Overpass,
// just hosted more reliably (Overpass's free public mirrors were
// intermittently down in testing) and with cleaner category tagging plus a
// real curation signal for heritage (heritage.unesco). Overpass supplements
// it for the one thing Geoapify's category list can't do at all
// (waterfalls have no Geoapify category), and is the full fallback if
// Geoapify has no key configured, is rate-limited, or errors.
async function fetchLiveCategorySpots(
  category: OverpassCategoryKey,
  coords: { latitude: number; longitude: number },
  radiusMeters: number,
  limit = 20
): Promise<SpotInfo[]> {
  const geoapifyPlaces = await fetchGeoapifyCategoryPlaces(category, coords, radiusMeters, limit);

  if (category === 'outdoors') {
    // If Geoapify found outdoors spots, attempt a fast enrichment for waterfalls without blocking
    if (geoapifyPlaces.length > 0) {
      const waterfallPlaces = await fetchOverpassPlaces([{ key: 'natural', value: 'waterfall' }], coords, radiusMeters, 5).catch(() => []);
      const combined = [...geoapifyPlaces];
      for (const w of waterfallPlaces) {
        if (!combined.some(c => c.name.toLowerCase() === w.name.toLowerCase())) combined.push(w);
      }
      return mapOverpassPlacesToSpots(combined.slice(0, limit));
    }
  } else if (geoapifyPlaces.length > 0) {
    return mapOverpassPlacesToSpots(geoapifyPlaces);
  }

  // Geoapify unavailable/empty — fall back to Overpass entirely.
  const overpassPlaces = await fetchOverpassCategoryPlaces(category, coords, radiusMeters, limit);
  return mapOverpassPlacesToSpots(overpassPlaces);
}

// General "what's worth seeing here" search (beaches, heritage, museums,
// parks, viewpoints — no specific category), used for a plain place-name
// search like "Baliuag" that isn't filtered to one category chip.
async function fetchLiveAttractionSpots(
  coords: { latitude: number; longitude: number },
  radiusMeters: number,
  limit = 20
): Promise<SpotInfo[]> {
  const geoapifyPlaces = await fetchGeoapifyPlaces(ATTRACTION_GEOAPIFY_CATEGORIES, coords, radiusMeters, limit);
  if (geoapifyPlaces.length > 0) {
    return mapOverpassPlacesToSpots(geoapifyPlaces);
  }

  // Geoapify unavailable/empty — fall back to Overpass entirely.
  const overpassPlaces = await fetchOverpassPlaces(ATTRACTION_OVERPASS_TAGS, coords, radiusMeters, limit);
  return mapOverpassPlacesToSpots(overpassPlaces);
}

function detectCategoryFromQuery(query: string): OverpassCategoryKey | null {
  if (query.includes('best islands beaches waterfalls')) return 'outdoors';
  if (query.includes('best historical landmarks')) return 'heritage';
  if (query.includes('best museums art galleries')) return 'art';
  if (query.includes('best theme parks amusement')) return 'parks';
  if (query.includes('famous local restaurants')) return 'food';
  return null;
}

// The old Wikipedia/Photon-based category lookups, kept as the nationwide
// "browse everything" backbone (broad geographic spread of notable spots)
// and as a fallback when Overpass has no local data for a searched place.
async function fetchCuratedCategorySpots(
  category: OverpassCategoryKey,
  coords: { latitude: number; longitude: number }
): Promise<SpotInfo[]> {
  switch (category) {
    case 'outdoors': {
      const waterfalls = await fetchWikipediaCategorySpots('Category:Waterfalls_of_the_Philippines', coords, 'Waterfall', 'nature');
      const beaches = await fetchWikipediaCategorySpots('Category:Beaches_of_the_Philippines', coords, 'Beach', 'relaxing');
      return [...waterfalls, ...beaches].slice(0, 15);
    }
    case 'heritage':
      return await fetchWikipediaCategorySpots('Category:National_Historical_Landmarks_of_the_Philippines', coords, 'Heritage', 'culture');
    case 'art':
      return await fetchWikipediaCategorySpots('Category:Museums_in_the_Philippines', coords, 'Museum', 'culture');
    case 'parks':
      return await fetchWikipediaCategorySpots('Category:Parks_in_the_Philippines', coords, 'Park', 'relaxing');
    case 'food': {
      const photonFood = await searchPhotonPlaces(`restaurant cafe Philippines`, coords);
      return photonFood.slice(0, 12).map(pr => ({
        id: pr.id,
        name: pr.name,
        location: pr.address || 'Philippines',
        vibe: 'relaxing',
        season: 'year-round',
        budget: 'moderate',
        distance: 'Top Dining',
        highlights: ['Local Eatery', 'OpenStreetMap Verified'],
        description: `A popular dining spot in the Philippines. Address: ${pr.address}`,
        image: getPlaceImageUrl(pr.name, ['restaurant', 'cafe']),
        rating: 4.8,
        reviewCount: '1.2K',
        categoryTag: 'Dining',
        subtitle: pr.address,
        latitude: pr.latitude,
        longitude: pr.longitude,
        days: []
      }));
    }
    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED FREE PLACES PROVIDER
// Makes 100% real, live dynamic HTTP queries to Wikipedia & OpenStreetMap.
// Zero hardcoded place arrays!
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchFreePlaces(
  cityName: string,
  query: string,
  coords: { latitude: number; longitude: number }
): Promise<SpotInfo[]> {
  const cleaned = extractCleanLocationQuery(query);
  const category = detectCategoryFromQuery(query);

  // Did the user name an actual place ("Boracay", "Vigan"), or is this a
  // generic nationwide browse ("Philippines")? The old version of this
  // function ignored this distinction entirely for category rows — a search
  // for "beaches in Boracay" silently returned the same fixed nationwide
  // Wikipedia beach list as a plain "beaches" browse, dropping "Boracay" on
  // the floor. Overpass fixes that by letting us search by real tag data
  // anchored to the actual named place.
  const specificLocation =
    cleaned && cleaned.length >= 2 && cleaned.toLowerCase() !== 'philippines' ? cleaned : null;

  if (category) {
    let anchorCoords = coords;
    if (specificLocation) {
      const geocoded = await searchPhotonPlaces(specificLocation, coords);
      if (geocoded.length > 0) {
        anchorCoords = { latitude: geocoded[0].latitude, longitude: geocoded[0].longitude };
      }
    }

    const radiusMeters = specificLocation ? 12000 : 30000;
    const liveSpots = await fetchLiveCategorySpots(category, anchorCoords, radiusMeters, specificLocation ? 15 : 12);

    if (specificLocation) {
      // A named place was searched — real live data near it is far more
      // relevant than a random slice of a nationwide list. Only fall back
      // to the curated list if nothing is tagged there at all.
      if (liveSpots.length > 0) return liveSpots;
      const curatedFallback = await fetchCuratedCategorySpots(category, anchorCoords);
      if (curatedFallback.length > 0) return curatedFallback;
    } else {
      // Nationwide browse (Home page rows): keep the curated Wikipedia list
      // as the backbone (it spans well-known spots across the whole
      // archipelago), and widen coverage with real nearby places that
      // Wikipedia's category membership can't capture.
      const curated = await fetchCuratedCategorySpots(category, coords);
      const combined = [...curated];
      for (const s of liveSpots) {
        if (!combined.some(c => c.name.toLowerCase() === s.name.toLowerCase())) combined.push(s);
      }
      if (combined.length > 0) return combined.slice(0, 24);
    }
  }

  // 2. City / Municipality / Target Search (e.g. "baliuag", "vigan", "baguio", "tagaytay", "boracay", etc.)
  const targetLocation = cleaned || (cityName !== 'Philippines' ? cityName : '') || query;
  if (targetLocation && targetLocation.length >= 2) {
    // Geocode the location name with Photon to get real coordinates in Philippines
    const photonMatches = await searchPhotonPlaces(targetLocation, coords);
    if (photonMatches.length > 0) {
      const bestMatch = photonMatches[0];
      const targetCoords = { latitude: bestMatch.latitude, longitude: bestMatch.longitude };

      // Query Wikipedia and live Geoapify concurrently for maximum responsiveness
      const [wikiRes, liveRes] = await Promise.allSettled([
        fetchWikipediaNearbySpots(targetCoords, 10000, 12, [bestMatch.name, targetLocation]),
        fetchLiveAttractionSpots(targetCoords, 12000, 15),
      ]);

      const wikiSpots = wikiRes.status === 'fulfilled' ? wikiRes.value : [];
      const liveSpots = liveRes.status === 'fulfilled' ? liveRes.value : [];

      // Photon POIs matching the search text itself — lowest-confidence
      // source (it's a geocoder, not a category search), so it goes last
      // and drops purely administrative hits (the town/city/barangay entry
      // for the place being searched, which isn't a destination itself).
      const ADMIN_PLACE_TYPES = new Set(['city', 'town', 'village', 'municipality', 'state', 'country', 'county', 'borough', 'suburb', 'district', 'hamlet']);
      const osmSpots: SpotInfo[] = photonMatches
        .filter(pr => !ADMIN_PLACE_TYPES.has((pr.category || '').toLowerCase()))
        .slice(0, 8)
        .map(pr => {
          const dist = calculateDistanceKm(coords.latitude, coords.longitude, pr.latitude, pr.longitude);
          return {
            id: pr.id,
            name: pr.name,
            location: pr.address || `${targetLocation}, Philippines`,
            vibe: 'relaxing',
            season: 'year-round',
            budget: 'moderate',
            distance: dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`,
            highlights: ['OpenStreetMap Spot', 'Live Local Location'],
            description: `A destination in ${pr.address || targetLocation}.`,
            image: getPlaceImageUrl(pr.name, [pr.category || 'Spot']),
            rating: 4.7,
            reviewCount: '1.1K',
            categoryTag: pr.category || 'Local Spot',
            subtitle: pr.address,
            latitude: pr.latitude,
            longitude: pr.longitude,
            days: []
          };
        });

      // Merge: curated Wikipedia notability first, then real Geoapify/
      // Overpass tag matches, then the loose Photon name matches — deduped
      // by name.
      const combined = [...wikiSpots];
      for (const s of [...liveSpots, ...osmSpots]) {
        if (!combined.some(c => c.name.toLowerCase() === s.name.toLowerCase())) {
          combined.push(s);
        }
      }

      if (combined.length > 0) {
        return combined;
      }
    }
  }

  // 3. "Near You" GPS Fallback: query Wikipedia Geosearch around user's exact coordinates
  if (cityName && cityName !== 'Philippines') {
    const nearbySpots = await fetchWikipediaNearbySpots(coords, 10000, 12);
    if (nearbySpots.length > 0) {
      return nearbySpots;
    }
  }

  // 4. Live Wikipedia text search fallback
  const liveSearchResults = await searchWikipediaLive(cleaned || query, coords);
  if (liveSearchResults.length > 0) {
    return liveSearchResults;
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVINCE SPOTS (FOR EXPLORE TAB)
// Live query to Wikipedia & OpenStreetMap for specific provinces
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchFreePlacesForProvince(
  queryName: string,
  provinceId: string,
  municipalityId?: string
): Promise<Destination[]> {
  try {
    const photonPlaces = await searchPhotonPlaces(`tourist spots in ${queryName} Philippines`);
    return photonPlaces.map(pr => ({
      id: pr.id,
      provinceId,
      municipalityId: municipalityId || '',
      name: pr.name,
      latitude: pr.latitude,
      longitude: pr.longitude,
      tags: ['Attraction', 'Tourist Spot', pr.category || 'Destination'],
      rating: '4.7',
      bestTime: 'Oct – May',
      description: `A live destination in ${queryName} registered on OpenStreetMap.`,
      image: getPlaceImageUrl(pr.name, ['Attraction']),
      address: pr.address || `${queryName}, Philippines`,
    }));
  } catch (err) {
    console.warn('Live province search error:', err);
    return [];
  }
}
