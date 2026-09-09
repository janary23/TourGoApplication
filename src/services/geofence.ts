// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE MATH
// Small, dependency-free helpers for the trip "safe zone" feature: distance
// in meters, a rough (but fine for a safety-radius UI, not survey-grade)
// circle-as-polygon generator for drawing the zone on the map, and the
// itinerary centroid the zone is centered on.
// ─────────────────────────────────────────────────────────────────────────────

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6371000;

/** Great-circle distance between two points, in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return EARTH_RADIUS_M * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function isOutsideGeofence(center: LatLng, point: LatLng, radiusMeters: number): boolean {
  return distanceMeters(center, point) > radiusMeters;
}

/**
 * Approximates a circle of the given radius around `center` as a closed
 * GeoJSON [lng, lat][] ring, for rendering as a Polygon on the map. Uses the
 * standard equirectangular approximation (meters-per-degree-longitude
 * scaled by cos(latitude)) — accurate to well under 1% at the scale of a
 * walking-distance safety zone, which is all this needs.
 */
export function circleRingCoordinates(
  center: LatLng,
  radiusMeters: number,
  points = 64
): [number, number][] {
  const latRad = (center.latitude * Math.PI) / 180;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(latRad);

  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat = ((radiusMeters * Math.sin(angle)) / metersPerDegreeLat);
    const dLng = metersPerDegreeLng !== 0 ? (radiusMeters * Math.cos(angle)) / metersPerDegreeLng : 0;
    ring.push([center.longitude + dLng, center.latitude + dLat]);
  }
  return ring;
}

/** Centroid of a list of coordinates, or null if the list is empty. */
export function centroid(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
  return { latitude: lat, longitude: lng };
}

/** Formats meters as a short human label, e.g. 500m or 1.2km. */
export function formatRadius(radiusMeters: number): string {
  if (radiusMeters >= 1000) return `${(radiusMeters / 1000).toFixed(radiusMeters % 1000 === 0 ? 0 : 1)}km`;
  return `${radiusMeters}m`;
}
