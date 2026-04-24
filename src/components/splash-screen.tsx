'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/lib/i18n';

interface SplashScreenProps {
  onComplete: (isAuthenticated: boolean) => void;
}

// Get dark mode state from system
function getDarkModeSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check localStorage first (theme set by user in settings)
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') return true;
  if (savedTheme === 'light') return false;
  
  // Then check system preference
  if (window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  return false;
}

// Subscribe to dark mode changes
function subscribeToDarkMode(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Handler for storage changes (theme setting)
  const storageHandler = () => callback();
  
  // Handler for system theme changes
  const mediaQueryHandler = () => callback();
  
  window.addEventListener('storage', storageHandler);
  mediaQuery.addEventListener('change', mediaQueryHandler);
  
  return () => {
    window.removeEventListener('storage', storageHandler);
    mediaQuery.removeEventListener('change', mediaQueryHandler);
  };
}

// Hook to detect system theme using sync external store
function useDarkMode() {
  return useSyncExternalStore(
    subscribeToDarkMode,
    getDarkModeSnapshot,
    () => false // Server snapshot
  );
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { t } = useLanguageStore();
  const [isVisible, setIsVisible] = useState(true);
  const { isAuthenticated, verifySession } = useAuthStore();
  const isDark = useDarkMode();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        // Verify session before completing
        const isValidSession = isAuthenticated && verifySession();
        onComplete(isValidSession);
      }, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, onComplete, verifySession]);

  // Theme-based colors
  const bgGradient = isDark 
    ? 'linear-gradient(135deg, #0f172a 0%, #0a1628 50%, #0d2137 100%)'
    : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%)';
  
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const subtitleColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const particleColor = isDark ? 'bg-white/10' : 'bg-emerald-600/10';
  const loadingColor = isDark ? 'bg-emerald-400' : 'bg-emerald-600';
  const logoShadow = isDark ? 'shadow-emerald-500/40' : 'shadow-emerald-500/30';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background: bgGradient,
          }}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-1 h-1 rounded-full ${particleColor}`}
                style={{
                  left: `${10 + (i * 6) % 80}%`,
                  top: `${15 + (i * 7) % 70}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: isDark ? [0.1, 0.3, 0.1] : [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 3 + (i % 3),
                  repeat: Infinity,
                  delay: (i % 5) * 0.4,
                }}
              />
            ))}
          </div>

          {/* Logo Container with zoom effect */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.8,
              ease: 'easeOut',
            }}
            className="flex flex-col items-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={`w-28 h-28 rounded-3xl overflow-hidden shadow-2xl ${logoShadow} mb-8 bg-white`}
            >
              <img 
                src="/logo.jpg" 
                alt="HB Sallery Box Logo" 
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* App Name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className={`text-3xl font-bold ${textColor} mb-3 tracking-tight`}
            >
              HB Sallery Box
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className={`${subtitleColor} text-base`}
            >
              {t.auth.secureStaffManagement}
            </motion.p>
          </motion.div>

          {/* Loading indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="mt-16"
          >
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-2 rounded-full ${loadingColor}`}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
