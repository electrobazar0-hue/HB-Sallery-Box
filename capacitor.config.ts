import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hbsalarybox.app',
  appName: 'HB-SALLERY-BOX',
  webDir: 'out',
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff',
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
