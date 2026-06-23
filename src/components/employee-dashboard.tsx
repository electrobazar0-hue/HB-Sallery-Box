'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, User, Calendar, Clock, DollarSign, Bell,
  FileText, Home, Menu, X, Settings,
  Camera, MapPin, Check, Fingerprint, Gift, Navigation,
  Image as ImageIcon, Megaphone, Receipt, Plus, Trash2, XCircle, PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useGPS } from '@/hooks/use-gps';
import { useNotifications } from '@/hooks/use-notifications';
import { CameraCapture } from '@/components/camera-capture';
import { to12HourFormat, dateTo12HourFormat, dateTo12HourFormatWithSeconds, dateTo24HourFormatWithSeconds, formatTimeWithSeconds } from '@/lib/time-utils';
// import { isWithinGeofence, getGeofenceViolationMessage } from '@/lib/geofence';

interface AttendanceRecord {
  id: string;
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
  overtime: number;
  status: string;
}

interface EmployeeDashboardProps {
  onLogout: () => void;
  onSettings: () => void;
}

interface SalaryRecord {
  id: string;
  month: string;
  baseSalary: number;
  overtime: number;
  incentives: number;
  deductions: number;
  netSalary: number;
  status: string;
  paidAt?: string;
}

interface LeaveRecord {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
  attendanceAllow?: boolean;
  createdAt: string;
  approvedAt?: string;
}

interface HolidayRecord {
  id: string;
  holidayName: string;
  date: string;
  holidayType: string;
  description?: string;
  allowPunch: boolean;
  isHalfDay: boolean;
  isPaid: boolean;
  isOptional: boolean;
}

interface ExpenseRecord {
  id: string;
  title: string;
  description?: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: string;
  receiptUrl?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  employee?: {
    id: string;
    name: string;
    designation?: string;
    department?: string;
  };
}

export function EmployeeDashboard({ onLogout, onSettings }: EmployeeDashboardProps) {
  const { user, updateUser } = useAuthStore();
  const { t } = useLanguageStore();
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [publishedHolidays, setPublishedHolidays] = useState<HolidayRecord[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [pendingPunchType, setPendingPunchType] = useState<'in' | 'out' | null>(null);
  const [punchTime, setPunchTime] = useState<{ in?: string; out?: string }>({});
  const [punchInLocation, setPunchInLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [punchOutLocation, setPunchOutLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [showLeaveHistoryDialog, setShowLeaveHistoryDialog] = useState(false);
  const [announcements, setAnnouncements] = useState<{ id: string; title: string; message: string; createdAt: string }[]>([]);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<{ title: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [incentiveRecords, setIncentiveRecords] = useState<{ id: string; amount: number; reason: string; type: string; month: string; createdAt: string }[]>([]);
  const [showIncentiveDialog, setShowIncentiveDialog] = useState(false);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showExpenseHistoryDialog, setShowExpenseHistoryDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    description: '',
    category: 'other',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    receiptUrl: '',
  });
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);

  // GPS tracking
  const { coordinates, permissionStatus, requestPermission, getCurrentPosition } = useGPS({
    onSuccess: (coords) => {
      console.log('GPS coordinates:', coords);
    },
  });

  // Notifications
  const {
    notifications,
    unreadCount,
    permissionStatus: notifPermission,
    requestPermission: requestNotifPermission,
    addNotification,
    markAsRead,
    markAllAsRead,
  } = useNotifications({
    userId: user?.id || '',
    role: 'employee',
  });

  // Leave form
  const [leaveForm, setLeaveForm] = useState({
    type: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    address: '',
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request GPS permission on mount
  useEffect(() => {
    if (permissionStatus === 'prompt') {
      requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  // Request notification permission
  useEffect(() => {
    if (notifPermission === 'default') {
      requestNotifPermission();
    }
  }, [notifPermission, requestNotifPermission]);

  // Fetch attendance history
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const fetchAttendance = async () => {
      try {
        const response = await fetch(`/api/attendance?employeeId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch attendance');
        }
        
        const data = await response.json();
        
        if (mounted && data.attendance && data.attendance.length > 0) {
          setAttendanceHistory(data.attendance);
          // Check if already punched in today
          const today = new Date().toISOString().split('T')[0];
          const todayRecord = data.attendance.find((a: AttendanceRecord) => a.date === today);
          if (todayRecord && todayRecord.punchIn && !todayRecord.punchOut) {
            setIsPunchedIn(true);
            setPunchTime({ in: todayRecord.punchIn.slice(0, 5) });
            setPunchInLocation({ lat: todayRecord.punchInLat!, lng: todayRecord.punchInLng! });
          }
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
        // Don't set demo data - keep empty for fresh employee
        if (mounted) {
          setAttendanceHistory([]);
        }
      }
    };

    fetchAttendance();

    return () => { mounted = false; };
  }, [user?.id]);

  // Fetch salary history
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const fetchSalaryHistory = async () => {
      try {
        const response = await fetch(`/api/salary?employeeId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch salary history');
        }
        
        const data = await response.json();
        
        if (mounted && data.salaries) {
          setSalaryHistory(data.salaries);
        }
      } catch (error) {
        console.error('Error fetching salary history:', error);
        if (mounted) {
          setSalaryHistory([]);
        }
      }
    };

    fetchSalaryHistory();

    return () => { mounted = false; };
  }, [user?.id]);

  // Fetch leave records
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const fetchLeaveRecords = async () => {
      try {
        const response = await fetch(`/api/leaves?employeeId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch leave records');
        }
        
        const data = await response.json();
        
        if (mounted && data.leaves) {
          setLeaveRecords(data.leaves);
        }
      } catch (error) {
        console.error('Error fetching leave records:', error);
        if (mounted) {
          setLeaveRecords([]);
        }
      }
    };

    fetchLeaveRecords();

    return () => { mounted = false; };
  }, [user?.id]);

  // Fetch incentive records
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const fetchIncentives = async () => {
      try {
        const response = await fetch(`/api/incentives?employeeId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch incentives');
        }
        
        const data = await response.json();
        
        if (mounted && data.incentives) {
          setIncentiveRecords(data.incentives);
        }
      } catch (error) {
        console.error('Error fetching incentives:', error);
        if (mounted) {
          setIncentiveRecords([]);
        }
      }
    };

    fetchIncentives();

    return () => { mounted = false; };
  }, [user?.id]);

  // Fetch expense records
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    const fetchExpenses = async () => {
      try {
        const response = await fetch(`/api/expenses?employeeId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch expenses');
        }
        
        const data = await response.json();
        
        if (mounted && data.expenses) {
          setExpenseRecords(data.expenses);
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
        if (mounted) {
          setExpenseRecords([]);
        }
      }
    };

    fetchExpenses();

    return () => { mounted = false; };
  }, [user?.id]);

  // Fetch announcements and show popup for new ones
  useEffect(() => {
    if (!user?.organizationId) return;

    let mounted = true;

    const fetchAnnouncements = async () => {
      try {
        const response = await fetch(`/api/announcements?organizationId=${user.organizationId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch announcements');
        }
        
        const data = await response.json();
        
        if (mounted && data.announcements && data.announcements.length > 0) {
          setAnnouncements(data.announcements);
          
          // Check for new announcements (not seen in this session)
          const lastSeenKey = `lastAnnouncement_${user.organizationId}`;
          const lastSeenId = sessionStorage.getItem(lastSeenKey);
          
          // Get the latest announcement
          const latestAnnouncement = data.announcements[0];
          
          // If it's a new announcement, show popup
          if (latestAnnouncement && latestAnnouncement.id !== lastSeenId) {
            setCurrentAnnouncement({
              title: latestAnnouncement.title,
              message: latestAnnouncement.message
            });
            setShowAnnouncementPopup(true);
            
            // Add to notifications
            addNotification({
              title: '📢 ' + latestAnnouncement.title,
              body: latestAnnouncement.message,
              type: 'announcement',
            });
            
            // Mark as seen
            sessionStorage.setItem(lastSeenKey, latestAnnouncement.id);
          }
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      }
    };

    fetchAnnouncements();
    
    // Poll for new announcements every 30 seconds
    const interval = setInterval(fetchAnnouncements, 30000);

    return () => { 
      mounted = false;
      clearInterval(interval);
    };
  }, [user?.organizationId, user?.id, addNotification]);

  // Calculate leaves left (12 total - approved leaves count)
  const TOTAL_LEAVES = 12;
  const approvedLeavesCount = leaveRecords.filter(l => l.status === 'approved').length;
  const leavesLeft = TOTAL_LEAVES - approvedLeavesCount;

  // Check if today is an approved leave day
  const checkIfTodayIsApprovedLeave = (): { isLeave: boolean; leaveRecord: LeaveRecord | null } => {
    const today = new Date().toISOString().split('T')[0];
    const approvedLeave = leaveRecords.find(leave => {
      if (leave.status !== 'approved') return false;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const todayDate = new Date(today);
      return todayDate >= start && todayDate <= end;
    });
    return { isLeave: !!approvedLeave, leaveRecord: approvedLeave || null };
  };

  const { isLeave: isTodayApprovedLeave, leaveRecord: todayLeaveRecord } = checkIfTodayIsApprovedLeave();

  const menuItems = [
    { id: 'home', label: t.dashboard.home, icon: Home },
    { id: 'holidays', label: t.dashboard.holidays, icon: PartyPopper },
    { id: 'attendance', label: t.dashboard.attendance, icon: Clock },
    { id: 'leaves', label: t.leave.applyLeave, icon: Calendar },
    { id: 'expenses', label: t.dashboard.expenses, icon: Receipt },
    { id: 'salary', label: t.dashboard.salary, icon: DollarSign },
    { id: 'incentives', label: t.dashboard.incentives, icon: Gift },
    { id: 'settings', label: t.common.settings, icon: Settings },
  ];

  // Map leave type to translation key
  const getLeaveTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      casual: t.leave.casual,
      sick: t.leave.sick,
      earned: t.leave.earned,
      unpaid: t.leave.unpaid,
    };
    return typeMap[type] || type;
  };

  // Map attendance status to translation
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      present: t.attendance.present,
      absent: t.attendance.absent,
      late: t.attendance.late,
    };
    return statusMap[status] || status;
  };

  // Map expense status to translation
  const getExpenseStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t.leave.pending,
      approved: t.leave.approved,
      paid: t.salary.paid,
      rejected: t.leave.rejected,
    };
    return statusMap[status] || status;
  };

  // Handle punch with GPS and photo
  const handlePunch = async (type: 'in' | 'out') => {
    console.log('handlePunch called with type:', type);

    // Check if today is an approved leave day
    if (isTodayApprovedLeave) {
      console.log('Cannot punch - on approved leave');
      addNotification({
        title: t.leave.cannotPunchOnLeave,
        body: t.dashboard.onApprovedLeave,
        type: 'leave',
      });
      return;
    }

    // Check GPS permission
    if (permissionStatus !== 'granted') {
      console.log('GPS permission not granted, requesting...');
      const granted = await requestPermission();
      if (!granted) {
        console.error('GPS permission denied');
        alert(t.attendance.gpsPermissionRequired);
        return;
      }
    }

    console.log('Opening camera for punch:', type);
    // Set pending punch type and show camera
    setPendingPunchType(type);
    setShowCamera(true);
  };

  // Complete punch after photo capture with accurate GPS location and LOCAL time
  const completePunch = async (photo: string) => {
    if (!pendingPunchType) {
      console.error('No pending punch type');
      return;
    }

    console.log('Starting punch:', pendingPunchType);
    setShowCamera(false);
    setIsLoading(true);

    try {
      // Get current GPS position with high accuracy
      console.log('Getting GPS position...');
      const coords = await getCurrentPosition();
      console.log('GPS coords received:', coords);

      // Use LOCAL time from device (not GPS timestamp which is UTC)
      const now = new Date(); // Device's local time
      const date = now.toISOString().split('T')[0];

      // Format times using device's LOCAL time
      const time = dateTo12HourFormat(now); // 12-hour format for display (e.g., "10:39 AM")
      const accurateTime = dateTo12HourFormatWithSeconds(now); // With seconds (e.g., "10:39:45 AM")
      const fullTime = dateTo24HourFormatWithSeconds(now); // 24-hour format for database (e.g., "10:39:45")

      console.log('Time formatted:', { time, accurateTime, fullTime });

      // Validate required data
      if (!user?.id) {
        throw new Error('User ID not found. Please log in again.');
      }

      if (!coords || !coords.latitude || !coords.longitude) {
        throw new Error('GPS coordinates not available. Please try again.');
      }

      // Check geofence if enabled for this employee
      /*if (user?.geofenceEnabled && user.geofenceLat && user.geofenceLng) {
        console.log('Geofence is enabled, checking location...');
        const isWithin = isWithinGeofence(
          { lat: coords.latitude, lng: coords.longitude },
          { lat: user.geofenceLat, lng: user.geofenceLng, radius: user.geofenceRadius || 100 }
        );

        if (!isWithin) {
          const violationMessage = getGeofenceViolationMessage(
            { lat: coords.latitude, lng: coords.longitude },
            { lat: user.geofenceLat, lng: user.geofenceLng, radius: user.geofenceRadius || 100 }
          );
          console.log('Geofence violation:', violationMessage);
          throw new Error(violationMessage || 'You are outside the allowed attendance area.');
        }
        console.log('User is within geofence, allowing punch.');
      }*/

      // Send to API with LOCAL timestamp and pre-formatted local times
      const payload = {
        employeeId: user.id,
        type: pendingPunchType,
        latitude: coords.latitude,
        longitude: coords.longitude,
        photo,
        timestamp: now.getTime(), // Device's local timestamp
        localTime: fullTime, // Local time as string (HH:MM:SS) - matches user's timezone
        accuracy: coords.accuracy, // Location accuracy in meters
      };
      console.log('Sending to API:', payload);

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to punch in/out');
      }

      // Show accuracy in notification
      const accuracyInfo = data.accuracy ? ` (±${data.accuracy.toFixed(0)}m accuracy)` : '';
      const timeInfo = data.accurateTime || accurateTime;

      if (pendingPunchType === 'in') {
        setPunchTime({ ...punchTime, in: timeInfo });
        setPunchInLocation({ lat: coords.latitude, lng: coords.longitude });
        setIsPunchedIn(true);

        // Add notification with error handling
        try {
          addNotification({
            title: t.notifications.punchInSuccess || 'Punched In Successfully',
            body: `${t.dashboard.punchedInAtTime || 'Punched in at'} ${timeInfo}${accuracyInfo}`,
            type: 'attendance',
            priority: 'high',
          });
        } catch (notifError) {
          console.error('Failed to add notification:', notifError);
        }

        // Update attendance history
        const newRecord: AttendanceRecord = {
          id: Date.now().toString(),
          date,
          punchIn: fullTime,
          punchInLat: coords.latitude,
          punchInLng: coords.longitude,
          punchInPhoto: photo,
          workHours: 0,
          overtime: 0,
          status: 'present',
        };
        setAttendanceHistory(prev => [newRecord, ...prev.filter(a => a.date !== date)]);
      } else {
        setPunchTime({ ...punchTime, out: timeInfo });
        setPunchOutLocation({ lat: coords.latitude, lng: coords.longitude });
        setIsPunchedIn(false);

        // Add notification with error handling
        try {
          addNotification({
            title: t.notifications.punchOutSuccess || 'Punched Out Successfully',
            body: `${t.dashboard.punchedOutAtTime || 'Punched out at'} ${timeInfo}${accuracyInfo}`,
            type: 'attendance',
            priority: 'normal',
          });
        } catch (notifError) {
          console.error('Failed to add notification:', notifError);
        }

        // Update today's record in history
        setAttendanceHistory(prev => prev.map(record => {
          if (record.date === date) {
            return {
              ...record,
              punchOut: fullTime,
              punchOutLat: coords.latitude,
              punchOutLng: coords.longitude,
              punchOutPhoto: photo,
              workHours: data.workHours || 9,
              overtime: data.overtime || 1,
            };
          }
          return record;
        }));
      }
    } catch (error) {
      console.error('Punch error:', error);
      const errorMessage = error instanceof Error ? error.message : t.attendance.punchFailedMessage || 'Failed to punch in/out';

      // Try to show error notification
      try {
        addNotification({
          title: t.attendance.punchFailed || 'Punch Failed',
          body: errorMessage,
          type: 'error',
          priority: 'high',
        });
      } catch (notifError) {
        console.error('Failed to add error notification:', notifError);
        // Fallback to alert
        alert(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setPendingPunchType(null);
    }
  };

  const handleApplyLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) return;

    try {
      await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user?.id,
          ...leaveForm,
        }),
      });
      addNotification({
        title: t.dashboard.leaveRequestSubmitted,
        body: t.dashboard.leaveSubmitMessage,
        type: 'leave',
      });
      setShowLeaveDialog(false);
      setLeaveForm({ type: 'casual', startDate: '', endDate: '', reason: '' });
    } catch (error) {
      console.error('Leave error:', error);
      setShowLeaveDialog(false);
    }
  };

  const handleSubmitExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.expenseDate) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user?.id,
          title: expenseForm.title,
          description: expenseForm.description,
          category: expenseForm.category,
          amount: parseFloat(expenseForm.amount),
          expenseDate: expenseForm.expenseDate,
          receiptUrl: expenseForm.receiptUrl,
        }),
      });
      
      if (response.ok) {
        addNotification({
          title: t.expense.expenseSubmitted,
          body: t.dashboard.expenseSubmitMessage,
          type: 'expense',
        });
        setShowExpenseDialog(false);
        setExpenseForm({
          title: '',
          description: '',
          category: 'other',
          amount: '',
          expenseDate: new Date().toISOString().split('T')[0],
          receiptUrl: '',
        });
        // Refresh expense records
        const data = await response.json();
        if (data.expense) {
          setExpenseRecords(prev => [data.expense, ...prev]);
        }
      }
    } catch (error) {
      console.error('Expense error:', error);
      addNotification({
        title: t.common.error,
        body: t.dashboard.failedSubmitExpense,
        type: 'error',
      });
    }
    setIsLoading(false);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm(t.expense.confirmDeleteExpense)) return;

    try {
      const response = await fetch(`/api/expenses?id=${expenseId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setExpenseRecords(prev => prev.filter(e => e.id !== expenseId));
        addNotification({
          title: t.expense.expenseDeleted,
          body: t.expense.expenseDeleteSuccess,
          type: 'expense',
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleUpdateProfile = () => {
    updateUser(profileForm);
    setShowProfileDialog(false);
  };

  const handleToggleBiometric = () => {
    updateUser({ biometricEnabled: !user?.biometricEnabled });
  };

  const handleViewPhoto = (photo: string) => {
    setSelectedPhoto(photo);
    setShowPhotoDialog(true);
  };

  const salaryData = useMemo(() => ({
    baseSalary: user?.salary || 0,
    overtime: 0,
    incentives: incentiveRecords.reduce((sum, i) => sum + i.amount, 0),
    deductions: 0,
    netSalary: (user?.salary || 0) + incentiveRecords.reduce((sum, i) => sum + i.amount, 0),
  }), [user?.salary, incentiveRecords]);

  const handleMenuClick = (id: string) => {
    if (id === 'settings') {
      onSettings();
    } else if (id === 'leaves') {
      setShowLeaveDialog(true);
    } else if (id === 'holidays') {
      setShowHolidayDialog(true);
      if (user?.organizationId) {
        fetch(`/api/holidays?organizationId=${user.organizationId}&status=active`).then(r => r.json()).then(d => {
          if (d.success) setPublishedHolidays(d.holidays || []);
        }).catch(() => {});
      }
    } else if (id === 'salary') {
      setShowSalaryDialog(true);
    } else {
      setActiveTab(id);
    }
    setSidebarOpen(false);
  };

  // Render attendance tab content
  const renderAttendanceTab = () => (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-500" />
            {t.attendance.myAttendanceActivities}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.attendance.allRecordsWithPhotosLocations}
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[60dvh]">
            <div className="space-y-4">
              {attendanceHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>{t.attendance.noAttendanceRecords}</p>
                </div>
              ) : (
                attendanceHistory.map((record) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-xl bg-muted/30 space-y-4"
                  >
                    {/* Date and Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex flex-col items-center justify-center text-white">
                          <span className="text-xs">
                            {new Date(record.date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold">{new Date(record.date).getDate()}</span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                          </p>
                          <Badge variant={
                            record.status === 'present' ? 'default' :
                            record.status === 'late' ? 'secondary' : 'destructive'
                          }>
                            {getStatusLabel(record.status)}
                          </Badge>
                        </div>
                      </div>
                      {record.workHours > 0 && (
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-500">{record.workHours}h</p>
                          {record.overtime > 0 && (
                            <p className="text-xs text-orange-500">+{record.overtime}h {t.attendance.otLabel}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Punch In Details */}
                    {record.punchIn && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Punch In */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-emerald-600">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-sm font-medium">{t.attendance.punchIn}: {formatTimeWithSeconds(record.punchIn)}</span>
                            {record.punchIn.includes(':') && record.punchIn.split(':').length > 2 && (
                              <span className="text-xs text-muted-foreground ml-2">(accurate time)</span>
                            )}
                          </div>

                          {/* Punch In Photo */}
                          {record.punchInPhoto && (
                            <div className="relative group">
                              <img
                                src={record.punchInPhoto}
                                alt={t.attendance.punchIn}
                                className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => handleViewPhoto(record.punchInPhoto!)}
                              />
                              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                {t.attendance.tapToView}
                              </div>
                            </div>
                          )}

                          {/* Punch In Location */}
                          {record.punchInLat && record.punchInLng && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                              <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{t.attendance.punchInLocation}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {record.punchInLat.toFixed(6)}, {record.punchInLng.toFixed(6)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Punch Out */}
                        {record.punchOut ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-red-600">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="text-sm font-medium">{t.attendance.punchOut}: {formatTimeWithSeconds(record.punchOut)}</span>
                              {record.punchOut.includes(':') && record.punchOut.split(':').length > 2 && (
                                <span className="text-xs text-muted-foreground ml-2">(accurate time)</span>
                              )}
                            </div>

                            {/* Punch Out Photo */}
                            {record.punchOutPhoto && (
                              <div className="relative group">
                                <img
                                  src={record.punchOutPhoto}
                                  alt={t.attendance.punchOut}
                                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => handleViewPhoto(record.punchOutPhoto!)}
                                />
                                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                  <ImageIcon className="h-3 w-3" />
                                  {t.attendance.tapToView}
                                </div>
                              </div>
                            )}

                          {/* Punch Out Location */}
                          {record.punchOutLat && record.punchOutLng && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                              <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{t.attendance.punchOutLocation}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {record.punchOutLat.toFixed(6)}, {record.punchOutLng.toFixed(6)}
                                </p>
                              </div>
                            </div>
                          )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
                            <span className="text-muted-foreground text-sm">{t.attendance.notPunchedOutYet}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Absent indicator */}
                    {!record.punchIn && (
                      <div className="flex items-center justify-center p-4 bg-red-500/10 rounded-lg">
                        <span className="text-red-500 font-medium">{t.attendance.absentNoRecorded}</span>
                      </div>
                    )}

                    {/* Locked indicator */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        {t.attendance.recordLocked}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  // Render expenses tab content
  const renderExpensesTab = () => (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-500" />
                {t.expense.myExpenseClaims}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t.expense.submitTrackClaims}
              </p>
            </div>
            <Button onClick={() => setShowExpenseDialog(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              <Plus className="h-4 w-4 mr-2" />
              {t.expense.newClaim}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Expense Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg text-center border border-yellow-200 dark:border-yellow-800">
              <p className="text-3xl font-bold text-yellow-500">
                {expenseRecords.filter(e => e.status === 'pending').length}
              </p>
              <p className="text-sm text-muted-foreground">{t.leave.pending}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg text-center border border-emerald-200 dark:border-emerald-800">
              <p className="text-3xl font-bold text-emerald-500">
                ₹{expenseRecords.filter(e => e.status === 'approved' || e.status === 'paid').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{t.leave.approved}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 rounded-lg text-center border border-red-200 dark:border-red-800">
              <p className="text-3xl font-bold text-red-500">
                {expenseRecords.filter(e => e.status === 'rejected').length}
              </p>
              <p className="text-sm text-muted-foreground">{t.leave.rejected}</p>
            </div>
          </div>

          <ScrollArea className="max-h-[50dvh]">
            <div className="space-y-3">
              {expenseRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">{t.expense.noExpenses}</p>
                  <p className="text-sm mb-4">{t.expense.submitFirstClaim}</p>
                  <Button onClick={() => setShowExpenseDialog(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600">
                    <Plus className="h-4 w-4 mr-2" />
                    {t.expense.submitNewClaim}
                  </Button>
                </div>
              ) : (
                expenseRecords.map((expense) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-xl bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${
                          expense.category === 'medical' ? 'bg-gradient-to-br from-red-400 to-pink-500' :
                          expense.category === 'petrol' ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                          expense.category === 'food' ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                          expense.category === 'travel' ? 'bg-gradient-to-br from-blue-400 to-indigo-500' :
                          'bg-gradient-to-br from-gray-400 to-slate-500'
                        }`}>
                          <Receipt className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium">{expense.title}</p>
                          <p className="text-sm text-muted-foreground capitalize">{expense.category} • {expense.expenseDate}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">₹{expense.amount.toLocaleString()}</p>
                        {expense.status === 'pending' ? (
                          <Badge className="bg-yellow-500 text-white animate-pulse">
                            <Clock className="h-3 w-3 mr-1" />
                            {t.leave.pendingApproval}
                          </Badge>
                        ) : expense.status === 'approved' ? (
                          <Badge className="bg-emerald-500 text-white">
                            <Check className="h-3 w-3 mr-1" />
                            {t.leave.approved}
                          </Badge>
                        ) : expense.status === 'paid' ? (
                          <Badge className="bg-blue-500 text-white">
                            <Check className="h-3 w-3 mr-1" />
                            {t.salary.paid}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            {t.leave.rejected}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {expense.description && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">{t.dashboard.descriptionLabel}:</span> {expense.description}
                        </p>
                      </div>
                    )}

                    {expense.rejectionReason && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-sm text-red-500">
                          <span className="font-medium">{t.dashboard.rejectionReason}:</span> {expense.rejectionReason}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {t.dashboard.submitted}: {new Date(expense.createdAt).toLocaleDateString()}
                      </span>
                      {expense.status === 'pending' && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50"
                          onClick={() => handleDeleteExpense(expense.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t.common.delete}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  // Render incentives tab content
  const renderIncentivesTab = () => (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-orange-500" />
            {t.incentive.myIncentives}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.dashboard.bonusesRewardsByAdmin}
          </p>
        </CardHeader>
        <CardContent>
          {/* Incentive Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg text-center border border-orange-200 dark:border-orange-800">
              <p className="text-3xl font-bold text-orange-500">₹{incentiveRecords.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t.incentive.totalEarned}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg text-center border border-emerald-200 dark:border-emerald-800">
              <p className="text-3xl font-bold text-emerald-500">{incentiveRecords.length}</p>
              <p className="text-sm text-muted-foreground">{t.incentive.incentivesReceived}</p>
            </div>
          </div>

          <ScrollArea className="max-h-[50dvh]">
            <div className="space-y-3">
              {incentiveRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">{t.incentive.noIncentives}</p>
                  <p className="text-sm">{t.dashboard.incentivesWillAppear}</p>
                </div>
              ) : (
                incentiveRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((incentive) => (
                  <motion.div
                    key={incentive.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border rounded-xl bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white">
                          <Gift className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{incentive.type} {t.dashboard.incentiveLabel}</p>
                          <p className="text-sm text-muted-foreground">{incentive.month}</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-orange-500">+₹{incentive.amount.toLocaleString()}</p>
                    </div>
                    
                    <div className="pt-2 border-t mt-2">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">{t.dashboard.reasonLabel}:</span> {incentive.reason}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>{t.dashboard.received}: {new Date(incentive.createdAt).toLocaleDateString()}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden min-h-11 min-w-11" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white">
                <img 
                  src="/logo.jpg" 
                  alt="HB Sallery Box Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-lg hidden sm:inline">HB Sallery Box</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotificationDialog(true)}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profilePhoto} alt={user?.name || 'Employee'} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-sm">
                {user?.name?.charAt(0) || 'E'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-background border-r z-50 md:hidden pt-[env(safe-area-inset-top)]">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-white">
                    <img 
                      src="/logo.jpg" 
                      alt="HB Sallery Box Logo" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-bold">{t.dashboard.employeePanel}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="p-4 space-y-1">
                {menuItems.map((item) => (
                  <button key={item.id} onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === item.id ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:bg-muted'
                    }`}>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
                <div className="pt-4 mt-4 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <button onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
                    <LogOut className="h-5 w-5" />
                    <span>{t.common.logout}</span>
                  </button>
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-muted/30">
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:bg-muted'
                }`}>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profilePhoto} alt={user?.name || 'Employee'} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                  {user?.name?.charAt(0) || 'E'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <Badge variant="secondary" className="text-xs px-2 py-0 h-5">{t.dashboard.employeeRole}</Badge>
              </div>
            </div>
            <Button variant="ghost" onClick={onLogout}
              className="w-full mt-2 text-red-500 hover:bg-red-500/10 hover:text-red-500">
              <LogOut className="h-4 w-4 mr-2" />
              {t.common.logout}
            </Button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 pb-24 md:pb-6 md:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
            {activeTab === 'attendance' ? (
              renderAttendanceTab()
            ) : activeTab === 'expenses' ? (
              renderExpensesTab()
            ) : activeTab === 'incentives' ? (
              renderIncentivesTab()
            ) : (
              <>
                {/* Welcome Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">{t.dashboard.welcomeEmployee}, {user?.name?.split(' ')[0] || t.dashboard.employeeRole}!</h1>
                    <p className="text-muted-foreground">
                      {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold font-mono">
                      {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                    {isPunchedIn && punchTime.in && (
                      <p className="text-sm text-emerald-500">{t.dashboard.checkedInAt} {punchTime.in}</p>
                    )}
                  </div>
                </motion.div>

                {/* Punch In/Out Card with GPS Status */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  {isTodayApprovedLeave ? (
                    // Approved Leave Day Card
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-6 w-6" />
                              <h2 className="text-xl font-bold">{t.dashboard.youAreOnLeave}</h2>
                            </div>
                            <p className="text-blue-100">
                              {getLeaveTypeLabel(todayLeaveRecord?.type || '')} {t.dashboard.leaveLabel}
                            </p>
                            <p className="text-sm text-blue-200 mt-1">
                              {todayLeaveRecord && (
                                <>
                                  {new Date(todayLeaveRecord.startDate).toLocaleDateString()} - {new Date(todayLeaveRecord.endDate).toLocaleDateString()}
                                </>
                              )}
                            </p>
                            {todayLeaveRecord?.reason && (
                              <p className="text-sm text-blue-200 mt-2">
                                {t.dashboard.reasonLabel}: {todayLeaveRecord.reason}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                            <Check className="h-5 w-5" />
                            <span className="font-medium">{t.leave.approved}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    // Normal Punch Card
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-bold mb-2">
                              {isPunchedIn ? t.dashboard.checkedIn : t.dashboard.readyToCheckIn}
                            </h2>
                            <div className="flex items-center gap-4 text-emerald-100">
                              {punchTime.in && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {t.attendance.inLabel}: {punchTime.in}
                                </span>
                              )}
                              {punchTime.out && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {t.attendance.outLabel}: {punchTime.out}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3">
                            {!isPunchedIn ? (
                              <Button size="lg" onClick={() => handlePunch('in')}
                                className="bg-white text-emerald-600 hover:bg-emerald-50">
                                <Check className="h-5 w-5 mr-2" />
                                {t.attendance.punchIn}
                              </Button>
                            ) : (
                              <Button size="lg" onClick={() => handlePunch('out')}
                                className="bg-white/20 text-white hover:bg-white/30">
                                <LogOut className="h-5 w-5 mr-2" />
                                {t.attendance.punchOut}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Status indicators */}
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-emerald-100 text-sm">
                          <span className={`flex items-center gap-1 ${permissionStatus === 'granted' ? '' : 'text-yellow-300'}`}>
                            <MapPin className="h-4 w-4" />
                            {permissionStatus === 'granted' ? t.attendance.gpsActive : t.attendance.gpsRequired}
                          </span>
                          <span className="flex items-center gap-1">
                            <Camera className="h-4 w-4" />
                            {t.attendance.photoRequired}
                          </span>
                          {punchInLocation && (
                            <span className="flex items-center gap-1">
                              <Navigation className="h-4 w-4" />
                              {t.attendance.punchIn}: {punchInLocation.lat.toFixed(4)}, {punchInLocation.lng.toFixed(4)}
                            </span>
                          )}
                          {punchOutLocation && (
                            <span className="flex items-center gap-1">
                              <Navigation className="h-4 w-4" />
                              {t.attendance.punchOut}: {punchOutLocation.lat.toFixed(4)}, {punchOutLocation.lng.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>

                {/* Quick Stats */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-emerald-500" />
                          <p className="text-sm text-muted-foreground">{t.dashboard.thisMonthHours}</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-500">{attendanceHistory.reduce((sum, a) => sum + (a.workHours || 0), 0).toFixed(1)}h</p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setShowLeaveHistoryDialog(true)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <p className="text-sm text-muted-foreground">{t.dashboard.leavesLeft}</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-500">{leavesLeft}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.dashboard.tapToViewHistory}</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-0 shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-purple-500" />
                          <p className="text-sm text-muted-foreground">{t.dashboard.netSalary}</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-500">₹{salaryData.netSalary.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setShowIncentiveDialog(true)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Gift className="h-4 w-4 text-orange-500" />
                          <p className="text-sm text-muted-foreground">{t.dashboard.incentives}</p>
                        </div>
                        <p className="text-2xl font-bold text-orange-500">₹{incentiveRecords.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.common.viewDetails}</p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{t.dashboard.quickActions}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button onClick={() => setShowLeaveDialog(true)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all relative">
                          <Calendar className="h-6 w-6 text-emerald-500" />
                          <span className="text-sm font-medium">{t.dashboard.applyLeave}</span>
                        </button>
                        <button onClick={() => setShowExpenseHistoryDialog(true)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all relative">
                          <Receipt className="h-6 w-6 text-emerald-500" />
                          <span className="text-sm font-medium">{t.dashboard.myExpenses}</span>
                          {expenseRecords.filter(e => e.status === 'pending').length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                              {expenseRecords.filter(e => e.status === 'pending').length}
                            </span>
                          )}
                        </button>
                        <button onClick={() => setShowIncentiveDialog(true)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all">
                          <Gift className="h-6 w-6 text-emerald-500" />
                          <span className="text-sm font-medium">{t.incentive.myIncentives}</span>
                        </button>
                        <button onClick={() => setShowProfileDialog(true)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all">
                          <User className="h-6 w-6 text-emerald-500" />
                          <span className="text-sm font-medium">{t.dashboard.editProfile}</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pending Expense Claims Alert */}
                {expenseRecords.filter(e => e.status === 'pending').length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                    <Card className="border-0 shadow-md border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                              <Clock className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                                {t.dashboard.pendingExpenseApprovals}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {expenseRecords.filter(e => e.status === 'pending').length} {t.dashboard.expenseClaimsWaiting}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            className="border-yellow-500 text-yellow-600 hover:bg-yellow-100"
                            onClick={() => setShowExpenseHistoryDialog(true)}
                          >
                            {t.dashboard.viewClaims}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Recent Attendance Preview */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{t.attendance.recentAttendance}</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab('attendance')}>
                          {t.common.viewAll}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {attendanceHistory.slice(0, 3).map((record) => (
                          <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="w-12 h-12 rounded-lg bg-background flex flex-col items-center justify-center">
                              <span className="text-xs text-muted-foreground">
                                {new Date(record.date).toLocaleDateString('en-US', { month: 'short' })}
                              </span>
                              <span className="text-lg font-bold">{new Date(record.date).getDate()}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'secondary' : 'destructive'}>
                                  {getStatusLabel(record.status)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{t.attendance.locked}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                {record.punchIn && <span>{t.attendance.inLabel}: {to12HourFormat(record.punchIn)}</span>}
                                {record.punchOut && <span>{t.attendance.outLabel}: {to12HourFormat(record.punchOut)}</span>}
                                {record.workHours > 0 && <span>{record.workHours}h</span>}
                              </div>
                            </div>
                            {(record.punchInPhoto || record.punchOutPhoto) && (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden sticky bottom-0 border-t bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around py-2">
          {menuItems.slice(0, 4).map((item) => (
            <button key={item.id} onClick={() => handleMenuClick(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-h-[52px] ${
                activeTab === item.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              }`}>
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
          <button onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground min-h-[52px]">
            <Menu className="h-5 w-5" />
            <span className="text-xs">{t.dashboard.more}</span>
          </button>
        </div>
      </nav>

      {/* Camera Capture Dialog */}
      <CameraCapture
        open={showCamera}
        onCapture={completePunch}
        onClose={() => {
          setShowCamera(false);
          setPendingPunchType(null);
        }}
        title={pendingPunchType === 'in' ? `📸 ${t.attendance.capturePunchInSelfie}` : `📸 ${t.attendance.capturePunchOutSelfie}`}
      />

      {/* Holiday Dialog - Shows only PUBLISHED holidays */}
      <Dialog open={showHolidayDialog} onOpenChange={setShowHolidayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-emerald-500" />
              {t.dashboard.holidays}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70dvh]">
            {publishedHolidays.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No holidays published yet</p>
                <p className="text-xs mt-1">Admin will publish holidays soon</p>
              </div>
            ) : (
              <div className="space-y-2">
                {publishedHolidays
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((h) => {
                    const isPast = new Date(h.date) < new Date(new Date().toDateString());
                    const isToday = h.date === new Date().toISOString().split('T')[0];
                    return (
                      <div key={h.id} className={`flex items-center gap-3 p-3 rounded-lg ${isPast ? 'bg-muted/30 opacity-60' : 'bg-muted/50'}`}>
                        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white shrink-0 ${
                          isToday ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                          h.holidayType === 'national' ? 'bg-gradient-to-br from-orange-400 to-red-500' :
                          'bg-gradient-to-br from-purple-400 to-pink-500'
                        }`}>
                          <span className="text-[10px] leading-none">{new Date(h.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="text-lg font-bold leading-none">{new Date(h.date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{h.holidayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(h.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isToday && <Badge className="bg-emerald-500 text-white text-[10px] px-1.5">Today!</Badge>}
                          <Badge variant="outline" className="text-[10px]">{h.holidayType}</Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Photo View Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{t.attendance.attendancePhoto}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt={t.attendance.attendancePhoto}
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dashboard.applyForLeave}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.leave.leaveType}</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3"
                value={leaveForm.type}
                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
              >
                <option value="casual">{t.leave.casual} {t.dashboard.leaveLabel}</option>
                <option value="sick">{t.leave.sick} {t.dashboard.leaveLabel}</option>
                <option value="earned">{t.leave.earned} {t.dashboard.leaveLabel}</option>
                <option value="unpaid">{t.leave.unpaid} {t.dashboard.leaveLabel}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.leave.startDate}</Label>
                <Input type="date" value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t.leave.endDate}</Label>
                <Input type="date" value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.leave.reason}</Label>
              <Textarea placeholder={t.dashboard.enterReasonForLeave}
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowLeaveDialog(false)}>
                {t.common.cancel}
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={handleApplyLeave}>
                {t.common.submit}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Salary Dialog */}
      <Dialog open={showSalaryDialog} onOpenChange={setShowSalaryDialog}>
        <DialogContent className="max-w-2xl max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              {t.salary.salaryHistory}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70dvh]">
            <div className="space-y-4">
              {/* Current Salary Info */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">{t.dashboard.currentBaseSalary}</h3>
                  <p className="text-3xl font-bold">₹{salaryData.baseSalary.toLocaleString()}</p>
                  <p className="text-sm text-emerald-100 mt-1">{t.dashboard.perMonth}</p>
                </CardContent>
              </Card>

              {/* Salary History List */}
              <div className="space-y-3">
                <h4 className="font-medium text-muted-foreground">{t.dashboard.paymentHistory}</h4>
                
                {salaryHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">{t.salary.noSalaryRecords}</p>
                    <p className="text-sm">{t.dashboard.salaryPaymentsWillAppear}</p>
                  </div>
                ) : (
                  salaryHistory.map((record) => (
                    <div key={record.id} className="p-4 border rounded-xl bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex flex-col items-center justify-center text-white">
                            <span className="text-xs">
                              {record.month.split('-')[1] === '01' ? 'Jan' :
                               record.month.split('-')[1] === '02' ? 'Feb' :
                               record.month.split('-')[1] === '03' ? 'Mar' :
                               record.month.split('-')[1] === '04' ? 'Apr' :
                               record.month.split('-')[1] === '05' ? 'May' :
                               record.month.split('-')[1] === '06' ? 'Jun' :
                               record.month.split('-')[1] === '07' ? 'Jul' :
                               record.month.split('-')[1] === '08' ? 'Aug' :
                               record.month.split('-')[1] === '09' ? 'Sep' :
                               record.month.split('-')[1] === '10' ? 'Oct' :
                               record.month.split('-')[1] === '11' ? 'Nov' : 'Dec'}
                            </span>
                            <span className="text-sm font-bold">{record.month.split('-')[0].slice(2)}</span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {record.month.split('-')[1] === '01' ? 'January' :
                               record.month.split('-')[1] === '02' ? 'February' :
                               record.month.split('-')[1] === '03' ? 'March' :
                               record.month.split('-')[1] === '04' ? 'April' :
                               record.month.split('-')[1] === '05' ? 'May' :
                               record.month.split('-')[1] === '06' ? 'June' :
                               record.month.split('-')[1] === '07' ? 'July' :
                               record.month.split('-')[1] === '08' ? 'August' :
                               record.month.split('-')[1] === '09' ? 'September' :
                               record.month.split('-')[1] === '10' ? 'October' :
                               record.month.split('-')[1] === '11' ? 'November' : 'December'} {record.month.split('-')[0]}
                            </p>
                            <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>
                              {record.status === 'paid' ? t.salary.paid : t.salary.pending}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-500">₹{record.netSalary.toLocaleString()}</p>
                          {record.paidAt && (
                            <p className="text-xs text-muted-foreground">
                              {t.salary.paid}: {new Date(record.paidAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Salary Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t">
                        <div className="text-center p-2 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">{t.salary.baseSalary}</p>
                          <p className="font-medium">₹{record.baseSalary.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">{t.salary.overtime}</p>
                          <p className="font-medium text-blue-500">+₹{record.overtime.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">{t.salary.incentives}</p>
                          <p className="font-medium text-purple-500">+₹{record.incentives.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">{t.salary.deductions}</p>
                          <p className="font-medium text-red-500">-₹{record.deductions.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dashboard.editProfile}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-2xl">
                    {user?.name?.charAt(0) || 'E'}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center min-h-11 min-w-11">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.dashboard.fullName}</Label>
              <Input value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t.employee.email}</Label>
              <Input type="email" value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t.employee.address}</Label>
              <Textarea value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                <span className="text-sm">{t.settings.biometricLock}</span>
              </div>
              <button onClick={handleToggleBiometric}
                className={`w-12 h-6 rounded-full transition-colors ${user?.biometricEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${user?.biometricEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowProfileDialog(false)}>
                {t.common.cancel}
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={handleUpdateProfile}>
                {t.dashboard.saveChanges}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="max-w-md max-h-[80dvh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{t.notifications.notifications}</DialogTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  {t.notifications.markAllRead}
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2" />
                  <p>{t.notifications.noNotifications}</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      notification.read ? 'bg-muted/30' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        notification.read ? 'bg-transparent' : 'bg-emerald-500'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Leave History Dialog */}
      <Dialog open={showLeaveHistoryDialog} onOpenChange={setShowLeaveHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              {t.leave.leaveHistory}
            </DialogTitle>
          </DialogHeader>
          
          {/* Leave Balance Summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
            <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-center">
              <p className="text-xl sm:text-2xl font-bold text-emerald-500">{TOTAL_LEAVES}</p>
              <p className="text-xs text-muted-foreground">{t.leave.totalLeaves}</p>
            </div>
            <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-center">
              <p className="text-xl sm:text-2xl font-bold text-red-500">{approvedLeavesCount}</p>
              <p className="text-xs text-muted-foreground">{t.leave.used}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-center">
              <p className="text-xl sm:text-2xl font-bold text-blue-500">{leavesLeft}</p>
              <p className="text-xs text-muted-foreground">{t.leave.remaining}</p>
            </div>
          </div>

          <ScrollArea className="max-h-[50dvh]">
            <div className="space-y-3">
              {leaveRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">{t.leave.noLeaveRecords}</p>
                  <p className="text-sm">{t.dashboard.leaveApplicationsWillAppear}</p>
                </div>
              ) : (
                leaveRecords.map((record) => (
                  <div key={record.id} className="p-4 border rounded-xl bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center text-white">
                          <span className="text-xs">
                            {new Date(record.startDate).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold">{new Date(record.startDate).getDate()}</span>
                        </div>
                        <div>
                          <p className="font-medium capitalize">{getLeaveTypeLabel(record.type)} {t.dashboard.leaveLabel}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(record.startDate).toLocaleDateString()} - {new Date(record.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          record.status === 'approved' ? 'default' : 
                          record.status === 'rejected' ? 'destructive' : 'secondary'
                        }
                        className={
                          record.status === 'approved' ? 'bg-emerald-500' : 
                          record.status === 'rejected' ? 'bg-red-500' : ''
                        }
                      >
                        {record.status === 'approved' ? `✓ ${t.leave.approved}` : 
                         record.status === 'rejected' ? `✗ ${t.leave.rejected}` : `⏳ ${t.leave.pending}`}
                      </Badge>
                    </div>
                    
                    {record.reason && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">{t.dashboard.reasonLabel}:</span> {record.reason}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{t.dashboard.applied}: {new Date(record.createdAt).toLocaleDateString()}</span>
                      {record.approvedAt && (
                        <span>
                          {record.status === 'approved' ? t.leave.approved : t.leave.rejected}: {new Date(record.approvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowLeaveHistoryDialog(false)}>
              {t.common.close}
            </Button>
            <Button 
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" 
              onClick={() => {
                setShowLeaveHistoryDialog(false);
                setShowLeaveDialog(true);
              }}
            >
              {t.leave.applyLeave}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement Popup Dialog */}
      <Dialog open={showAnnouncementPopup} onOpenChange={setShowAnnouncementPopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Megaphone className="h-5 w-5" />
              {t.dashboard.newAnnouncement}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-400 mb-2">
                {currentAnnouncement?.title}
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {currentAnnouncement?.message}
              </p>
            </div>
            <Button 
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
              onClick={() => setShowAnnouncementPopup(false)}
            >
              <Check className="h-4 w-4 mr-2" />
              {t.dashboard.gotIt}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incentive History Dialog */}
      <Dialog open={showIncentiveDialog} onOpenChange={setShowIncentiveDialog}>
        <DialogContent className="max-w-2xl max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-orange-500" />
              {t.incentive.myIncentives}
            </DialogTitle>
          </DialogHeader>
          
          {/* Incentive Summary */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg text-center border border-orange-200 dark:border-orange-800">
              <p className="text-3xl font-bold text-orange-500">₹{incentiveRecords.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t.incentive.totalEarned}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg text-center border border-emerald-200 dark:border-emerald-800">
              <p className="text-3xl font-bold text-emerald-500">{incentiveRecords.length}</p>
              <p className="text-sm text-muted-foreground">{t.incentive.incentivesReceived}</p>
            </div>
          </div>

          <ScrollArea className="max-h-[50dvh]">
            <div className="space-y-3">
              {incentiveRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">{t.incentive.noIncentives}</p>
                  <p className="text-sm">{t.dashboard.incentivesWillAppear}</p>
                </div>
              ) : (
                incentiveRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((incentive) => (
                  <div key={incentive.id} className="p-4 border rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white">
                          <Gift className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{incentive.type} {t.dashboard.incentiveLabel}</p>
                          <p className="text-sm text-muted-foreground">{incentive.month}</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-orange-500">+₹{incentive.amount.toLocaleString()}</p>
                    </div>
                    
                    <div className="pt-2 border-t mt-2">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">{t.dashboard.reasonLabel}:</span> {incentive.reason}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>{t.dashboard.received}: {new Date(incentive.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowIncentiveDialog(false)}>
              {t.common.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Submit Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-500" />
              {t.dashboard.submitExpenseClaim}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="expenseTitle">{t.dashboard.titleRequired}</Label>
              <Input id="expenseTitle" placeholder={t.dashboard.travelPlaceholder}
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} />
            </div>

            <div>
              <Label htmlFor="expenseCategory">{t.dashboard.categoryRequired}</Label>
              <select id="expenseCategory" className="w-full p-2 border rounded-lg bg-background"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                <option value="medical">{t.dashboard.medicalEmergency}</option>
                <option value="petrol">{t.dashboard.petrolFuel}</option>
                <option value="food">{t.dashboard.foodMeals}</option>
                <option value="travel">{t.dashboard.travelTransport}</option>
                <option value="equipment">{t.dashboard.equipmentTools}</option>
                <option value="other">{t.expense.other}</option>
              </select>
            </div>

            <div>
              <Label htmlFor="expenseAmount">{t.dashboard.amountRequired}</Label>
              <Input id="expenseAmount" type="number" placeholder="0"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </div>

            <div>
              <Label htmlFor="expenseDate">{t.dashboard.dateRequired}</Label>
              <Input id="expenseDate" type="date"
                value={expenseForm.expenseDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} />
            </div>

            <div>
              <Label htmlFor="expenseDescription">{t.dashboard.descriptionLabel}</Label>
              <Textarea id="expenseDescription" placeholder={t.dashboard.additionalDetails}
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowExpenseDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button className="flex-1" onClick={handleSubmitExpense} disabled={isLoading || !expenseForm.title || !expenseForm.amount}>
              {isLoading ? t.dashboard.submitting : t.dashboard.submitClaim}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense History Dialog */}
      <Dialog open={showExpenseHistoryDialog} onOpenChange={setShowExpenseHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[90dvh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-500" />
              {t.expense.myExpenseClaims}
            </DialogTitle>
          </DialogHeader>
          
          {/* Expense Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <div className="p-3 sm:p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg text-center border border-yellow-200 dark:border-yellow-800">
              <p className="text-2xl sm:text-3xl font-bold text-yellow-500">
                {expenseRecords.filter(e => e.status === 'pending').length}
              </p>
              <p className="text-sm text-muted-foreground">{t.leave.pending}</p>
            </div>
            <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-lg text-center border border-emerald-200 dark:border-emerald-800">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-500">
                ₹{expenseRecords.filter(e => e.status === 'approved' || e.status === 'paid').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{t.leave.approved}</p>
            </div>
            <div className="p-3 sm:p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 rounded-lg text-center border border-red-200 dark:border-red-800">
              <p className="text-2xl sm:text-3xl font-bold text-red-500">
                {expenseRecords.filter(e => e.status === 'rejected').length}
              </p>
              <p className="text-sm text-muted-foreground">{t.leave.rejected}</p>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <Button onClick={() => { setShowExpenseHistoryDialog(false); setShowExpenseDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              {t.expense.newClaim}
            </Button>
          </div>

          <ScrollArea className="max-h-[50dvh]">
            <div className="space-y-3">
              {expenseRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">{t.expense.noExpenseClaims}</p>
                  <p className="text-sm">{t.expense.submitFirstClaim}</p>
                </div>
              ) : (
                expenseRecords.map((expense) => (
                  <div key={expense.id} className="p-4 border rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${
                          expense.category === 'medical' ? 'bg-gradient-to-br from-red-400 to-pink-500' :
                          expense.category === 'petrol' ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                          expense.category === 'food' ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                          expense.category === 'travel' ? 'bg-gradient-to-br from-blue-400 to-indigo-500' :
                          'bg-gradient-to-br from-gray-400 to-slate-500'
                        }`}>
                          <Receipt className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium">{expense.title}</p>
                          <p className="text-sm text-muted-foreground capitalize">{expense.category} • {expense.expenseDate}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">₹{expense.amount.toLocaleString()}</p>
                        {expense.status === 'pending' ? (
                          <Badge className="bg-yellow-500 text-white animate-pulse">
                            <Clock className="h-3 w-3 mr-1" />
                            {t.leave.pendingApproval}
                          </Badge>
                        ) : expense.status === 'approved' ? (
                          <Badge className="bg-emerald-500 text-white">
                            <Check className="h-3 w-3 mr-1" />
                            {t.leave.approved}
                          </Badge>
                        ) : expense.status === 'paid' ? (
                          <Badge className="bg-blue-500 text-white">
                            <Check className="h-3 w-3 mr-1" />
                            {t.salary.paid}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            {t.leave.rejected}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {expense.description && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">{t.dashboard.descriptionLabel}:</span> {expense.description}
                        </p>
                      </div>
                    )}

                    {expense.rejectionReason && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-sm text-red-500">
                          <span className="font-medium">{t.dashboard.rejectionReason}:</span> {expense.rejectionReason}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {t.dashboard.submitted}: {new Date(expense.createdAt).toLocaleDateString()}
                      </span>
                      {expense.status === 'pending' && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50"
                          onClick={() => handleDeleteExpense(expense.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t.common.delete}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowExpenseHistoryDialog(false)}>
              {t.common.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
