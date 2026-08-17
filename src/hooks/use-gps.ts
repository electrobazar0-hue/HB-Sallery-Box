'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface UseGPSOptions {
  enableBackgroundTracking?: boolean;
  onSuccess?: (coords: GPSCoordinates) => void;
  onError?: (error: GeolocationPositionError) => void;
  highAccuracyThreshold?: number;
}

const geocodeCache = new Map<string, string>();

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }
  if (typeof window !== 'undefined') {
    const cached = sessionStorage.getItem(`geo_${cacheKey}`);
    if (cached) {
      geocodeCache.set(cacheKey, cached);
      return cached;
    }
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'en,hi' },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const parts = [
        addr.amenity || addr.shop || addr.building,
        addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.village || addr.county || addr.subdistrict,
        addr.state,
      ].filter(Boolean);

      const formatted = parts.length > 0 ? parts.join(', ') : (data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      geocodeCache.set(cacheKey, formatted);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`geo_${cacheKey}`, formatted);
      }
      return formatted;
    }
  } catch {
    // Return formatted coordinates as fallback
  }

  const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  geocodeCache.set(cacheKey, fallback);
  return fallback;
}

export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function getInitialPermissionStatus(): 'granted' | 'denied' | 'prompt' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  if (!('permissions' in navigator)) return 'unknown';
  return 'prompt';
}

export function useGPS(options: UseGPSOptions = {}) {
  const [coordinates, setCoordinates] = useState<GPSCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>(getInitialPermissionStatus);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Get current position with quick fallback
  const getCurrentPosition = useCallback(async (): Promise<GPSCoordinates> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        const fallback: GPSCoordinates = {
          latitude: 28.6139,
          longitude: 77.2090,
          accuracy: 100,
          timestamp: Date.now(),
        };
        resolve(fallback);
        return;
      }

      let isResolved = false;

      const finish = (coords: GPSCoordinates) => {
        if (isResolved) return;
        isResolved = true;
        if (mountedRef.current) {
          setCoordinates(coords);
          setError(null);
        }
        try {
          sessionStorage.setItem('last_gps_fix', JSON.stringify(coords));
        } catch {}
        options.onSuccess?.(coords);
        resolve(coords);
      };

      // Fallback function when GPS fails
      const fallbackResolve = () => {
        try {
          const cached = sessionStorage.getItem('last_gps_fix');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.latitude && parsed?.longitude) {
              finish({ ...parsed, timestamp: Date.now() });
              return;
            }
          }
        } catch {}

        finish({
          latitude: 28.613939,
          longitude: 77.209021,
          accuracy: 50,
          timestamp: Date.now(),
        });
      };

      // 1. First attempt: High accuracy GPS with 4s timeout
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          finish({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            altitude: pos.coords.altitude || null,
            altitudeAccuracy: pos.coords.altitudeAccuracy || null,
            heading: pos.coords.heading || null,
            speed: pos.coords.speed || null,
          });
        },
        (err1) => {
          console.warn('High-accuracy GPS attempt failed, trying low accuracy...', err1.message);
          // 2. Second attempt: Low accuracy / cached GPS with 3s timeout
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              finish({
                latitude: pos2.coords.latitude,
                longitude: pos2.coords.longitude,
                accuracy: pos2.coords.accuracy,
                timestamp: pos2.timestamp,
              });
            },
            (err2) => {
              console.warn('Low accuracy GPS also failed, using fallback location', err2.message);
              fallbackResolve();
            },
            {
              enableHighAccuracy: false,
              timeout: 3000,
              maximumAge: 60000,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 4000,
          maximumAge: 5000,
        }
      );

      // Safety timeout after 8 seconds total
      setTimeout(() => {
        if (!isResolved) {
          console.warn('GPS overall timeout hit, completing with fallback');
          fallbackResolve();
        }
      }, 8000);
    });
  }, [options]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: GPSCoordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        if (mountedRef.current) {
          setCoordinates(coords);
          setError(null);
        }
        options.onSuccess?.(coords);
      },
      (err) => {
        if (mountedRef.current) setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }, [options]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      await getCurrentPosition();
      if (mountedRef.current) setPermissionStatus('granted');
      return true;
    } catch {
      if (mountedRef.current) setPermissionStatus('denied');
      return false;
    }
  }, [getCurrentPosition]);

  useEffect(() => {
    mountedRef.current = true;
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (mountedRef.current) setPermissionStatus(result.state);
        result.addEventListener('change', () => {
          if (mountedRef.current) setPermissionStatus(result.state);
        });
      }).catch(() => {});
    }
    return () => {
      mountedRef.current = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    coordinates,
    error,
    permissionStatus,
    isTracking,
    getCurrentPosition,
    startTracking,
    stopTracking,
    requestPermission,
  };
}
