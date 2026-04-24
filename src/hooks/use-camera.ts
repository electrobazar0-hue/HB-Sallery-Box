'use client';

import { useState, useCallback, useRef } from 'react';

interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  quality?: number;
}

export function useCamera(options: UseCameraOptions = {}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Start camera
  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: options.facingMode || 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      
      setStream(mediaStream);
      setIsActive(true);
      setError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setError(message);
      return false;
    }
  }, [options.facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Capture photo
  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !isActive) {
      setError('Camera is not active');
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Could not create canvas context');
      return null;
    }
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const quality = options.quality || 0.8;
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    
    return dataUrl;
  }, [isActive, options.quality]);

  // Capture photo as blob
  const capturePhotoBlob = useCallback(async (): Promise<Blob | null> => {
    const dataUrl = capturePhoto();
    if (!dataUrl) return null;
    
    try {
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch {
      setError('Failed to convert photo to blob');
      return null;
    }
  }, [capturePhoto]);

  return {
    stream,
    error,
    isActive,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    capturePhotoBlob,
  };
}
