'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Users, Clock, DollarSign, Calendar,
  Bell, ChevronRight, FileText, Settings,
  Home, Menu, X, Star, MessageSquare, Edit,
  Check, XCircle, Fingerprint, UserPlus, Send, Camera, Activity, KeyRound, PartyPopper, Shield, Trash2, Eye, Gift, Receipt, Wallet, CheckCircle, XIcon, ShieldCheck, ShieldX, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShiftManagement } from '@/components/shift-management';
import { PhotoPicker } from '@/components/photo-picker';
import { EmployeeActivities } from '@/components/employee-activities';
import { HolidayManagement } from '@/components/holiday-management';
import { useNotifications, NotificationData } from '@/hooks/use-notifications';
import { useLanguageStore } from '@/lib/i18n';

interface AdminDashboardProps {
  onLogout: () => void;
  onSettings: () => void;
}

// Types
interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  designation?: string;
  department?: string;
  salary: number;
  active: boolean;
  starOfMonth: boolean;
  biometricEnabled: boolean;
  aadharNumber?: string;
  panNumber?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  profilePhoto?: string;
}

interface SalaryRecord {
  id: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  overtime: number;
  incentives: number;
  deductions: number;
  netSalary: number;
  status: string;
  paidAt?: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee: { name: string; designation?: string };
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

interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: { name: string; designation?: string };
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
}

interface ExpenseRecord {
  id: string;
  employeeId: string;
  employee?: { name: string; designation?: string; department?: string };
  title: string;
  description?: string;
  category: string;
  amount: number;
  expenseDate: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  employee?: { name: string; designation?: string; department?: string; salary: number };
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  advance: number;
  advanceRecovery: number;
  netSalary: number;
  status: string;
  notes?: string;
}

interface IncentiveRecord {
  id: string;
  employeeId: string;
  employee?: { name: string; designation?: string };
  amount: number;
  reason: string;
  type: 'bonus' | 'performance' | 'referral' | 'attendance' | 'other';
  date: string;
  month?: string;
}

export function AdminDashboard({ onLogout, onSettings }: AdminDashboardProps) {
  const { user, updateUser, updateOrganizationLogo } = useAuthStore();
  const { t } = useLanguageStore();
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modals
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showLeaves, setShowLeaves] = useState(false);
  const [showShiftManagement, setShowShiftManagement] = useState(false);
  const [showSalaryManagement, setShowSalaryManagement] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfilePhotoPicker, setShowProfilePhotoPicker] = useState(false);
  const [showOrgLogoPicker, setShowOrgLogoPicker] = useState(false);
  const [showEmployeeActivities, setShowEmployeeActivities] = useState(false);
  const [showHolidayManagement, setShowHolidayManagement] = useState(false);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [showPaySalary, setShowPaySalary] = useState(false);
  const [showIncentives, setShowIncentives] = useState(false);
  const [showAllLeaves, setShowAllLeaves] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvingLeave, setApprovingLeave] = useState<any>(null);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [incentiveRecords, setIncentiveRecords] = useState<IncentiveRecord[]>([]);
  const [incentiveEmployee, setIncentiveEmployee] = useState<Employee | null>(null);
  const [showAddIncentive, setShowAddIncentive] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [showExpenses, setShowExpenses] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid'>('all');
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [showPayroll, setShowPayroll] = useState(false);
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState(new Date().toISOString().slice(0, 7));

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    name: '', phone: '', email: '', address: '', designation: '', department: '', salary: 0,
    userId: '', password: '', securityPassword: '',
    aadharNumber: '', panNumber: '', accountNumber: '', ifscCode: '', upiId: ''
  });
  const [salaryForm, setSalaryForm] = useState({
    month: '', baseSalary: 0, overtime: 0, incentives: 0, deductions: 0
  });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', message: '' });
  const [incentiveForm, setIncentiveForm] = useState({
    amount: 0, reason: '', type: 'bonus', month: new Date().toISOString().slice(0, 7)
  });

  // Notifications
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
  } = useNotifications({
    userId: user?.id || '',
    role: 'admin',
  });

  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { id: 'home', label: t.dashboard.home, icon: Home },
    { id: 'employees', label: t.dashboard.employees, icon: Users },
    { id: 'attendance', label: t.dashboard.attendance, icon: Clock },
    { id: 'activities', label: t.dashboard.activities, icon: Activity },
    { id: 'leaves', label: t.leave.leaveRequests, icon: Calendar },
    { id: 'expenses', label: t.dashboard.expenseClaims, icon: Receipt },
    { id: 'payroll', label: t.payroll.payrollManagement, icon: Wallet },
    { id: 'salary', label: t.salary.salaryManagement, icon: DollarSign },
    { id: 'incentives', label: t.dashboard.incentives, icon: Star },
    { id: 'holidays', label: t.dashboard.holidays, icon: PartyPopper },
    { id: 'settings', label: t.common.settings, icon: Settings },
  ];

  // Fetch data on mount
  useEffect(() => {
    if (!isAdmin || !user?.id) return;
    
    let mounted = true;
    
    const fetchData = async () => {
      // Fetch employees - NO DEMO DATA, only real data from database
      try {
        const response = await fetch(`/api/employees?adminId=${user.id}`);
        const data = await response.json();
        if (mounted && data.employees) {
          setEmployees(data.employees);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        // Don't set demo data - keep empty array for fresh admin
        if (mounted) {
          setEmployees([]);
        }
      }
      
      // Fetch attendance - NO DEMO DATA
      if (user.organizationId) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const response = await fetch(`/api/attendance?organizationId=${user.organizationId}&date=${today}`);
          const data = await response.json();
          if (mounted && data.attendance) {
            setAttendance(data.attendance);
          }
        } catch (error) {
          console.error('Error fetching attendance:', error);
          // Don't set demo data - keep empty array for fresh admin
          if (mounted) {
            setAttendance([]);
          }
        }
        
        // Fetch leaves - NO DEMO DATA
        try {
          const response = await fetch(`/api/leaves?organizationId=${user.organizationId}&status=pending`);
          const data = await response.json();
          if (mounted && data.leaves) {
            setLeaves(data.leaves);
          }
        } catch (error) {
          console.error('Error fetching leaves:', error);
          // Don't set demo data - keep empty array for fresh admin
          if (mounted) {
            setLeaves([]);
          }
        }
        
        // Fetch expenses - NO DEMO DATA
        try {
          const response = await fetch(`/api/expenses?organizationId=${user.organizationId}`);
          const data = await response.json();
          if (mounted && data.expenses) {
            setExpenses(data.expenses);
          }
        } catch (error) {
          console.error('Error fetching expenses:', error);
          if (mounted) {
            setExpenses([]);
          }
        }
      }
    };
    
    fetchData();
    
    return () => { mounted = false; };
  }, [isAdmin, user?.id, user?.organizationId]);

  const handleAddEmployee = async () => {
    // Validation with detailed error messages
    if (!employeeForm.name?.trim()) {
      addNotification({ title: t.common.error, body: t.employee.validationName, type: 'announcement' });
      return;
    }
    if (!employeeForm.phone?.trim() || employeeForm.phone.length < 10) {
      addNotification({ title: t.common.error, body: t.employee.validationPhone, type: 'announcement' });
      return;
    }
    if (!employeeForm.userId?.trim() || employeeForm.userId.length < 4) {
      addNotification({ title: t.common.error, body: t.employee.validationUserId, type: 'announcement' });
      return;
    }
    if (!employeeForm.password || employeeForm.password.length < 6) {
      addNotification({ title: t.common.error, body: t.employee.validationPassword, type: 'announcement' });
      return;
    }
    if (!employeeForm.securityPassword || employeeForm.securityPassword.length < 4) {
      addNotification({ title: t.common.error, body: t.employee.validationSecurityPassword, type: 'announcement' });
      return;
    }
    if (!user?.id || !user?.organizationId) {
      addNotification({ title: t.common.error, body: t.employee.sessionExpired, type: 'announcement' });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: employeeForm.name.trim(),
          phone: employeeForm.phone.replace(/\D/g, ''),
          email: employeeForm.email?.trim() || null,
          address: employeeForm.address?.trim() || null,
          designation: employeeForm.designation?.trim() || null,
          department: employeeForm.department?.trim() || null,
          salary: Number(employeeForm.salary) || 0,
          userId: employeeForm.userId.trim().toLowerCase(),
          password: employeeForm.password,
          securityPassword: employeeForm.securityPassword,
          aadharNumber: employeeForm.aadharNumber?.trim() || null,
          panNumber: employeeForm.panNumber?.trim() || null,
          accountNumber: employeeForm.accountNumber?.trim() || null,
          ifscCode: employeeForm.ifscCode?.trim() || null,
          upiId: employeeForm.upiId?.trim() || null,
          adminId: user.id,
          organizationId: user.organizationId,
        }),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setEmployees([...employees, data.employee]);
        addNotification({
          title: t.messages.employeeAdded,
          body: `${employeeForm.name} ${t.employee.employeeAddedSuccess}`,
          type: 'announcement',
        });
        // Reset form and close dialog
        setShowAddEmployee(false);
        setEmployeeForm({ 
          name: '', phone: '', email: '', address: '', designation: '', department: '', salary: 0, 
          userId: '', password: '', securityPassword: '',
          aadharNumber: '', panNumber: '', accountNumber: '', ifscCode: '', upiId: ''
        });
      } else {
        addNotification({
          title: t.common.error,
          body: data.error || t.employee.validationName,
          type: 'announcement',
        });
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      addNotification({
        title: t.common.error,
        body: t.common.retry,
        type: 'announcement',
      });
    }
    setIsLoading(false);
  };

  const handleToggleStar = async (id: string) => {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;
    
    try {
      await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, starOfMonth: !employee.starOfMonth }),
      });
    } catch {
      // Continue with local update
    }
    setEmployees(employees.map(e => e.id === id ? { ...e, starOfMonth: !e.starOfMonth } : e));
  };

  const handleToggleBiometric = async (id: string) => {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;
    
    try {
      await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, biometricEnabled: !employee.biometricEnabled }),
      });
    } catch {
      // Continue with local update
    }
    setEmployees(employees.map(e => e.id === id ? { ...e, biometricEnabled: !e.biometricEnabled } : e));
  };

  // Reject - one click direct
  const handleRejectLeave = async (leave: any) => {
    try {
      await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leave.id, status: 'rejected', approvedBy: user?.id, attendanceAllow: false }),
      });
    } catch {
      // Continue with local update
    }
    addNotification({
      title: t.leave.leaveRejected,
      body: `${leave.employee.name} - ${t.leave.leaveRejected}`,
      type: 'leave',
 });
    setLeaves(leaves.filter(l => l.id !== leave.id));
    if (allLeaves.length > 0) fetchAllLeaves();
  };

  // Approve - open dialog first for attendance allow/not allow
  const handleOpenApproveDialog = (leave: any) => {
    setApprovingLeave(leave);
    setShowApproveDialog(true);
  };

  // Final approve after selecting attendance allow/not allow
  const handleConfirmApprove = async (attendanceAllow: boolean) => {
    if (!approvingLeave) return;
    setShowApproveDialog(false);
    try {
      await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approvingLeave.id, status: 'approved', approvedBy: user?.id, attendanceAllow }),
      });
    } catch {
      // Continue with local update
    }
    addNotification({
      title: t.leave.leaveApproved,
      body: `${approvingLeave.employee.name} - ${t.leave.leaveApproved}. ${attendanceAllow ? t.leave.attendanceAllow : t.leave.attendanceNotAllow}.`,

      type: 'leave',
    });
    setLeaves(leaves.filter(l => l.id !== approvingLeave.id));
    setApprovingLeave(null);
    if (allLeaves.length > 0) fetchAllLeaves();
  };

  // Legacy handler kept for compatibility
  const handleLeaveAction = async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected') {
      const leave = leaves.find(l => l.id === id);
      if (leave) handleRejectLeave(leave);
    } else {
      const leave = leaves.find(l => l.id === id);
      if (leave) handleOpenApproveDialog(leave);
    }
  };

  const handleExpenseAction = async (id: string, status: 'approved' | 'rejected' | 'paid', rejectionReason?: string) => {
    try {
      await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status, 
          approvedBy: user?.id,
          rejectionReason 
        }),
      });
      // Update local state
      setExpenses(expenses.map(e => 
        e.id === id ? { ...e, status, rejectionReason } : e
      ));
      
      const expense = expenses.find(e => e.id === id);
      if (expense) {
        addNotification({
          title: `Expense ${status}`,
          body: `${expense.employee?.name || 'Employee'}'s expense claim of ₹${expense.amount} has been ${status}.`,
          type: 'expense',
        });
      }
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const handlePayrollSave = async (employeeId: string, data: {
    baseSalary: number;
    bonus: number;
    deductions: number;
    advance: number;
    advanceRecovery: number;
    notes?: string;
  }) => {
    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          month: selectedPayrollMonth,
          ...data,
          createdBy: user?.id,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        addNotification({
          title: t.payroll.payrollUpdated,
          body: `${t.payroll.payrollForMonth} ${selectedPayrollMonth}`,

          type: 'payroll',
        });
      }
    } catch (error) {
      console.error('Error saving payroll:', error);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.message || !user?.organizationId) return;
    
    try {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...announcementForm,
          organizationId: user.organizationId,
        }),
      });
      addNotification({
        title: t.announcement.announcementSent,
        body: `"${announcementForm.title}" ${t.announcement.announcementSentDesc}`,
        type: 'announcement',
      });
    } catch {
      addNotification({
        title: t.announcement.announcementSent,
        body: `"${announcementForm.title}" ${t.announcement.announcementSentDesc}`,
        type: 'announcement',
      });
    }
    setShowAnnouncement(false);
    setAnnouncementForm({ title: '', message: '' });
  };

  // Handle profile photo update
  const handleProfilePhotoUpdate = (photo: string) => {
    updateUser({ profilePhoto: photo });
    addNotification({
      title: t.settings.changeProfilePhoto,
      body: t.messages.employeeUpdated,
      type: 'announcement',
    });
  };

  // Handle organization logo update
  const handleOrgLogoUpdate = (logo: string) => {
    updateOrganizationLogo(logo);
    addNotification({
      title: t.common.success,
      body: t.messages.employeeUpdated,
      type: 'announcement',
    });
  };

  const stats = [
    { label: t.dashboard.totalEmployees, value: employees.length.toString(), color: 'text-emerald-500' },
    { label: t.dashboard.presentToday, value: attendance.filter(a => a.punchIn).length.toString(), color: 'text-blue-500' },
    { label: t.dashboard.pendingLeaves, value: leaves.length.toString(), color: 'text-orange-500' },
    { label: t.dashboard.starEmployee, value: employees.find(e => e.starOfMonth)?.name || t.common.none, color: 'text-purple-500' },
  ];

  const handleMenuClick = (id: string) => {
    switch (id) {
      case 'settings': onSettings(); break;
      case 'employees': setShowEmployeeList(true); setActiveTab(id); break;  // Show employee list
      case 'attendance': setShowAttendance(true); setActiveTab(id); break;
      case 'activities': setShowEmployeeActivities(true); setActiveTab(id); break;
      case 'leaves': setShowLeaves(true); setActiveTab(id); break;
      case 'salary': setShowSalaryManagement(true); setActiveTab(id); break;
      case 'incentives': setShowIncentives(true); setActiveTab(id); break;
      case 'holidays': setShowHolidayManagement(true); setActiveTab(id); break;
      default: setActiveTab(id);
    }
    setSidebarOpen(false);
  };

  // Handle Pay Salary
  const handlePaySalary = async () => {
    if (!selectedEmployee || !salaryForm.month) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          ...salaryForm,
          netSalary: salaryForm.baseSalary + salaryForm.overtime + salaryForm.incentives - salaryForm.deductions,
        }),
      });
      const data = await response.json();
      if (data.success) {
        addNotification({
          title: t.messages.salaryPaidSuccess,
          body: `${t.salary.salaryPaidSuccess} ${selectedEmployee.name} ${t.salary.forMonth} ${salaryForm.month}`,
          type: 'announcement',
        });
        setShowPaySalary(false);
        setSelectedEmployee(null);
        setSalaryForm({ month: '', baseSalary: 0, overtime: 0, incentives: 0, deductions: 0 });
      }
    } catch (error) {
      console.error('Error paying salary:', error);
    }
    setIsLoading(false);
  };

  // Handle Delete Employee
  const handleDeleteEmployee = async (id: string) => {
    if (!confirm(t.employee.confirmDeleteEmployee)) return;
    
    try {
      const response = await fetch(`/api/employees?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setEmployees(employees.filter(e => e.id !== id));
        addNotification({
          title: t.messages.employeeDeleted,
          body: t.employee.employeeDeleteSuccess,
          type: 'announcement',
        });
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  // Fetch all leaves for tracking
  const fetchAllLeaves = async () => {
    if (!user?.organizationId) return;
    
    try {
      const response = await fetch(`/api/leaves?organizationId=${user.organizationId}`);
      const data = await response.json();
      if (data.leaves) {
        setAllLeaves(data.leaves);
      }
    } catch (error) {
      console.error('Error fetching all leaves:', error);
    }
  };

  // Open all leaves dialog
  const handleViewAllLeaves = () => {
    fetchAllLeaves();
    setShowAllLeaves(true);
  };

  // Filter leaves
  const filteredLeaves = leaveFilter === 'all' 
    ? allLeaves 
    : allLeaves.filter(l => l.status === leaveFilter);

  // Handle Add Incentive
  const handleAddIncentive = async () => {
    if (!incentiveEmployee || !incentiveForm.amount || !incentiveForm.reason) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/incentives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: incentiveEmployee.id,
          amount: incentiveForm.amount,
          reason: incentiveForm.reason,
          type: incentiveForm.type,
          month: incentiveForm.month,
          organizationId: user?.organizationId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        addNotification({
          title: t.incentive.incentiveAdded,
          body: `₹${incentiveForm.amount.toLocaleString()} ${t.incentive.incentiveAdded} - ${incentiveEmployee.name}`,
          type: 'announcement',
        });
        setShowAddIncentive(false);
        setIncentiveEmployee(null);
        setIncentiveForm({ amount: 0, reason: '', type: 'bonus', month: new Date().toISOString().slice(0, 7) });
        // Refresh incentive records
        try {
          const response = await fetch(`/api/incentives?organizationId=${user?.organizationId}`);
          const data = await response.json();
          if (data.incentives) {
            setIncentiveRecords(data.incentives);
          }
        } catch (e) {
          console.error('Error refreshing incentives:', e);
        }
      }
    } catch (error) {
      console.error('Error adding incentive:', error);
    }
    setIsLoading(false);
  };

  // Open incentives dialog and fetch records
  useEffect(() => {
    if (showIncentives && user?.organizationId) {
      // Define async function inside effect
      const loadIncentives = async () => {
        try {
          const response = await fetch(`/api/incentives?organizationId=${user.organizationId}`);
          const data = await response.json();
          if (data.incentives) {
            setIncentiveRecords(data.incentives);
          }
        } catch (error) {
          console.error('Error fetching incentives:', error);
        }
      };
      loadIncentives();
    }
  }, [showIncentives, user?.organizationId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowOrgLogoPicker(true)}
                className="relative group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg"
              >
                {user?.organizationLogo ? (
                  <img 
                    src={user.organizationLogo} 
                    alt={user.organizationName || 'Organization'} 
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{user?.organizationName?.charAt(0) || 'HB'}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </button>
              <span className="font-bold text-lg hidden sm:inline">{user?.organizationName || 'HB Sallery Box'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
            <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotifications(true)}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            <button 
              onClick={() => setShowProfilePhotoPicker(true)}
              className="focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profilePhoto} alt={user?.name || 'Admin'} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-sm">
                  {user?.name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
            </button>
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
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-background border-r z-50 md:hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-white">
                    <img 
                      src="/logo.jpg" 
                      alt="HB Sallery Box Logo" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-bold">{t.dashboard.adminPanel}</span>
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
                <div className="pt-4 mt-4 border-t">
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
            <button 
              onClick={() => setShowProfilePhotoPicker(true)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profilePhoto} alt={user?.name || 'Admin'} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                  {user?.name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <Badge variant="secondary" className="text-xs px-2 py-0 h-5">{t.auth.admin}</Badge>
              </div>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </button>
            <Button variant="ghost" onClick={onLogout}
              className="w-full mt-2 text-red-500 hover:bg-red-500/10 hover:text-red-500">
              <LogOut className="h-4 w-4 mr-2" />
              {t.common.logout}
            </Button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Welcome Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{t.dashboard.welcomeAdmin}, {user?.name?.split(' ')[0] || 'Admin'}!</h1>
                <p className="text-muted-foreground">{user?.organizationName || t.dashboard.organizationDashboard}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowAddEmployee(true)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t.dashboard.addEmployee}
                </Button>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}>
                    <Card className="border-0 shadow-md">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t.dashboard.quickActions}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: t.dashboard.viewAttendance, icon: Clock, action: () => setShowAttendance(true) },
                      { label: t.dashboard.employeeActivities, icon: Activity, action: () => setShowEmployeeActivities(true) },
                      { label: t.leave.leaveRequests, icon: Calendar, action: () => setShowLeaves(true), badge: leaves.length },
                      { label: t.dashboard.manageShifts, icon: Clock, action: () => setShowShiftManagement(true) },
                      { label: t.salary.salaryManagement, icon: DollarSign, action: () => setShowSalaryManagement(true) },
                      { label: t.incentive.giveIncentive, icon: Gift, action: () => setShowIncentives(true) },
                      { label: t.dashboard.holidays, icon: PartyPopper, action: () => setShowHolidayManagement(true) },
                      { label: t.announcement.sendAnnouncement, icon: MessageSquare, action: () => setShowAnnouncement(true) },
                    ].map((action) => (
                      <button key={action.label} onClick={action.action}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-95 transition-all relative touch-manipulation min-h-[80px]">
                        <action.icon className="h-6 w-6 text-emerald-500" />
                        <span className="text-sm font-medium text-center">{action.label}</span>
                        {action.badge && action.badge > 0 && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {action.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden sticky bottom-0 border-t bg-background/95 backdrop-blur-sm">
        <div className="flex justify-around py-2">
          {menuItems.slice(0, 4).map((item) => (
            <button key={item.id} onClick={() => handleMenuClick(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                activeTab === item.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
              }`}>
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
          <button onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground">
            <Menu className="h-5 w-5" />
            <span className="text-xs">{t.dashboard.more}</span>
          </button>
        </div>
      </nav>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={showAddEmployee || !!editingEmployee} onOpenChange={(open) => {
        if (!open) { 
          setShowAddEmployee(false); 
          setEditingEmployee(null); 
          setEmployeeForm({ 
            name: '', phone: '', email: '', address: '', designation: '', department: '', salary: 0, 
            userId: '', password: '', securityPassword: '',
            aadharNumber: '', panNumber: '', accountNumber: '', ifscCode: '', upiId: ''
          }); 
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingEmployee ? t.employee.editEmployee : t.employee.addNewEmployee}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 pr-4">
            <div className="space-y-2">
              <Label>{t.employee.nameRequired}</Label>
              <Input placeholder={t.employee.employeeNamePlaceholder} value={editingEmployee ? editingEmployee.name : employeeForm.name}
                onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, name: e.target.value }) : setEmployeeForm({ ...employeeForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t.employee.phoneRequired}</Label>
              <Input placeholder={t.employee.phonePlaceholder} value={editingEmployee ? editingEmployee.phone : employeeForm.phone}
                onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, phone: e.target.value }) : setEmployeeForm({ ...employeeForm, phone: e.target.value })} />
            </div>
            {!editingEmployee && (
              <>
                <div className="space-y-2">
                  <Label>{t.employee.userIdRequired}</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t.employee.userIdPlaceholder} value={employeeForm.userId}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, userId: e.target.value.toLowerCase().replace(/\s+/g, '') })} className="pl-10" />
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 4 characters</p>
                </div>
                <div className="space-y-2">
                  <Label>{t.employee.passwordRequired}</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder={t.employee.passwordPlaceholder} value={employeeForm.password}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })} className="pl-10" />
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>
                <div className="space-y-2">
                  <Label>{t.employee.securityPasswordRequired}</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder={t.employee.securityPasswordPlaceholder} value={employeeForm.securityPassword}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, securityPassword: e.target.value })} className="pl-10" />
                  </div>
                  <p className="text-xs text-muted-foreground">Remember this - needed for password reset</p>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>{t.employee.email}</Label>
              <Input type="email" placeholder={t.employee.emailPlaceholder} value={editingEmployee ? editingEmployee.email || '' : employeeForm.email}
                onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, email: e.target.value }) : setEmployeeForm({ ...employeeForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t.employee.address}</Label>
              <Input placeholder={t.employee.addressPlaceholder} value={editingEmployee ? editingEmployee.address || '' : employeeForm.address}
                onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, address: e.target.value }) : setEmployeeForm({ ...employeeForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t.employee.designation}</Label><Input placeholder={t.employee.designationPlaceholder} value={editingEmployee ? editingEmployee.designation || '' : employeeForm.designation}
                onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, designation: e.target.value }) : setEmployeeForm({ ...employeeForm, designation: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t.employee.department}</Label><Input placeholder={t.employee.departmentPlaceholder} value={editingEmployee ? editingEmployee.department || '' : employeeForm.department}
                onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, department: e.target.value }) : setEmployeeForm({ ...employeeForm, department: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>{t.salary.baseSalary}</Label>
              <Input type="number" placeholder={t.employee.salaryPlaceholder} value={editingEmployee ? editingEmployee.salary : employeeForm.salary}
                onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, salary: Number(e.target.value) }) : setEmployeeForm({ ...employeeForm, salary: Number(e.target.value) })} />
            </div>
            
            {/* Bank Details Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t.employee.bankDetails}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.employee.aadharNumber}</Label>
                  <Input placeholder={t.employee.aadharPlaceholder} maxLength={12} value={editingEmployee ? editingEmployee.aadharNumber || '' : employeeForm.aadharNumber}
                    onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, aadharNumber: e.target.value.replace(/\D/g, '') }) : setEmployeeForm({ ...employeeForm, aadharNumber: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.employee.panNumber}</Label>
                  <Input placeholder={t.employee.panPlaceholder} maxLength={10} value={editingEmployee ? editingEmployee.panNumber || '' : employeeForm.panNumber}
                    onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, panNumber: e.target.value.toUpperCase() }) : setEmployeeForm({ ...employeeForm, panNumber: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label>{t.employee.accountNumber}</Label>
                  <Input placeholder={t.employee.accountPlaceholder} value={editingEmployee ? editingEmployee.accountNumber || '' : employeeForm.accountNumber}
                    onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, accountNumber: e.target.value }) : setEmployeeForm({ ...employeeForm, accountNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.employee.ifscCode}</Label>
                  <Input placeholder={t.employee.ifscPlaceholder} value={editingEmployee ? editingEmployee.ifscCode || '' : employeeForm.ifscCode}
                    onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, ifscCode: e.target.value.toUpperCase() }) : setEmployeeForm({ ...employeeForm, ifscCode: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="space-y-2 mt-3">
                <Label>{t.employee.upiId}</Label>
                <Input placeholder={t.employee.upiPlaceholder} value={editingEmployee ? editingEmployee.upiId || '' : employeeForm.upiId}
                  onChange={(e) => editingEmployee ? setEditingEmployee({ ...editingEmployee, upiId: e.target.value }) : setEmployeeForm({ ...employeeForm, upiId: e.target.value })} />
              </div>
            </div>
            
            {editingEmployee && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2"><Fingerprint className="h-4 w-4" /><span className="text-sm">{t.settings.biometricLock}</span></div>
                <button onClick={() => handleToggleBiometric(editingEmployee.id)}
                  className={`w-12 h-6 rounded-full transition-colors ${editingEmployee.biometricEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editingEmployee.biometricEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAddEmployee(false); setEditingEmployee(null); }}>{t.common.cancel}</Button>
              <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={() => {
                if (editingEmployee) { setEmployees(employees.map(e => e.id === editingEmployee.id ? editingEmployee : e)); setEditingEmployee(null); }
                else { handleAddEmployee(); }
              }} disabled={isLoading}>{editingEmployee ? t.common.save : t.dashboard.addEmployee}</Button>
            </div>
          </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Employee List Dialog */}
      <Dialog open={showEmployeeList} onOpenChange={setShowEmployeeList}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-full p-0 gap-0">
          <DialogHeader className="p-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>{t.dashboard.employees} ({employees.length})</span>
              <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 w-full sm:w-auto" onClick={() => { setShowEmployeeList(false); setShowAddEmployee(true); }}>
                <UserPlus className="h-4 w-4 mr-2" /> {t.dashboard.addEmployee}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] sm:max-h-[75vh]">
            <div className="p-4">
              {employees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">{t.employee.noEmployees}</p>
                  <p className="text-sm">{t.employee.addFirstEmployee}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employees.map((emp) => (
                    <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                      {/* Mobile: Top row with avatar and info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={emp.profilePhoto} />
                          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-lg">
                            {emp.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{emp.name}</p>
                            {emp.starOfMonth && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                            <Badge variant={emp.active ? 'default' : 'secondary'} className="text-xs">{emp.active ? t.employee.active : t.employee.inactive}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">{emp.designation}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline truncate">{emp.department}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">₹{emp.salary?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{emp.phone}</span>
                            {emp.email && <><span className="hidden sm:inline">•</span><span className="hidden sm:inline truncate">{emp.email}</span></>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile: Bottom row with actions */}
                      <div className="flex items-center justify-end gap-2 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0">
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none h-9" onClick={() => {
                          setSelectedEmployee(emp);
                          setSalaryForm({ 
                            month: new Date().toISOString().slice(0, 7), 
                            baseSalary: emp.salary, 
                            overtime: 0, 
                            incentives: 0, 
                            deductions: 0 
                          });
                          setShowPaySalary(true);
                        }}>
                          <DollarSign className="h-4 w-4 sm:mr-1" /> <span className="sm:inline">{t.employee.paySalary}</span>
                        </Button>
                        <Button size="sm" variant="outline" className="h-9 w-9 sm:w-auto" onClick={() => {
                          setEditingEmployee(emp);
                          setShowEmployeeList(false);
                          setShowAddEmployee(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-9 w-9 sm:w-auto" onClick={() => handleDeleteEmployee(emp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Pay Salary Dialog */}
      <Dialog open={showPaySalary} onOpenChange={setShowPaySalary}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.employee.paySalary}</DialogTitle></DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                    {selectedEmployee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.designation} • {selectedEmployee.department}</p>
                </div>
              </div>
              
              {/* Bank Details */}
              {(selectedEmployee.accountNumber || selectedEmployee.upiId) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Payment Details</p>
                  {selectedEmployee.accountNumber && (
                    <p><span className="text-muted-foreground">Account:</span> ****{selectedEmployee.accountNumber.slice(-4)}</p>
                  )}
                  {selectedEmployee.ifscCode && (
                    <p><span className="text-muted-foreground">IFSC:</span> {selectedEmployee.ifscCode}</p>
                  )}
                  {selectedEmployee.upiId && (
                    <p><span className="text-muted-foreground">UPI:</span> {selectedEmployee.upiId}</p>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>{t.salary.month}</Label>
                <Input type="month" value={salaryForm.month} onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.salary.baseSalary}</Label>
                  <Input type="number" value={salaryForm.baseSalary} onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.salary.overtime}</Label>
                  <Input type="number" value={salaryForm.overtime} onChange={(e) => setSalaryForm({ ...salaryForm, overtime: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.salary.incentives}</Label>
                  <Input type="number" value={salaryForm.incentives} onChange={(e) => setSalaryForm({ ...salaryForm, incentives: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>{t.salary.deductions}</Label>
                  <Input type="number" value={salaryForm.deductions} onChange={(e) => setSalaryForm({ ...salaryForm, deductions: Number(e.target.value) })} />
                </div>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{t.salary.netSalary}</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    ₹{(salaryForm.baseSalary + salaryForm.overtime + salaryForm.incentives - salaryForm.deductions).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowPaySalary(false); setSelectedEmployee(null); }}>{t.common.cancel}</Button>
                <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={handlePaySalary} disabled={isLoading}>
                  {isLoading ? '...' : t.employee.paySalary}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={showAttendance} onOpenChange={setShowAttendance}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>{t.dashboard.todayAttendance}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {attendance.map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                      {record.employee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{record.employee.name}</p>
                    <p className="text-sm text-muted-foreground">{record.employee.designation}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Badge variant={record.punchIn ? 'default' : 'destructive'}>{record.punchIn || 'Not punched in'}</Badge>
                      {record.punchOut && <Badge variant="secondary">{record.punchOut}</Badge>}
                    </div>
                    {record.workHours > 0 && <p className="text-xs text-muted-foreground mt-1">{record.workHours}h worked</p>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Leave Requests Dialog */}
      <Dialog open={showLeaves} onOpenChange={setShowLeaves}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t.leave.pendingApproval}</span>
              <Button size="sm" variant="outline" onClick={handleViewAllLeaves}>
                <Eye className="h-4 w-4 mr-1" /> {t.common.viewAll}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-3">
              {leaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Calendar className="h-8 w-8 mx-auto mb-2" /><p>{t.leave.noLeaveRecords}</p></div>
              ) : (
                leaves.map((leave) => (
                  <div key={leave.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{leave.employee.name}</p>
                      <Badge>{leave.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{leave.startDate} - {leave.endDate}</p>
                    {leave.reason && <p className="text-sm mt-1">{leave.reason}</p>}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleRejectLeave(leave)}>
                        <XCircle className="h-4 w-4 mr-1" /> {t.leave.reject}
                      </Button>
                      <Button size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600" onClick={() => handleOpenApproveDialog(leave)}>
                        <Check className="h-4 w-4 mr-1" /> {t.leave.approve}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Leave Approve Dialog - Attendance Allow/Not Allow */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-sm w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              {t.leave.approveLeave}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {approvingLeave?.employee?.name} — {approvingLeave?.type} leave ({approvingLeave?.startDate} to {approvingLeave?.endDate})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {t.leave.chooseAttendanceOption}
              </p>
            </div>
            
            {approvingLeave?.reason && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground"><span className="font-medium">Reason:</span> {approvingLeave.reason}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleConfirmApprove(true)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t.leave.attendanceAllow}</span>
                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{t.leave.employeeCanPunch}</span>
              </button>

              <button
                onClick={() => handleConfirmApprove(false)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all active:scale-95 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                  <ShieldX className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-red-700 dark:text-red-300">{t.leave.attendanceNotAllow}</span>
                <span className="text-[10px] text-red-600/70 dark:text-red-400/70">{t.leave.employeeCannotPunch}</span>
              </button>
            </div>

            <Button variant="outline" className="w-full" onClick={() => { setShowApproveDialog(false); setApprovingLeave(null); }}>
              {t.common.cancel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Leaves Tracking Dialog */}
      <Dialog open={showAllLeaves} onOpenChange={setShowAllLeaves}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" />
              {t.leave.leaveTracking}
            </DialogTitle>
          </DialogHeader>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'rejected'].map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={leaveFilter === filter ? 'default' : 'outline'}
                className={leaveFilter === filter ? 'bg-emerald-500' : ''}
                onClick={() => setLeaveFilter(filter as typeof leaveFilter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                {filter === 'all' && ` (${allLeaves.length})`}
                {filter === 'pending' && ` (${allLeaves.filter(l => l.status === 'pending').length})`}
                {filter === 'approved' && ` (${allLeaves.filter(l => l.status === 'approved').length})`}
                {filter === 'rejected' && ` (${allLeaves.filter(l => l.status === 'rejected').length})`}
              </Button>
            ))}
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {filteredLeaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t.leave.noLeaveRecords}</p>
                </div>
              ) : (
                filteredLeaves.map((leave) => (
                  <div key={leave.id} className="p-4 border rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                            {leave.employee?.name?.charAt(0) || 'E'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{leave.employee?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{leave.employee?.designation || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{leave.type}</Badge>
                        <Badge 
                          variant={
                            leave.status === 'approved' ? 'default' : 
                            leave.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                          className={
                            leave.status === 'approved' ? 'bg-emerald-500' : 
                            leave.status === 'rejected' ? 'bg-red-500' : ''
                          }
                        >
                          {leave.status === 'approved' ? `✓ ${t.leave.approved}` : 
                           leave.status === 'rejected' ? `✗ ${t.leave.rejected}` : `⏳ ${t.leave.pending}`}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>📅 {leave.startDate} - {leave.endDate}</span>
                    </div>
                    {leave.reason && (
                      <p className="text-sm mt-2 bg-background p-2 rounded">
                        <span className="font-medium">{t.leave.reason}:</span> {leave.reason}
                      </p>
                    )}
                    {leave.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50" onClick={() => { handleRejectLeave(leave); }}>
                          <XCircle className="h-4 w-4 mr-1" /> {t.leave.reject}
                        </Button>
                        <Button size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600" onClick={() => { handleOpenApproveDialog(leave); }}>
                          <Check className="h-4 w-4 mr-1" /> {t.leave.approve}
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

      {/* Shift Management Dialog */}
      <Dialog open={showShiftManagement} onOpenChange={setShowShiftManagement}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{t.shift.shiftManagement}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <ShiftManagement organizationId={user?.organizationId || ''} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Employee Activities Dialog */}
      <Dialog open={showEmployeeActivities} onOpenChange={setShowEmployeeActivities}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              {t.dashboard.employeeActivities}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh]">
            <EmployeeActivities organizationId={user?.organizationId || ''} />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Salary Management Dialog */}
      <Dialog open={showSalaryManagement} onOpenChange={setShowSalaryManagement}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{t.salary.salaryManagement}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2"><CardTitle className="text-base">{t.salary.salaryFormula}</CardTitle></CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <p><span className="text-emerald-500">{t.salary.baseSalary}</span></p>
                    <p><span className="text-blue-500">+ {t.salary.overtime}</span></p>
                    <p><span className="text-purple-500">+ {t.salary.incentives}</span></p>
                    <p className="border-t pt-2 mt-2"><span className="font-bold">= {t.salary.finalSalary}</span></p>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                        {emp.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-sm text-muted-foreground">{emp.designation}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-500">₹{emp.salary.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{t.salary.baseSalary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncement} onOpenChange={setShowAnnouncement}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.announcement.sendAnnouncement}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.announcement.announcementTitle}</Label>
              <Input placeholder={t.announcement.announcementTitle} value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t.announcement.announcementMessage}</Label>
              <Textarea placeholder="Enter your message..." rows={4} value={announcementForm.message}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAnnouncement(false)}>{t.common.cancel}</Button>
              <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={handleSendAnnouncement}>
                <Send className="h-4 w-4 mr-2" /> Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{t.notifications.notifications}</DialogTitle>
              {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllAsRead}>{t.notifications.markAllRead}</Button>}
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Bell className="h-8 w-8 mx-auto mb-2" /><p>{t.notifications.noNotifications}</p></div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} onClick={() => markAsRead(notification.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${notification.read ? 'bg-muted/30' : 'bg-muted hover:bg-muted/80'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-transparent' : 'bg-emerald-500'}`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Profile Photo Picker */}
      <PhotoPicker
        open={showProfilePhotoPicker}
        onClose={() => setShowProfilePhotoPicker(false)}
        onConfirm={handleProfilePhotoUpdate}
        title={t.settings.changeProfilePhoto}
        currentPhoto={user?.profilePhoto}
        aspectRatio="circle"
        allowGallery={true}
      />

      {/* Organization Logo Picker */}
      <PhotoPicker
        open={showOrgLogoPicker}
        onClose={() => setShowOrgLogoPicker(false)}
        onConfirm={handleOrgLogoUpdate}
        title="Organization Logo"
        currentPhoto={user?.organizationLogo}
        aspectRatio="square"
        allowGallery={true}
      />

      {/* Holiday Management Dialog */}
      <Dialog open={showHolidayManagement} onOpenChange={setShowHolidayManagement}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-emerald-500" />
              {t.holiday.holidayManagement}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <HolidayManagement 
              organizationId={user?.organizationId || ''} 
              adminId={user?.id || ''} 
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Incentives Management Dialog */}
      <Dialog open={showIncentives} onOpenChange={setShowIncentives}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-emerald-500" />
                {t.incentive.giveIncentive}
              </span>
              <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600" onClick={() => setShowAddIncentive(true)}>
                <Gift className="h-4 w-4 mr-2" /> {t.incentive.giveIncentive}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4">
              {/* Incentive Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-500">₹{incentiveRecords.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Given</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-500">{incentiveRecords.length}</p>
                    <p className="text-xs text-muted-foreground">Total Records</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-500">{incentiveRecords.filter(i => i.month === new Date().toISOString().slice(0, 7)).length}</p>
                    <p className="text-xs text-muted-foreground">This Month</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-orange-500">{new Set(incentiveRecords.map(i => i.employeeId)).size}</p>
                    <p className="text-xs text-muted-foreground">Employees</p>
                  </CardContent>
                </Card>
              </div>

              {/* Incentive Records List */}
              {incentiveRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">{t.incentive.noIncentives}</p>
                  <p className="text-sm">Give incentives to employees to motivate them!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incentiveRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((incentive) => (
                    <div key={incentive.id} className="flex items-center gap-4 p-4 border rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-lg">
                          {incentive.employee?.name?.charAt(0) || 'E'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{incentive.employee?.name || 'Unknown'}</p>
                          <Badge variant="outline" className="text-xs">{incentive.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{incentive.reason}</p>
                        <p className="text-xs text-muted-foreground">{new Date(incentive.date).toLocaleDateString()} {incentive.month && `• ${incentive.month}`}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-500">+₹{incentive.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Incentive</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Incentive Dialog */}
      <Dialog open={showAddIncentive} onOpenChange={setShowAddIncentive}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-emerald-500" />
              {incentiveEmployee ? `${t.incentive.giveIncentive} - ${incentiveEmployee.name}` : t.incentive.selectEmployee}
            </DialogTitle>
          </DialogHeader>
          
          {!incentiveEmployee ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setIncentiveEmployee(emp)}
                    className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                        {emp.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-sm text-muted-foreground">{emp.designation || 'Employee'}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
                    {incentiveEmployee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{incentiveEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">{incentiveEmployee.designation || 'Employee'}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIncentiveEmployee(null)}>{t.common.edit}</Button>
              </div>
              
              <div className="space-y-2">
                <Label>{t.incentive.incentiveType}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'bonus', label: '🎉 Bonus' },
                    { value: 'performance', label: '⭐ Performance' },
                    { value: 'attendance', label: '✅ Attendance' },
                    { value: 'referral', label: '👥 Referral' },
                    { value: 'overtime', label: '⏰ Overtime' },
                    { value: 'achievement', label: '🏆 Achievement' },
                    ...customCategories.map(cat => ({ value: cat.toLowerCase(), label: `📁 ${cat}` })),
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setIncentiveForm({ ...incentiveForm, type: type.value })}
                      className={`p-2 border rounded-lg text-sm transition-colors ${
                        incentiveForm.type === type.value ? 'bg-emerald-500 text-white border-emerald-500' : 'hover:bg-muted'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                
                {/* Add New Category */}
                {!showNewCategoryInput ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => setShowNewCategoryInput(true)}
                  >
                    <Star className="h-4 w-4 mr-2" /> {t.incentive.addNewCategory}
                  </Button>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewCategoryInput(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-emerald-500"
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          setCustomCategories([...customCategories, newCategoryName.trim()]);
                          setIncentiveForm({ ...incentiveForm, type: newCategoryName.trim().toLowerCase() });
                          setNewCategoryName('');
                          setShowNewCategoryInput(false);
                        }
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t.incentive.amount} (₹) *</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={incentiveForm.amount || ''}
                  onChange={(e) => setIncentiveForm({ ...incentiveForm, amount: Number(e.target.value) })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.salary.month}</Label>
                <Input
                  type="month"
                  value={incentiveForm.month}
                  onChange={(e) => setIncentiveForm({ ...incentiveForm, month: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t.incentive.reason} *</Label>
                <Textarea
                  placeholder="Enter reason for incentive..."
                  rows={3}
                  value={incentiveForm.reason}
                  onChange={(e) => setIncentiveForm({ ...incentiveForm, reason: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowAddIncentive(false); setIncentiveEmployee(null); }}>{t.common.cancel}</Button>
                <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={handleAddIncentive} disabled={isLoading || !incentiveForm.amount || !incentiveForm.reason}>
                  {isLoading ? '...' : t.incentive.giveIncentive}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
