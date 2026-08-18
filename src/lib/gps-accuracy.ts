/**
 * High-Precision GPS and Geolocation Utilities
 * Ensures maximum accuracy for attendance punch-in/out and geofence tracking.
 */

export interface HighAccuracyGPSResult {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters (lower is more accurate)
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
  isHighAccuracy: boolean;
}

export interface AccuratePositionOptions {
  desiredAccuracy?: number; // Target accuracy in meters (default: 20m)
  maxWaitMs?: number; // Maximum time to wait for desired accuracy (default: 6000ms)
  timeout?: number; // Geolocation API hardware timeout (default: 12000ms)
}

/**
 * Acquires high-precision GPS coordinates using multi-sample watchPosition.
 * Instead of grabbing the first rough cell tower fix, it watches GPS satellite fixes
 * until a fix with accuracy <= desiredAccuracy (e.g. <= 20m) is achieved, or returns
 * the best (lowest error radius) fix obtained within maxWaitMs.
 */
export async function getAccurateGPSPosition(
  options: AccuratePositionOptions = {}
): Promise<HighAccuracyGPSResult> {
  const {
    desiredAccuracy = 20, // 20 meters target
    maxWaitMs = 6000, // wait up to 6 seconds for satellite lock
    timeout = 12000,
  } = options;

  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser or device.');
  }

  return new Promise((resolve, reject) => {
    let bestFix: HighAccuracyGPSResult | null = null;
    let watchId: number | null = null;
    let isSettled = false;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const finishSuccess = (result: HighAccuracyGPSResult) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(result);
    };

    const finishError = (err: Error) => {
      if (isSettled) return;
      if (bestFix) {
        // If we got at least one fix before the error, use the best one
        isSettled = true;
        cleanup();
        resolve(bestFix);
        return;
      }
      isSettled = true;
      cleanup();
      reject(err);
    };

    // Set max wait timeout
    timer = setTimeout(() => {
      if (bestFix) {
        finishSuccess(bestFix);
      } else {
        // Attempt single fallback call if watch hasn't fired
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            finishSuccess({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude || null,
              altitudeAccuracy: pos.coords.altitudeAccuracy || null,
              heading: pos.coords.heading || null,
              speed: pos.coords.speed || null,
              timestamp: pos.timestamp,
              isHighAccuracy: pos.coords.accuracy <= 50,
            });
          },
          (err) => {
            finishError(new Error(getGeolocationErrorMessage(err)));
          },
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
        );
      }
    }, maxWaitMs);

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const currentFix: HighAccuracyGPSResult = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude || null,
            altitudeAccuracy: pos.coords.altitudeAccuracy || null,
            heading: pos.coords.heading || null,
            speed: pos.coords.speed || null,
            timestamp: pos.timestamp,
            isHighAccuracy: pos.coords.accuracy <= desiredAccuracy,
          };

          // Update best fix if this one has lower accuracy radius (more precise)
          if (!bestFix || currentFix.accuracy < bestFix.accuracy) {
            bestFix = currentFix;
          }

          // If we reached our desired accuracy threshold (e.g. <= 20 meters), resolve immediately!
          if (currentFix.accuracy <= desiredAccuracy) {
            finishSuccess(currentFix);
          }
        },
        (err) => {
          // If we haven't acquired any fix yet, report error
          if (!bestFix) {
            finishError(new Error(getGeolocationErrorMessage(err)));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: timeout,
          maximumAge: 0, // Force fresh satellite/GPS measurement, no stale cache
        }
      );
    } catch (e) {
      finishError(e instanceof Error ? e : new Error('Failed to start GPS tracking.'));
    }
  });
}

/**
 * Human-friendly error messages for Geolocation errors
 */
export function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'GPS permission denied. Please allow Location access in browser settings.';
    case error.POSITION_UNAVAILABLE:
      return 'GPS signal unavailable. Please ensure Location/GPS is turned ON on your phone/device.';
    case error.TIMEOUT:
      return 'Location request timed out. Please check your GPS signal and try again.';
    default:
      return error.message || 'Unable to retrieve accurate location.';
  }
}

/**
 * Formats coordinates to 6 decimal places (approx. 0.1 meter precision)
 */
export function formatAccurateCoords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
