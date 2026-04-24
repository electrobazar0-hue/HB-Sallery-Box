'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Camera, MapPin, Clock, User, Image as ImageIcon, ExternalLink,
  Calendar, Filter, ChevronLeft, ChevronRight, Eye
} from 'lucide-react';
import { to12HourFormat } from '@/lib/time-utils';
import { useLanguageStore } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface Employee {
  id: string;
  name: string;
  designation?: string;
}

interface ActivityRecord {
  id: string;
  employeeId: string;
  employee: Employee;
  date: string;
  punchIn?: string;
  punchOut?: string;
  punchInLat?: number;
  punchInLng?: number;
  punchOutLat?: number;
  punchOutLng?: number;
  punchInPhoto?: string;
  punchOutPhoto?: string;
  workHours: number;
  status: string;
}

interface EmployeeActivitiesProps {
  organizationId: string;
}

export function EmployeeActivities({ organizationId }: EmployeeActivitiesProps) {
  const { t } = useLanguageStore();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [photoDialog, setPhotoDialog] = useState<{ open: boolean; photo: string | null; title: string }>({
    open: false,
    photo: null,
    title: '',
  });

  // Fetch employees list
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`/api/employees?organizationId=${organizationId}`);
        const data = await response.json();
        if (data.employees) {
          setEmployees(data.employees.map((e: { id: string; name: string; designation?: string }) => ({
            id: e.id,
            name: e.name,
            designation: e.designation,
          })));
        }
      } catch {
        // Demo data
        setEmployees([
          { id: '1', name: 'John Doe', designation: 'Manager' },
          { id: '2', name: 'Jane Smith', designation: 'Developer' },
          { id: '3', name: 'Mike Johnson', designation: 'Designer' },
        ]);
      }
    };

    if (organizationId) {
      fetchEmployees();
    }
  }, [organizationId]);

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        let url = `/api/attendance?organizationId=${organizationId}&date=${selectedDate}`;
        if (selectedEmployee !== 'all') {
          url = `/api/attendance?employeeId=${selectedEmployee}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        if (data.attendance) {
          setActivities(data.attendance);
        }
      } catch {
        // Demo data
        setActivities([
          {
            id: '1',
            employeeId: '1',
            employee: { id: '1', name: 'John Doe', designation: 'Manager' },
            date: selectedDate,
            punchIn: '09:00:00',
            punchOut: '18:00:00',
            punchInLat: 28.6139,
            punchInLng: 77.2090,
            punchOutLat: 28.6140,
            punchOutLng: 77.2091,
            workHours: 9,
            status: 'present',
          },
          {
            id: '2',
            employeeId: '2',
            employee: { id: '2', name: 'Jane Smith', designation: 'Developer' },
            date: selectedDate,
            punchIn: '09:15:00',
            punchInLat: 28.6139,
            punchInLng: 77.2090,
            workHours: 0,
            status: 'present',
          },
          {
            id: '3',
            employeeId: '3',
            employee: { id: '3', name: 'Mike Johnson', designation: 'Designer' },
            date: selectedDate,
            workHours: 0,
            status: 'absent',
          },
        ]);
      }
      setIsLoading(false);
    };

    if (organizationId) {
      fetchActivities();
    }
  }, [organizationId, selectedDate, selectedEmployee]);

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const viewPhoto = (photo: string, title: string) => {
    setPhotoDialog({ open: true, photo, title });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time?: string) => {
    return to12HourFormat(time);
  };

  // Navigate dates
  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Helper to get translated status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return t.attendance.present;
      case 'absent': return t.attendance.absent;
      case 'late': return t.attendance.late;
      case 'halfDay': return t.attendance.halfDay;
      default: return status;
    }
  };

  // Filter activities by employee
  const filteredActivities = selectedEmployee === 'all'
    ? activities
    : activities.filter(a => a.employeeId === selectedEmployee);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t.common.today}
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">{formatDate(selectedDate)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.employee.selectEmployee} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.employee.allEmployees}</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activities List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredActivities.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t.attendance.noActivitiesFound}</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {filteredActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-0 shadow-md overflow-hidden">
                  {/* Employee Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-white">
                          <AvatarFallback className="bg-white/20 text-white text-lg">
                            {activity.employee.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-white">{activity.employee.name}</h3>
                          <p className="text-white/80 text-sm">{activity.employee.designation}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                          {getStatusText(activity.status)}
                        </Badge>
                        {activity.workHours > 0 && (
                          <p className="text-white/80 text-sm mt-1">{t.attendance.hoursWorked.replace('{hours}', String(activity.workHours))}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {activity.punchIn ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Punch In Section */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-emerald-600">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="font-semibold">{t.attendance.punchIn}: {formatTime(activity.punchIn)}</span>
                          </div>

                          {/* Punch In Photo */}
                          <div className="relative">
                            {activity.punchInPhoto ? (
                              <div
                                className="relative rounded-lg overflow-hidden cursor-pointer group"
                                onClick={() => viewPhoto(activity.punchInPhoto!, `${activity.employee.name} - ${t.attendance.punchInPhoto}`)}
                              >
                                <img
                                  src={activity.punchInPhoto}
                                  alt={t.attendance.punchIn}
                                  className="w-full h-40 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="flex items-center gap-2 text-white">
                                    <Eye className="h-5 w-5" />
                                    <span>{t.attendance.viewPhoto}</span>
                                  </div>
                                </div>
                                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                  <Camera className="h-3 w-3" />
                                  {t.attendance.selfie}
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-40 bg-muted rounded-lg flex flex-col items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                <span className="text-sm text-muted-foreground">{t.attendance.noPhoto}</span>
                              </div>
                            )}
                          </div>

                          {/* Punch In Location */}
                          {activity.punchInLat && activity.punchInLng && (
                            <button
                              onClick={() => openGoogleMaps(activity.punchInLat!, activity.punchInLng!)}
                              className="w-full flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors"
                            >
                              <MapPin className="h-4 w-4 text-emerald-600" />
                              <div className="flex-1 text-left">
                                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t.attendance.punchInLocation}</p>
                                <p className="text-xs text-muted-foreground">
                                  {activity.punchInLat.toFixed(6)}, {activity.punchInLng.toFixed(6)}
                                </p>
                              </div>
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                        </div>

                        {/* Punch Out Section */}
                        <div className="space-y-3">
                          {activity.punchOut ? (
                            <>
                              <div className="flex items-center gap-2 text-red-600">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span className="font-semibold">{t.attendance.punchOut}: {formatTime(activity.punchOut)}</span>
                              </div>

                              {/* Punch Out Photo */}
                              <div className="relative">
                                {activity.punchOutPhoto ? (
                                  <div
                                    className="relative rounded-lg overflow-hidden cursor-pointer group"
                                    onClick={() => viewPhoto(activity.punchOutPhoto!, `${activity.employee.name} - ${t.attendance.punchOutPhoto}`)}
                                  >
                                    <img
                                      src={activity.punchOutPhoto}
                                      alt={t.attendance.punchOut}
                                      className="w-full h-40 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <div className="flex items-center gap-2 text-white">
                                        <Eye className="h-5 w-5" />
                                        <span>{t.attendance.viewPhoto}</span>
                                      </div>
                                    </div>
                                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                      <Camera className="h-3 w-3" />
                                      {t.attendance.selfie}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-40 bg-muted rounded-lg flex flex-col items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                                    <span className="text-sm text-muted-foreground">{t.attendance.noPhoto}</span>
                                  </div>
                                )}
                              </div>

                              {/* Punch Out Location */}
                              {activity.punchOutLat && activity.punchOutLng && (
                                <button
                                  onClick={() => openGoogleMaps(activity.punchOutLat!, activity.punchOutLng!)}
                                  className="w-full flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                                >
                                  <MapPin className="h-4 w-4 text-red-600" />
                                  <div className="flex-1 text-left">
                                    <p className="text-xs font-medium text-red-700 dark:text-red-400">{t.attendance.punchOutLocation}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {activity.punchOutLat.toFixed(6)}, {activity.punchOutLng.toFixed(6)}
                                    </p>
                                  </div>
                                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="h-full flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                              <div className="text-center">
                                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground text-sm">{t.attendance.notPunchedOutYet}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <div className="text-center">
                          <User className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          <p className="text-red-600 font-medium">{t.attendance.absentNoRecorded}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Photo View Dialog */}
      <Dialog open={photoDialog.open} onOpenChange={(open) => setPhotoDialog({ ...photoDialog, open })}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{photoDialog.title}</DialogTitle>
          </DialogHeader>
          {photoDialog.photo && (
            <img
              src={photoDialog.photo}
              alt={photoDialog.title}
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
