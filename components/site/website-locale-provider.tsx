'use client';

import type { ReactNode } from 'react';
import { WebsiteLocaleContext } from '@/lib/context/website-locale';

interface WebsiteLocaleProviderProps {
  locale: string;
  children: ReactNode;
}

export function WebsiteLocaleProvider({ locale, children }: WebsiteLocaleProviderProps) {
  return (
    <WebsiteLocaleContext.Provider value={locale}>
      {children}
    </WebsiteLocaleContext.Provider>
  );
}
