'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Check, ArrowRight, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhotoPicker } from '@/components/photo-picker';
import { useLanguageStore } from '@/lib/i18n';

interface OrganizationSetupProps {
  organizationName: string;
  adminName: string;
  onComplete: (logo: string | null) => void;
  onSkip: () => void;
}

export function OrganizationSetup({
  organizationName,
  adminName,
  onComplete,
  onSkip,
}: OrganizationSetupProps) {
  const { t } = useLanguageStore();
  const [logo, setLogo] = useState<string | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePhotoConfirm = (photo: string) => {
    setLogo(photo);
    setShowPhotoPicker(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500));
    onComplete(logo);
    setIsLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">{t.orgSetup.setOrgLogo}</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              {t.orgSetup.addLogoDesc}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Logo Preview Section */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="relative"
              >
                {/* Main Logo Display */}
                <button
                  onClick={() => setShowPhotoPicker(true)}
                  className="relative group rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-4"
                >
                  {logo ? (
                    <div className="w-40 h-40 relative">
                      <img
                        src={logo}
                        alt={t.orgSetup.orgLogo}
                        className="w-full h-full object-cover rounded-2xl shadow-lg"
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-2xl">
                        <Upload className="h-8 w-8 text-white mb-2" />
                        <span className="text-white text-sm font-medium">{t.orgSetup.changeLogo}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 group-hover:border-emerald-500 transition-colors shadow-inner">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-600/20 flex items-center justify-center mb-2">
                        <ImageIcon className="h-10 w-10 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <span className="text-sm text-muted-foreground group-hover:text-emerald-500 transition-colors">
                        {t.orgSetup.clickToAddLogo}
                      </span>
                    </div>
                  )}
                </button>

                {/* Organization Initial Fallback */}
                {!logo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Avatar className="w-32 h-32 opacity-0">
                      <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl">
                        {getInitials(organizationName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </motion.div>

              {/* Organization Name */}
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold">{organizationName}</h3>
                <p className="text-sm text-muted-foreground">{t.orgSetup.adminLabel}: {adminName}</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">{t.orgSetup.tipsTitle}</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• {t.orgSetup.tipSquare}</li>
                <li>• {t.orgSetup.tipFormat}</li>
                <li>• {t.orgSetup.tipSize}</li>
                <li>• {t.orgSetup.tipBranding}</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onSkip}
                className="flex-1"
                disabled={isLoading}
              >
                {t.orgSetup.skipForNow}
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.orgSetup.saving}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    {t.orgSetup.saveAndContinue}
                  </div>
                )}
              </Button>
            </div>

            {/* Preview Card */}
            {logo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-3 bg-card"
              >
                <p className="text-xs text-muted-foreground mb-2">{t.orgSetup.previewInApp}</p>
                <div className="flex items-center gap-3">
                  <img
                    src={logo}
                    alt={t.orgSetup.logoPreview}
                    className="w-10 h-10 rounded-lg object-cover shadow"
                  />
                  <div>
                    <p className="font-medium text-sm">{organizationName}</p>
                    <p className="text-xs text-muted-foreground">{t.orgSetup.yourOrganization}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Photo Picker */}
      <PhotoPicker
        open={showPhotoPicker}
        onClose={() => setShowPhotoPicker(false)}
        onConfirm={handlePhotoConfirm}
        title={t.orgSetup.orgLogo}
        aspectRatio="square"
        allowGallery={true}
      />
    </div>
  );
}
