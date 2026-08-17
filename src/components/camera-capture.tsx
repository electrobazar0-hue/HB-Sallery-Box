'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CameraCaptureProps {
  open: boolean;
  onCapture: (photo: string) => void;
  onClose: () => void;
  title?: string;
}

export function CameraCapture({ open, onCapture, onClose, title = 'Capture Photo' }: CameraCaptureProps) {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  // Stop camera helper function
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setCameraStream(null);
    setIsActive(false);
    setIsStarting(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open || capturedPhoto || !cameraStream || !videoRef.current) return;

    const video = videoRef.current;
    let cancelled = false;
    video.srcObject = cameraStream;

    const playPreview = async () => {
      try {
        await video.play();
        if (!cancelled && mountedRef.current) {
          setIsActive(true);
          setIsStarting(false);
          setError(null);
        }
      } catch (err) {
        console.error('Camera preview error:', err);
        if (!cancelled && mountedRef.current) {
          setIsActive(false);
          setError('Camera preview could not start. Please close and try again.');
        }
      }
    };

    video.onloadedmetadata = playPreview;
    void playPreview();

    return () => {
      cancelled = true;
      video.onloadedmetadata = null;
      if (video.srcObject === cameraStream) {
        video.srcObject = null;
      }
    };
  }, [open, capturedPhoto, cameraStream]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!open || streamRef.current || isStarting) return;

    setIsStarting(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = mediaStream;
      setCameraStream(mediaStream);
      setIsActive(false);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      
      let message = 'Camera access denied';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          message = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          message = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError') {
          message = 'Camera is already in use by another application.';
        } else {
          message = err.message;
        }
      }
      setError(message);
      setIsActive(false);
    } finally {
      setIsStarting(false);
    }
  }, [open, isStarting]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    stopCameraStream();
    setCapturedPhoto(null);
    setError(null);
    onClose();
  }, [stopCameraStream, onClose]);

  // Handle capture
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !isActive) {
      setError('Camera is not active. Please wait for camera to start.');
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera not ready. Please wait and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      setError('Could not create canvas context');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    setCapturedPhoto(dataUrl);
    stopCameraStream();
  }, [isActive, stopCameraStream]);

  // Handle retake
  const handleRetake = useCallback(() => {
    setCapturedPhoto(null);
    setError(null);
    setTimeout(() => {
      startCamera();
    }, 100);
  }, [startCamera]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      handleClose();
    }
  }, [capturedPhoto, onCapture, handleClose]);

  // Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Start camera when dialog opens
  useEffect(() => {
    if (!open) return;
    setCapturedPhoto(null);
    setError(null);

    const timer = setTimeout(() => {
      startCamera();
    }, 200);
    
    return () => clearTimeout(timer);
  }, [open, startCamera]);

  // Stop camera when dialog closes
  useEffect(() => {
    if (open) return;
    stopCameraStream();
  }, [open, stopCameraStream]);

  const showLoading = open && !isActive && !capturedPhoto && !error && (isStarting || !!cameraStream);
  const showError = error && !capturedPhoto && !showLoading;
  const showGuide = !capturedPhoto && isActive && !error;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] sm:aspect-[3/4] max-h-[52dvh] bg-black rounded-xl overflow-hidden mx-3 sm:mx-4">
          {/* Camera Preview */}
          {!capturedPhoto && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onCanPlay={() => {
                setIsActive(true);
                setIsStarting(false);
              }}
              className="w-full h-full object-cover"
            />
          )}

          {/* Captured Photo */}
          {capturedPhoto && (
            <img
              src={capturedPhoto}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          {/* Loading Overlay */}
          {showLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-white text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Starting camera...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {showError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-white text-center p-4">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-2">{error}</p>
                <Button variant="outline" size="sm" className="text-white border-white" onClick={startCamera}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Face Guide Overlay */}
          {showGuide && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 sm:w-48 sm:h-48 border-4 border-white/50 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-3 sm:p-4 flex justify-center gap-3 bg-background">
          {!capturedPhoto ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleCapture}
                disabled={!isActive || !!error}
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleRetake}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={handleConfirm}
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirm
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
