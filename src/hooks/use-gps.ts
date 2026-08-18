'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { getAccurateGPSPosition, getGeolocationErrorMessage } from '@/lib/gps-accuracy';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  isHighAccuracy?: boolean;
}

export interface UseGPSOptions {
  enableBackgroundTracking?: boolean;
  onSuccess?: (coords: GPSCoordinates) => void;
  onError?: (error: GeolocationPositionError) => void;
  highAccuracyThreshold?: number;
}

const geocodeCache = new Map<string, string>();

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
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
        signal: AbortSignal.timeout(3500),
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

      const formatted = parts.length > 0
        ? parts.join(', ')
        : (data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
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
  const latestFixRef = useRef<GPSCoordinates | null>(null);
  const mountedRef = useRef(true);

  // Update both state and ref for 0ms latency access
  const updateCoordinates = useCallback((coords: GPSCoordinates) => {
    latestFixRef.current = coords;
    if (mountedRef.current) {
      setCoordinates(coords);
      setError(null);
    }
    try {
      sessionStorage.setItem('last_gps_fix', JSON.stringify(coords));
    } catch {}
    options.onSuccess?.(coords);
  }, [options]);

  // High-accuracy multi-sample GPS acquisition
  const getCurrentPosition = useCallback(async (): Promise<GPSCoordinates> => {
    // If we already have a warm, accurate GPS fix from background watch (< 10 seconds old and accuracy <= 25m), use it immediately!
    if (
      latestFixRef.current &&
      Date.now() - latestFixRef.current.timestamp < 10000 &&
      latestFixRef.current.accuracy <= 25
    ) {
      return latestFixRef.current;
    }

    try {
      const accurateFix = await getAccurateGPSPosition({
        desiredAccuracy: 20, // Aim for <= 20 meters accuracy
        maxWaitMs: 6000, // Wait up to 6 seconds for satellite lock
        timeout: 12000,
      });

      const result: GPSCoordinates = {
        latitude: accurateFix.latitude,
        longitude: accurateFix.longitude,
        accuracy: accurateFix.accuracy,
        timestamp: accurateFix.timestamp,
        altitude: accurateFix.altitude,
        altitudeAccuracy: accurateFix.altitudeAccuracy,
        heading: accurateFix.heading,
        speed: accurateFix.speed,
        isHighAccuracy: accurateFix.isHighAccuracy,
      };

      updateCoordinates(result);
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to get accurate GPS location';
      if (mountedRef.current) setError(errMsg);

      // Check if we have any cached fix before failing
      if (latestFixRef.current) {
        return latestFixRef.current;
      }
      try {
        const cached = sessionStorage.getItem('last_gps_fix');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.latitude && parsed?.longitude) {
            return { ...parsed, timestamp: Date.now() };
          }
        }
      } catch {}

      throw err;
    }
  }, [updateCoordinates]);

  // Continuous background tracking for instant GPS warmth
  const startTracking = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    setIsTracking(true);
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: GPSCoordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            altitude: pos.coords.altitude || null,
            altitudeAccuracy: pos.coords.altitudeAccuracy || null,
            heading: pos.coords.heading || null,
            speed: pos.coords.speed || null,
            isHighAccuracy: pos.coords.accuracy <= 25,
          };
          updateCoordinates(coords);
        },
        (err) => {
          if (mountedRef.current) {
            setError(getGeolocationErrorMessage(err));
          }
          options.onError?.(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } catch (e) {
      console.warn('Could not start GPS watch tracking', e);
    }
  }, [options, updateCoordinates]);

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

  // Auto-start high accuracy tracking on mount so GPS hardware is warm
  useEffect(() => {
    mountedRef.current = true;
    startTracking();

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
  }, [startTracking]);

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
