'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sun, Moon, Monitor, Check, Fingerprint, Lock, Shield, KeyRound, Languages, CheckCircle2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth-store';
import { useBiometric } from '@/hooks/use-biometric';
import { useLanguageStore } from '@/lib/i18n';
import { LanguageToggle } from '@/components/language-toggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PhotoPicker } from '@/components/photo-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SettingsProps {
  onBack: () => void;
  onLogout: () => void;
}

// Helper to check PIN status
function getPinStatus(): boolean {
  if (typeof window === 'undefined') return false;
  const pin = localStorage.getItem('hb_app_pin');
  return !!pin && pin.length >= 4;
}

// Helper to check biometric status
function getBiometricStatus(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('hb_biometric_enabled') === 'true';
}

export function Settings({ onBack, onLogout }: SettingsProps) {
  const { theme, setTheme } = useTheme();
  const { user, updateUser, updateOrganizationLogo } = useAuthStore();
  const { language, setLanguage, t } = useLanguageStore();
  const {
    isSupported: biometricSupported,
    isAvailable: biometricAvailable,
    isEnabled: securityEnabled,
    isAuthenticating: biometricAuthenticating,
    enable: enableBiometric,
    disable: disableBiometric,
  } = useBiometric();
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [hasPin, setHasPin] = useState(() => getPinStatus());
  const [biometricEnabled, setBiometricEnabled] = useState(() => getBiometricStatus());
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const handleProfilePhotoUpdate = async (photo: string) => {
    setPhotoLoading(true);
    
    // Update local state immediately
    updateUser({ profilePhoto: photo });
    
    // Save to database based on user role
    try {
      const apiEndpoint = user?.role === 'admin' ? '/api/admin' : '/api/employees';
      
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user?.id,
          profilePhoto: photo,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('Profile photo saved to database');
      }
    } catch (error) {
      console.error('Error saving profile photo:', error);
    }
    
    setPhotoLoading(false);
    setShowPhotoPicker(false);
  };

  const handleOrganizationLogoUpdate = (logo: string) => {
    updateOrganizationLogo(logo);
  };

  const themes = [
    { id: 'light', label: t.settings.lightMode, icon: Sun, description: t.settings.lightModeDesc },
    { id: 'dark', label: t.settings.darkMode, icon: Moon, description: t.settings.darkModeDesc },
    { id: 'system', label: t.settings.systemDefault, icon: Monitor, description: t.settings.systemDefaultDesc },
  ];

  const languages = [
    { id: 'en' as const, label: 'English', flag: '🇺🇸' },
    { id: 'hi' as const, label: 'हिंदी', flag: '🇮🇳' },
  ];

  const handleAppLockToggle = async () => {
    if (securityEnabled) {
      disableBiometric();
      setBiometricEnabled(false);
    } else {
      // Check if PIN is set first
      if (!hasPin) {
        setPinError(t.settings.pleaseSetPinFirst);
        setShowPinDialog(true);
        return;
      }
      // Enable PIN-only lock
      localStorage.setItem('hb_app_pin_enabled', 'true');
      localStorage.removeItem('hb_biometric_enabled');
      setBiometricEnabled(false);
      window.location.reload();
    }
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      // Disable biometric, keep PIN
      localStorage.removeItem('hb_biometric_enabled');
      localStorage.setItem('hb_app_pin_enabled', 'true');
      setBiometricEnabled(false);
    } else {
      // Check if PIN is set first
      if (!hasPin) {
        setPinError(t.settings.pleaseSetPinForBiometric);
        setShowPinDialog(true);
        return;
      }
      // Try to enable biometric
      const success = await enableBiometric();
      console.log('Enable biometric result:', success);
      
      // Check if biometric was actually enabled
      const isBiometricEnabled = localStorage.getItem('hb_biometric_enabled') === 'true';
      setBiometricEnabled(isBiometricEnabled);
      
      if (!isBiometricEnabled) {
        // Biometric failed, show message
        setPinError(t.settings.biometricNotAvailable);
        setShowPinDialog(true);
      }
    }
  };

  const handleSetPin = () => {
    if (newPin.length < 4) {
      setPinError(t.settings.pinMustBe4Digits);
      return;
    }
    if (newPin !== confirmPin) {
      setPinError(t.settings.pinsDoNotMatch);
      return;
    }
    
    localStorage.setItem('hb_app_pin', newPin);
    setPinSuccess(t.settings.pinSetSuccessfully);
    setPinError('');
    setHasPin(true);
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => {
      setShowPinDialog(false);
      setPinSuccess('');
    }, 1500);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">{t.common.settings}</h1>
          </div>
          <LanguageToggle />
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-lg mx-auto space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t.settings.profile}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowPhotoPicker(true)}
                  className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Avatar className="h-16 w-16 border-2 border-emerald-500/30">
                    <AvatarImage src={user?.profilePhoto} alt={user?.name || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-2xl font-bold">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </button>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{user?.name || 'User'}</p>
                  <p className="text-muted-foreground text-sm">{user?.phone}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {user?.role === 'admin' ? 'Admin' : t.dashboard.employees}
                  </span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => setShowPhotoPicker(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                {t.settings.changeProfilePhoto}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                {t.settings.security}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Set PIN First */}
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      hasPin ? 'bg-emerald-500/10' : 'bg-orange-500/10'
                    }`}>
                      {hasPin ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <KeyRound className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{t.settings.pinSetup}</p>
                      <p className="text-sm text-muted-foreground">
                        {hasPin ? t.settings.pinIsSet : t.settings.requiredFirstStep}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPinDialog(true)}
                  >
                    {hasPin ? t.settings.changePin : t.settings.setPin}
                  </Button>
                </div>
              </div>

              {/* Step 2: Enable App Lock (requires PIN) */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    hasPin ? 'bg-emerald-500/10' : 'bg-muted'
                  }`}>
                    <Lock className={`h-5 w-5 ${hasPin ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium">{t.settings.appLock}</p>
                    <p className="text-sm text-muted-foreground">
                      {!hasPin ? t.settings.setPinFirst : t.settings.askPinEveryOpen}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAppLockToggle}
                  disabled={!hasPin}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    securityEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                  } ${!hasPin ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    securityEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Step 3: Biometric (Mobile only, requires PIN + App Lock) */}
              {biometricSupported && biometricAvailable && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      hasPin && securityEnabled ? 'bg-blue-500/10' : 'bg-muted'
                    }`}>
                      <Fingerprint className={`h-5 w-5 ${hasPin && securityEnabled ? 'text-blue-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{t.settings.biometricLock}</p>
                      <p className="text-sm text-muted-foreground">
                        {!hasPin ? t.settings.setPinFirst : !securityEnabled ? t.settings.enableAppLockFirst : t.settings.useFingerprintUnlock}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleBiometricToggle}
                    disabled={!hasPin || !securityEnabled || biometricAuthenticating}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      biometricEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    } ${(!hasPin || !securityEnabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      biometricEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              )}

              {/* Status Info */}
              <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg space-y-1">
                <p className="font-medium text-foreground">{t.settings.howItWorks}</p>
                <p>{t.settings.step1SetPin}</p>
                <p>{t.settings.step2EnableAppLock}</p>
                {biometricSupported && biometricAvailable && (
                  <p>{t.settings.step3EnableBiometric}</p>
                )}
                {!biometricSupported && (
                  <p className="text-orange-500">{t.settings.biometricOnlyMobile}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Language Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Languages className="h-5 w-5 text-emerald-500" />
                {t.settings.language}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    language === lang.id
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl bg-muted">
                    {lang.flag}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{lang.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {lang.id === 'en' ? 'English' : 'हिंदी'}
                    </p>
                  </div>
                  {language === lang.id && (
                    <Check className="h-5 w-5 text-emerald-500" />
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Theme Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t.settings.appearance}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => setTheme(themeOption.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    theme === themeOption.id
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    theme === themeOption.id ? 'bg-emerald-500 text-white' : 'bg-muted'
                  }`}>
                    <themeOption.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{themeOption.label}</p>
                    <p className="text-sm text-muted-foreground">{themeOption.description}</p>
                  </div>
                  {theme === themeOption.id && (
                    <Check className="h-5 w-5 text-emerald-500" />
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t.settings.about}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.settings.appName}</span>
                  <span className="font-medium">HB Sallery Box</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.settings.version}</span>
                  <span className="font-medium">1.0.0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full h-12 text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
          >
            {t.common.logout}
          </Button>
        </motion.div>
      </div>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-500" />
              {hasPin ? t.settings.changePin : t.settings.setPin}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>{t.settings.thisPinRequired}</p>
              <p className="mt-1 font-medium text-foreground">{t.settings.doNotForgetPin}</p>
            </div>
            <div className="space-y-2">
              <Label>{t.settings.enterPin}</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder={t.settings.enterPin}
                className="text-center text-xl tracking-widest"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.confirmPin}</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder={t.settings.confirmPin}
                className="text-center text-xl tracking-widest"
              />
            </div>
            {pinError && (
              <p className="text-sm text-red-500">{pinError}</p>
            )}
            {pinSuccess && (
              <p className="text-sm text-emerald-500">{pinSuccess}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setShowPinDialog(false);
                setPinError('');
                setNewPin('');
                setConfirmPin('');
              }}>
                {t.common.cancel}
              </Button>
              <Button className="flex-1 bg-emerald-500" onClick={handleSetPin}>
                {t.settings.savePin}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Photo Picker */}
      <PhotoPicker
        open={showPhotoPicker}
        onClose={() => setShowPhotoPicker(false)}
        onConfirm={handleProfilePhotoUpdate}
        title="Profile Photo"
        currentPhoto={user?.profilePhoto}
        aspectRatio="circle"
        allowGallery={true}
      />
    </div>
  );
}
