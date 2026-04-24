'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, RefreshCw, Trash2, Edit, Check,
  Sun, PartyPopper, Building, AlertTriangle, Clock,
  ChevronLeft, ChevronRight, Download,
  Eye, EyeOff, Shield, CircleDollarSign, CircleDot,
  HandCoins, CalendarDays, Ban, Send, ToggleLeft, ToggleRight,
  Info, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { Textarea } from '@/components/ui/textarea';
import { useLanguageStore } from '@/lib/i18n';

interface Holiday {
  id: string;
  holidayName: string;
  date: string;
  holidayType: string;
  description?: string;
  allowPunch: boolean;
  isHalfDay: boolean;
  isPaid: boolean;
  isOptional: boolean;
  compensatoryOff: boolean;
  isRecurring: boolean;
  recurringDay?: number;
  status: string;
}

interface HolidayStats {
  totalHolidays: number;
  activeHolidays: number;
  draftHolidays: number;
  paidHolidays: number;
  halfDayHolidays: number;
  optionalHolidays: number;
  compOffHolidays: number;
}

interface HolidayManagementProps {
  organizationId: string;
  adminId: string;
}

const holidayTypes = [
  { value: 'national', label: 'National', icon: Sun, color: 'bg-orange-500' },
  { value: 'festival', label: 'Festival', icon: PartyPopper, color: 'bg-purple-500' },
  { value: 'weekly', label: 'Weekly Off', icon: Clock, color: 'bg-blue-500' },
  { value: 'company', label: 'Company', icon: Building, color: 'bg-emerald-500' },
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'bg-red-500' },
];

const weekDays = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const emptyFormData = {
  holidayName: '',
  date: '',
  holidayType: 'company',
  description: '',
  allowPunch: false,
  isHalfDay: false,
  isPaid: true,
  isOptional: false,
  compensatoryOff: false,
  isRecurring: false,
  recurringDay: 0,
  status: 'active',
};

export function HolidayManagement({ organizationId, adminId }: HolidayManagementProps) {
  const { t } = useLanguageStore();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [stats, setStats] = useState<HolidayStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [formData, setFormData] = useState({ ...emptyFormData });

  // Fetch holidays
  const fetchHolidays = async () => {
    if (!organizationId) {
      setError(t.holiday.organizationNotFound);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/holidays?organizationId=${organizationId}`);
      const data = await response.json();

      if (data.success) {
        setHolidays(data.holidays || []);
        setStats(data.stats || null);
      } else {
        setError(data.error || t.holiday.failedFetchHolidays);
      }
    } catch (err) {
      console.error('Error fetching holidays:', err);
      setError(t.holiday.failedFetchConnection);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [organizationId]);

  // Sync with Google Calendar
  const handleSyncGoogleCalendar = async () => {
    if (!organizationId) {
      setError(t.holiday.organizationNotFound);
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/holidays/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, adminId, country: 'indian' }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`${t.holiday.syncIndianHolidays}: ${data.added || 0} (${data.skipped || 0} ${t.holiday.repeatEveryWeek})`);
        fetchHolidays();
      } else {
        setError(data.error || 'Failed to sync holidays');
      }
    } catch (err) {
      console.error('Error syncing holidays:', err);
      setError(t.holiday.failedFetchConnection);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add/Edit holiday
  const handleSaveHoliday = async () => {
    if (!formData.holidayName || !formData.date) {
      setError(t.holiday.holidayNameDateRequired);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = '/api/holidays';
      const method = editingHoliday ? 'PUT' : 'POST';
      const body = editingHoliday
        ? { id: editingHoliday.id, ...formData }
        : { organizationId, createdBy: adminId, ...formData };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(editingHoliday ? t.holiday.holidayUpdated : t.holiday.holidayAdded);
        setShowAddDialog(false);
        setEditingHoliday(null);
        setFormData({ ...emptyFormData });
        fetchHolidays();
      } else {
        setError(data.error || t.holiday.failedSaveHoliday);
      }
    } catch (err) {
      console.error('Error saving holiday:', err);
      setError(t.holiday.failedSaveTryAgain);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick toggle (allowPunch, isPaid, etc.) — directly update a single field
  const handleQuickToggle = async (holiday: Holiday, field: string, value: boolean) => {
    try {
      const response = await fetch('/api/holidays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: holiday.id,
          holidayName: holiday.holidayName,
          date: holiday.date,
          holidayType: holiday.holidayType,
          description: holiday.description || '',
          allowPunch: field === 'allowPunch' ? value : holiday.allowPunch,
          isHalfDay: field === 'isHalfDay' ? value : holiday.isHalfDay,
          isPaid: field === 'isPaid' ? value : holiday.isPaid,
          isOptional: field === 'isOptional' ? value : holiday.isOptional,
          compensatoryOff: field === 'compensatoryOff' ? value : holiday.compensatoryOff,
          isRecurring: holiday.isRecurring,
          recurringDay: holiday.recurringDay || 0,
          status: holiday.status,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchHolidays();
        const labelMap: Record<string, string> = {
          allowPunch: t.holiday.allowAttendance,
          isHalfDay: t.holiday.halfDay,
          isPaid: t.holiday.paid,
          isOptional: t.holiday.optionalLabel,
          compensatoryOff: t.holiday.compOffLabel,
        };
        setSuccess(`${holiday.holidayName}: ${labelMap[field] || field} ${value ? t.holiday.enabled : t.holiday.disabled}`);
      }
    } catch (err) {
      setError(t.holiday.failedUpdateHoliday);
    }
  };

  // Toggle publish/draft status
  const handleTogglePublish = async (holiday: Holiday) => {
    const newStatus = holiday.status === 'active' ? 'draft' : 'active';
    try {
      const response = await fetch('/api/holidays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: holiday.id,
          holidayName: holiday.holidayName,
          date: holiday.date,
          holidayType: holiday.holidayType,
          description: holiday.description || '',
          allowPunch: holiday.allowPunch,
          isHalfDay: holiday.isHalfDay,
          isPaid: holiday.isPaid,
          isOptional: holiday.isOptional,
          compensatoryOff: holiday.compensatoryOff,
          isRecurring: holiday.isRecurring,
          recurringDay: holiday.recurringDay || 0,
          status: newStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(newStatus === 'active'
          ? `${holiday.holidayName} - ${t.holiday.holidayPublished}`
          : `${holiday.holidayName} - ${t.holiday.holidayHidden}`
        );
        fetchHolidays();
      }
    } catch (err) {
      setError(t.holiday.failedUpdateHoliday);
    }
  };

  // Delete holiday
  const handleDeleteHoliday = async () => {
    if (!deletingHoliday) return;

    try {
      const response = await fetch(`/api/holidays?id=${deletingHoliday.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t.holiday.holidayDeleted);
        setDeletingHoliday(null);
        fetchHolidays();
      } else {
        setError(data.error || t.holiday.failedDeleteHoliday);
      }
    } catch (err) {
      console.error('Error deleting holiday:', err);
      setError(t.holiday.failedDeleteTryAgain);
    }
  };

  // Open edit dialog with holiday data
  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      holidayName: holiday.holidayName,
      date: holiday.date,
      holidayType: holiday.holidayType,
      description: holiday.description || '',
      allowPunch: holiday.allowPunch,
      isHalfDay: holiday.isHalfDay,
      isPaid: holiday.isPaid,
      isOptional: holiday.isOptional,
      compensatoryOff: holiday.compensatoryOff,
      isRecurring: holiday.isRecurring,
      recurringDay: holiday.recurringDay || 0,
      status: holiday.status || 'active',
    });
    setShowAddDialog(true);
  };

  // Get holiday type info
  const getHolidayTypeInfo = (type: string) => {
    return holidayTypes.find(ht => ht.value === type) || holidayTypes[3];
  };

  // Calendar navigation
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // Generate calendar days
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    const today = new Date().toISOString().split('T')[0];

    const days: Array<{ day: number; date: string; holiday?: Holiday | undefined; isToday: boolean } | null> = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split('T')[0];
      const holiday = holidays.find(h => h.date === dateStr);
      const isToday = dateStr === today;
      days.push({ day: i, date: dateStr, holiday, isToday });
    }
    return days;
  };

  // Get upcoming holidays
  const getUpcomingHolidays = () => {
    const today = new Date().toISOString().split('T')[0];
    return holidays
      .filter(h => h.date >= today && h.status === 'active')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(null); setSuccess(null); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => {
              setEditingHoliday(null);
              setFormData({ ...emptyFormData });
              setShowAddDialog(true);
            }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.holiday.addHoliday}
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncGoogleCalendar}
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {t.holiday.syncIndianHolidays}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            {stats?.activeHolidays || 0} {t.holiday.employeesCanSee}
          </Badge>
          <Badge variant="outline" className="text-xs border-dashed">
            <EyeOff className="h-3 w-3 mr-1" />
            {stats?.draftHolidays || 0} {t.holiday.draft}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
          {[
            { label: t.holiday.total, value: stats.totalHolidays, color: 'text-foreground' },
            { label: t.holiday.paid, value: stats.paidHolidays, color: 'text-emerald-500' },
            { label: t.holiday.halfDay, value: stats.halfDayHolidays, color: 'text-amber-500' },
            { label: t.holiday.optionalLabel, value: stats.optionalHolidays, color: 'text-blue-500' },
            { label: t.holiday.compOffLabel, value: stats.compOffHolidays, color: 'text-teal-500' },
            { label: t.holiday.published, value: stats.activeHolidays, color: 'text-emerald-500' },
            { label: t.holiday.draft, value: stats.draftHolidays, color: 'text-orange-400' },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm py-2 px-3">
              <p className={`text-lg sm:text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Error/Success Messages */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Alert className="border-emerald-500 bg-emerald-500/10">
              <Check className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-emerald-600 dark:text-emerald-400">{success}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {!organizationId && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{t.holiday.organizationNotFound}</AlertDescription>
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar View */}
        <Card className="lg:col-span-2 border-0 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                {t.holiday.holidayCalendar}
              </CardTitle>
              <div className="flex items-center gap-1 sm:gap-2 self-center">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-medium text-sm sm:text-base min-w-[120px] sm:min-w-[150px] text-center">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-[10px] sm:text-xs font-medium text-muted-foreground py-1 sm:py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {getCalendarDays().map((day, index) => (
                <div
                  key={index}
                  className={`aspect-square p-0.5 sm:p-1 rounded-lg text-xs sm:text-sm relative flex flex-col items-center justify-center cursor-pointer transition-all ${
                    day?.isToday ? 'ring-2 ring-emerald-400' : ''
                  } ${
                    day?.holiday
                      ? day.holiday.status === 'draft'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 border border-dashed border-amber-400'
                        : day.holiday.isHalfDay
                          ? 'bg-amber-400 text-white font-medium'
                          : `${getHolidayTypeInfo(day.holiday.holidayType).color} text-white font-medium`
                      : day ? 'hover:bg-muted' : ''
                  }`}
                  title={day?.holiday ? `${day.holiday.holidayName}${day.holiday.status === 'draft' ? ` (${t.holiday.draftHidden})` : ''}` : undefined}
                  onClick={() => day?.holiday && openEditDialog(day.holiday)}
                >
                  {day?.day}
                  {day?.holiday?.isHalfDay && day.holiday.status === 'active' && (
                    <span className="text-[6px] sm:text-[8px] leading-none">1/2</span>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
              {holidayTypes.map((type) => (
                <div key={type.value} className="flex items-center gap-1">
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded ${type.color}`} />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{type.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-amber-400" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">{t.holiday.halfDay}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded border border-dashed border-amber-400 bg-amber-100 dark:bg-amber-900/30" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">{t.holiday.draftHidden}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Holidays */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                {t.holiday.upcoming}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getUpcomingHolidays().length === 0 ? (
                <p className="text-muted-foreground text-xs sm:text-sm text-center py-3 sm:py-4">{t.holiday.noUpcomingHolidays}</p>
              ) : (
                <div className="space-y-2">
                  {getUpcomingHolidays().map((holiday) => {
                    const typeInfo = getHolidayTypeInfo(holiday.holidayType);
                    return (
                      <div key={holiday.id} className="p-2 sm:p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => openEditDialog(holiday)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs sm:text-sm truncate mr-2">{holiday.holidayName}</span>
                          <Badge className={`${typeInfo.color} text-white text-[10px] sm:text-xs flex-shrink-0`}>{typeInfo.label}</Badge>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {holiday.isHalfDay && <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-400 text-amber-500">{t.holiday.halfDayLabel}</Badge>}
                          {holiday.isOptional && <Badge variant="outline" className="text-[8px] px-1 py-0 border-blue-400 text-blue-500">{t.holiday.optionalLabel}</Badge>}
                          {holiday.compensatoryOff && <Badge variant="outline" className="text-[8px] px-1 py-0 border-teal-400 text-teal-500">{t.holiday.compOffLabel}</Badge>}
                          {!holiday.isPaid && <Badge variant="outline" className="text-[8px] px-1 py-0 border-red-400 text-red-500">{t.holiday.unpaidLabel}</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Holidays List */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">{t.holiday.allHolidays} ({holidays.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] sm:h-[350px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>
                ) : holidays.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground text-xs sm:text-sm">{t.holiday.noHolidaysFound}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.holiday.addHolidaysManually}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {holidays
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((holiday) => {
                        const typeInfo = getHolidayTypeInfo(holiday.holidayType);
                        const isDraft = holiday.status === 'draft';
                        const isActive = holiday.status === 'active';
                        return (
                          <div key={holiday.id} className={`p-2 sm:p-3 rounded-lg transition-colors ${isDraft ? 'bg-amber-50 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-700' : 'bg-muted/30'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditDialog(holiday)}>
                                <p className="font-medium text-xs sm:text-sm truncate">{holiday.holidayName}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                {/* Feature badges */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <Badge className={`${typeInfo.color} text-white text-[10px]`}>{typeInfo.label}</Badge>
                                  {isActive && <Badge variant="outline" className="text-[8px] px-1 py-0 border-emerald-400 text-emerald-600">{t.holiday.employeesCanSee}</Badge>}
                                  {isDraft && <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-400 text-amber-600">{t.holiday.draftHidden}</Badge>}
                                  {holiday.isHalfDay && <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-400 text-amber-500">{t.holiday.halfDayLabel}</Badge>}
                                  {holiday.allowPunch && <Badge variant="outline" className="text-[8px] px-1 py-0 border-emerald-400 text-emerald-500">{t.holiday.punchAllowed}</Badge>}
                                  {!holiday.isPaid && <Badge variant="outline" className="text-[8px] px-1 py-0 border-red-400 text-red-500">{t.holiday.unpaidLabel}</Badge>}
                                  {holiday.isOptional && <Badge variant="outline" className="text-[8px] px-1 py-0 border-blue-400 text-blue-500">{t.holiday.optionalLabel}</Badge>}
                                  {holiday.compensatoryOff && <Badge variant="outline" className="text-[8px] px-1 py-0 border-teal-400 text-teal-500">{t.holiday.compOffLabel}</Badge>}
                                </div>
                              </div>
                              {/* Action buttons column */}
                              <div className="flex flex-col items-center gap-0.5">
                                {/* Publish/Hide toggle */}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTogglePublish(holiday)}
                                  title={isActive ? t.holiday.hideFromEmployees : t.holiday.showToEmployees}>
                                  {isActive ? <EyeOff className="h-3 w-3 text-red-400" /> : <Send className="h-3 w-3 text-emerald-500" />}
                                </Button>
                                {/* Edit */}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(holiday)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                {/* Delete */}
                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-red-500" onClick={() => setDeletingHoliday(holiday)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Holiday Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingHoliday ? t.holiday.editHoliday : t.holiday.addHoliday}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingHoliday ? t.holiday.editHolidayDesc : t.holiday.addHolidayDesc}
            </DialogDescription>
          </DialogHeader>

          {!editingHoliday && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                {t.holiday.draftNote}
              </p>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            {/* Basic Info */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">{t.holiday.holidayNameRequired}</Label>
              <Input placeholder="e.g., Diwali, Independence Day" value={formData.holidayName}
                onChange={(e) => setFormData({ ...formData, holidayName: e.target.value })} className="text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">{t.holiday.date} *</Label>
                <Input type="date" value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">{t.holiday.selectType}</Label>
                <Select value={formData.holidayType} onValueChange={(value) => setFormData({ ...formData, holidayType: value })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {holidayTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-sm">
                        <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded ${type.color}`} />{type.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">{t.holiday.description}</Label>
              <Textarea placeholder={t.holiday.descriptionPlaceholder} value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-sm min-h-[60px] resize-none" />
            </div>

            <Separator />

            {/* Attendance Control */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> {t.holiday.attendanceRules}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {formData.allowPunch ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-red-400" />}
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{t.holiday.allowAttendance}</p>
                      <p className="text-[10px] text-muted-foreground">{t.holiday.allowAttendanceDesc}</p>
                    </div>
                  </div>
                  <Switch checked={formData.allowPunch} onCheckedChange={(c) => setFormData({ ...formData, allowPunch: c })} />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{t.holiday.halfDayHoliday}</p>
                      <p className="text-[10px] text-muted-foreground">{t.holiday.halfDayHolidayDesc}</p>
                    </div>
                  </div>
                  <Switch checked={formData.isHalfDay} onCheckedChange={(c) => setFormData({ ...formData, isHalfDay: c })} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Salary / Payment Control */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CircleDollarSign className="h-3 w-3" /> {t.holiday.salaryPayment}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {formData.isPaid ? <HandCoins className="h-4 w-4 text-emerald-500" /> : <HandCoins className="h-4 w-4 text-red-400" />}
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{t.holiday.paidHoliday}</p>
                      <p className="text-[10px] text-muted-foreground">{t.holiday.paidHolidayDesc}</p>
                    </div>
                  </div>
                  <Switch checked={formData.isPaid} onCheckedChange={(c) => setFormData({ ...formData, isPaid: c })} />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{t.holiday.optionalHoliday}</p>
                      <p className="text-[10px] text-muted-foreground">{t.holiday.optionalHolidayDesc}</p>
                    </div>
                  </div>
                  <Switch checked={formData.isOptional} onCheckedChange={(c) => setFormData({ ...formData, isOptional: c })} />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="h-4 w-4 text-teal-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{t.holiday.compensatoryOff}</p>
                      <p className="text-[10px] text-muted-foreground">{t.holiday.compensatoryOffDesc}</p>
                    </div>
                  </div>
                  <Switch checked={formData.compensatoryOff} onCheckedChange={(c) => setFormData({ ...formData, compensatoryOff: c })} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Recurring / Weekly Off */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> {t.holiday.weeklyOff}
              </h4>
              <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                <div>
                  <p className="text-xs sm:text-sm font-medium">{t.holiday.repeatEveryWeek}</p>
                  <p className="text-[10px] text-muted-foreground">{t.holiday.weeklyOffRecurring}</p>
                </div>
                <Switch checked={formData.isRecurring} onCheckedChange={(c) => setFormData({ ...formData, isRecurring: c })} />
              </div>

              {formData.isRecurring && (
                <div className="space-y-1.5 sm:space-y-2 mt-2">
                  <Label className="text-xs sm:text-sm">{t.holiday.dayOfWeek}</Label>
                  <Select value={formData.recurringDay.toString()}
                    onValueChange={(value) => setFormData({ ...formData, recurringDay: parseInt(value) })}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {weekDays.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()} className="text-sm">{day.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Status - only show when editing */}
            {editingHoliday && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Send className="h-3 w-3" /> {t.holiday.showToEmployees}
                </h4>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-emerald-500" />{t.holiday.publishedEmployees}</span>
                    </SelectItem>
                    <SelectItem value="draft">
                      <span className="flex items-center gap-2"><EyeOff className="h-3.5 w-3.5 text-amber-500" />{t.holiday.draftHidden}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2 sm:pt-4">
              <Button variant="outline" className="flex-1 text-sm h-10 sm:h-11"
                onClick={() => { setShowAddDialog(false); setEditingHoliday(null); }}>
                {t.common.cancel}
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-sm h-10 sm:h-11"
                onClick={handleSaveHoliday} disabled={isLoading || !formData.holidayName || !formData.date}>
                {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                {editingHoliday ? t.common.save : t.common.add}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingHoliday} onOpenChange={(open) => { if (!open) setDeletingHoliday(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.holiday.deleteHoliday}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.holiday.confirmDeleteHoliday} — <strong>{deletingHoliday?.holidayName}</strong>
              <br />
              {t.holiday.deleteHolidayWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingHoliday(null)}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDeleteHoliday}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
