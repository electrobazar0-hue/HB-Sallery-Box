'use client';

import { useState } from 'react';
import { Clock, Plus, Edit, Trash2, Users, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguageStore } from '@/lib/i18n';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  employees: { id: string; name: string }[];
}

interface ShiftChangeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  currentShiftId: string;
  currentShiftName: string;
  requestedShiftId: string;
  requestedShiftName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface ShiftManagementProps {
  organizationId: string;
}

export function ShiftManagement({ organizationId }: ShiftManagementProps) {
  const { t } = useLanguageStore();

  const [shifts, setShifts] = useState<Shift[]>([
    { id: '1', name: 'Morning Shift', startTime: '09:00', endTime: '17:00', graceMinutes: 15, employees: [{ id: '1', name: 'John Doe' }] },
    { id: '2', name: 'Evening Shift', startTime: '14:00', endTime: '22:00', graceMinutes: 15, employees: [{ id: '2', name: 'Jane Smith' }] },
    { id: '3', name: 'Night Shift', startTime: '22:00', endTime: '06:00', graceMinutes: 10, employees: [] },
  ]);

  const [changeRequests, setChangeRequests] = useState<ShiftChangeRequest[]>([
    { id: '1', employeeId: '1', employeeName: 'John Doe', currentShiftId: '1', currentShiftName: 'Morning Shift', requestedShiftId: '2', requestedShiftName: 'Evening Shift', reason: 'Personal commitment', status: 'pending', createdAt: new Date().toISOString() },
  ]);

  const [showAddShift, setShowAddShift] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '',
    endTime: '',
    graceMinutes: 15,
  });

  const handleAddShift = async () => {
    if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) return;

    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...shiftForm, organizationId }),
      });
      const data = await response.json();
      if (data.success) {
        setShifts([...shifts, data.shift]);
      }
    } catch {
      // Demo mode
      const newShift: Shift = {
        id: Date.now().toString(),
        ...shiftForm,
        employees: [],
      };
      setShifts([...shifts, newShift]);
    }

    setShowAddShift(false);
    setShiftForm({ name: '', startTime: '', endTime: '', graceMinutes: 15 });
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await fetch(`/api/shifts?id=${id}`, { method: 'DELETE' });
    } catch {
      // Continue with local delete
    }
    setShifts(shifts.filter(s => s.id !== id));
  };

  const handleRequestAction = (id: string, status: 'approved' | 'rejected') => {
    setChangeRequests(changeRequests.map(r => 
      r.id === id ? { ...r, status } : r
    ));
  };

  const pendingCount = changeRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Shift Cards */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t.shift.shiftSchedules}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRequests(true)} className="relative">
            <Clock className="h-4 w-4 mr-2" />
            {t.shift.changeRequests}
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button size="sm" onClick={() => setShowAddShift(true)} className="bg-gradient-to-r from-emerald-500 to-teal-600">
            <Plus className="h-4 w-4 mr-2" />
            {t.shift.addShift}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shifts.map((shift) => (
          <Card key={shift.id} className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{shift.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingShift(shift)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteShift(shift.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Time */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{shift.startTime}</span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono text-sm">{shift.endTime}</span>
                </div>

                {/* Grace Period */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t.shift.gracePeriod}:</span>
                  <Badge variant="secondary">{shift.graceMinutes} {t.shift.minutes}</Badge>
                </div>

                {/* Employees */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Users className="h-4 w-4" />
                    <span>{shift.employees.length} {t.shift.employees}</span>
                  </div>
                  {shift.employees.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {shift.employees.map((emp) => (
                        <Badge key={emp.id} variant="outline" className="text-xs">
                          {emp.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Shift Dialog */}
      <Dialog open={showAddShift || !!editingShift} onOpenChange={(open) => {
        if (!open) {
          setShowAddShift(false);
          setEditingShift(null);
          setShiftForm({ name: '', startTime: '', endTime: '', graceMinutes: 15 });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingShift ? t.shift.editShift : t.shift.addNewShift}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.shift.shiftName}</Label>
              <Input
                placeholder={t.shift.shiftNamePlaceholder}
                value={editingShift ? editingShift.name : shiftForm.name}
                onChange={(e) => editingShift 
                  ? setEditingShift({ ...editingShift, name: e.target.value })
                  : setShiftForm({ ...shiftForm, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.shift.startTime}</Label>
                <Input
                  type="time"
                  value={editingShift ? editingShift.startTime : shiftForm.startTime}
                  onChange={(e) => editingShift 
                    ? setEditingShift({ ...editingShift, startTime: e.target.value })
                    : setShiftForm({ ...shiftForm, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t.shift.endTime}</Label>
                <Input
                  type="time"
                  value={editingShift ? editingShift.endTime : shiftForm.endTime}
                  onChange={(e) => editingShift 
                    ? setEditingShift({ ...editingShift, endTime: e.target.value })
                    : setShiftForm({ ...shiftForm, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.shift.gracePeriodMinutes}</Label>
              <Input
                type="number"
                placeholder="15"
                value={editingShift ? editingShift.graceMinutes : shiftForm.graceMinutes}
                onChange={(e) => editingShift 
                  ? setEditingShift({ ...editingShift, graceMinutes: Number(e.target.value) })
                  : setShiftForm({ ...shiftForm, graceMinutes: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowAddShift(false);
                setEditingShift(null);
              }}>
                {t.common.cancel}
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={() => {
                if (editingShift) {
                  setShifts(shifts.map(s => s.id === editingShift.id ? editingShift : s));
                  setEditingShift(null);
                } else {
                  handleAddShift();
                }
              }}>
                {editingShift ? t.shift.saveChanges : t.shift.addShift}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Requests Dialog */}
      <Dialog open={showRequests} onOpenChange={setShowRequests}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t.shift.changeRequests}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-3">
              {changeRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>{t.shift.noChangeRequests}</p>
                </div>
              ) : (
                changeRequests.map((request) => (
                  <div key={request.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{request.employeeName}</span>
                      <Badge variant={
                        request.status === 'approved' ? 'default' : 
                        request.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {request.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className="text-muted-foreground">{request.currentShiftName}</span>
                      <span>→</span>
                      <span className="text-emerald-600">{request.requestedShiftName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{request.reason}</p>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRequestAction(request.id, 'rejected')}>
                          <X className="h-4 w-4 mr-1" />
                          {t.shift.reject}
                        </Button>
                        <Button size="sm" className="flex-1 bg-emerald-500" onClick={() => handleRequestAction(request.id, 'approved')}>
                          <Check className="h-4 w-4 mr-1" />
                          {t.shift.approve}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
