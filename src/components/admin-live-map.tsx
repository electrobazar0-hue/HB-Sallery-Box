'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, RefreshCw, Navigation, User, ExternalLink,
  ShieldCheck, AlertCircle, Clock, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { fetchJSON } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ActiveStaff {
  sessionId: string;
  employeeId: string;
  name: string;
  phone: string;
  designation: string;
  department: string;
  profilePhoto: string | null;
  branchName: string;
  punchInTime: string | null;
  startedAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  lastUpdated: string;
}

interface AdminLiveMapProps {
  organizationId: string;
}

export function AdminLiveMap({ organizationId }: AdminLiveMapProps) {
  const [activeStaff, setActiveStaff] = useState<ActiveStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchLiveTracking = useCallback(async () => {
    if (!organizationId) return;
    try {
      setIsLoading(true);
      const data = await fetchJSON<{ success?: boolean; activeStaff?: ActiveStaff[] }>(
        `/api/location-tracking?organizationId=${encodeURIComponent(organizationId)}`,
        { cache: 'no-store' }
      );
      if (data?.activeStaff) {
        setActiveStaff(data.activeStaff);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching live tracking:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchLiveTracking();
    // Auto-refresh every 30 seconds for real-time live monitoring
    const interval = setInterval(fetchLiveTracking, 30000);
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

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-900/40 to-slate-900/60 p-4 rounded-xl border border-teal-500/20 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Navigation className="h-5 w-5 text-teal-400" />
              Live Staff Location Tracking
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Active on-duty staff location stream • Refreshed: {lastRefreshed.toLocaleTimeString()}
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
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by staff name, phone, or branch..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-muted/20 border-muted"
        />
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
          {filteredStaff.map((staff) => (
            <motion.div
              key={staff.sessionId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-teal-500/20 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-lg space-y-3"
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

                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5">
                  ● Active
                </Badge>
              </div>

              {/* Punch In & Timing Details */}
              <div className="p-2.5 bg-white/5 rounded-lg text-xs space-y-1 border border-white/5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Punch In Time:</span>
                  <span className="font-mono font-bold text-white">{staff.punchInTime || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Status:</span>
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

                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/30 text-xs h-8"
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps?q=${staff.latitude},${staff.longitude}`,
                        '_blank'
                      )
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    View Live on Google Maps
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-amber-300/80 italic">Awaiting first GPS fix...</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
