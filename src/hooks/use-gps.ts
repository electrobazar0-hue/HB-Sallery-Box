'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

interface UseGPSOptions {
  enableBackgroundTracking?: boolean;
  onSuccess?: (coords: GPSCoordinates) => void;
  onError?: (error: GeolocationPositionError) => void;
  highAccuracyThreshold?: number; // Maximum acceptable accuracy in meters (default: 50m)
}

// Initial state computed synchronously
function getInitialPermissionStatus(): 'granted' | 'denied' | 'prompt' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  if (!('permissions' in navigator)) return 'unknown';
  return 'prompt'; // Default until we can check
}

export function useGPS(options: UseGPSOptions = {}) {
  const [coordinates, setCoordinates] = useState<GPSCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>(getInitialPermissionStatus);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Get current position with improved accuracy
  const getCurrentPosition = useCallback(async (): Promise<GPSCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      const accuracyThreshold = options.highAccuracyThreshold || 50; // Default 50 meters
      let attempts = 0;
      const maxAttempts = 3;

      const tryGetPosition = () => {
        attempts++;

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: GPSCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              altitude: position.coords.altitude || null,
              altitudeAccuracy: position.coords.altitudeAccuracy || null,
              heading: position.coords.heading || null,
              speed: position.coords.speed || null,
            };
            
            // Check if accuracy is acceptable
            if (coords.accuracy <= accuracyThreshold) {
              if (mountedRef.current) {
                setCoordinates(coords);
                setError(null);
              }
              options.onSuccess?.(coords);
              resolve(coords);
            } else if (attempts < maxAttempts) {
              // Try again for better accuracy
              console.log(`Position accuracy ${coords.accuracy.toFixed(2)}m exceeds threshold ${accuracyThreshold}m. Retrying (${attempts}/${maxAttempts})...`);
              setTimeout(tryGetPosition, 1000);
            } else {
              // Accept the best we got after max attempts
              console.warn(`Using position with accuracy ${coords.accuracy.toFixed(2)}m (threshold: ${accuracyThreshold}m)`);
              if (mountedRef.current) {
                setCoordinates(coords);
                setError(null);
              }
              options.onSuccess?.(coords);
              resolve(coords);
            }
          },
          (err) => {
            if (mountedRef.current) {
              setError(err.message);
            }
            options.onError?.(err);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: 30000, // Increased timeout for better accuracy
            maximumAge: 0, // Force fresh position
          }
        );
      };

      tryGetPosition();
    });
  }, [options]);

  // Start continuous tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords: GPSCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        if (mountedRef.current) {
          setCoordinates(coords);
          setError(null);
        }
        options.onSuccess?.(coords);
      },
      (err) => {
        if (mountedRef.current) {
          setError(err.message);
        }
        options.onError?.(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000, // Reduced to get more recent positions
      }
    );
  }, [options]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    try {
      await getCurrentPosition();
      if (mountedRef.current) {
        setPermissionStatus('granted');
      }
      return true;
    } catch {
      if (mountedRef.current) {
        setPermissionStatus('denied');
      }
      return false;
    }
  }, [getCurrentPosition]);

  // Check permission asynchronously
  useEffect(() => {
    mountedRef.current = true;
    
    const checkPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          if (mountedRef.current) {
            setPermissionStatus(result.state);
          }
          
          result.addEventListener('change', () => {
            if (mountedRef.current) {
              setPermissionStatus(result.state);
            }
          });
        } catch {
          // Keep default status
        }
      }
    };
    
    checkPermission();
    
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
