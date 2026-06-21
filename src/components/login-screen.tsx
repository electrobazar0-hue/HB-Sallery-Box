'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, Shield, Users, UserPlus, AlertCircle, Loader2, Eye, EyeOff, Wifi, WifiOff, KeyRound, RefreshCcw, Info } from 'lucide-react';
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
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguageStore } from '@/lib/i18n';
import { useAuthStore, type UserRole } from '@/store/auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface LoginScreenProps {
  onLogin: () => void;
  onRegister: (phone: string) => void;
}

export function LoginScreen({ onLogin, onRegister }: LoginScreenProps) {
  const { t } = useLanguageStore();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const { login } = useAuthStore();
  const { toast } = useToast();

  // Forgot Password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [securityPassword, setSecurityPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotRole, setForgotRole] = useState<UserRole>('employee');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = async () => {
    if (!userId || !password) {
      setError(`${t.auth.userId} & ${t.auth.password}`);
      return;
    }
    
    if (!isOnline) {
      setError(t.auth.offline);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          password,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.common.error);
      }

      // Login successful
      login({
        id: data.user.id,
        userId: data.user.userId,
        phone: data.user.phone,
        name: data.user.name,
        role: data.user.role,
        organizationId: data.user.organizationId,
        organizationName: data.user.organizationName,
        email: data.user.email,
        designation: data.user.designation,
        department: data.user.department,
        salary: data.user.salary,
        profilePhoto: data.user.profilePhoto,
        geofenceEnabled: data.user.geofenceEnabled,
        geofenceLat: data.user.geofenceLat,
        geofenceLng: data.user.geofenceLng,
        geofenceRadius: data.user.geofenceRadius,
      });

      toast({
        title: selectedRole === 'admin' ? t.auth.loginAsAdmin : t.auth.loginAsEmployee,
        description: `${t.common.welcome}, ${data.user.name}!`,
      });

      setIsLoading(false);
      onLogin();

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t.common.error;
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: errorMessage,
      });
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async () => {
    if (!forgotPhone || !securityPassword || !newPassword) {
      setForgotError(t.auth.allFieldsRequired);
      return;
    }

    if (newPassword.length < 6) {
      setForgotError(t.auth.newPasswordMin6);
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: forgotPhone.replace(/\D/g, ''),
          securityPassword,
          newPassword,
          role: forgotRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.common.error);
      }

      setForgotSuccess(t.auth.passwordResetSuccess);
      toast({
        title: t.auth.resetPassword,
        description: t.auth.passwordResetSuccess,
      });
      setForgotPhone('');
      setSecurityPassword('');
      setNewPassword('');
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotSuccess('');
      }, 2000);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t.common.error;
      setForgotError(errorMessage);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: errorMessage,
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* Theme Toggle & Language Toggle */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Network Status */}
      <div className="absolute top-4 left-4 z-10">
        {isOnline ? (
          <div className="flex items-center gap-1 text-xs text-emerald-500">
            <Wifi className="h-3 w-3" />
            {t.auth.online}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-red-500">
            <WifiOff className="h-3 w-3" />
            {t.auth.offline}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-emerald-500/20 mb-4 bg-white"
            >
              <img 
                src="/logo.jpg" 
                alt="HB Sallery Box Logo" 
                className="w-full h-full object-cover"
              />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">HB Sallery Box</h1>
            <p className="text-muted-foreground text-sm mt-1">{t.auth.secureStaffManagement}</p>
          </div>

          {/* Auth Badge */}
          <div className="flex justify-center mb-4">
            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <span className="text-xs text-blue-600 font-medium">🔐 {t.auth.userId} / {t.auth.password}</span>
            </div>
          </div>

          {/* Demo Credentials */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Demo Credentials</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  setUserId('admin');
                  setPassword('admin123');
                  setError('');
                }}
                className="text-left p-2 rounded-lg bg-background/60 hover:bg-background transition-colors cursor-pointer border border-transparent hover:border-amber-500/30"
              >
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">🔐 Admin</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">ID: <span className="font-mono text-foreground">admin</span></div>
                <div className="text-[11px] text-muted-foreground">Pass: <span className="font-mono text-foreground">admin123</span></div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('employee');
                  setUserId('employee');
                  setPassword('emp123');
                  setError('');
                }}
                className="text-left p-2 rounded-lg bg-background/60 hover:bg-background transition-colors cursor-pointer border border-transparent hover:border-amber-500/30"
              >
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">👤 Employee</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">ID: <span className="font-mono text-foreground">employee</span></div>
                <div className="text-[11px] text-muted-foreground">Pass: <span className="font-mono text-foreground">emp123</span></div>
              </button>
            </div>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-1.5 text-center">Click to auto-fill credentials</p>
          </motion.div>

          {/* Login Card */}
          <Card className="border-0 shadow-2xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{t.auth.signIn}</CardTitle>
              <CardDescription>
                {t.auth.enterCredentials}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>{t.auth.iAmA}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('admin');
                      setError('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedRole === 'admin'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <Shield className={`h-5 w-5 mx-auto mb-2 ${
                      selectedRole === 'admin' ? 'text-emerald-500' : 'text-muted-foreground'
                    }`} />
                    <span className={`text-sm font-medium ${
                      selectedRole === 'admin' ? 'text-emerald-500' : 'text-foreground'
                    }`}>{t.auth.admin}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('employee');
                      setError('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedRole === 'employee'
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <Users className={`h-5 w-5 mx-auto mb-2 ${
                      selectedRole === 'employee' ? 'text-emerald-500' : 'text-muted-foreground'
                    }`} />
                    <span className={`text-sm font-medium ${
                      selectedRole === 'employee' ? 'text-emerald-500' : 'text-foreground'
                    }`}>{t.auth.employeeRole}</span>
                  </button>
                </div>
              </div>

              {/* User ID Input */}
              <div className="space-y-2">
                <Label htmlFor="userId">{t.auth.userId}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="userId"
                    type="text"
                    placeholder={t.auth.enterUserId}
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      setError('');
                    }}
                    onKeyPress={handleKeyPress}
                    className="pl-10 h-12"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.password}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t.auth.enterPassword}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    onKeyPress={handleKeyPress}
                    className="pl-10 pr-10 h-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Button */}
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center justify-center gap-1"
              >
                <KeyRound className="h-3 w-3" />
                {t.auth.forgotPassword}
              </button>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                  >
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-500">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Button */}
              <Button
                onClick={handleLogin}
                disabled={!userId || !password || isLoading || !isOnline}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.auth.signingIn}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {t.auth.signIn}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>

              {/* Register as Admin */}
              <Button
                variant="outline"
                onClick={() => onRegister('')}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t.auth.registerAsAdmin}
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground mt-6"
          >
            {selectedRole === 'employee'
              ? t.auth.employeeMustBeRegistered
              : t.auth.newAdminsCanRegister}
          </motion.p>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center">
        <p className="text-xs text-muted-foreground">
          {t.auth.copyright}
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-emerald-500" />
              {t.auth.resetPassword}
            </DialogTitle>
            <DialogDescription>
              {t.auth.enterPhone} & {t.auth.securityPassword}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Role Selection for Reset */}
            <div className="space-y-2">
              <Label>{t.auth.iAmA}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForgotRole('admin')}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    forgotRole === 'admin'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <Shield className={`h-4 w-4 mx-auto mb-1 ${
                    forgotRole === 'admin' ? 'text-emerald-500' : 'text-muted-foreground'
                  }`} />
                  <span className={`text-sm font-medium ${
                    forgotRole === 'admin' ? 'text-emerald-500' : 'text-foreground'
                  }`}>{t.auth.admin}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForgotRole('employee')}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    forgotRole === 'employee'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <Users className={`h-4 w-4 mx-auto mb-1 ${
                    forgotRole === 'employee' ? 'text-emerald-500' : 'text-muted-foreground'
                  }`} />
                  <span className={`text-sm font-medium ${
                    forgotRole === 'employee' ? 'text-emerald-500' : 'text-foreground'
                  }`}>{t.auth.employeeRole}</span>
                </button>
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="forgotPhone">{t.employee.phone}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgotPhone"
                  type="text"
                  placeholder={t.auth.enterPhone}
                  value={formatPhone(forgotPhone)}
                  onChange={(e) => {
                    setForgotPhone(e.target.value.replace(/\D/g, ''));
                    setForgotError('');
                  }}
                  className="pl-10 h-11"
                  maxLength={12}
                />
              </div>
            </div>

            {/* Security Password */}
            <div className="space-y-2">
              <Label htmlFor="securityPassword">{t.auth.securityPassword}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="securityPassword"
                  type="password"
                  placeholder={t.auth.enterSecurityPassword}
                  value={securityPassword}
                  onChange={(e) => {
                    setSecurityPassword(e.target.value);
                    setForgotError('');
                  }}
                  className="pl-10 h-11"
                />
              </div>
              <p className="text-xs text-muted-foreground">{t.auth.securityPasswordHint}</p>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t.auth.resetPassword}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder={t.auth.enterNewPassword}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setForgotError('');
                  }}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Error Message */}
            {forgotError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-500">{forgotError}</p>
              </div>
            )}

            {/* Success Message */}
            {forgotSuccess && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <RefreshCcw className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{forgotSuccess}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotError('');
                  setForgotSuccess('');
                  setForgotPhone('');
                  setSecurityPassword('');
                  setNewPassword('');
                }}
              >
                {t.common.cancel}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                onClick={handleForgotPassword}
                disabled={forgotLoading || !forgotPhone || !securityPassword || !newPassword}
              >
                {forgotLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t.auth.resetting}
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    {t.auth.resetPassword}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
