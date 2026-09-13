'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, CheckCircle, AlertCircle, Loader2,
  Lock, ArrowLeft, Shield, User, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fetchJSON } from '@/lib/utils';
import { CameraCapture } from '@/components/camera-capture';

interface AttendanceKioskProps {
  organizationId: string;
  organizationName?: string;
  onExit?: () => void;
}

export function AttendanceKiosk({ organizationId, organizationName, onExit }: AttendanceKioskProps) {
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleKioskPunch = async () => {
    if (!identifier) {
      setMessage({ type: 'error', text: 'Please enter your Mobile Number or User ID' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetchJSON<{
        success?: boolean;
        message?: string;
        employeeName?: string;
        action?: string;
        time?: string;
        error?: string;
      }>('/api/kiosk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          identifier,
          pin: pin || undefined,
          photo: photo || undefined,
        }),
      });

      if (res?.success) {
        setMessage({
          type: 'success',
          text: res.message || `Attendance recorded successfully at ${res.time}`,
        });
        setIdentifier('');
        setPin('');
        setPhoto(null);
      } else {
        setMessage({
          type: 'error',
          text: res?.error || 'Failed to record attendance',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error recording kiosk attendance',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl">
      <div className="w-full max-w-md space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-teal-400" />
            <div>
              <h2 className="font-bold text-base text-white">Attendance Kiosk Mode</h2>
              <p className="text-xs text-slate-400">{organizationName || 'Salary Box'}</p>
            </div>
          </div>

          {onExit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onExit}
              className="text-slate-400 hover:text-white text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Exit Kiosk
            </Button>
          )}
        </div>

        {/* Message Banner */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3.5 rounded-xl border text-sm flex items-center gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{message.text}</span>
          </motion.div>
        )}

        {/* Kiosk Form */}
        <Card className="border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl text-white">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Staff Phone Number or User ID *</label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Enter Phone or ID"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-9 bg-black/30 border-white/15 text-white placeholder:text-slate-500 text-sm h-11"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">4-Digit PIN (Optional)</label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="pl-9 bg-black/30 border-white/15 text-white placeholder:text-slate-500 font-mono text-center tracking-widest text-lg h-11"
                />
              </div>
            </div>

            {/* Optional Photo selfie */}
            <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5 text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-teal-400" />
                Selfie Verification:
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs border-teal-500/30 text-teal-300"
                onClick={() => setShowCamera(true)}
              >
                {photo ? '✓ Photo Captured' : 'Take Photo'}
              </Button>
            </div>

            <Button
              size="lg"
              onClick={handleKioskPunch}
              disabled={isLoading || !identifier}
              className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-base shadow-lg shadow-teal-900/40"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              Punch Attendance
            </Button>
          </CardContent>
        </Card>

        {showCamera && (
          <CameraCapture
            open={showCamera}
            onCapture={(img) => {
              setPhoto(img);
              setShowCamera(false);
            }}
            onClose={() => setShowCamera(false)}
          />
        )}
      </div>
    </div>
  );
}
