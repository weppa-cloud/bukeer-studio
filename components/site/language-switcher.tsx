'use client';

import { useCallback } from 'react';
import {
  SITE_LANG_QUERY_PARAM,
  SITE_LANG_STORAGE_KEY,
  SITE_MENU_LOCALES,
  normalizeLanguageCode,
} from '@/lib/site/currency';

interface LanguageSwitcherProps {
  currentLocale: string;
  footerPalette: { muted: string; border: string; text: string };
}

export function LanguageSwitcher({ currentLocale, footerPalette }: LanguageSwitcherProps) {
  const normalizedLocale = normalizeLanguageCode(currentLocale) ?? 'es';

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = normalizeLanguageCode(e.target.value);
    if (!newLocale || newLocale === normalizedLocale) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SITE_LANG_STORAGE_KEY, newLocale);
    }
    const url = new URL(window.location.href);
    url.searchParams.set(SITE_LANG_QUERY_PARAM, newLocale);
    window.location.href = url.toString();
  }, [normalizedLocale]);

  return (
    <select
      value={normalizedLocale}
      onChange={handleChange}
      aria-label="Seleccionar idioma"
      className="bg-transparent border rounded px-2 py-1 text-sm cursor-pointer appearance-none"
      style={{
        color: footerPalette.muted,
        borderColor: footerPalette.border,
      }}
    >
      {SITE_MENU_LOCALES.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.label}
        </option>
      ))}
    </select>
  );
}
