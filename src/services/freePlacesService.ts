import { SpotInfo } from './homeSpots';
import { Destination, getPlaceImageUrl } from './destinations';

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

export async function fetchWikipediaNearbySpots(
  coords: { latitude: number; longitude: number },
  radiusMeters = 10000,
  limit = 10
): Promise<SpotInfo[]> {
  try {
    const safeRadius = Math.min(Math.max(radiusMeters, 10), 10000);
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${coords.latitude}|${coords.longitude}&ggsradius=${safeRadius}&ggslimit=${limit}&prop=pageimages|extracts|coordinates&piprop=thumbnail&pithumbsize=600&exintro=1&explaintext=1&exchars=220&format=json`;
    const res = await fetch(url, { headers: WIKI_HEADERS });
    if (!res.ok) return [];

    const json = await res.json();
    const pages = json?.query?.pages;
    if (!pages) return [];

    const spots: SpotInfo[] = [];
    for (const key of Object.keys(pages)) {
      const p = pages[key];
      if (!p || !p.title) continue;

      const titleLower = p.title.toLowerCase();
      // Skip non-tourist administrative articles
      if (titleLower.includes('election') || titleLower.includes('district') || titleLower.includes('legislative')) {
        continue;
      }

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
        days: [{ title: 'Visit Details', activities: ['Explore the landmark', 'Read cultural history'] }]
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

      // Skip list pages
      if (p.title.startsWith('List of') || p.title.startsWith('Category:')) continue;

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
        subtitle: `${categoryTag} • Philippines`,
        latitude: pLat,
        longitude: pLon,
        days: [{ title: 'Sightseeing', activities: [`Tour ${p.title}`, 'Take photos', 'Enjoy local scenery'] }]
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
        days: [{ title: 'Visit', activities: [`Explore ${p.title}`, 'Local attractions'] }]
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
// UNIFIED FREE PLACES PROVIDER
// Makes 100% real, live dynamic HTTP queries to Wikipedia & OpenStreetMap.
// Zero hardcoded place arrays!
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchFreePlaces(
  cityName: string,
  query: string,
  coords: { latitude: number; longitude: number }
): Promise<SpotInfo[]> {
  const qLower = query.toLowerCase();
  const cleaned = extractCleanLocationQuery(query);

  // 1. National Category Feeds (from Home Page rows)
  if (query.includes('best islands beaches waterfalls') || (qLower.includes('nature') && cityName === 'Philippines')) {
    const waterfalls = await fetchWikipediaCategorySpots('Category:Waterfalls_of_the_Philippines', coords, 'Waterfall', 'nature');
    const beaches = await fetchWikipediaCategorySpots('Category:Beaches_of_the_Philippines', coords, 'Beach', 'relaxing');
    return [...waterfalls, ...beaches].slice(0, 15);
  }

  if (query.includes('best historical landmarks') || (qLower.includes('heritage') && cityName === 'Philippines')) {
    return await fetchWikipediaCategorySpots('Category:National_Historical_Landmarks_of_the_Philippines', coords, 'Heritage', 'culture');
  }

  if (query.includes('best museums art galleries') || (qLower.includes('museum') && cityName === 'Philippines')) {
    return await fetchWikipediaCategorySpots('Category:Museums_in_the_Philippines', coords, 'Museum', 'culture');
  }

  if (query.includes('best theme parks amusement') || (qLower.includes('park') && cityName === 'Philippines')) {
    return await fetchWikipediaCategorySpots('Category:Parks_in_the_Philippines', coords, 'Park', 'relaxing');
  }

  if (query.includes('famous local restaurants') || (qLower.includes('restaurant') && cityName === 'Philippines')) {
    const photonFood = await searchPhotonPlaces(`restaurant cafe Philippines`, coords);
    if (photonFood.length > 0) {
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
        days: [{ title: 'Dining Experience', activities: ['Enjoy local food specialties', 'Try house bestsellers'] }]
      }));
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

      // Query live Wikipedia Geosearch around this exact location's coordinates!
      const wikiSpots = await fetchWikipediaNearbySpots(targetCoords, 10000, 12);

      // Also map the OpenStreetMap POIs found in that location
      const osmSpots: SpotInfo[] = photonMatches.slice(0, 8).map(pr => {
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
          days: [{ title: 'Visit Details', activities: ['Sightseeing', 'Explore surroundings'] }]
        };
      });

      // Merge Wikipedia attractions + OpenStreetMap places
      const combined = [...wikiSpots];
      for (const pr of osmSpots) {
        if (!combined.some(c => c.name.toLowerCase() === pr.name.toLowerCase())) {
          combined.push(pr);
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
