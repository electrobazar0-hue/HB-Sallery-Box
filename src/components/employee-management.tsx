'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, Search, X, User, Lock, Phone, Mail, 
  MapPin, Briefcase, Building, DollarSign, Camera, Upload,
  Eye, EyeOff, AlertCircle, Loader2, Check, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { CameraCapture } from '@/components/camera-capture';

interface Employee {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  designation?: string;
  department?: string;
  salary: number;
  profilePhoto?: string;
  active: boolean;
  createdAt: string;
}

export function EmployeeManagement() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    designation: '',
    department: '',
    salary: '',
    profilePhoto: '',
    active: true,
    geofenceEnabled: false,
    geofenceLat: '',
    geofenceLng: '',
    geofenceRadius: '100',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/employees?adminId=${user.id}`);
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Filter employees by search
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.phone.includes(searchQuery) ||
    emp.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset form
  const resetForm = () => {
    setFormData({
      userId: '',
      password: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      designation: '',
      department: '',
      salary: '',
      profilePhoto: '',
      active: true,
      geofenceEnabled: false,
      geofenceLat: '',
      geofenceLng: '',
      geofenceRadius: '100',
    });
    setError('');
    setShowPassword(false);
  };

  // Open add dialog
  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  // Open edit dialog
  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      userId: employee.userId,
      password: '',
      name: employee.name,
      phone: employee.phone,
      email: employee.email || '',
      address: employee.address || '',
      designation: employee.designation || '',
      department: employee.department || '',
      salary: employee.salary.toString(),
      profilePhoto: employee.profilePhoto || '',
      active: employee.active,
      geofenceEnabled: (employee as any).geofenceEnabled || false,
      geofenceLat: (employee as any).geofenceLat ? (employee as any).geofenceLat.toString() : '',
      geofenceLng: (employee as any).geofenceLng ? (employee as any).geofenceLng.toString() : '',
      geofenceRadius: (employee as any).geofenceRadius ? (employee as any).geofenceRadius.toString() : '100',
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteDialog(true);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, profilePhoto: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture
  const handleCameraCapture = (photo: string) => {
    setFormData(prev => ({ ...prev, profilePhoto: photo }));
    setShowCameraCapture(false);
  };

  // Handle get current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          geofenceLat: position.coords.latitude.toFixed(6),
          geofenceLng: position.coords.longitude.toFixed(6),
        }));
      },
      (error) => {
        setError('Unable to get your location. Please enter coordinates manually.');
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Add employee
  const handleAddEmployee = async () => {
    if (!formData.userId || !formData.password || !formData.name || !formData.phone) {
      setError('User ID, Password, Name, and Phone are required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const requestBody: Record<string, unknown> = {
        ...formData,
        salary: parseFloat(formData.salary) || 0,
        adminId: user?.id,
        organizationId: user?.organizationId,
      };

      // Only include geofence fields if enabled
      if (formData.geofenceEnabled) {
        requestBody.geofenceEnabled = true;
        requestBody.geofenceLat = parseFloat(formData.geofenceLat) || null;
        requestBody.geofenceLng = parseFloat(formData.geofenceLng) || null;
        requestBody.geofenceRadius = parseFloat(formData.geofenceRadius) || 100;
      } else {
        requestBody.geofenceEnabled = false;
        requestBody.geofenceLat = null;
        requestBody.geofenceLng = null;
        requestBody.geofenceRadius = null;
      }

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add employee');
      }

      await fetchEmployees();
      setShowAddDialog(false);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add employee');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit employee
  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;
    
    if (!formData.userId || !formData.name || !formData.phone) {
      setError('User ID, Name, and Phone are required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const requestBody: Record<string, unknown> = {
        id: selectedEmployee.id,
        ...formData,
        salary: parseFloat(formData.salary) || 0,
      };

      // Only include geofence fields if enabled
      if (formData.geofenceEnabled) {
        requestBody.geofenceEnabled = true;
        requestBody.geofenceLat = parseFloat(formData.geofenceLat) || null;
        requestBody.geofenceLng = parseFloat(formData.geofenceLng) || null;
        requestBody.geofenceRadius = parseFloat(formData.geofenceRadius) || 100;
      } else {
        requestBody.geofenceEnabled = false;
        requestBody.geofenceLat = null;
        requestBody.geofenceLng = null;
        requestBody.geofenceRadius = null;
      }

      const response = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update employee');
      }

      await fetchEmployees();
      setShowEditDialog(false);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/employees?id=${selectedEmployee.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      await fetchEmployees();
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Form fields component
  const FormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {/* Profile Photo */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {formData.profilePhoto ? (
            <img
              src={formData.profilePhoto}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/30"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <User className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCameraCapture(true)}
            className="text-xs"
          >
            <Camera className="h-3 w-3 mr-1" />
            Camera
          </Button>
          <label className="cursor-pointer">
            <Button type="button" variant="outline" size="sm" className="text-xs" asChild>
              <span>
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </span>
            </Button>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* User ID & Password */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>User ID *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={formData.userId}
              onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
              className="pl-9"
              placeholder="userid"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{isEdit ? 'New Password' : 'Password *'}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="pl-9 pr-9"
              placeholder="••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </div>

      {/* Name & Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Full name"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
              className="pl-9"
              placeholder="10-digit"
              maxLength={10}
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="pl-9"
            placeholder="email@example.com"
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label>Address</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="pl-9"
            placeholder="Address"
          />
        </div>
      </div>

      {/* Designation & Department */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Designation</Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={formData.designation}
              onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
              className="pl-9"
              placeholder="Position"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className="pl-9"
              placeholder="Department"
            />
          </div>
        </div>
      </div>

      {/* Salary */}
      <div className="space-y-2">
        <Label>Salary (₹)</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            value={formData.salary}
            onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
            className="pl-9"
            placeholder="0"
          />
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={formData.active}
          onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
          className="w-4 h-4 rounded border-input"
        />
        <Label htmlFor="active">Active Employee</Label>
      </div>

      {/* Geofence Settings */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Geofence Settings</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="geofenceEnabled"
              checked={formData.geofenceEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, geofenceEnabled: e.target.checked }))}
              className="w-4 h-4 rounded border-input"
            />
            <Label htmlFor="geofenceEnabled" className="cursor-pointer">Enable</Label>
          </div>
        </div>

        {formData.geofenceEnabled && (
          <div className="space-y-3 ml-2 pl-4 border-l-2 border-muted">
            {/* Get Current Location Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetCurrentLocation}
              className="w-full"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Get Current Location
            </Button>

            {/* Latitude & Longitude */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.geofenceLat}
                  onChange={(e) => setFormData(prev => ({ ...prev, geofenceLat: e.target.value }))}
                  placeholder="28.6139"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.geofenceLng}
                  onChange={(e) => setFormData(prev => ({ ...prev, geofenceLng: e.target.value }))}
                  placeholder="77.2090"
                />
              </div>
            </div>

            {/* Radius */}
            <div className="space-y-2">
              <Label className="text-sm">Allowed Radius (meters)</Label>
              <Input
                type="number"
                value={formData.geofenceRadius}
                onChange={(e) => setFormData(prev => ({ ...prev, geofenceRadius: e.target.value }))}
                placeholder="100"
                min="10"
                max="1000"
              />
              <p className="text-xs text-muted-foreground">
                Employee can punch in/out within this radius from the specified location
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Employees</h2>
          <p className="text-sm text-muted-foreground">{employees.length} employees registered</p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-500 hover:bg-emerald-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone, or user ID..."
          className="pl-9"
        />
      </div>

      {/* Employee List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No employees found</p>
            <Button variant="link" onClick={openAddDialog}>Add your first employee</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredEmployees.map((employee) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border p-4 flex items-center gap-4"
            >
              {/* Photo */}
              {employee.profilePhoto ? (
                <img 
                  src={employee.profilePhoto} 
                  alt={employee.name} 
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{employee.name}</p>
                  {!employee.active && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{employee.userId}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{employee.phone}</span>
                  {employee.designation && <span>• {employee.designation}</span>}
                </div>
              </div>

              {/* Salary */}
              <div className="text-right hidden sm:block">
                <p className="font-medium">₹{employee.salary.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(employee)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteDialog(employee)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <FormFields />
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Employee'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <FormFields isEdit />
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleEditEmployee} disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedEmployee?.name}</strong>?
              This action cannot be undone. All attendance and leave records will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-red-500 hover:bg-red-600"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Camera Capture Dialog */}
      <CameraCapture
        open={showCameraCapture}
        onCapture={handleCameraCapture}
        onClose={() => setShowCameraCapture(false)}
        title="📸 Capture Profile Photo"
      />
    </div>
  );
}
