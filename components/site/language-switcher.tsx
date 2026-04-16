'use client';

import { useCallback } from 'react';

const AVAILABLE_LOCALES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
] as const;

interface LanguageSwitcherProps {
  currentLocale: string;
  footerPalette: { muted: string; border: string; text: string };
}

export function LanguageSwitcher({ currentLocale, footerPalette }: LanguageSwitcherProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    if (newLocale === currentLocale) return;
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLocale);
    window.location.href = url.toString();
  }, [currentLocale]);

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      aria-label="Seleccionar idioma"
      className="bg-transparent border rounded px-2 py-1 text-sm cursor-pointer appearance-none"
      style={{
        color: footerPalette.muted,
        borderColor: footerPalette.border,
      }}
    >
      {AVAILABLE_LOCALES.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.flag} {locale.code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
