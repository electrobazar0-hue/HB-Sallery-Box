'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Lock, Unlock, AlertCircle, Loader2, Shield, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/lib/i18n';

interface BiometricLockProps {
  isLocked: boolean;
  isEnabled: boolean;
  isAuthenticating: boolean;
  onAuthenticate: () => Promise<boolean>;
  onUnlock: () => void;
  error: string | null;
}

export function BiometricLock({
  isLocked,
  isEnabled,
  isAuthenticating,
  onAuthenticate,
  onUnlock,
  error,
}: BiometricLockProps) {
  const { user } = useAuthStore();
  const { t } = useLanguageStore();
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);

  // Check if biometric is available (secure context + WebAuthn)
  // Removed mobile-only restriction for better testing
  const isBiometricAvailable = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    const secureContext = window.isSecureContext === true || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'https:';
    
    const webAuthnSupport = !!window.PublicKeyCredential;
    
    console.log('Biometric check:', { secureContext, webAuthnSupport });
    
    // Biometric available if secure context and WebAuthn support
    return secureContext && webAuthnSupport;
  }, []);

  // Check if biometric is actually enabled in settings
  const biometricEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const enabled = localStorage.getItem('hb_biometric_enabled') === 'true';
    console.log('Biometric enabled in storage:', enabled);
    return enabled;
  }, []);

  // Determine if we should show PIN directly (no biometric)
  const shouldShowPinDirectly = !isBiometricAvailable || !biometricEnabled;
  
  console.log('Lock screen state:', { 
    isBiometricAvailable, 
    biometricEnabled, 
    shouldShowPinDirectly 
  });

  // Lockout timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLockedOut && lockoutTime > 0) {
      interval = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLockedOut, lockoutTime]);

  // Try biometric authentication
  const tryBiometric = useCallback(async () => {
    if (isAuthenticating || isLockedOut || !isBiometricAvailable || !biometricEnabled) {
      console.log('Cannot try biometric:', { isAuthenticating, isLockedOut, isBiometricAvailable, biometricEnabled });
      return false;
    }
    
    const success = await onAuthenticate();
    return success;
  }, [isAuthenticating, isLockedOut, isBiometricAvailable, biometricEnabled, onAuthenticate]);

  // Handle biometric button click
  const handleBiometricAuth = useCallback(async () => {
    const success = await tryBiometric();
    if (!success) {
      setShowPinInput(true);
    }
  }, [tryBiometric]);

  const handlePinSubmit = useCallback(() => {
    if (pin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }

    // Check against user's security PIN - NO DEFAULT PIN
    const storedPin = localStorage.getItem('hb_app_pin');
    
    // If no PIN set, show error
    if (!storedPin) {
      setPinError('No PIN set. Please contact admin or reinstall app.');
      return;
    }
    
    if (pin === storedPin) {
      onUnlock();
      setPin('');
      setPinError('');
      setAttempts(0);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPinError(`Incorrect PIN. ${5 - newAttempts} ${t.biometric.attemptsRemaining}.`);
      setPin('');

      if (newAttempts >= 5) {
        setIsLockedOut(true);
        setLockoutTime(30); // 30 seconds lockout
        setPinError(t.biometric.tooManyAttempts);
      }
    }
  }, [pin, attempts, onUnlock, t]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
    setPinError('');
  };

  if (!isLocked) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 overflow-auto"
      >
        <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 safe-area-inset">
          {/* Logo and Brand */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">HB Sallery Box</h1>
            <p className="text-emerald-200/80 text-sm sm:text-base">{t.biometric.secureAccess}</p>
          </motion.div>

          {/* User Avatar */}
          {user && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mb-5"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg">
                {user.name?.charAt(0) || 'U'}
              </div>
              <p className="text-white text-center mt-2 font-medium text-sm sm:text-base">{user.name}</p>
            </motion.div>
          )}

          {/* Lock Icon or Fingerprint */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="relative mb-5"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              {isAuthenticating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
                </motion.div>
              ) : showPinInput || shouldShowPinDirectly ? (
                <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Fingerprint className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
                </motion.div>
              )}
            </div>

            {/* Pulse effect */}
            {!isAuthenticating && !showPinInput && isBiometricAvailable && biometricEnabled && (
              <motion.div
                animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-emerald-400"
              />
            )}
          </motion.div>

          {/* Error Message */}
          {(error || pinError) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200 w-full max-w-xs"
            >
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <p className="text-xs sm:text-sm">{error || pinError}</p>
            </motion.div>
          )}

          {/* Lockout Timer */}
          {isLockedOut && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg text-center w-full max-w-xs"
            >
              <p className="text-orange-200 text-sm">{t.biometric.tooManyAttempts}</p>
              <p className="text-2xl font-bold text-white mt-2">
                {Math.floor(lockoutTime / 60)}:{(lockoutTime % 60).toString().padStart(2, '0')}
              </p>
            </motion.div>
          )}

          {/* PIN Input */}
          {showPinInput && !isLockedOut && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs space-y-4"
            >
              <div className="relative">
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder={t.biometric.enterPin}
                  value={pin}
                  onChange={handlePinChange}
                  className="text-center text-xl sm:text-2xl tracking-widest h-12 sm:h-14 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl"
                  maxLength={6}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                />
              </div>
              <Button
                onClick={handlePinSubmit}
                className="w-full h-11 sm:h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-base sm:text-lg rounded-xl"
                disabled={pin.length < 4}
              >
                <Unlock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {t.biometric.unlock}
              </Button>
            </motion.div>
          )}

          {/* Action Buttons - Only show if biometric is available AND enabled */}
          {!showPinInput && !isLockedOut && isBiometricAvailable && biometricEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 w-full max-w-xs px-4"
            >
              <Button
                onClick={handleBiometricAuth}
                disabled={isAuthenticating}
                className="w-full h-12 sm:h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-base sm:text-lg font-medium shadow-lg rounded-xl"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    {t.biometric.authenticating}
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {t.biometric.useBiometric}
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => setShowPinInput(true)}
                className="w-full h-10 sm:h-12 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {t.biometric.usePinInstead}
              </Button>
            </motion.div>
          )}

          {/* PIN-only mode - Show button if biometric not available */}
          {shouldShowPinDirectly && !showPinInput && !isLockedOut && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 w-full max-w-xs px-4"
            >
              <Button
                onClick={() => setShowPinInput(true)}
                className="w-full h-12 sm:h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-base sm:text-lg font-medium shadow-lg rounded-xl"
              >
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {t.biometric.enterPin}
              </Button>
              {!isBiometricAvailable && (
                <p className="text-white/40 text-xs sm:text-sm text-center">
                  Biometric requires HTTPS or localhost
                </p>
              )}
              {isBiometricAvailable && !biometricEnabled && (
                <p className="text-white/40 text-xs sm:text-sm text-center">
                  Enable Biometric in Settings to use fingerprint
                </p>
              )}
            </motion.div>
          )}

          {/* Back to Biometric from PIN */}
          {showPinInput && !isLockedOut && isBiometricAvailable && biometricEnabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4"
            >
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPinInput(false);
                  setPin('');
                  setPinError('');
                }}
                className="text-white/60 hover:text-white text-sm"
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                {t.biometric.useBiometricInstead}
              </Button>
            </motion.div>
          )}

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-4 sm:bottom-6 text-white/40 text-xs text-center px-4"
          >
            {t.biometric.secureAccess}
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
