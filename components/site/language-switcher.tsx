'use client';

import { useCallback, useMemo } from 'react';
import {
  SITE_LANG_QUERY_PARAM,
  SITE_LANG_STORAGE_KEY,
  getLocaleLabel,
  normalizeLanguageCode,
  resolveSiteMenuLocales,
} from '@/lib/site/currency';
import {
  buildPublicLocalizedPath,
  resolveLocaleFromPublicPath,
} from '@/lib/seo/locale-routing';

interface LanguageSwitcherProps {
  currentLocale: string;
  locales?: Array<{ code: string; label: string }>;
  footerPalette: { muted: string; border: string; text: string };
  defaultLocale?: string;
  supportedLocales?: string[];
}

export function LanguageSwitcher({ currentLocale, locales, footerPalette, defaultLocale, supportedLocales }: LanguageSwitcherProps) {
  const localeOptions = useMemo(() => {
    if (!Array.isArray(locales) || locales.length === 0) {
      return resolveSiteMenuLocales({ contentLocale: currentLocale });
    }
    const normalized = locales
      .map((locale) => {
        const code = normalizeLanguageCode(locale.code);
        if (!code) return null;
        return {
          code,
          label: locale.label?.trim().length ? locale.label : getLocaleLabel(code),
        };
      })
      .filter((locale): locale is { code: string; label: string } => Boolean(locale));
    return normalized.length > 0
      ? normalized
      : resolveSiteMenuLocales({ contentLocale: currentLocale });
  }, [currentLocale, locales]);

  const normalizedLocale = useMemo(() => {
    const candidate = normalizeLanguageCode(currentLocale);
    if (candidate && localeOptions.some((locale) => locale.code === candidate)) {
      return candidate;
    }
    return localeOptions[0]?.code ?? 'es';
  }, [currentLocale, localeOptions]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = normalizeLanguageCode(e.target.value);
    if (!newLocale || newLocale === normalizedLocale) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SITE_LANG_STORAGE_KEY, newLocale);
    const defLoc = defaultLocale ?? 'es-CO';
    const { pathnameWithoutLang } = resolveLocaleFromPublicPath(
      window.location.pathname,
      { defaultLocale: defLoc, supportedLocales: supportedLocales ?? [] },
    );
    const targetPath = buildPublicLocalizedPath(pathnameWithoutLang, newLocale, defLoc);
    // Preserve currency query; drop lang (now in path)
    const params = new URLSearchParams(window.location.search);
    params.delete(SITE_LANG_QUERY_PARAM);
    const query = params.toString();
    window.location.href = query ? `${targetPath}?${query}` : targetPath;
  }, [normalizedLocale, defaultLocale, supportedLocales]);

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
      {localeOptions.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.label}
        </option>
      ))}
    </select>
  );
}
