'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: 'attendance' | 'leave' | 'salary' | 'announcement' | 'shift' | 'incentive' | 'expense' | 'payroll' | 'error' | 'info';
  read: boolean;
  createdAt: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}

interface UseNotificationsOptions {
  userId: string;
  role: 'admin' | 'employee';
}

// Notification templates for different events
const NOTIFICATION_TEMPLATES = {
  // Attendance notifications
  attendance_punch_in: {
    title: 'Punched In Successfully',
    body: 'You have been marked present for today.',
    type: 'attendance' as const,
    priority: 'normal' as const,
  },
  attendance_punch_out: {
    title: 'Punched Out Successfully',
    body: 'Your attendance has been recorded.',
    type: 'attendance' as const,
    priority: 'normal' as const,
  },
  attendance_late: {
    title: 'Late Arrival Detected',
    body: 'You have been marked as late for today.',
    type: 'attendance' as const,
    priority: 'high' as const,
  },
  attendance_reminder: {
    title: 'Punch In Reminder',
    body: 'Don\'t forget to punch in for your shift!',
    type: 'attendance' as const,
    priority: 'high' as const,
  },

  // Leave notifications
  leave_submitted: {
    title: 'Leave Request Submitted',
    body: 'Your leave request has been submitted for approval.',
    type: 'leave' as const,
    priority: 'normal' as const,
  },
  leave_approved: {
    title: 'Leave Approved',
    body: 'Your leave request has been approved.',
    type: 'leave' as const,
    priority: 'high' as const,
  },
  leave_rejected: {
    title: 'Leave Rejected',
    body: 'Your leave request has been rejected.',
    type: 'leave' as const,
    priority: 'high' as const,
  },
  leave_pending_admin: {
    title: 'New Leave Request',
    body: 'You have a pending leave request to review.',
    type: 'leave' as const,
    priority: 'high' as const,
  },

  // Salary notifications
  salary_processed: {
    title: 'Salary Processed',
    body: 'Your salary for this month has been processed.',
    type: 'salary' as const,
    priority: 'high' as const,
  },
  salary_credited: {
    title: 'Salary Credited',
    body: 'Your salary has been credited to your account.',
    type: 'salary' as const,
    priority: 'high' as const,
  },

  // Shift notifications
  shift_changed: {
    title: 'Shift Updated',
    body: 'Your shift schedule has been updated.',
    type: 'shift' as const,
    priority: 'high' as const,
  },
  shift_request_approved: {
    title: 'Shift Change Approved',
    body: 'Your shift change request has been approved.',
    type: 'shift' as const,
    priority: 'normal' as const,
  },
  shift_reminder: {
    title: 'Shift Starting Soon',
    body: 'Your shift starts in 30 minutes.',
    type: 'shift' as const,
    priority: 'high' as const,
  },

  // Announcement notifications
  announcement: {
    title: 'New Announcement',
    body: 'You have a new announcement from admin.',
    type: 'announcement' as const,
    priority: 'high' as const,
  },

  // Incentive notifications
  incentive_added: {
    title: 'Incentive Added',
    body: 'A new incentive has been added to your account.',
    type: 'incentive' as const,
    priority: 'normal' as const,
  },
  star_employee: {
    title: '🌟 Star Employee!',
    body: 'Congratulations! You are the Star Employee of the Month!',
    type: 'incentive' as const,
    priority: 'high' as const,
  },
};

// Get storage key based on user role
function getStorageKey(role: 'admin' | 'employee'): string {
  return `hb-notifications-${role}`;
}

// Get initial values synchronously
function getInitialNotifications(role: 'admin' | 'employee'): NotificationData[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = JSON.parse(localStorage.getItem(getStorageKey(role)) || '[]');
    if (stored.length > 0) return stored;
  } catch {
    // Ignore errors
  }

  return [
    {
      id: 'welcome_1',
      title: 'Welcome to HB Sallery Box!',
      body: 'You have successfully logged in.',
      type: 'announcement',
      read: false,
      createdAt: new Date().toISOString(),
      priority: 'normal',
    },
  ];
}

function getInitialSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

function getInitialPermission(): NotificationPermission {
  if (typeof window === 'undefined') return 'default';
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// Simulated FCM - In production, this would use actual Firebase Cloud Messaging
export function useNotifications(options: UseNotificationsOptions) {
  const { userId, role } = options;
  const [notifications, setNotifications] = useState<NotificationData[]>(() => getInitialNotifications(role));
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(getInitialPermission);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const isSupported = getInitialSupport();

  // Compute unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Request notification permission (simulates FCM token generation)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        // In production, this would get an FCM token
        const simulatedToken = `fcm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setFcmToken(simulatedToken);
        console.log('FCM Token (simulated):', simulatedToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [isSupported]);

  // Show browser notification
  const showBrowserNotification = useCallback(async (title: string, body: string, data?: Record<string, string>, priority?: 'high' | 'normal' | 'low') => {
    if (permissionStatus !== 'granted') return;

    try {
      // Try Service Worker notification first (required in some contexts)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: '/logo.svg',
          badge: '/logo.svg',
          tag: data?.id,
          data,
          requireInteraction: priority === 'high',
        });
        return;
      }

      // Fallback to regular Notification API
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/logo.svg',
          badge: '/logo.svg',
          tag: data?.id,
          data,
          requireInteraction: priority === 'high',
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto close after 5 seconds for low priority
        if (priority === 'low') {
          setTimeout(() => notification.close(), 5000);
        }
      }
    } catch (error) {
      // Silently fail - notifications are optional
      console.log('Notification not available:', error);
    }
  }, [permissionStatus]);

  // Add notification - stores separately for each role
  const addNotification = useCallback((notification: Omit<NotificationData, 'id' | 'read' | 'createdAt'>) => {
    try {
      const newNotification: NotificationData = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      setNotifications(prev => [newNotification, ...prev]);

      // Show browser notification (with error handling)
      try {
        showBrowserNotification(
          notification.title,
          notification.body,
          notification.data,
          notification.priority
        );
      } catch (browserNotifError) {
        console.log('Browser notification failed:', browserNotifError);
      }

      // Store in localStorage for persistence - SEPARATE by role
      try {
        const storageKey = getStorageKey(role);
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        stored.unshift(newNotification);
        localStorage.setItem(storageKey, JSON.stringify(stored.slice(0, 50)));
      } catch (storageError) {
        console.log('Storage error (non-critical):', storageError);
      }

      return newNotification;
    } catch (error) {
      console.error('Failed to add notification:', error);
      return null;
    }
  }, [showBrowserNotification, role]);

  // Add notification using template
  const notify = useCallback((
    templateKey: keyof typeof NOTIFICATION_TEMPLATES,
    overrides?: {
      title?: string;
      body?: string;
      data?: Record<string, string>;
    }
  ) => {
    const template = NOTIFICATION_TEMPLATES[templateKey];
    return addNotification({
      title: overrides?.title || template.title,
      body: overrides?.body || template.body,
      type: template.type,
      priority: template.priority,
      data: overrides?.data,
    });
  }, [addNotification]);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    
    // Update localStorage
    try {
      const storageKey = getStorageKey(role);
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = stored.map((n: NotificationData) => 
        n.id === id ? { ...n, read: true } : n
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Ignore errors
    }
  }, [role]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    // Update localStorage
    try {
      const storageKey = getStorageKey(role);
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = stored.map((n: NotificationData) => ({ ...n, read: true }));
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Ignore errors
    }
  }, [role]);

  // Clear notification
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Update localStorage
    try {
      const storageKey = getStorageKey(role);
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = stored.filter((n: NotificationData) => n.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // Ignore errors
    }
  }, [role]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(getStorageKey(role));
  }, [role]);

  // Simulate scheduled notifications (e.g., shift reminders)
  const scheduleNotification = useCallback((
    templateKey: keyof typeof NOTIFICATION_TEMPLATES,
    delayMs: number,
    overrides?: { title?: string; body?: string; data?: Record<string, string> }
  ) => {
    return setTimeout(() => {
      notify(templateKey, overrides);
    }, delayMs);
  }, [notify]);

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, NotificationData[]>);

  return {
    notifications,
    groupedNotifications,
    unreadCount,
    permissionStatus,
    fcmToken,
    isSupported,
    requestPermission,
    addNotification,
    notify,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    showBrowserNotification,
    scheduleNotification,
  };
}
