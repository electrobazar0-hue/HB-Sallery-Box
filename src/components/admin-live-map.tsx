'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, RefreshCw, Navigation, User, ExternalLink,
  ShieldCheck, AlertCircle, Clock, Search, Route, Eye,
  Compass, Layers, CheckCircle2, ChevronRight, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { fetchJSON } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RoutePoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  timestamp: string;
}

interface ActiveStaff {
  sessionId: string;
  employeeId: string;
  status: string;
  name: string;
  phone: string;
  designation: string;
  department: string;
  profilePhoto: string | null;
  branchName: string;
  punchInTime: string | null;
  punchOutTime?: string | null;
  startedAt: string;
  endedAt?: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  lastUpdated: string;
  totalPoints: number;
  routeHistory: RoutePoint[];
}

interface AdminLiveMapProps {
  organizationId: string;
}

export function AdminLiveMap({ organizationId }: AdminLiveMapProps) {
  const [activeStaff, setActiveStaff] = useState<ActiveStaff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<ActiveStaff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'active' | 'all'>('active');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [mapZoom, setMapZoom] = useState<number>(15);

  const fetchLiveTracking = useCallback(async () => {
    if (!organizationId) return;
    try {
      setIsLoading(true);
      const data = await fetchJSON<{ success?: boolean; activeStaff?: ActiveStaff[] }>(
        `/api/location-tracking?organizationId=${encodeURIComponent(organizationId)}&status=${viewFilter}`,
        { cache: 'no-store' }
      );
      if (data?.activeStaff) {
        setActiveStaff(data.activeStaff);
        // Keep selected staff updated
        if (selectedStaff) {
          const updated = data.activeStaff.find((s) => s.sessionId === selectedStaff.sessionId);
          if (updated) setSelectedStaff(updated);
        } else if (data.activeStaff.length > 0) {
          setSelectedStaff(data.activeStaff[0]);
        }
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching live tracking:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, viewFilter, selectedStaff]);

  useEffect(() => {
    fetchLiveTracking();
    const interval = setInterval(fetchLiveTracking, 25000);
    return () => clearInterval(interval);
  }, [fetchLiveTracking]);

  const getTimeAgo = (timestamp: string) => {
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 45) return 'Just now (Live)';
      if (diffSec < 120) return '1 min ago';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} mins ago`;
      return `${Math.floor(diffMin / 60)} hrs ago`;
    } catch {
      return 'Recently';
    }
  };

  const filteredStaff = activeStaff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.branchName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Focus coordinates for the interactive map
  const activeFocusStaff = selectedStaff || filteredStaff[0] || null;
  const mapLat = activeFocusStaff?.latitude || 28.6139;
  const mapLng = activeFocusStaff?.longitude || 77.2090;

  // OpenStreetMap embed URL with live marker
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - 0.008}%2C${mapLat - 0.006}%2C${mapLng + 0.008}%2C${mapLat + 0.006}&layer=mapnik&marker=${mapLat}%2C${mapLng}`;

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-900/50 via-slate-900/70 to-emerald-950/40 p-4 rounded-xl border border-teal-500/20 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Navigation className="h-5 w-5 text-teal-400" />
              Live Staff Location & Route Tracking
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-time GPS breadcrumb tracking during active duty • Synced: {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchLiveTracking}
            disabled={isLoading}
            className="border-teal-500/30 text-teal-300 hover:bg-teal-950/40 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh GPS
          </Button>
        </div>
      </div>

      {/* Main Interactive Map & Route Trail View */}
      {activeFocusStaff && activeFocusStaff.latitude && activeFocusStaff.longitude ? (
        <Card className="border border-teal-500/30 overflow-hidden bg-slate-950 shadow-xl">
          <CardHeader className="bg-slate-900/90 py-3 px-4 border-b border-teal-500/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-teal-500/40">
                <AvatarImage src={activeFocusStaff.profilePhoto || undefined} />
                <AvatarFallback className="bg-teal-700 text-white text-xs font-bold">
                  {activeFocusStaff.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{activeFocusStaff.name}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-1.5 py-0">
                    Live
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-300">
                  {activeFocusStaff.designation || 'Staff'} • {activeFocusStaff.branchName} • {activeFocusStaff.routeHistory.length} Trail Points
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps?q=${activeFocusStaff.latitude},${activeFocusStaff.longitude}`,
                    '_blank'
                  )
                }
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open Google Maps
              </Button>
            </div>
          </CardHeader>

          {/* Interactive OpenStreetMap iframe View */}
          <div className="relative w-full h-80 sm:h-96 bg-slate-900">
            <iframe
              title="Staff Live Location Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={mapEmbedUrl}
              className="w-full h-full filter saturate-125"
            />

            {/* GPS Overlay Floating Card */}
            <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md p-3 rounded-lg border border-teal-500/30 text-white text-xs shadow-lg space-y-1">
              <p className="font-semibold text-teal-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                Live GPS Position
              </p>
              <p className="font-mono text-[11px] text-slate-200">
                {activeFocusStaff.latitude.toFixed(6)}, {activeFocusStaff.longitude.toFixed(6)}
              </p>
              {activeFocusStaff.accuracy && (
                <p className="text-[10px] text-slate-400">Accuracy: ±{Math.round(activeFocusStaff.accuracy)} meters</p>
              )}
              <p className="text-[10px] text-emerald-400 font-medium">Status: {getTimeAgo(activeFocusStaff.lastUpdated)}</p>
            </div>
          </div>

          {/* Breadcrumb Trail / Travel Points Log */}
          {activeFocusStaff.routeHistory && activeFocusStaff.routeHistory.length > 0 && (
            <div className="p-3 bg-slate-900/90 border-t border-teal-500/20">
              <p className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                <Route className="h-3.5 w-3.5 text-teal-400" />
                User Travel Route & Movement Points ({activeFocusStaff.routeHistory.length} GPS breadcrumbs detected)
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {activeFocusStaff.routeHistory.slice(-8).map((point, idx) => (
                  <div
                    key={point.id || idx}
                    className="flex-shrink-0 p-2 rounded-lg bg-slate-950 border border-teal-500/20 text-[11px] text-slate-300 space-y-0.5 min-w-[130px]"
                  >
                    <span className="font-mono text-teal-400 font-semibold text-[10px]">
                      Point #{activeFocusStaff.routeHistory.length - 8 + idx + 1}
                    </span>
                    <p className="font-mono text-[10px] text-slate-200 truncate">
                      {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {/* Search Input & List of All Staff */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by staff name, phone, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/20 border-muted"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Badge variant={viewFilter === 'active' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setViewFilter('active')}>
            Active Duty ({activeStaff.filter(s => s.status === 'active').length})
          </Badge>
          <Badge variant={viewFilter === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setViewFilter('all')}>
            All Today ({activeStaff.length})
          </Badge>
        </div>
      </div>

      {/* Active Staff Grid */}
      {filteredStaff.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="text-base font-semibold">No Staff Currently on Active Duty</p>
            <p className="text-xs max-w-md mx-auto">
              Live location tracking starts automatically when a staff member punches in and ends when they punch out.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => {
            const isSelected = selectedStaff?.sessionId === staff.sessionId;
            return (
              <motion.div
                key={staff.sessionId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedStaff(staff)}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-white shadow-lg space-y-3 ${
                  isSelected
                    ? 'border-emerald-400 bg-gradient-to-br from-slate-900 to-teal-950 ring-2 ring-emerald-500/40'
                    : 'border-teal-500/20 bg-gradient-to-br from-slate-900 to-slate-950 hover:border-teal-500/40'
                }`}
              >
                {/* Staff Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-10 w-10 border border-teal-500/40">
                      <AvatarImage src={staff.profilePhoto || undefined} />
                      <AvatarFallback className="bg-teal-700 text-white text-sm font-bold">
                        {staff.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-sm text-white">{staff.name}</p>
                      <p className="text-xs text-slate-300">
                        {staff.designation || 'Staff'} • {staff.branchName}
                      </p>
                    </div>
                  </div>

                  <Badge className={staff.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5' : 'bg-slate-700 text-slate-300 text-[10px]'}>
                    {staff.status === 'active' ? '● Active' : 'Shift Ended'}
                  </Badge>
                </div>

                {/* Punch In & Timing Details */}
                <div className="p-2.5 bg-white/5 rounded-lg text-xs space-y-1 border border-white/5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Punch In Time:</span>
                    <span className="font-mono font-bold text-white">{staff.punchInTime || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>GPS Status:</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getTimeAgo(staff.lastUpdated)}
                    </span>
                  </div>
                </div>

                {/* GPS Coordinates & Accuracy */}
                {staff.latitude && staff.longitude ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-mono">
                        📍 {staff.latitude.toFixed(5)}, {staff.longitude.toFixed(5)}
                      </span>
                      {staff.accuracy && (
                        <span className="text-teal-300">±{Math.round(staff.accuracy)}m</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/30 text-xs h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStaff(staff);
                        }}
                      >
                        <Route className="h-3.5 w-3.5 mr-1" />
                        View Map Trail
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-emerald-600/40 hover:bg-emerald-600/60 text-white text-xs h-8 px-2.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://www.google.com/maps?q=${staff.latitude},${staff.longitude}`,
                            '_blank'
                          );
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-300/80 italic">Awaiting first GPS fix...</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

