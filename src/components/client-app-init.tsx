'use client';

import { useEffect } from 'react';
import { installClientApiInterceptor } from '@/lib/client-api-interceptor';

export function ClientAppInit() {
  useEffect(() => {
    installClientApiInterceptor();
  }, []);

  return null;
}
