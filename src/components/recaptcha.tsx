'use client';

import { useEffect, useRef } from 'react';

// reCAPTCHA configuration
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6Lek13IsAAAAAAEGSwVqJbjdKPppmMetncjWNCsr';

interface RecaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: Error) => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact' | 'invisible';
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (container: string | HTMLElement, options: object) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
    onRecaptchaLoad?: () => void;
  }
}

export function Recaptcha({ onVerify, onExpire, onError, theme = 'light', size = 'invisible' }: RecaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Load reCAPTCHA script
    const loadRecaptcha = () => {
      if (window.grecaptcha) {
        renderRecaptcha();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=explicit`;
      script.async = true;
      script.defer = true;
      
      window.onRecaptchaLoad = () => {
        renderRecaptcha();
      };
      
      script.onload = window.onRecaptchaLoad;
      script.onerror = () => {
        onError?.(new Error('Failed to load reCAPTCHA'));
      };

      document.head.appendChild(script);
    };

    const renderRecaptcha = () => {
      if (!containerRef.current || !window.grecaptcha) return;

      window.grecaptcha.ready(() => {
        if (containerRef.current && widgetIdRef.current === null) {
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: RECAPTCHA_SITE_KEY,
            theme,
            size,
            callback: onVerify,
            'expired-callback': onExpire,
            'error-callback': () => onError?.(new Error('reCAPTCHA error')),
          });
        }
      });
    };

    loadRecaptcha();

    return () => {
      // Cleanup
      if (widgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    };
  }, [onVerify, onExpire, onError, theme, size]);

  return <div ref={containerRef} className="recaptcha-container" />;
}

// Execute invisible reCAPTCHA
export async function executeRecaptcha(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.grecaptcha) {
      reject(new Error('reCAPTCHA not loaded'));
      return;
    }

    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit' });
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export default Recaptcha;
