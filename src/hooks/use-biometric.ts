'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface BiometricHook {
  isSupported: boolean;
  isAvailable: boolean;
  isEnabled: boolean;
  isLocked: boolean;
  isAuthenticating: boolean;
  error: string | null;
  enable: () => Promise<boolean>;
  disable: () => void;
  authenticate: () => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
}

const BIOMETRIC_KEY = 'hb_biometric_enabled';
const PIN_ENABLED_KEY = 'hb_app_pin_enabled';
const LOCK_KEY = 'hb_app_locked';

// Check if WebAuthn is supported
function checkWebAuthnSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    return !!(
      window.PublicKeyCredential &&
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    );
  } catch {
    return false;
  }
}

// Check if we're in a secure context (required for WebAuthn)
function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for secure context
  if (window.isSecureContext === true) return true;
  
  // Allow localhost for development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return true;
  }
  
  // Check for HTTPS
  if (window.location.protocol === 'https:') return true;
  
  return false;
}

// Check if we can actually use WebAuthn
async function canUseWebAuthn(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
      return false;
    }
    
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch (error) {
    console.log('WebAuthn check failed:', error);
    return false;
  }
}

export function useBiometric(): BiometricHook {
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if biometric is supported
  const biometricCapable = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    const secureContext = isSecureContext();
    const webAuthnSupport = checkWebAuthnSupport();
    
    console.log('Biometric capable:', { secureContext, webAuthnSupport });
    
    // Biometric works in secure context with WebAuthn support
    return secureContext && webAuthnSupport;
  }, []);

  // Check support and availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      setIsSupported(biometricCapable);
      
      if (biometricCapable) {
        try {
          const available = await canUseWebAuthn();
          setIsAvailable(available);
          console.log('WebAuthn available:', available);
        } catch (err) {
          console.log('WebAuthn not available:', err);
          setIsAvailable(false);
        }
      } else {
        setIsAvailable(false);
      }

      // Check if security is enabled
      const biometricEnabled = localStorage.getItem(BIOMETRIC_KEY) === 'true';
      const pinEnabled = localStorage.getItem(PIN_ENABLED_KEY) === 'true';
      
      const securityEnabled = biometricEnabled || pinEnabled;
      setIsEnabled(securityEnabled);
      
      console.log('Security status:', { biometricEnabled, pinEnabled, securityEnabled });

      // ALWAYS lock on every app open/refresh if security is enabled
      if (securityEnabled) {
        sessionStorage.removeItem(LOCK_KEY);
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    };

    checkBiometric();
  }, [biometricCapable]);

  // Lock app when user comes back
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const securityEnabled = localStorage.getItem(BIOMETRIC_KEY) === 'true' || 
                                localStorage.getItem(PIN_ENABLED_KEY) === 'true';
        
        if (securityEnabled) {
          sessionStorage.removeItem(LOCK_KEY);
          setIsLocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Enable security (biometric or PIN-only)
  const enable = useCallback(async (): Promise<boolean> => {
    // Check if PIN is set first
    const hasPin = localStorage.getItem('hb_app_pin');
    if (!hasPin || hasPin.length < 4) {
      setError('Please set a PIN first in Settings');
      return false;
    }

    // If biometric capable and available, try to enable biometric
    if (biometricCapable && isAvailable) {
      setIsAuthenticating(true);
      setError(null);

      try {
        // Double check WebAuthn is actually usable
        const canUse = await canUseWebAuthn();
        if (!canUse) {
          throw new Error('WebAuthn not available');
        }

        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const rpId = window.location.hostname === 'localhost' 
          ? 'localhost' 
          : window.location.hostname;

        const credentialOptions: CredentialCreationOptions = {
          publicKey: {
            challenge,
            rp: {
              name: 'HB Sallery Box',
              id: rpId,
            },
            user: {
              id: new Uint8Array(16),
              name: 'user@hbsallerybox',
              displayName: 'HB User',
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 },
              { type: 'public-key', alg: -257 },
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 60000,
            attestation: 'none',
          },
        };

        console.log('Creating WebAuthn credential...');
        const credential = await navigator.credentials.create(credentialOptions);
        
        if (credential) {
          console.log('WebAuthn credential created successfully');
          localStorage.setItem(BIOMETRIC_KEY, 'true');
          localStorage.setItem(PIN_ENABLED_KEY, 'true');
          setIsEnabled(true);
          setIsAuthenticating(false);
          return true;
        }

        setIsAuthenticating(false);
        return false;
      } catch (err) {
        console.log('Biometric enable error, using PIN-only:', err);
        // Fall back to PIN-only mode
        localStorage.setItem(PIN_ENABLED_KEY, 'true');
        localStorage.removeItem(BIOMETRIC_KEY);
        setIsEnabled(true);
        setIsAuthenticating(false);
        return true;
      }
    }

    // PIN-only mode
    console.log('Using PIN-only mode');
    localStorage.setItem(PIN_ENABLED_KEY, 'true');
    localStorage.removeItem(BIOMETRIC_KEY);
    setIsEnabled(true);
    return true;
  }, [biometricCapable, isAvailable]);

  // Disable security
  const disable = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
    sessionStorage.removeItem(LOCK_KEY);
    setIsEnabled(false);
    setIsLocked(false);
  }, []);

  // Authenticate using biometric
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!biometricCapable || !isAvailable) {
      console.log('Biometric not capable or available');
      return false;
    }

    const biometricEnabled = localStorage.getItem(BIOMETRIC_KEY) === 'true';
    if (!biometricEnabled) {
      console.log('Biometric not enabled');
      return false;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const canUse = await canUseWebAuthn();
      if (!canUse) {
        throw new Error('WebAuthn not available');
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const rpId = window.location.hostname === 'localhost' 
        ? 'localhost' 
        : window.location.hostname;

      const requestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          rpId,
          userVerification: 'required',
          timeout: 60000,
        },
      };

      console.log('Getting WebAuthn credential...');
      const credential = await navigator.credentials.get(requestOptions);
      
      if (credential) {
        console.log('WebAuthn authentication successful');
        sessionStorage.setItem(LOCK_KEY, 'unlocked');
        setIsLocked(false);
        setIsAuthenticating(false);
        return true;
      }

      setIsAuthenticating(false);
      return false;
    } catch (err) {
      console.log('Biometric authenticate error:', err);
      setError('Biometric failed. Use PIN instead.');
      setIsAuthenticating(false);
      return false;
    }
  }, [biometricCapable, isAvailable]);

  // Lock the app
  const lock = useCallback(() => {
    sessionStorage.removeItem(LOCK_KEY);
    setIsLocked(true);
  }, []);

  // Unlock the app (for PIN fallback)
  const unlock = useCallback(() => {
    sessionStorage.setItem(LOCK_KEY, 'unlocked');
    setIsLocked(false);
  }, []);

  return {
    isSupported,
    isAvailable,
    isEnabled,
    isLocked,
    isAuthenticating,
    error,
    enable,
    disable,
    authenticate,
    lock,
    unlock,
  };
}
