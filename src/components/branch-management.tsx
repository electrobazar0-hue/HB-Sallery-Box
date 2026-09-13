'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building, MapPin, Plus, Trash2, Edit2, Check,
  Navigation, Loader2, AlertCircle, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { fetchJSON } from '@/lib/utils';
import { getAccurateGPSPosition } from '@/lib/gps-accuracy';

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadius: number;
  active: boolean;
  createdAt: string;
  _count?: {
    employees: number;
  };
}

interface BranchManagementProps {
  organizationId: string;
  onBranchChange?: () => void;
}

export function BranchManagement({ organizationId, onBranchChange }: BranchManagementProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    geofenceRadius: '150',
  });

  const fetchBranches = useCallback(async () => {
    if (!organizationId) return;
    try {
      setIsLoading(true);
      const data = await fetchJSON<{ success?: boolean; branches?: Branch[] }>(
        `/api/branches?organizationId=${encodeURIComponent(organizationId)}`
      );
      if (data?.branches) {
        setBranches(data.branches);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleDetectLocation = async () => {
    setIsDetectingGPS(true);
    setError(null);
    try {
      const pos = await getAccurateGPSPosition({ desiredAccuracy: 15, maxWaitMs: 6000, timeout: 12000 });
      setForm((prev) => ({
        ...prev,
        latitude: pos.latitude.toFixed(6),
        longitude: pos.longitude.toFixed(6),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to detect GPS coordinates');
    } finally {
      setIsDetectingGPS(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!form.name || !form.address) {
      setError('Branch Name and Address are required.');
      return;
    }

    try {
      setError(null);
      const res = await fetchJSON<{ success?: boolean; branch?: Branch; error?: string }>('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: form.name,
          address: form.address,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          geofenceRadius: Number(form.geofenceRadius) || 150,
        }),
      });

      if (res?.success) {
        setShowAddDialog(false);
        setForm({ name: '', address: '', latitude: '', longitude: '', geofenceRadius: '150' });
        await fetchBranches();
        if (onBranchChange) onBranchChange();
      } else {
        setError(res?.error || 'Failed to create branch');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating branch');
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch? Employees assigned to this branch will be moved to unassigned.')) return;

    try {
      await fetchJSON(`/api/branches?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await fetchBranches();
      if (onBranchChange) onBranchChange();
    } catch (err) {
      console.error('Error deleting branch:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Building className="h-5 w-5 text-teal-500" />
            Company Branches & Geofence
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure branch locations and geofence radius for employee attendance
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-medium"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add New Branch
        </Button>
      </div>

      {/* Branch List */}
      {branches.length === 0 && !isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <Building className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="font-semibold">No Branches Created Yet</p>
            <p className="text-xs max-w-sm mx-auto">
              Create your company branches to assign staff and enforce location-based attendance.
            </p>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create First Branch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl border bg-card shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm">{branch.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{branch.address}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {branch._count?.employees || 0} Staff
                </Badge>
              </div>

              {/* Geofence info */}
              <div className="p-2.5 bg-muted/40 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Geofence Radius:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {branch.geofenceRadius}m
                  </span>
                </div>
                {branch.latitude && branch.longitude ? (
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>GPS:</span>
                    <span>{branch.latitude.toFixed(5)}, {branch.longitude.toFixed(5)}</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-500">⚠ No GPS Coordinates set</p>
                )}
              </div>

              <div className="flex items-center justify-end pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs h-7 px-2"
                  onClick={() => handleDeleteBranch(branch.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Branch Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-teal-500" />
              Add Company Branch
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Branch Name *</Label>
              <Input
                placeholder="e.g. Main Shop, Branch 2, Warehouse"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Branch Address *</Label>
              <Input
                placeholder="e.g. Shop 12, Market Road, Mumbai"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Latitude</Label>
                <Input
                  placeholder="19.0760"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Longitude</Label>
                <Input
                  placeholder="72.8777"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDetectLocation}
              disabled={isDetectingGPS}
              className="w-full text-xs text-teal-600 border-teal-500/30"
            >
              {isDetectingGPS ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isDetectingGPS ? 'Detecting GPS...' : 'Auto-Detect Current Location GPS'}
            </Button>

            <div>
              <Label className="text-xs font-semibold">Allowed Geofence Radius (meters)</Label>
              <Input
                type="number"
                min="50"
                max="2000"
                value={form.geofenceRadius}
                onChange={(e) => setForm({ ...form, geofenceRadius: e.target.value })}
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Staff must be within this distance ({form.geofenceRadius}m) to punch attendance.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateBranch} className="bg-teal-600 text-white">
              <Check className="h-4 w-4 mr-1" />
              Save Branch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
