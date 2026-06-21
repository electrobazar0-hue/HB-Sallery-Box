// Firebase configuration - Replace with your actual config from Firebase Console
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

export interface MessagePayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
}

// Lazy-initialized messaging instance
let messagingInstance: any = null;
let firebaseInitialized = false;

async function getMessagingInstance() {
  if (firebaseInitialized) return messagingInstance;

  try {
    const firebaseApp = await import('firebase/app');
    const firebaseMessaging = await import('firebase/messaging');

    const { initializeApp, getApps } = firebaseApp;
    const { getMessaging } = firebaseMessaging;

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    messagingInstance = typeof window !== 'undefined' ? getMessaging(app) : null;
    firebaseInitialized = true;
  } catch (error) {
    console.log('Firebase not available:', error);
    messagingInstance = null;
    firebaseInitialized = true;
  }

  return messagingInstance;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
    });

    return token;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: MessagePayload) => void) {
  // Schedule async setup, return noop for now
  getMessagingInstance().then(messaging => {
    if (!messaging) return;
    import('firebase/messaging').then(({ onMessage }) => {
      onMessage(messaging, (payload: any) => callback(payload));
    });
  });

  return () => {};
}

/**
 * Delete FCM token (for logout)
 */
export async function deleteToken(): Promise<boolean> {
  const messaging = await getMessagingInstance();
  if (!messaging) return false;

  try {
    await import('firebase/messaging').then(({ getToken }) => getToken(messaging));
    return true;
  } catch {
    return false;
  }
}

export const app = null;
export const messaging = null;