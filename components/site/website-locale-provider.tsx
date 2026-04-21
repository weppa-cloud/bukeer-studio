'use client';

import { useEffect, type ReactNode } from 'react';
import { WebsiteLocaleContext } from '@/lib/context/website-locale';

interface WebsiteLocaleProviderProps {
  locale: string;
  children: ReactNode;
}

export function WebsiteLocaleProvider({ locale, children }: WebsiteLocaleProviderProps) {
  useEffect(() => {
    const lang = locale.split('-')[0].toLowerCase();
    document.documentElement.lang = lang;
  }, [locale]);

  return (
    <WebsiteLocaleContext.Provider value={locale}>
      {children}
    </WebsiteLocaleContext.Provider>
  );
}
