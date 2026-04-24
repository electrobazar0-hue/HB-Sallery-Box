# 🔔 Push Notification Integration Guide

## Overview
This guide will help you integrate Firebase Cloud Messaging (FCM) for push notifications in HB Sallery Box.

---

## 📋 Prerequisites
- Firebase Account
- Firebase Project created
- Next.js 16 project set up

---

## 🚀 Step-by-Step Integration

### 1. Firebase Project Setup

#### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: "HB Sallery Box"
4. Follow the setup wizard
5. Click "Create project"

#### 1.2 Add Web App
1. In Firebase Console, go to Project Settings (gear icon)
2. Click "Add app" → "Web" (</> icon)
3. App nickname: "HB Sallery Box"
4. Check "Also set up Firebase Hosting for this app" (optional)
5. Click "Register app"

#### 1.3 Get Firebase Config
Copy the `firebaseConfig` object:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XXXXXXXXXX"
};
```

#### 1.4 Enable Cloud Messaging
1. Go to Project Settings → Cloud Messaging tab
2. Scroll to "Web Push certificates"
3. Click "Generate key pair"
4. Copy the **VAPID Key** (starts with "BC...")

---

### 2. Update Environment Variables

Edit `.env` file in your project:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...  # From firebaseConfig
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BC...  # From Cloud Messaging settings
```

---

### 3. Update Service Worker

Edit `public/firebase-messaging-sw.js`:

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Replace with YOUR Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'HB Sallery Box';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: payload.data,
    tag: payload.notification?.tag || Date.now().toString(),
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
```

---

### 4. Register Service Worker in App

Add this to your main layout or page component:

```typescript
'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();
  }, []);

  return (
    <html>
      <head>
        <title>HB Sallery Box</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

### 5. Request Notification Permission

In your login page or dashboard component:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useFCMNotifications } from '@/hooks/use-fcm-notifications';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();

  const {
    fcmToken,
    permissionStatus,
    isSupported,
    requestPermission,
  } = useFCMNotifications({
    userId: user?.id || '',
    role: 'employee',
  });

  // Request notification permission on mount
  useEffect(() => {
    if (isSupported && permissionStatus === 'default') {
      requestPermission();
    }
  }, [isSupported, permissionStatus, requestPermission]);

  // Save FCM token to backend when obtained
  useEffect(() => {
    if (fcmToken && user?.id) {
      saveFCMTokenToBackend(user.id, 'employee', fcmToken);
    }
  }, [fcmToken, user?.id]);

  async function saveFCMTokenToBackend(userId: string, role: string, token: string) {
    try {
      await fetch('/api/fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, token }),
      });
      console.log('FCM token saved to backend');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  return (
    <div>
      {permissionStatus !== 'granted' && (
        <button onClick={requestPermission}>
          Enable Notifications
        </button>
      )}
    </div>
  );
}
```

---

### 6. Send Notifications from Backend

Create a notification utility in backend:

```typescript
// lib/notifications.ts

import admin from 'firebase-admin';

// Initialize Firebase Admin (do this once)
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'your-project-id',
});

interface SendNotificationOptions {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
}

export async function sendPushNotification(options: SendNotificationOptions) {
  const { token, title, body, data, priority = 'normal' } = options;

  const message = {
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      id: Date.now().toString(),
      priority,
    },
    token,
    webpush: {
      fcm_options: {
        link: 'https://your-domain.com',
      },
    },
    android: {
      priority: priority === 'high' ? 'high' : 'normal',
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          sound: priority === 'high' ? 'default' : undefined,
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Send notification to multiple users
export async function sendNotificationToUsers(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const message = {
    notification: { title, body },
    data: { ...data, id: Date.now().toString() },
    tokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(`${response.successCount} messages sent successfully`);
    return response;
  } catch (error) {
    console.error('Error sending notifications:', error);
    throw error;
  }
}
```

---

### 7. Example: Send Notification on Attendance

Update your attendance API:

```typescript
// app/api/attendance/route.ts

import { sendPushNotification } from '@/lib/notifications';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  // ... existing code ...

  // After punch in/out
  if (pendingPunchType === 'in') {
    // Send notification to employee
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (employee?.fcmToken) {
      await sendPushNotification({
        token: employee.fcmToken,
        title: '✅ Punch In Successful',
        body: `You punched in at ${fullTime}`,
        data: {
          type: 'attendance',
          action: 'punch_in',
          time: fullTime,
        },
        priority: 'normal',
      });
    }
  }

  return NextResponse.json({ success: true, attendance });
}
```

---

### 8. Example: Admin Notifications

Send notification to admin when employee requests leave:

```typescript
// app/api/leaves/route.ts

import { sendPushNotification } from '@/lib/notifications';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { employeeId, type, startDate, endDate, reason } = await request.json();

  // Create leave request
  const leave = await db.leave.create({
    data: {
      employeeId,
      type,
      startDate,
      endDate,
      reason,
    },
  });

  // Get admin's FCM token
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { admin: true },
  });

  if (employee?.admin?.fcmToken) {
    await sendPushNotification({
      token: employee.admin.fcmToken,
      title: '📋 New Leave Request',
      body: `${employee.name} requested ${type} leave from ${startDate} to ${endDate}`,
      data: {
        type: 'leave',
        action: 'new_request',
        employeeId,
        leaveId: leave.id,
      },
      priority: 'high',
    });
  }

  return NextResponse.json({ success: true, leave });
}
```

---

### 9. Testing Notifications

#### Test from Firebase Console:
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Target: Select "User segment" or "FCM token"
5. Click "Send message"

#### Test from Backend:
```typescript
// Test endpoint
export async function GET() {
  const testToken = 'YOUR_FCM_TOKEN';

  await sendPushNotification({
    token: testToken,
    title: '🔔 Test Notification',
    body: 'This is a test notification from HB Sallery Box',
    data: {
      type: 'test',
      timestamp: Date.now().toString(),
    },
    priority: 'high',
  });

  return NextResponse.json({ message: 'Test notification sent' });
}
```

---

## 🔧 Troubleshooting

### Issue: Notifications not showing
**Solutions:**
1. Check browser notification permission is granted
2. Verify FCM token is saved correctly
3. Check service worker is registered
4. Ensure VAPID key is correct
5. Check browser console for errors

### Issue: Service worker not registering
**Solutions:**
1. Ensure service worker file exists in `public/`
2. Check file path is correct
3. Verify service worker scope
4. Clear browser cache

### Issue: Notifications only work when tab is open
**Solutions:**
1. Ensure background message handler is in service worker
2. Check Firebase config matches
3. Verify VAPID key is set correctly

---

## 📱 Notification Types

### Attendance Notifications
- ✅ Punch In/Out success
- ⏰ Late arrival warning
- 📅 Daily attendance reminder

### Leave Notifications
- 📋 Leave request submitted/approved/rejected
- 🗓️ Leave balance low warning

### Salary Notifications
- 💰 Salary processed
- 💳 Salary credited

### Announcement Notifications
- 📢 New announcements from admin
- 🎉 Holiday notifications

### Shift Notifications
- 🔄 Shift change alerts
- ⏰ Shift starting soon

---

## 🎯 Best Practices

1. **Always ask for permission** at the right time (after user logs in)
2. **Store FCM tokens** securely in database
3. **Handle token refresh** (tokens can expire)
4. **Use appropriate priority** (high for important, normal for regular)
5. **Include actionable data** in notifications
6. **Test thoroughly** on different devices/browsers
7. **Handle errors gracefully** (notifications are optional)
8. **Respect user preferences** (provide opt-out option)

---

## 📚 Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

## ✅ Checklist

- [ ] Firebase project created
- [ ] Web app added to Firebase
- [ ] Cloud Messaging enabled
- [ ] VAPID key generated
- [ ] Environment variables updated
- [ ] Service worker configured
- [ ] FCM token saved to database
- [ ] Notifications sending from backend
- [ ] Testing on different devices
- [ ] Error handling implemented

---

## 🎉 Success!

Once completed, your app will have fully functional push notifications!

Users will receive notifications for:
- ✅ Attendance events
- 📋 Leave requests
- 💰 Salary updates
- 📢 Announcements
- And more!
