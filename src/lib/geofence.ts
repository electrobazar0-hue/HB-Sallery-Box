/**
 * Geofence validation utilities.
 * High-accuracy geodesic distance and boundary checking.
 */

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface GeofenceConfig {
  lat: number;
  lng: number;
  radius: number;
}

export const SHOP_COVERAGE_ERROR = 'You are not coverage in the shop area.';

/**
 * Calculates high-precision distance in meters between two coordinates using the Haversine formula.
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const earthRadiusMeters = 6371e3;
  const lat1 = (coord1.lat * Math.PI) / 180;
  const lat2 = (coord2.lat * Math.PI) / 180;
  const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  return earthRadiusMeters * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Checks if current location is within geofence radius (with optional GPS accuracy buffer).
 */
export function isWithinGeofence(
  currentLocation: Coordinates,
  geofence: GeofenceConfig,
): boolean {
  const distance = calculateDistance(currentLocation, {
    lat: geofence.lat,
    lng: geofence.lng,
  });

  // Adaptive accuracy tolerance: allow up to 25m buffer for indoor GPS noise
  const accuracyBuffer = Math.min(currentLocation.accuracy || 0, 25);
  const effectiveRadius = geofence.radius + accuracyBuffer;

  return distance <= effectiveRadius;
}

/**
 * Returns null if location is valid within geofence, or returns a descriptive error message.
 */
export function getGeofenceViolationMessage(
  currentLocation: Coordinates,
  geofence: GeofenceConfig,
  action: 'punch in' | 'punch out' = 'punch in',
): string | null {
  const distance = calculateDistance(currentLocation, {
    lat: geofence.lat,
    lng: geofence.lng,
  });

  const accuracyBuffer = Math.min(currentLocation.accuracy || 0, 25);
  const effectiveRadius = geofence.radius + accuracyBuffer;

  if (distance <= effectiveRadius) {
    return null;
  }

  return `You are not inside the shop area for ${action}. (Distance: ${Math.round(distance)}m, Allowed: ${geofence.radius}m)`;
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
