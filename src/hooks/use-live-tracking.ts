'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchJSON } from '@/lib/utils';
import { getAccurateGPSPosition } from '@/lib/gps-accuracy';

interface UseLiveTrackingProps {
  employeeId?: string;
  organizationId?: string;
  isPunchedIn: boolean;
  attendanceId?: string;
}

export function useLiveTracking({
  employeeId,
  organizationId,
  isPunchedIn,
  attendanceId,
}: UseLiveTrackingProps) {
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number; accuracy: number; time: Date } | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStartedRef = useRef(false);

  // 1. Start Tracking Session when Punch In occurs
  const startSession = useCallback(async () => {
    if (!employeeId || isStartedRef.current) return;
    isStartedRef.current = true;

    try {
      // Get current location
      const pos = await getAccurateGPSPosition({ desiredAccuracy: 25, maxWaitMs: 4000, timeout: 8000 }).catch(() => null);

      const res = await fetchJSON<{ success?: boolean; sessionId?: string; error?: string }>('/api/location-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          employeeId,
          organizationId,
          attendanceId,
          latitude: pos?.latitude || null,
          longitude: pos?.longitude || null,
          accuracy: pos?.accuracy || null,
        }),
      });

      if (res?.success && res.sessionId) {
        sessionIdRef.current = res.sessionId;
        setIsTrackingActive(true);
        if (pos) {
          setLastLocation({ lat: pos.latitude, lng: pos.longitude, accuracy: pos.accuracy, time: new Date() });
        }
      }
    } catch (err) {
      console.warn('Could not start live tracking session:', err);
    }
  }, [employeeId, organizationId, attendanceId]);

  // 2. Stop Tracking Session immediately when Punch Out occurs
  const stopSession = useCallback(async () => {
    if (!isStartedRef.current && !sessionIdRef.current && !isTrackingActive) return;
    isStartedRef.current = false;
    setIsTrackingActive(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      await fetchJSON('/api/location-tracking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          sessionId: sessionIdRef.current,
        }),
      });
    } catch (err) {
      console.warn('Error ending live tracking session:', err);
    } finally {
      sessionIdRef.current = null;
    }
  }, [employeeId, isTrackingActive]);

  // 3. Periodic Background Breadcrumb Update (every 40 seconds)
  const sendLocationUpdate = useCallback(async () => {
    if (!employeeId || !isStartedRef.current) return;

    try {
      const pos = await getAccurateGPSPosition({ desiredAccuracy: 30, maxWaitMs: 3000, timeout: 6000 }).catch(() => null);
      if (!pos) return;

      await fetchJSON('/api/location-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          employeeId,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
        }),
      });

      setLastLocation({ lat: pos.latitude, lng: pos.longitude, accuracy: pos.accuracy, time: new Date() });
      setTrackingError(null);
    } catch (err) {
      setTrackingError(err instanceof Error ? err.message : 'Tracking update failed');
    }
  }, [employeeId]);

  useEffect(() => {
    if (isPunchedIn && employeeId) {
      startSession();
      // Schedule battery-optimized periodic updates every 40s
      intervalRef.current = setInterval(sendLocationUpdate, 40000);
    } else {
      stopSession();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPunchedIn, employeeId, startSession, stopSession, sendLocationUpdate]);

  return {
    isTrackingActive,
    lastLocation,
    trackingError,
  };
}
