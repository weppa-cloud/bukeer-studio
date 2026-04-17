'use client';

import { useContext } from 'react';
import { WebsiteLocaleContext } from '@/lib/context/website-locale';

export function useWebsiteLocale(): string {
  return useContext(WebsiteLocaleContext) || 'es-CO';
}
