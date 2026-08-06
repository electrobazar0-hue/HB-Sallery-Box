'use client';

import { useState, useCallback } from 'react';
import { SplashScreen } from '@/components/splash-screen';
import { LoginScreen } from '@/components/login-screen';
import { AdminRegistration } from '@/components/admin-registration';
import { AdminDashboard } from '@/components/admin-dashboard';
import { EmployeeDashboard } from '@/components/employee-dashboard';
import { Settings } from '@/components/settings';
import { BiometricLock } from '@/components/biometric-lock';
import { SetupGuide } from '@/components/setup-guide';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { useAuthStore } from '@/store/auth-store';
import { useBiometric } from '@/hooks/use-biometric';
import { fetchJSON } from '@/lib/utils';

type Screen = 'splash' | 'setup' | 'login' | 'register' | 'dashboard' | 'settings';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [registrationPhone, setRegistrationPhone] = useState('');
  const { logout, user } = useAuthStore();
  
  const {
    isEnabled: biometricEnabled,
    isLocked: biometricLocked,
    isAuthenticating: biometricAuthenticating,
    error: biometricError,
    authenticate: biometricAuthenticate,
    unlock: biometricUnlock,
  } = useBiometric();

  const handleSplashComplete = useCallback(async (isAuthenticated: boolean) => {
    if (isAuthenticated) {
      setCurrentScreen('dashboard');
      return;
    }

    // Check database status before showing login (with retry)
    let connected = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await fetchJSON<{ success: boolean; connected?: boolean }>('/api/setup');
        if (data?.success && data.connected) {
          connected = true;
          break;
        }
      } catch {
        // Retry on network error
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (connected) {
      setCurrentScreen('login');
    } else {
      // Fallback to login even if setup check fails
      // (the setup guide is only needed for PostgreSQL on Vercel)
      setCurrentScreen('login');
    }
  }, []);

  const handleLogin = useCallback(() => {
    setCurrentScreen('dashboard');
  }, []);

  const handleRegister = useCallback((phone: string) => {
    setRegistrationPhone(phone);
    setCurrentScreen('register');
  }, []);

  const handleRegistered = useCallback(() => {
    setCurrentScreen('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setCurrentScreen('login');
  }, [logout]);

  const handleSettings = useCallback(() => {
    setCurrentScreen('settings');
  }, []);

  const handleBackFromSettings = useCallback(() => {
    setCurrentScreen('dashboard');
  }, []);

  const handleBackFromRegister = useCallback(() => {
    setCurrentScreen('login');
  }, []);

  const handleBiometricAuthenticate = useCallback(async () => {
    return await biometricAuthenticate();
  }, [biometricAuthenticate]);

  const handleBiometricUnlock = useCallback(() => {
    biometricUnlock();
  }, [biometricUnlock]);

  // Render appropriate dashboard based on user role
  const renderDashboard = () => {
    if (user?.role === 'admin') {
      return (
        <AdminDashboard
          onLogout={handleLogout}
          onSettings={handleSettings}
        />
      );
    }
    return (
      <EmployeeDashboard
        onLogout={handleLogout}
        onSettings={handleSettings}
      />
    );
  };

  return (
    <main className="min-h-[100dvh]">
      {/* Biometric Lock Screen */}
      {currentScreen === 'dashboard' && biometricEnabled && (
        <BiometricLock
          isLocked={biometricLocked}
          isEnabled={biometricEnabled}
          isAuthenticating={biometricAuthenticating}
          onAuthenticate={handleBiometricAuthenticate}
          onUnlock={handleBiometricUnlock}
          error={biometricError}
        />
      )}
      
      {currentScreen === 'splash' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
      {currentScreen === 'setup' && (
        <SetupGuide />
      )}
      {currentScreen === 'login' && (
        <LoginScreen
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      )}
      {currentScreen === 'register' && (
        <AdminRegistration
          onBack={handleBackFromRegister}
          onRegistered={handleRegistered}
          initialPhone={registrationPhone}
        />
      )}
      {currentScreen === 'dashboard' && renderDashboard()}
      {currentScreen === 'settings' && (
        <Settings
          onBack={handleBackFromSettings}
          onLogout={handleLogout}
        />
      )}

      {/* PWA Install Prompt + Fullscreen Button */}
      <PWAInstallPrompt />
    </main>
  );
}