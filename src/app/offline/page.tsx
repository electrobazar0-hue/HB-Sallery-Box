'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [online, setOnline] = useState(() => {
    // Check if already online during initialization
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return false;
  });

  const retryConnection = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.href = '/';
      } else {
        setIsRetrying(false);
      }
    }, 1500);
  };

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setOnline(true);
      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#eaf7ef',
      padding: '20px',
      margin: 0,
      boxSizing: 'border-box',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '90%',
          maxWidth: '380px',
          background: '#f5fff7',
          border: '3px solid #3aa85c',
          borderRadius: '24px',
          padding: '40px 20px',
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
        }}>
        {/* Icon */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            width: '90px',
            height: '60px',
            margin: '0 auto 24px',
            position: 'relative',
          }}>
          {/* Cloud */}
          <div style={{
            width: '90px',
            height: '50px',
            border: '4px solid #3aa85c',
            borderRadius: '25px',
            position: 'absolute',
            bottom: '0',
          }} />
          {/* Cloud left circle */}
          <div style={{
            content: '',
            width: '40px',
            height: '40px',
            border: '4px solid #3aa85c',
            borderRadius: '50%',
            position: 'absolute',
            top: '-20px',
            left: '10px',
            background: '#f5fff7',
          }} />
          {/* Cloud right circle */}
          <div style={{
            content: '',
            width: '35px',
            height: '35px',
            border: '4px solid #3aa85c',
            borderRadius: '50%',
            position: 'absolute',
            top: '-15px',
            right: '10px',
            background: '#f5fff7',
          }} />
          {/* Slash */}
          <div style={{
            width: '5px',
            height: '95px',
            background: '#3aa85c',
            position: 'absolute',
            top: '-20px',
            left: '42.5px',
            transform: 'rotate(45deg)',
          }} />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            color: '#3aa85c',
            fontSize: '32px',
            margin: '24px 0 40px',
            fontWeight: 'bold',
          }}>
          No Internet
        </motion.h1>

        {/* Retry Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          onClick={retryConnection}
          disabled={isRetrying || online}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 32px',
            fontSize: '18px',
            color: (isRetrying || online) ? '#999' : '#3aa85c',
            background: 'transparent',
            border: '2px solid #3aa85c',
            borderRadius: '50px',
            cursor: (isRetrying || online) ? 'not-allowed' : 'pointer',
            transition: '0.3s',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            if (!isRetrying && !online) {
              e.currentTarget.style.background = '#3aa85c';
              e.currentTarget.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            if (!isRetrying && !online) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#3aa85c';
            }
          }}>
          {isRetrying && (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: '18px',
                height: '18px',
                border: '3px solid transparent',
                borderTop: '3px solid currentColor',
                borderRadius: '50%',
                display: 'inline-block',
              }} />
          )}
          <span>{online ? 'Connecting...' : 'Retry'}</span>
        </motion.button>

        {/* Status message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{
            marginTop: '20px',
            color: '#666',
            fontSize: '14px',
          }}>
          Please check your internet connection and try again.
        </motion.p>
      </motion.div>
    </div>
  );
}
