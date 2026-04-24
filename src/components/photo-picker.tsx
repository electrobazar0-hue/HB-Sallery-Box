'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PhotoPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (photo: string) => void;
  title?: string;
  currentPhoto?: string;
  aspectRatio?: 'square' | 'circle';
  allowGallery?: boolean;
}

export function PhotoPicker({
  open,
  onClose,
  onConfirm,
  title = 'Select Photo',
  currentPhoto,
  aspectRatio = 'circle',
  allowGallery = true,
}: PhotoPickerProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(currentPhoto || null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCameraReady(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      
      setCameraStream(stream);
      setCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
        // Start playing
        try {
          await videoRef.current.play();
        } catch (e) {
          console.error('Video play error:', e);
        }
      }
    } catch (err) {
      let message = 'Camera access denied. Please allow camera access or use gallery.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          message = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          message = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError') {
          message = 'Camera is already in use by another application.';
        }
      }
      setError(message);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setCameraReady(false);
  }, [cameraStream]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Draw and flip horizontally for selfie camera
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedPhoto(dataUrl);
    stopCamera();
  }, [stopCamera]);

  // Handle file selection from gallery
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        // Resize image if too large
        const img = new Image();
        img.onload = () => {
          const maxSize = 1024;
          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          context?.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setSelectedPhoto(resizedDataUrl);
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    stopCamera();
    setSelectedPhoto(currentPhoto || null);
    setError(null);
    onClose();
  }, [stopCamera, currentPhoto, onClose]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (selectedPhoto) {
      onConfirm(selectedPhoto);
      handleClose();
    }
  }, [selectedPhoto, onConfirm, handleClose]);

  // Handle retake
  const handleRetake = useCallback(() => {
    setSelectedPhoto(null);
    setError(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {/* Preview Area */}
          <div className={`relative mx-auto overflow-hidden bg-muted ${
            aspectRatio === 'circle' ? 'w-48 h-48 rounded-full' : 'w-64 h-64 rounded-lg'
          }`}>
            {selectedPhoto ? (
              <img
                src={selectedPhoto}
                alt="Selected"
                className="w-full h-full object-cover"
              />
            ) : cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-2" />
                <p className="text-sm">No photo selected</p>
              </div>
            )}

            {/* Loading overlay for camera start */}
            {cameraActive && !cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <RefreshCw className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-500 text-center mt-2">{error}</p>
          )}

          {/* Action Buttons */}
          <div className="mt-4 space-y-3">
            {!selectedPhoto && !cameraActive && (
              <>
                {/* Camera Button */}
                <Button
                  onClick={startCamera}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>

                {/* Gallery Button */}
                {allowGallery && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose from Gallery
                    </Button>
                  </>
                )}
              </>
            )}

            {cameraActive && !selectedPhoto && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={stopCamera} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={capturePhoto} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </div>
            )}

            {selectedPhoto && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetake} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Change
                </Button>
                <Button onClick={handleConfirm} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
                  <Check className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Reusable Avatar with edit button
interface EditableAvatarProps {
  src?: string | null;
  name: string;
  onEdit: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOrganization?: boolean;
}

export function EditableAvatar({
  src,
  name,
  onEdit,
  size = 'lg',
  isOrganization = false,
}: EditableAvatarProps) {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
    xl: 'h-32 w-32',
  };

  return (
    <button
      onClick={onEdit}
      className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
    >
      <Avatar className={`${sizeClasses[size]} border-4 border-background shadow-lg`}>
        <AvatarImage src={src || undefined} alt={name} />
        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white text-xl">
          {name?.charAt(0)?.toUpperCase() || (isOrganization ? '🏢' : '👤')}
        </AvatarFallback>
      </Avatar>
      
      {/* Edit overlay */}
      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Camera className="h-6 w-6 text-white" />
      </div>
    </button>
  );
}
