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
  const { logout, user, updateUser } = useAuthStore();
  
  const {
    isEnabled: biometricEnabled,
    isLocked: biometricLocked,
    isAuthenticating: biometricAuthenticating,
    error: biometricError,
    authenticate: biometricAuthenticate,
    unlock: biometricUnlock,
  } = useBiometric();

  const refreshCurrentUser = useCallback(async () => {
    if (!user?.id) return true;

    try {
      if (user.role === 'admin') {
        const data = await fetchJSON<{
          exists?: boolean;
          admin?: {
            id: string;
            userId?: string;
            name: string;
            phone: string;
            email?: string;
            profilePhoto?: string;
            organizationLogo?: string;
            organization?: { id: string; name: string; logo?: string };
          };
        }>(`/api/admin?id=${encodeURIComponent(user.id)}`, { cache: 'no-store' });

        if (data?.admin) {
          updateUser({
            id: data.admin.id,
            userId: data.admin.userId,
            name: data.admin.name,
            phone: data.admin.phone,
            email: data.admin.email,
            profilePhoto: data.admin.profilePhoto,
            organizationId: data.admin.organization?.id,
            organizationName: data.admin.organization?.name,
            organizationLogo: data.admin.organizationLogo || data.admin.organization?.logo,
          });
          return true;
        }

        return data?.exists === false ? false : true;
      }

      const data = await fetchJSON<{
        employee?: {
          id: string;
          userId?: string;
          name: string;
          phone: string;
          email?: string;
          designation?: string;
          department?: string;
          salary?: number;
          profilePhoto?: string;
          active?: boolean;
          organizationId?: string;
          organizationName?: string;
          organizationLogo?: string;
          organization?: { id: string; name: string; logo?: string };
          geofenceEnabled?: boolean;
          geofenceLat?: number;
          geofenceLng?: number;
          geofenceRadius?: number;
        };
        _httpError?: boolean;
      }>(`/api/employees?employeeId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });

      if (data?.employee) {
        const employee = data.employee;
        updateUser({
          id: employee.id,
          userId: employee.userId,
          name: employee.name,
          phone: employee.phone,
          email: employee.email,
          designation: employee.designation,
          department: employee.department,
          salary: employee.salary,
          profilePhoto: employee.profilePhoto,
          active: employee.active,
          organizationId: employee.organizationId || employee.organization?.id,
          organizationName: employee.organizationName || employee.organization?.name,
          organizationLogo: employee.organizationLogo || employee.organization?.logo,
          geofenceEnabled: employee.geofenceEnabled,
          geofenceLat: employee.geofenceLat,
          geofenceLng: employee.geofenceLng,
          geofenceRadius: employee.geofenceRadius,
        });
        return true;
      }

      return data?._httpError ? false : true;
    } catch (error) {
      console.error('Failed to refresh current user:', error);
      return true;
    }
  }, [user?.id, user?.role, updateUser]);

  const handleSplashComplete = useCallback(async (isAuthenticated: boolean) => {
    if (isAuthenticated) {
      const isCurrentUserValid = await refreshCurrentUser();
      if (isCurrentUserValid) {
        setCurrentScreen('dashboard');
      } else {
        logout();
        setCurrentScreen('login');
      }
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
  }, [logout, refreshCurrentUser]);

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
