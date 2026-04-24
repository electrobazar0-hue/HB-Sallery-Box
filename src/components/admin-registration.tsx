'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Lock, Building, MapPin, FileText, ArrowLeft, ArrowRight, 
  AlertCircle, Loader2, Camera, Upload, X, Check, Eye, EyeOff,
  Crop, RotateCcw, ZoomIn, ZoomOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/store/auth-store';
import { CameraCapture } from '@/components/camera-capture';
import { useLanguageStore } from '@/lib/i18n';

interface AdminRegistrationProps {
  onBack: () => void;
  onRegistered: () => void;
  initialPhone: string;
}

export function AdminRegistration({ onBack, onRegistered, initialPhone }: AdminRegistrationProps) {
  const { t } = useLanguageStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  
  // Step 1: Basic Details
  const [formData, setFormData] = useState({
    name: '',
    phone: initialPhone,
    email: '',
    address: '',
    organizationName: '',
    organizationAddress: '',
    gst: '',
  });
  
  // Step 2: Profile Photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 100 });
  const [imageScale, setImageScale] = useState(1);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Step 3: User ID & Password
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityPassword, setSecurityPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError(t.orgSetup.validationAdminName);
      return false;
    }
    if (!formData.phone || formData.phone.length < 10) {
      setError(t.orgSetup.validationAdminPhone);
      return false;
    }
    if (!formData.organizationName.trim()) {
      setError(t.orgSetup.validationOrgName);
      return false;
    }
    if (!formData.organizationAddress.trim()) {
      setError(t.orgSetup.validationOrgAddress);
      return false;
    }
    return true;
  };

  // Step 2: Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImageToEdit(dataUrl);
        setShowImageEditor(true);
        setCropArea({ x: 0, y: 0, size: 100 });
        setImageScale(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapturePhoto = () => {
    // Open the camera capture dialog
    setShowCameraCapture(true);
  };

  const handleCameraCapture = (photo: string) => {
    // Set the captured photo directly
    setProfilePhoto(photo);
    setShowCameraCapture(false);
  };

  const applyImageEdit = useCallback(() => {
    if (!imageToEdit || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      const outputSize = 200;
      canvas.width = outputSize;
      canvas.height = outputSize;
      
      const minDim = Math.min(img.width, img.height);
      const sx = cropArea.x * (img.width / 100);
      const sy = cropArea.y * (img.height / 100);
      const sSize = (cropArea.size / 100) * minDim;
      
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setProfilePhoto(dataUrl);
      setShowImageEditor(false);
      setImageToEdit(null);
    };
    img.src = imageToEdit;
  }, [imageToEdit, cropArea]);

  const cancelImageEdit = () => {
    setShowImageEditor(false);
    setImageToEdit(null);
  };

  const removePhoto = () => {
    setProfilePhoto(null);
  };

  // Step 3 Validation
  const validateStep3 = () => {
    if (!userId.trim()) {
      setError(t.orgSetup.validationUserIdRequired);
      return false;
    }
    if (userId.length < 4) {
      setError(t.employee.validationUserId);
      return false;
    }
    if (!password) {
      setError(t.orgSetup.validationPasswordRequired);
      return false;
    }
    if (password.length < 6) {
      setError(t.employee.validationPassword);
      return false;
    }
    if (password !== confirmPassword) {
      setError(t.orgSetup.validationPasswordsMatch);
      return false;
    }
    if (!securityPassword) {
      setError(t.orgSetup.validationSecurityPasswordRequired);
      return false;
    }
    if (securityPassword.length < 4) {
      setError(t.employee.validationSecurityPassword);
      return false;
    }
    return true;
  };

  // Navigation between steps
  const goNext = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
      // Pre-fill userId from name
      if (!userId) {
        const baseUserId = formData.name.toLowerCase().replace(/\s+/g, '').slice(0, 8);
        setUserId(baseUserId + Math.floor(Math.random() * 1000));
      }
    }
  };

  const goBack = () => {
    setError('');
    if (step === 1) {
      onBack();
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  // Final Registration
  const handleRegister = async () => {
    if (!validateStep3()) return;
    
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          password,
          securityPassword,
          name: formData.name,
          phone: formData.phone.replace(/\D/g, ''),
          email: formData.email,
          address: formData.address,
          organizationName: formData.organizationName,
          organizationAddress: formData.organizationAddress,
          gst: formData.gst,
          profilePhoto,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.orgSetup.registrationFailed);
      }

      // Login the user
      login({
        id: data.user.id,
        userId: data.user.userId,
        phone: data.user.phone,
        name: data.user.name,
        role: 'admin',
        organizationId: data.user.organizationId,
        organizationName: data.user.organizationName,
        email: data.user.email,
        profilePhoto: data.user.profilePhoto,
      });

      setIsLoading(false);
      onRegistered();

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t.orgSetup.registrationFailedRetry;
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="absolute top-4 right-4 z-10"><ThemeToggle /></div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl shadow-emerald-500/20 mb-3 bg-white"
            >
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </motion.div>
            <h1 className="text-xl font-bold">{t.orgSetup.adminRegistration}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t.orgSetup.createOrgAccount}</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step >= s 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-8 h-0.5 mx-1 transition-all ${
                    step > s ? 'bg-emerald-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Labels */}
          <div className="flex justify-between text-xs text-muted-foreground mb-4 px-2">
            <span className={step >= 1 ? 'text-emerald-600 font-medium' : ''}>{t.orgSetup.stepDetails}</span>
            <span className={step >= 2 ? 'text-emerald-600 font-medium' : ''}>{t.orgSetup.stepPhoto}</span>
            <span className={step >= 3 ? 'text-emerald-600 font-medium' : ''}>{t.orgSetup.stepCredentials}</span>
          </div>

          <Card className="border-0 shadow-2xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">
                {step === 1 && t.orgSetup.orgSetup}
                {step === 2 && t.orgSetup.profilePhoto}
                {step === 3 && t.orgSetup.setCredentials}
              </CardTitle>
              <CardDescription>
                {step === 1 && t.orgSetup.fillOrgInfo}
                {step === 2 && t.orgSetup.addProfilePhoto}
                {step === 3 && t.orgSetup.createLoginCredentials}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Details */}
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label>{t.orgSetup.adminName} *</Label>
                      <Input 
                        placeholder={t.orgSetup.enterAdminName} 
                        value={formData.name} 
                        onChange={(e) => updateFormData('name', e.target.value)} 
                        className="h-11" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.orgSetup.adminPhone} *</Label>
                      <Input 
                        placeholder={t.orgSetup.enterAdminPhone} 
                        value={formatPhone(formData.phone)} 
                        onChange={(e) => updateFormData('phone', e.target.value.replace(/\D/g, ''))} 
                        className="h-11" 
                        maxLength={12} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.orgSetup.adminEmail}</Label>
                      <Input 
                        type="email" 
                        placeholder={t.orgSetup.enterAdminEmail} 
                        value={formData.email} 
                        onChange={(e) => updateFormData('email', e.target.value)} 
                        className="h-11" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.orgSetup.orgName} *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder={t.orgSetup.enterOrgName} 
                          value={formData.organizationName} 
                          onChange={(e) => updateFormData('organizationName', e.target.value)} 
                          className="pl-10 h-11" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.orgSetup.orgAddress} *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder={t.orgSetup.enterOrgAddress} 
                          value={formData.organizationAddress} 
                          onChange={(e) => updateFormData('organizationAddress', e.target.value)} 
                          className="pl-10 h-11" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.orgSetup.orgGst}</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder={t.orgSetup.enterGst} 
                          value={formData.gst} 
                          onChange={(e) => updateFormData('gst', e.target.value)} 
                          className="pl-10 h-11" 
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Profile Photo */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    {!showImageEditor ? (
                      <>
                        {/* Current Photo Display */}
                        {profilePhoto ? (
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500/30">
                                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                              </div>
                              <button
                                onClick={removePhoto}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-sm text-muted-foreground">{t.orgSetup.profilePhotoSet}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                              <User className="h-12 w-12 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm text-muted-foreground">{t.orgSetup.noProfilePhoto}</p>
                          </div>
                        )}

                        {/* Upload/Capture Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-16 flex-col"
                          >
                            <Upload className="h-5 w-5 mb-1" />
                            <span className="text-xs">{t.orgSetup.uploadPhoto}</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCapturePhoto}
                            className="h-16 flex-col"
                          >
                            <Camera className="h-5 w-5 mb-1" />
                            <span className="text-xs">{t.orgSetup.camera}</span>
                          </Button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </>
                    ) : (
                      /* Image Editor */
                      <div className="space-y-4">
                        <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
                          {imageToEdit && (
                            <img 
                              src={imageToEdit} 
                              alt="Edit" 
                              className="w-full h-full object-cover"
                              style={{ transform: `scale(${imageScale})` }}
                            />
                          )}
                          {/* Crop overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-32 h-32 border-2 border-white rounded-full bg-black/20" />
                          </div>
                        </div>
                        
                        {/* Editor Controls */}
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setImageScale(Math.max(0.5, imageScale - 0.1))}
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setImageScale(Math.min(2, imageScale + 0.1))}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setImageScale(1)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={cancelImageEdit} className="flex-1">
                            {t.common.cancel}
                          </Button>
                          <Button onClick={applyImageEdit} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                            <Check className="h-4 w-4 mr-2" />
                            {t.orgSetup.apply}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <canvas ref={canvasRef} className="hidden" />
                  </motion.div>
                )}

                {/* Step 3: User ID & Password */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label>{t.orgSetup.adminUserId} *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t.orgSetup.createUserId}
                          value={userId}
                          onChange={(e) => {
                            setUserId(e.target.value.toLowerCase().replace(/\s+/g, ''));
                            setError('');
                          }}
                          className="pl-10 h-11"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{t.orgSetup.userIdMin4NoSpaces}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{t.orgSetup.adminPassword} *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t.orgSetup.createPassword}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                          }}
                          className="pl-10 pr-10 h-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.orgSetup.passwordMin6}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{t.auth.confirmPassword} *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t.orgSetup.confirmPasswordPlaceholder}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setError('');
                          }}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t.orgSetup.adminSecurityPassword} *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder={t.orgSetup.securityPasswordPlaceholder}
                          value={securityPassword}
                          onChange={(e) => {
                            setSecurityPassword(e.target.value);
                            setError('');
                          }}
                          className="pl-10 h-11"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{t.orgSetup.securityPasswordHint}</p>
                    </div>

                    {/* Preview */}
                    <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-4">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Preview" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{formData.name}</p>
                        <p className="text-sm text-muted-foreground">@{userId || 'userid'}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={goBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {step === 1 ? t.common.back : t.orgSetup.previous}
                </Button>
                {step < 3 ? (
                  <Button onClick={goNext} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                    {t.common.next}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleRegister} 
                    disabled={isLoading}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t.orgSetup.creating}
                      </>
                    ) : (
                      t.auth.createAccount
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <div className="p-4 text-center">
        <p className="text-xs text-muted-foreground">{t.auth.copyright}</p>
      </div>

      {/* Camera Capture Dialog */}
      <CameraCapture
        open={showCameraCapture}
        onCapture={handleCameraCapture}
        onClose={() => setShowCameraCapture(false)}
        title={t.orgSetup.captureProfilePhoto}
      />
    </div>
  );
}
