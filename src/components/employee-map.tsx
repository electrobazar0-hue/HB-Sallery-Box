'use client';

// Google Maps types
type GoogleMap = any;
type GoogleMarker = any;
type GoogleLatLng = any;
type GoogleInfoWindow = any;

declare global {
  interface Window {
    google: Record<string, any>;
  }
}

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, RefreshCw, Maximize2, Users, Loader2, AlertCircle } from 'lucide-react';
import { useLanguageStore } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Google Maps API Key - Set this in your environment variables
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface Employee {
  id: string;
  name: string;
  designation?: string;
  latitude?: number;
  longitude?: number;
  lastUpdate?: string;
  status: 'online' | 'offline' | 'working';
}

interface EmployeeMapProps {
  employees: Employee[];
  adminView?: boolean;
  currentLocation?: { lat: number; lng: number } | null;
}

function getStatusColor(status: Employee['status']) {
  switch (status) {
    case 'online': return 'bg-emerald-500';
    case 'working': return 'bg-blue-500';
    case 'offline': return 'bg-gray-400';
    default: return 'bg-gray-400';
  }
}

// Default center coordinates (India - New Delhi)
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 };
const DEFAULT_ZOOM = 14;

// Load Google Maps Script
function loadGoogleMapsScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!GOOGLE_MAPS_API_KEY) {
      resolve(false);
      return;
    }
    
    // Check if already loaded
    if (window.google && window.google.maps) {
      resolve(true);
      return;
    }
    
    // Check if script is being loaded
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    
    // Define callback
    (window as unknown as { initGoogleMapsCallback: () => void }).initGoogleMapsCallback = () => {
      resolve(true);
    };
    
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function MapDisplay({
  employees,
  adminView,
  fullscreen,
  onSelectEmployee,
  selectedEmployee,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
}: {
  employees: Employee[];
  adminView: boolean;
  fullscreen: boolean;
  onSelectEmployee: (emp: Employee | null) => void;
  selectedEmployee: Employee | null;
  center?: { lat: number; lng: number };
  zoom?: number;
}) {
  const { t } = useLanguageStore();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);

  // Initialize Google Maps or fallback to OpenStreetMap
  useEffect(() => {
    const initMap = async () => {
      if (GOOGLE_MAPS_API_KEY) {
        const loaded = await loadGoogleMapsScript();
        if (loaded && mapRef.current && window.google) {
          try {
            // Create map
            googleMapRef.current = new window.google.maps.Map(mapRef.current, {
              center: { lat: center.lat, lng: center.lng },
              zoom: zoom,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            });
            
            setUseGoogleMaps(true);
            setMapLoaded(true);
          } catch {
            setMapError(true);
            setMapLoaded(true);
          }
        } else {
          setMapLoaded(true);
        }
      } else {
        setMapLoaded(true);
      }
    };
    
    initMap();
  }, [center.lat, center.lng, zoom]);

  // Update markers when employees change (Google Maps)
  useEffect(() => {
    if (!useGoogleMaps || !googleMapRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    employees.forEach((emp) => {
      if (emp.latitude && emp.longitude) {
        const marker = new window.google.maps.Marker({
          position: { lat: emp.latitude, lng: emp.longitude },
          map: googleMapRef.current,
          title: emp.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: emp.status === 'online' ? '#10B981' : emp.status === 'working' ? '#3B82F6' : '#9CA3AF',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });

        marker.addListener('click', () => onSelectEmployee(emp));
        markersRef.current.push(marker);
      }
    });
  }, [employees, useGoogleMaps, onSelectEmployee]);

  // OpenStreetMap tile URL
  const osmTileUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.02}%2C${center.lat - 0.02}%2C${center.lng + 0.02}%2C${center.lat + 0.02}&layer=mapnik&marker=${center.lat}%2C${center.lng}`;

  return (
    <div className="relative">
      {/* Map Container */}
      <div
        className={`relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg overflow-hidden ${
          fullscreen ? 'h-[60vh]' : 'h-64'
        }`}
      >
        {/* Google Maps Container */}
        {useGoogleMaps && (
          <div 
            ref={mapRef} 
            className="absolute inset-0 w-full h-full"
          />
        )}

        {/* OpenStreetMap fallback (no API key needed) */}
        {!useGoogleMaps && !mapError && (
          <iframe
            src={osmTileUrl}
            className="absolute inset-0 w-full h-full border-0"
            title="Map"
            onLoad={() => setMapLoaded(true)}
            onError={() => setMapError(true)}
          />
        )}

        {/* Fallback grid overlay if both maps fail */}
        {mapError && (
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        )}

        {/* Employee markers overlay (for non-Google Maps) */}
        {!useGoogleMaps && mapLoaded && employees.map((emp, index) => {
          if (!emp.latitude || !emp.longitude) return null;
          
          // Calculate position based on coordinates
          const latOffset = (emp.latitude - center.lat) * 2000;
          const lngOffset = (emp.longitude - center.lng) * 2000;
          const left = Math.max(5, Math.min(95, 50 + lngOffset * 0.5));
          const top = Math.max(5, Math.min(95, 50 - latOffset * 0.5));

          return (
            <div
              key={emp.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:z-20 hover:scale-110 z-10"
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={() => onSelectEmployee(emp)}
            >
              <div className="relative">
                {emp.status === 'online' && (
                  <div className={`absolute inset-0 ${getStatusColor(emp.status)} rounded-full animate-ping opacity-30`} />
                )}
                <div className={`relative w-10 h-10 rounded-full ${getStatusColor(emp.status)} flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-900`}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-white text-slate-700 text-xs font-bold dark:bg-slate-800 dark:text-white">
                      {emp.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {selectedEmployee?.id === emp.id && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 whitespace-nowrap">
                    <span className="text-xs font-medium bg-background px-2 py-0.5 rounded shadow">
                      {emp.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading overlay */}
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-emerald-500" />
              <p className="text-sm text-muted-foreground">{t.employee.loadingMap}</p>
            </div>
          </div>
        )}

        {/* Map attribution */}
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded z-20">
          {useGoogleMaps ? (
            <span>© Google Maps</span>
          ) : (
            <>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenStreetMap</a></>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-background/80 px-3 py-2 rounded z-20">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t.auth.online}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{t.auth.working}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span>{t.auth.offline}</span>
            </div>
          </div>
        </div>

        {/* Admin badge */}
        {adminView && (
          <div className="absolute top-2 left-2 z-20">
            <Badge variant="secondary" className="bg-background/80">
              <Users className="h-3 w-3 mr-1" />
              {t.employee.employeesCount.replace('{count}', String(employees.length))}
            </Badge>
          </div>
        )}
      </div>

      {/* Employee List Sidebar (for fullscreen) */}
      {fullscreen && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {employees.map((emp) => {
            return (
              <button
                key={emp.id}
                onClick={() => onSelectEmployee(emp)}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                  selectedEmployee?.id === emp.id ? 'border-emerald-500 bg-emerald-500/10' : 'hover:bg-muted'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${getStatusColor(emp.status)}`} />
                <div className="text-left">
                  <p className="text-sm font-medium truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.designation}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EmployeeMap({ employees, adminView = true }: EmployeeMapProps) {
  const { t } = useLanguageStore();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper to get translated status label
  const getStatusLabel = (status: Employee['status']) => {
    switch (status) {
      case 'online': return t.auth.online;
      case 'working': return t.auth.working;
      case 'offline': return t.auth.offline;
      default: return status;
    }
  };

  // Simulated employee locations for demo
  const employeeLocations: Employee[] = employees.length > 0 ? employees : [
    { id: '1', name: 'John Doe', designation: 'Manager', latitude: 28.6139, longitude: 77.2090, status: 'online', lastUpdate: new Date().toISOString() },
    { id: '2', name: 'Jane Smith', designation: 'Developer', latitude: 28.6129, longitude: 77.2080, status: 'working', lastUpdate: new Date().toISOString() },
    { id: '3', name: 'Mike Johnson', designation: 'Designer', latitude: 28.6149, longitude: 77.2100, status: 'online', lastUpdate: new Date().toISOString() },
  ];

  // Calculate center from employee locations
  const center = employeeLocations.length > 0 && employeeLocations[0].latitude
    ? {
        lat: employeeLocations.reduce((sum, e) => sum + (e.latitude || 0), 0) / employeeLocations.length,
        lng: employeeLocations.reduce((sum, e) => sum + (e.longitude || 0), 0) / employeeLocations.length,
      }
    : DEFAULT_CENTER;

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-500" />
              {adminView ? t.employee.employeeLocations : t.employee.myLocation}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(true)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-4 px-4">
          <MapDisplay
            employees={employeeLocations}
            adminView={adminView}
            fullscreen={false}
            onSelectEmployee={setSelectedEmployee}
            selectedEmployee={selectedEmployee}
            center={center}
          />
        </CardContent>
      </Card>

      {/* Employee detail */}
      {selectedEmployee && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                {selectedEmployee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{selectedEmployee.name}</p>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedEmployee.status)}`} />
                <Badge variant="secondary" className="text-xs">
                  {getStatusLabel(selectedEmployee.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selectedEmployee.designation}</p>
              {selectedEmployee.latitude && selectedEmployee.longitude && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Navigation className="h-3 w-3" />
                  {selectedEmployee.latitude.toFixed(4)}, {selectedEmployee.longitude.toFixed(4)}
                </p>
              )}
              {selectedEmployee.lastUpdate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t.employee.lastUpdated} {new Date(selectedEmployee.lastUpdate).toLocaleString()}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedEmployee(null)}>
              {t.common.close}
            </Button>
          </div>
        </div>
      )}

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-500" />
              {t.employee.realTimeEmployeeMap}
            </DialogTitle>
          </DialogHeader>
          <MapDisplay
            employees={employeeLocations}
            adminView={adminView}
            fullscreen={true}
            onSelectEmployee={setSelectedEmployee}
            selectedEmployee={selectedEmployee}
            center={center}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
