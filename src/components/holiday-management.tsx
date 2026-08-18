'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, RefreshCw, Trash2, Edit, Check,
  Sun, PartyPopper, Building, AlertTriangle, Clock,
  ChevronLeft, ChevronRight, Download,
  Eye, EyeOff, CalendarDays, Send, X,
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
import { fetchJSON } from '@/lib/utils';

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
  syncSource?: string;
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

interface SyncPreview {
  holidays: Array<{ date: string; name: string; type: string }>;
  count: number;
  year: number;
  source: string;
  hasGoogleKey: boolean;
}

interface HolidayManagementProps {
  organizationId: string;
  adminId: string;
}

type CalendarDayItem = {
  day: number;
  date: string;
  holiday?: Holiday;
  isToday: boolean;
} | null;

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

const syncYears = [2024, 2025, 2026, 2027];

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
  status: 'draft',
};

const fallbackT = {
  syncHolidays: 'Sync Holidays',
  previewSync: 'Preview sync before importing',
  publishAll: 'Publish All',
  deleteDrafts: 'Delete Drafts',
  draftBanner: (count: number) => `${count} holiday${count === 1 ? '' : 's'} in draft (Hidden from employees)`,
  published: 'Active (Visible)',
  all: 'All',
  status: 'Status',
  draftDescription: 'Drafts are hidden from employee app until published',
  publishedDescription: 'Published holidays are visible to employees',
  publishedVisible: 'Published (Visible to Employees)',
  holidayNamePlaceholder: 'e.g. Independence Day, Diwali, Annual Day',
  rules: 'Rules & Settings',
  allowPunchDesc: 'Allow employees to punch attendance on this holiday',
  halfDayDesc: 'Half day off (morning or afternoon)',
  selectDay: 'Select day of week',
  deleteHolidayConfirm: 'Delete Holiday Confirmation',
};

function getSourceDisplayName(source: string): string {
  if (source === 'india-post') return 'India Post (Government Live)';
  if (source === 'office-holidays-ics') return 'Office Holidays iCal';
  if (source === 'google-calendar') return 'Google Calendar';
  return 'Indian Standard Calendar';
}

function getSyncSourceBadge(source?: string): { label: string; color: string } | null {
  if (!source) return null;
  if (source === 'india-post') return { label: 'India Post', color: 'border-orange-400 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20' };
  if (source === 'office-holidays-ics') return { label: 'Office Holidays', color: 'border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20' };
  if (source === 'google-calendar') return { label: 'Google Cal', color: 'border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' };
  return { label: 'Indian Std', color: 'border-teal-400 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/20' };
}

export function HolidayManagement({ organizationId, adminId }: HolidayManagementProps) {
  const { t } = useLanguageStore();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [stats, setStats] = useState<HolidayStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Sync State
  const [syncYear, setSyncYear] = useState<number>(new Date().getFullYear());
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [syncPreviewLoading, setSyncPreviewLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [formData, setFormData] = useState({ ...emptyFormData });
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [isBulkAction, setIsBulkAction] = useState(false);

  // Fetch holidays
  const fetchHolidays = async (statusFilter?: string) => {
    if (!organizationId) {
      setError(t.holiday.organizationNotFound);
      setIsLoading(false);
      return;
    }

    try {
      const filterParam = statusFilter || activeFilter;
      const url = `/api/holidays?organizationId=${organizationId}${filterParam !== 'all' ? `&status=${filterParam}` : ''}`;
      const data = await fetchJSON(url);

      if (data?.success) {
        setHolidays(data.holidays || []);
        setStats(data.stats || null);
      } else {
        setError(data?.error || t.holiday.failedFetchHolidays);
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

  // Re-fetch when filter changes
  useEffect(() => {
    if (organizationId) {
      fetchHolidays(activeFilter);
    }
  }, [activeFilter, organizationId]);

  // Handle Sync Preview (GET)
  const handleSyncPreview = async () => {
    setSyncPreviewLoading(true);
    setError(null);
    try {
      const data = await fetchJSON<{
        success?: boolean;
        holidays?: Array<{ date: string; name: string; type: string }>;
        count?: number;
        year?: number;
        source?: string;
        hasGoogleKey?: boolean;
        error?: string;
      }>(`/api/holidays/sync?year=${syncYear}`);

      if (data?.success) {
        setSyncPreview({
          holidays: data.holidays || [],
          count: data.count || (data.holidays?.length ?? 0),
          year: data.year || syncYear,
          source: data.source || 'static-database',
          hasGoogleKey: !!data.hasGoogleKey,
        });
      } else {
        setError(data?.error || 'Failed to fetch holiday preview');
      }
    } catch (err) {
      console.error('Sync preview error:', err);
      setError(t.holiday.failedFetchConnection);
    } finally {
      setSyncPreviewLoading(false);
    }
  };

  // Handle Sync Holidays (POST) - Saves as draft
  const handleSyncHolidays = async () => {
    if (!organizationId || !adminId) return;

    setIsSyncing(true);
    setError(null);

    try {
      const data = await fetchJSON<{
        success?: boolean;
        added?: number;
        skipped?: number;
        total?: number;
        source?: string;
        sourceLabel?: string;
        error?: string;
        message?: string;
      }>('/api/holidays/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          adminId,
          year: syncYear,
        }),
      });

      if (data?.success) {
        setSuccess(data.message || `${data.added || 0} holidays synced into Draft`);
        setSyncPreview(null);
        fetchHolidays(activeFilter);
      } else {
        setError(data?.error || 'Failed to sync holidays');
      }
    } catch (err) {
      console.error('Holiday sync error:', err);
      setError(t.holiday.failedFetchConnection);
    } finally {
      setIsSyncing(false);
    }
  };

  // Bulk actions (PATCH)
  const handleBulkAction = async (action: string) => {
    if (!organizationId) return;

    setIsBulkAction(true);
    setError(null);

    try {
      const data = await fetchJSON('/api/holidays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, action }),
      });

      if (data?.success) {
        const actionLabel = action === 'publish-all'
          ? `${data.count} holidays published`
          : `${data.count} draft holidays deleted`;
        setSuccess(actionLabel);
        fetchHolidays(activeFilter);
      } else {
        setError(data?.error || 'Bulk action failed');
      }
    } catch (err) {
      console.error('Error in bulk action:', err);
      setError(t.holiday.failedFetchConnection);
    } finally {
      setIsBulkAction(false);
    }
  };

  // Add/Edit holiday
  const handleSaveHoliday = async () => {
    if (!formData.holidayName || !formData.date) {
      setError(t.holiday.holidayNameDateRequired);
      return;
    }

    try {
      setError(null);
      if (editingHoliday) {
        // Update
        const payload = {
          id: editingHoliday.id,
          holidayName: formData.holidayName,
          date: formData.date,
          holidayType: formData.holidayType,
          description: formData.description,
          allowPunch: formData.allowPunch,
          isHalfDay: formData.isHalfDay,
          isPaid: formData.isPaid,
          isOptional: formData.isOptional,
          compensatoryOff: formData.compensatoryOff,
          isRecurring: formData.isRecurring,
          recurringDay: formData.recurringDay,
          status: formData.status,
        };

        // Optimistic UI update
        setHolidays(prev => prev.map(h => h.id === editingHoliday.id ? { ...h, ...payload } : h));
        setShowAddDialog(false);
        setEditingHoliday(null);
        setFormData({ ...emptyFormData });

        const data = await fetchJSON('/api/holidays', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (data?.success) {
          setSuccess(t.holiday.holidayUpdated);
          fetchHolidays(activeFilter);
        } else {
          setError(data?.error || t.holiday.failedUpdateHoliday);
          fetchHolidays(activeFilter);
        }
      } else {
        // Create (defaults to draft)
        const payload = {
          organizationId,
          createdBy: adminId,
          ...formData,
        };

        const data = await fetchJSON('/api/holidays', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (data?.success && data.holiday) {
          const isPublished = formData.status === 'active';
          setSuccess(isPublished ? 'Holiday created and published' : 'Holiday created as draft');
          setShowAddDialog(false);
          setFormData({ ...emptyFormData });
          setHolidays(prev => [...prev, data.holiday]);
          fetchHolidays(activeFilter);
        } else {
          setError(data?.error || t.holiday.failedSaveHoliday);
        }
      }
    } catch (err) {
      console.error('Error saving holiday:', err);
      setError(t.holiday.failedFetchConnection);
      fetchHolidays(activeFilter);
    }
  };

  // Toggle publish/draft (On/Off) on individual holiday
  const handleTogglePublish = async (holiday: Holiday) => {
    const newStatus = holiday.status === 'active' ? 'draft' : 'active';
    
    // Instant optimistic UI update
    setHolidays(prev => prev.map(h => h.id === holiday.id ? { ...h, status: newStatus } : h));

    try {
      const data = await fetchJSON('/api/holidays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: holiday.id,
          status: newStatus,
        }),
      });

      if (data?.success) {
        setSuccess(newStatus === 'active' ? `"${holiday.holidayName}" is now Active (Visible to Employees)` : `"${holiday.holidayName}" is now Off / Draft (Hidden)`);
        fetchHolidays(activeFilter);
      } else {
        setError(data?.error || 'Failed to update status');
        fetchHolidays(activeFilter);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError(t.holiday.failedFetchConnection);
      fetchHolidays(activeFilter);
    }
  };

  // Delete holiday
  const handleDeleteHoliday = async () => {
    if (!deletingHoliday) return;
    const targetId = deletingHoliday.id;
    const targetName = deletingHoliday.holidayName;

    // Optimistic UI delete
    setHolidays(prev => prev.filter(h => h.id !== targetId));
    setDeletingHoliday(null);

    try {
      setError(null);
      const data = await fetchJSON(`/api/holidays?id=${targetId}`, {
        method: 'DELETE',
      });

      if (data?.success) {
        setSuccess(`"${targetName}" ${t.holiday.holidayDeleted}`);
        fetchHolidays(activeFilter);
      } else {
        setError(data?.error || t.holiday.failedDeleteHoliday);
        fetchHolidays(activeFilter);
      }
    } catch (err) {
      console.error('Error deleting holiday:', err);
      setError(t.holiday.failedFetchConnection);
      fetchHolidays(activeFilter);
    }
  };

  // Open edit dialog
  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      holidayName: holiday.holidayName || '',
      date: holiday.date || '',
      holidayType: holiday.holidayType || 'company',
      description: holiday.description || '',
      allowPunch: Boolean(holiday.allowPunch),
      isHalfDay: Boolean(holiday.isHalfDay),
      isPaid: holiday.isPaid !== undefined ? Boolean(holiday.isPaid) : true,
      isOptional: Boolean(holiday.isOptional),
      compensatoryOff: Boolean(holiday.compensatoryOff),
      isRecurring: Boolean(holiday.isRecurring),
      recurringDay: holiday.recurringDay || 0,
      status: holiday.status || 'draft',
    });
    setShowAddDialog(true);
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      daysInMonth: lastDay.getDate(),
      startingDay: firstDay.getDay(),
    };
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getCalendarDays = (): CalendarDayItem[] => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
    const days: CalendarDayItem[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holiday = holidays.find(h => h.date === dateStr);
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push({
        day,
        date: dateStr,
        holiday,
        isToday,
      });
    }

    return days;
  };

  const getHolidayTypeInfo = (type: string) => {
    return holidayTypes.find(t => t.value === type) || holidayTypes[3];
  };

  // Get upcoming holidays (only active)
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

  // Filter tabs data
  const filterTabs = [
    { key: 'all' as const, label: (t.holiday as Record<string, string>).all || fallbackT.all, count: holidays.length },
    { key: 'active' as const, label: 'Published / Active', count: stats?.activeHolidays || 0 },
    { key: 'draft' as const, label: 'Drafts / Off', count: stats?.draftHolidays || 0 },
  ];

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
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm w-full sm:w-auto font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.holiday.addHoliday}
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs font-normal">
            <Eye className="h-3 w-3 mr-1 text-emerald-500" />
            {stats?.activeHolidays || 0} {t.holiday.employeesCanSee}
          </Badge>
          <Badge variant="outline" className="text-xs border-dashed text-amber-600 dark:text-amber-400 border-amber-400 font-normal">
            <EyeOff className="h-3 w-3 mr-1" />
            {stats?.draftHolidays || 0} {t.holiday.draft}
          </Badge>
        </div>
      </div>

      {/* Sync Holidays Section */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Download className="h-4 w-4 text-emerald-500" />
                {fallbackT.syncHolidays}
              </h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                {t.holiday.syncIndianHolidays} {fallbackT.previewSync}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Year Selector */}
              <Select
                value={syncYear.toString()}
                onValueChange={(val) => {
                  setSyncYear(parseInt(val));
                  setSyncPreview(null);
                }}
              >
                <SelectTrigger className="w-[90px] h-9 text-xs sm:text-sm bg-background">
                  <CalendarDays className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {syncYears.map((y) => (
                    <SelectItem key={y} value={y.toString()} className="text-xs sm:text-sm">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Preview / Sync buttons */}
              {!syncPreview ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncPreview}
                  disabled={syncPreviewLoading}
                  className="h-9 text-xs bg-background hover:bg-muted"
                >
                  {syncPreviewLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {syncPreviewLoading ? 'Checking...' : 'Preview'}
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={handleSyncHolidays}
                    disabled={isSyncing}
                    className="h-9 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm"
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {isSyncing ? 'Syncing...' : `Sync ${syncPreview.count} (as Draft)`}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSyncPreview(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sync Preview Info Drawer */}
          <AnimatePresence>
            {syncPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="bg-background/90 rounded-lg p-3 text-[10px] sm:text-xs border shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {syncPreview.count} holidays detected for {syncPreview.year}
                    </p>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-400 text-emerald-600">
                      Source: {getSourceDisplayName(syncPreview.source)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[10px]">
                    Note: Click &quot;Sync&quot; to import these holidays into Draft status. Admin can review and publish anytime.
                  </p>
                  <ScrollArea className="h-[120px] w-full rounded border p-2 bg-muted/20">
                    <div className="space-y-1.5">
                      {syncPreview.holidays.map((h, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px] sm:text-xs py-0.5 border-b border-border/40 last:border-0">
                          <span className="font-medium truncate mr-2">{h.name}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-muted-foreground">{h.date}</span>
                            <Badge className={`${getHolidayTypeInfo(h.type).color} text-white text-[8px] px-1 py-0`}>
                              {h.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
          {[
            { label: t.holiday.total, value: stats.totalHolidays, color: 'text-foreground' },
            { label: 'Active', value: stats.activeHolidays, color: 'text-emerald-500' },
            { label: 'Draft / Off', value: stats.draftHolidays, color: 'text-amber-500' },
            { label: t.holiday.paid, value: stats.paidHolidays, color: 'text-emerald-600' },
            { label: t.holiday.halfDay, value: stats.halfDayHolidays, color: 'text-amber-500' },
            { label: t.holiday.optionalLabel, value: stats.optionalHolidays, color: 'text-blue-500' },
            { label: t.holiday.compOffLabel, value: stats.compOffHolidays, color: 'text-teal-500' },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm py-2 px-3">
              <p className={`text-lg sm:text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label} <span className="text-[10px] ml-1 opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar — shown when drafts exist and filter is all or draft */}
      <AnimatePresence>
        {(stats?.draftHolidays ?? 0) > 0 && (activeFilter === 'all' || activeFilter === 'draft') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5">
              <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                {fallbackT.draftBanner(stats?.draftHolidays ?? 0)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  onClick={() => handleBulkAction('publish-all')}
                  disabled={isBulkAction}
                >
                  {isBulkAction ? <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> : <Send className="h-3 w-3 mr-1.5" />}
                  {fallbackT.publishAll}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => handleBulkAction('delete-drafts')}
                  disabled={isBulkAction}
                >
                  {isBulkAction ? <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1.5" />}
                  {fallbackT.deleteDrafts}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                      <div
                        key={holiday.id}
                        className="p-2 sm:p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => openEditDialog(holiday)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs sm:text-sm truncate mr-2">{holiday.holidayName}</span>
                          <Badge className={`${typeInfo.color} text-white text-[10px] sm:text-xs flex-shrink-0`}>{typeInfo.label}</Badge>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
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
              <ScrollArea className="h-[320px] sm:h-[360px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>
                ) : holidays.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground text-xs sm:text-sm">{t.holiday.noHolidaysFound}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.holiday.addHolidaysManually}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {holidays
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((holiday) => {
                        const typeInfo = getHolidayTypeInfo(holiday.holidayType);
                        const isDraft = holiday.status === 'draft';
                        const isActive = holiday.status === 'active';
                        const syncBadge = getSyncSourceBadge(holiday.syncSource);
                        return (
                          <div
                            key={holiday.id}
                            className={`p-2.5 sm:p-3 rounded-lg transition-all border ${
                              isDraft
                                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-dashed border-amber-300 dark:border-amber-700'
                                : 'bg-card border-border/70 shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {/* Left Info Column */}
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditDialog(holiday)}>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{holiday.holidayName}</p>
                                  {/* On/Off Status Badge Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTogglePublish(holiday);
                                    }}
                                    className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                                      isActive
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                                    }`}
                                    title={isActive ? 'Click to turn OFF (Draft)' : 'Click to turn ON (Publish)'}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {isActive ? 'Active (On)' : 'Draft (Off)'}
                                  </button>
                                  {syncBadge && (
                                    <Badge variant="outline" className={`text-[8px] px-1.5 py-0 ${syncBadge.color}`}>
                                      📡 {syncBadge.label}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                                  {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                {holiday.description && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 italic">
                                    {holiday.description}
                                  </p>
                                )}
                                {/* Feature Badges */}
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  <Badge className={`${typeInfo.color} text-white text-[9px] px-1.5 py-0`}>{typeInfo.label}</Badge>
                                  {holiday.isHalfDay && <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-400 text-amber-500">{t.holiday.halfDayLabel}</Badge>}
                                  {holiday.allowPunch && <Badge variant="outline" className="text-[8px] px-1 py-0 border-emerald-400 text-emerald-500">{t.holiday.punchAllowed}</Badge>}
                                  {!holiday.isPaid && <Badge variant="outline" className="text-[8px] px-1 py-0 border-red-400 text-red-500">{t.holiday.unpaidLabel}</Badge>}
                                  {holiday.isOptional && <Badge variant="outline" className="text-[8px] px-1 py-0 border-blue-400 text-blue-500">{t.holiday.optionalLabel}</Badge>}
                                  {holiday.compensatoryOff && <Badge variant="outline" className="text-[8px] px-1 py-0 border-teal-400 text-teal-500">{t.holiday.compOffLabel}</Badge>}
                                </div>
                              </div>

                              {/* Right Actions Column */}
                              <div className="flex items-center gap-1 self-start flex-shrink-0">
                                {/* Edit Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 sm:w-auto sm:px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(holiday);
                                  }}
                                  title="Edit Holiday"
                                >
                                  <Edit className="h-3 w-3" />
                                  <span className="hidden sm:inline">Edit</span>
                                </Button>
                                {/* Delete Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 sm:w-auto sm:px-2 text-xs flex items-center gap-1 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingHoliday(holiday);
                                  }}
                                  title="Delete Holiday"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span className="hidden sm:inline">Delete</span>
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

          <div className="space-y-3 sm:space-y-4 py-2">
            {/* Status (Draft vs Published) */}
            <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/40 border">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>{fallbackT.status}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {formData.status === 'draft' ? fallbackT.draftDescription : fallbackT.publishedDescription}
                </span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="text-xs sm:text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <EyeOff className="h-3.5 w-3.5" />
                      {t.holiday.draftHidden}
                    </span>
                  </SelectItem>
                  <SelectItem value="active">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <Eye className="h-3.5 w-3.5" />
                      {fallbackT.publishedVisible}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Holiday Name */}
            <div className="space-y-1.5">
              <Label htmlFor="holidayName" className="text-xs sm:text-sm">{t.holiday.holidayName} *</Label>
              <Input
                id="holidayName"
                value={formData.holidayName}
                onChange={(e) => setFormData({ ...formData, holidayName: e.target.value })}
                placeholder={fallbackT.holidayNamePlaceholder}
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs sm:text-sm">{t.holiday.date} *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Holiday Type */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t.holiday.type}</Label>
              <Select
                value={formData.holidayType}
                onValueChange={(value) => setFormData({ ...formData, holidayType: value })}
              >
                <SelectTrigger className="text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {holidayTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${type.color}`} />
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs sm:text-sm">{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs sm:text-sm">{t.holiday.description}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.holiday.descriptionPlaceholder}
                rows={2}
                className="text-xs sm:text-sm"
              />
            </div>

            <Separator />

            {/* Attendance & Salary Rules */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">{fallbackT.rules}</p>

              {/* Paid Holiday */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium">{t.holiday.paidHoliday}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{t.holiday.paidHolidayDesc}</p>
                </div>
                <Switch
                  checked={formData.isPaid}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
                />
              </div>

              {/* Allow Punch */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium">{t.holiday.allowAttendance}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{fallbackT.allowPunchDesc}</p>
                </div>
                <Switch
                  checked={formData.allowPunch}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowPunch: checked })}
                />
              </div>

              {/* Half Day */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium">{t.holiday.halfDayHoliday}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{fallbackT.halfDayDesc}</p>
                </div>
                <Switch
                  checked={formData.isHalfDay}
                  onCheckedChange={(checked) => setFormData({ ...formData, isHalfDay: checked })}
                />
              </div>

              {/* Optional Holiday */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium">{t.holiday.optionalHoliday}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{t.holiday.optionalHolidayDesc}</p>
                </div>
                <Switch
                  checked={formData.isOptional}
                  onCheckedChange={(checked) => setFormData({ ...formData, isOptional: checked })}
                />
              </div>

              {/* Compensatory Off */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium">{t.holiday.compensatoryOff}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{t.holiday.compensatoryOffDesc}</p>
                </div>
                <Switch
                  checked={formData.compensatoryOff}
                  onCheckedChange={(checked) => setFormData({ ...formData, compensatoryOff: checked })}
                />
              </div>

              {/* Recurring */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium">{t.holiday.weeklyOffRecurring}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{t.holiday.repeatEveryWeek}</p>
                  </div>
                  <Switch
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
                  />
                </div>

                {formData.isRecurring && (
                  <div className="pl-2 pt-1">
                    <Select
                      value={formData.recurringDay.toString()}
                      onValueChange={(value) => setFormData({ ...formData, recurringDay: parseInt(value) })}
                    >
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue placeholder={fallbackT.selectDay} />
                      </SelectTrigger>
                      <SelectContent>
                        {weekDays.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            <span className="text-xs sm:text-sm">{day.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingHoliday(null);
                setFormData({ ...emptyFormData });
              }}
              className="text-xs sm:text-sm"
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleSaveHoliday}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm"
            >
              {editingHoliday ? t.common.save : t.holiday.addHoliday}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingHoliday} onOpenChange={() => setDeletingHoliday(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">{fallbackT.deleteHolidayConfirm}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              {t.holiday.confirmDeleteHoliday} &quot;{deletingHoliday?.holidayName}&quot;? {t.holiday.deleteHolidayWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs sm:text-sm">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHoliday}
              className="bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm"
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
