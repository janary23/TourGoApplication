// src/services/travelEstimate.ts
// Shared distance + travel-time estimation used by the itinerary warning engine.
//
// Before this module the itinerary validator only knew a handful of hardcoded
// Cebu routes and returned a flat 30 minutes for everything else, which meant
// the "tight travel buffer" and "distant locations" checks silently never fired
// outside Cebu. Those known routes are preserved verbatim as overrides below;
// every other pair now resolves against the app's existing geo catalogs and
// falls back to the old 30-minute default only when a place can't be placed.

import { DESTINATIONS, MUNICIPALITIES, PROVINCE_GEO } from './destinations';
import { PHILIPPINES_PROVINCES } from './philippinesMapData';

export interface Coords {
  latitude: number;
  longitude: number;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// ── Gazetteer ────────────────────────────────────────────────────────────────

// Common hubs travellers plan around that aren't in the offline destination
// catalog yet (the catalog is island/landmark oriented). Kept small and additive
// — the catalogs above are still the primary source.
const EXTRA_PLACES: Record<string, Coords> = {
  manila: { latitude: 14.5995, longitude: 120.9842 },
  'metro manila': { latitude: 14.5995, longitude: 120.9842 },
  makati: { latitude: 14.5547, longitude: 121.0244 },
  'quezon city': { latitude: 14.676, longitude: 121.0437 },
  taguig: { latitude: 14.5176, longitude: 121.0509 },
  pasay: { latitude: 14.5378, longitude: 120.9896 },
  baguio: { latitude: 16.4023, longitude: 120.596 },
  'baguio city': { latitude: 16.4023, longitude: 120.596 },
  sagada: { latitude: 17.0844, longitude: 120.9008 },
  vigan: { latitude: 17.5747, longitude: 120.3869 },
  tagaytay: { latitude: 14.1153, longitude: 120.9621 },
  batangas: { latitude: 13.7565, longitude: 121.0583 },
  nasugbu: { latitude: 14.0722, longitude: 120.632 },
  'la union': { latitude: 16.6159, longitude: 120.3209 },
  'san juan': { latitude: 16.6742, longitude: 120.3319 },
  subic: { latitude: 14.8794, longitude: 120.2325 },
  clark: { latitude: 15.1859, longitude: 120.5601 },
  pampanga: { latitude: 15.0794, longitude: 120.62 },
  'cebu city': { latitude: 10.3157, longitude: 123.8854 },
  cebu: { latitude: 10.3157, longitude: 123.8854 },
  mactan: { latitude: 10.3103, longitude: 123.9494 },
  'lapu-lapu': { latitude: 10.3103, longitude: 123.9494 },
  badian: { latitude: 9.8697, longitude: 123.3969 },
  'kawasan falls': { latitude: 9.8149, longitude: 123.3872 },
  bohol: { latitude: 9.85, longitude: 124.2 },
  panglao: { latitude: 9.5786, longitude: 123.7508 },
  dumaguete: { latitude: 9.3103, longitude: 123.3081 },
  siquijor: { latitude: 9.2142, longitude: 123.5153 },
  bacolod: { latitude: 10.6767, longitude: 122.9503 },
  iloilo: { latitude: 10.7202, longitude: 122.5621 },
  boracay: { latitude: 11.9674, longitude: 121.9248 },
  tacloban: { latitude: 11.2444, longitude: 125.0048 },
  siargao: { latitude: 9.8482, longitude: 126.0458 },
  'general luna': { latitude: 9.7833, longitude: 126.1567 },
  'cagayan de oro': { latitude: 8.4542, longitude: 124.6319 },
  camiguin: { latitude: 9.1732, longitude: 124.7295 },
  davao: { latitude: 7.1907, longitude: 125.4553 },
  'davao city': { latitude: 7.1907, longitude: 125.4553 },
  zamboanga: { latitude: 6.9214, longitude: 122.079 },
  'puerto princesa': { latitude: 9.7392, longitude: 118.7353 },
  'el nido': { latitude: 11.1949, longitude: 119.4013 },
  coron: { latitude: 12.0053, longitude: 120.2042 },
  'port barton': { latitude: 10.4456, longitude: 119.2247 },
  batanes: { latitude: 20.4487, longitude: 121.9702 },
  basco: { latitude: 20.4487, longitude: 121.9702 },
  banaue: { latitude: 16.9105, longitude: 121.0623 },
  sorsogon: { latitude: 12.9733, longitude: 124.0064 },
  legazpi: { latitude: 13.1391, longitude: 123.7438 },
  donsol: { latitude: 12.9086, longitude: 123.5975 },
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let placeIndex: Array<{ key: string; coords: Coords }> | null = null;

/** Build the name -> coords index once, longest names first so that
 *  "cebu city" wins over "cebu" during substring matching. */
function getPlaceIndex(): Array<{ key: string; coords: Coords }> {
  if (placeIndex) return placeIndex;

  const map = new Map<string, Coords>();

  const add = (name: string | undefined, coords: Coords) => {
    if (!name) return;
    const key = normalize(name);
    if (!key || key.length < 3) return;
    if (!map.has(key)) map.set(key, coords);
  };

  // Provinces (name comes from the map data, coords from the geo table)
  for (const p of PHILIPPINES_PROVINCES) {
    const geo = PROVINCE_GEO[p.id];
    if (geo) add(p.name, { latitude: geo.latitude, longitude: geo.longitude });
  }

  // Municipalities — also index the name with a trailing "City" removed and
  // any parenthetical stripped, e.g. "Boracay (Malay)" -> "boracay".
  for (const list of Object.values(MUNICIPALITIES)) {
    for (const m of list) {
      const coords = { latitude: m.latitude, longitude: m.longitude };
      add(m.name, coords);
      add(m.name.replace(/\(.*?\)/g, ''), coords);
      add(m.name.replace(/\bcity\b/i, ''), coords);
    }
  }

  // Named destinations (most specific, added last but they win by length)
  for (const d of DESTINATIONS) {
    add(d.name, { latitude: d.latitude, longitude: d.longitude });
  }

  for (const [key, coords] of Object.entries(EXTRA_PLACES)) add(key, coords);

  placeIndex = Array.from(map.entries())
    .map(([key, coords]) => ({ key, coords }))
    .sort((a, b) => b.key.length - a.key.length);

  return placeIndex;
}

/**
 * Resolve a free-text place string ("Kawasan Falls, Badian, Cebu") to coords.
 * Tries the whole string first, then each comma-separated part, then the
 * longest indexed name contained anywhere in the string. Returns null when the
 * place isn't recognisable — callers should degrade gracefully.
 */
export function resolvePlaceCoords(text: string): Coords | null {
  if (!text) return null;
  const index = getPlaceIndex();
  const full = normalize(text);
  if (!full) return null;

  const exact = index.find((e) => e.key === full);
  if (exact) return exact.coords;

  for (const part of text.split(',')) {
    const key = normalize(part);
    if (!key) continue;
    const hit = index.find((e) => e.key === key);
    if (hit) return hit.coords;
  }

  const contained = index.find(
    (e) => full.includes(` ${e.key} `) || full.startsWith(`${e.key} `) || full.endsWith(` ${e.key}`)
  );
  return contained ? contained.coords : null;
}

// ── Travel time ──────────────────────────────────────────────────────────────

/** Known routes kept from the original inline estimator so existing Cebu trips
 *  keep producing exactly the same warnings they did before. */
const ROUTE_OVERRIDES: Array<{ a: (s: string) => boolean; b: (s: string) => boolean; minutes: number }> = (() => {
  const isCebu = (s: string) =>
    s.includes('cebu') ||
    s.includes('mactan') ||
    s.includes('airport') ||
    s.includes('ocean park') ||
    s.includes('temple of leah') ||
    s.includes('tops');
  const isMoalboal = (s: string) => s.includes('moalboal') || s.includes('sardine') || s.includes('panagsama');
  const isOslob = (s: string) => s.includes('oslob') || s.includes('whale') || s.includes('sumilon');
  const isKawasan = (s: string) => s.includes('kawasan') || s.includes('badian') || s.includes('falls');

  return [
    { a: isCebu, b: isMoalboal, minutes: 150 },
    { a: isCebu, b: isOslob, minutes: 180 },
    { a: isCebu, b: isKawasan, minutes: 150 },
    { a: isMoalboal, b: isKawasan, minutes: 45 },
    { a: isMoalboal, b: isOslob, minutes: 90 },
  ];
})();

/**
 * Convert a straight-line distance into a road-travel estimate.
 * Calibrated against the hardcoded Cebu routes the app already shipped with
 * (~30 km/h effective for inter-town legs, slower for short urban hops).
 */
export function minutesForKm(km: number): number {
  if (km <= 0.5) return 10;
  if (km <= 5) return Math.round(5 + km * 3); // ~20 km/h in town
  return Math.round(10 + km * 2); // ~30 km/h + overhead
}

/** Default used when neither place can be located — the app's previous behaviour. */
export const UNKNOWN_TRAVEL_MINUTES = 30;

/**
 * Estimate travel time in minutes between two free-text places.
 * Order of precedence: identical place -> known route override -> coordinate
 * based estimate -> the legacy 30-minute default.
 */
export function estimateTravelMinutes(locA: string, locB: string): number {
  if (!locA || !locB) return UNKNOWN_TRAVEL_MINUTES;

  const cleanA = locA.trim().toLowerCase();
  const cleanB = locB.trim().toLowerCase();
  if (cleanA === cleanB) return 10;

  for (const route of ROUTE_OVERRIDES) {
    if ((route.a(cleanA) && route.b(cleanB)) || (route.a(cleanB) && route.b(cleanA))) {
      return route.minutes;
    }
  }

  const from = resolvePlaceCoords(locA);
  const to = resolvePlaceCoords(locB);
  if (from && to) return minutesForKm(haversineKm(from, to));

  return UNKNOWN_TRAVEL_MINUTES;
}

/** Straight-line km between two free-text places, or null if unresolvable. */
export function estimateDistanceKm(locA: string, locB: string): number | null {
  const from = resolvePlaceCoords(locA);
  const to = resolvePlaceCoords(locB);
  if (!from || !to) return null;
  return haversineKm(from, to);
}
