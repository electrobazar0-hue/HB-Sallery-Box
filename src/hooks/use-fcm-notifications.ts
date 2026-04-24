'use client';

import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage, MessagePayload } from '@/lib/firebase';
import { registerServiceWorker } from '@/lib/service-worker';

export interface FCMNotificationData {
  id: string;
  title: string;
  body: string;
  type: 'attendance' | 'leave' | 'salary' | 'announcement' | 'shift' | 'incentive' | 'expense' | 'payroll' | 'error' | 'info';
  read: boolean;
  createdAt: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}

interface UseFCMNotificationsOptions {
  userId: string;
  role: 'admin' | 'employee';
  onNotificationClick?: (notification: FCMNotificationData) => void;
}

// Get storage key based on user role
function getStorageKey(role: 'admin' | 'employee'): string {
  return `hb-fcm-notifications-${role}`;
}

// Get initial notifications
function getInitialNotifications(role: 'admin' | 'employee'): FCMNotificationData[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(getStorageKey(role));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }

  return [];
}

export function useFCMNotifications(options: UseFCMNotificationsOptions) {
  const { userId, role, onNotificationClick } = options;

  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [notifications, setNotifications] = useState<FCMNotificationData[]>(getInitialNotifications(role));
  const [isSupported, setIsSupported] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Register service worker
  useEffect(() => {
    if (isSupported) {
      registerServiceWorker();
    }
  }, [isSupported]);

  // Add notification
  const addNotification = useCallback((notification: FCMNotificationData) => {
    setNotifications((prev) => [notification, ...prev]);

    // Store in localStorage
    try {
      const storageKey = getStorageKey(role);
      const stored = getInitialNotifications(role);
      const updated = [notification, ...stored].slice(0, 50);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.log('Storage error:', error);
    }
  }, [role]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported || permissionStatus !== 'granted') return;

    const unsubscribe = onForegroundMessage((payload: MessagePayload) => {
      console.log('Foreground FCM message:', payload);

      const notification: FCMNotificationData = {
        id: payload.data?.id || `fcm_${Date.now()}`,
        title: payload.notification?.title || payload.data?.title || 'Notification',
        body: payload.notification?.body || payload.data?.body || '',
        type: (payload.data?.type as FCMNotificationData['type']) || 'info',
        read: false,
        createdAt: new Date().toISOString(),
        data: payload.data,
        priority: (payload.data?.priority as 'high' | 'normal' | 'low') || 'normal',
      };

      addNotification(notification);

      // Custom callback
      if (onNotificationClick) {
        onNotificationClick(notification);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isSupported, permissionStatus, onNotificationClick, addNotification]);

  // Request permission and get token
  const requestPermission = useCallback(async (): Promise<string | null> => {
    if (!isSupported) {
      console.log('Notifications not supported');
      return null;
    }

    try {
      const token = await requestNotificationPermission();

      if (token) {
        setFcmToken(token);
        setPermissionStatus('granted');

        // Here you would send the token to your backend
        // await saveFCMTokenToBackend(userId, token, role);
        console.log('FCM Token obtained:', token);
      }

      return token;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return null;
    }
  }, [isSupported, userId, role]);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    try {
      const storageKey = getStorageKey(role);
      const stored = getInitialNotifications(role);
      const updated = stored.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.log('Storage error:', error);
    }
  }, [role]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const storageKey = getStorageKey(role);
      const stored = getInitialNotifications(role);
      const updated = stored.map((n) => ({ ...n, read: true }));
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.log('Storage error:', error);
    }
  }, [role]);

  // Clear notification
  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const storageKey = getStorageKey(role);
      const stored = getInitialNotifications(role);
      const updated = stored.filter((n) => n.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.log('Storage error:', error);
    }
  }, [role]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(getStorageKey(role));
  }, [role]);

  return {
    fcmToken,
    permissionStatus,
    isSupported,
    notifications,
    unreadCount,
    requestPermission,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };
}
