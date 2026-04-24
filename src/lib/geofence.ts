/**
 * Geofence validation utilities
 * Calculates distance between two coordinates using Haversine formula
 */

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeofenceConfig {
  lat: number;
  lng: number;
  radius: number; // in meters
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a location is within the allowed geofence radius
 * @param currentLocation Current coordinates of the user
 * @param geofence Geofence configuration
 * @returns True if within geofence, false otherwise
 */
export function isWithinGeofence(
  currentLocation: Coordinates,
  geofence: GeofenceConfig
): boolean {
  const distance = calculateDistance(currentLocation, {
    lat: geofence.lat,
    lng: geofence.lng,
  });

  return distance <= geofence.radius;
}

/**
 * Get geofence violation message with distance info
 * @param currentLocation Current coordinates of the user
 * @param geofence Geofence configuration
 * @returns Error message if outside geofence, null if inside
 */
export function getGeofenceViolationMessage(
  currentLocation: Coordinates,
  geofence: GeofenceConfig
): string | null {
  const distance = calculateDistance(currentLocation, {
    lat: geofence.lat,
    lng: geofence.lng,
  });

  if (distance > geofence.radius) {
    const excessDistance = Math.round(distance - geofence.radius);
    return `You are ${excessDistance}m outside the allowed attendance area. Please move closer to your work location.`;
  }

  return null;
}

/**
 * Format coordinates for display
 * @param lat Latitude
 * @param lng Longitude
 * @returns Formatted string
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
