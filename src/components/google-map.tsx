'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface GoogleMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  width?: string;
  height?: string;
  showMarker?: boolean;
  markerLabel?: string;
  className?: string;
}

export function GoogleMap({
  lat,
  lng,
  zoom = 15,
  width = '100%',
  height = '300px',
  showMarker = true,
  markerLabel = 'Punch Location',
  className = '',
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  // Check if Google Maps is already loaded (synchronously)
  const isInitiallyLoaded = typeof window !== 'undefined' && window.google && window.google.maps;
  const [isLoaded, setIsLoaded] = useState(isInitiallyLoaded);
  const [loadError, setLoadError] = useState(false);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // If already loaded, mark as loaded and return
    if (isInitiallyLoaded) {
      // Defer state update to avoid synchronous state in effect
      requestAnimationFrame(() => setIsLoaded(true));
      return;
    }

    // Avoid loading script multiple times
    if (scriptLoadedRef.current) {
      return;
    }
    scriptLoadedRef.current = true;

    // Load Google Maps API
    const script = document.createElement('script');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('Google Maps API key not found');
      requestAnimationFrame(() => setLoadError(true));
      return;
    }

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setLoadError(true);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      scriptLoadedRef.current = false;
    };
  }, [isInitiallyLoaded]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    try {
      // Initialize map
      const map = new google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      mapInstanceRef.current = map;

      // Add marker if enabled
      if (showMarker) {
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: markerLabel,
          animation: google.maps.Animation.DROP,
        });

        markerRef.current = marker;

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: system-ui, sans-serif;">
              <div style="font-weight: 600; margin-bottom: 4px;">${markerLabel}</div>
              <div style="font-size: 12px; color: #666;">
                Lat: ${lat.toFixed(6)}<br/>
                Lng: ${lng.toFixed(6)}
              </div>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      }
    } catch (error) {
      console.error('Error initializing Google Map:', error);
      // Don't set state here to avoid cascading renders
    }
  }, [isLoaded, lat, lng, zoom, showMarker, markerLabel]);

  // Update map center when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      mapInstanceRef.current.panTo({ lat, lng });
    }

    if (markerRef.current && isLoaded) {
      markerRef.current.setPosition({ lat, lng });
    }
  }, [lat, lng, isLoaded]);

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Map unavailable</p>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 text-xs hover:underline"
          >
            View on Google Maps
          </a>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-2" />
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ width, height }}
    />
  );
}

// Type declaration for global window object
declare global {
  interface Window {
    google?: Record<string, any>;
  }
}
