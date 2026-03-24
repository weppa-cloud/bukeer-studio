'use client';

/**
 * M3 Theme Provider — v3.0 (powered by @bukeer/theme-sdk)
 *
 * Consumes DesignTokens + ThemeProfile from SDK and compiles
 * them into CSS variables for the entire application.
 *
 * No local type definitions — all types from @bukeer/theme-sdk.
 */

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import type {
  DesignTokens,
  ColorScheme,
  ThemeProfile,
  CssVariable,
} from '@bukeer/theme-sdk';
import {
  compileTheme,
  TOURISM_PRESETS,
} from '@bukeer/theme-sdk';

// ---------------------------------------------------------------------------
// Default theme — Corporate preset as fallback
// ---------------------------------------------------------------------------

const defaultPreset = TOURISM_PRESETS.find(p => p.metadata.slug === 'corporate') ?? TOURISM_PRESETS[0];
const defaultTokens: DesignTokens = defaultPreset.tokens;
const defaultProfile: ThemeProfile = defaultPreset.profile;

// ---------------------------------------------------------------------------
// Theme Input — what the provider accepts
// ---------------------------------------------------------------------------

export interface ThemeInput {
  tokens: DesignTokens;
  profile: ThemeProfile;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface M3ThemeContextType {
  tokens: DesignTokens;
  profile: ThemeProfile;
  setThemeInput: (input: ThemeInput) => void;
  resolvedColorScheme: ColorScheme;
}

const M3ThemeContext = createContext<M3ThemeContextType | undefined>(undefined);

export function useM3Theme() {
  const context = useContext(M3ThemeContext);
  if (!context) {
    throw new Error('useM3Theme must be used within M3ThemeProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Apply compiled CSS variables to DOM
// ---------------------------------------------------------------------------

function applyCssVariables(
  vars: CssVariable[],
  root: HTMLElement,
) {
  for (const v of vars) {
    root.style.setProperty(`--${v.name}`, v.value);
  }
}

/** Deep merge partial tokens with defaults so compileTheme never hits undefined */
function mergeWithDefaults(partial: DesignTokens): DesignTokens {
  // Deep merge helper
  function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
    const result = { ...target } as Record<string, unknown>;
    for (const key of Object.keys(source)) {
      if (result[key] === undefined || result[key] === null) {
        result[key] = source[key];
      } else if (
        typeof result[key] === 'object' && !Array.isArray(result[key]) &&
        typeof source[key] === 'object' && !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
      }
    }
    return result as T;
  }
  return deepMerge(partial, defaultTokens);
}

function applyCompiledThemeToDOM(
  tokens: DesignTokens,
  profile: ThemeProfile,
  isDark: boolean,
) {
  const safeTokens = mergeWithDefaults(tokens);
  let compiled;
  try {
    compiled = compileTheme(safeTokens, profile, { target: 'web' });
  } catch (e) {
    console.warn('[M3ThemeProvider] compileTheme failed, using defaults:', e);
    compiled = compileTheme(defaultTokens, defaultProfile, { target: 'web' });
  }
  if (!compiled.web) return;

  const root = document.documentElement;

  // Set data attributes
  for (const [key, value] of Object.entries(compiled.web.dataAttributes)) {
    root.setAttribute(`data-${key}`, value);
  }

  // Apply mode-dependent colors
  const modeVars = isDark ? compiled.web.dark : compiled.web.light;
  applyCssVariables(modeVars, root);

  // Apply invariant variables (typography, shape, spacing, motion, layout)
  applyCssVariables(compiled.web.invariant, root);

  // Inject Google Fonts dynamically
  injectFontLinks(compiled.web.fontImports);
}

/**
 * Inject Google Fonts link elements into <head>.
 * Idempotent — skips already-loaded fonts.
 */
function injectFontLinks(urls: string[]) {
  for (const url of urls) {
    const id = `gfont-${url.replace(/[^a-zA-Z0-9]/g, '').slice(-40)}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface M3ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeInput;
}

export function M3ThemeProvider({ children, initialTheme }: M3ThemeProviderProps) {
  const [tokens, setTokens] = useState<DesignTokens>(
    mergeWithDefaults(initialTheme?.tokens ?? defaultTokens),
  );
  const [profile, setProfile] = useState<ThemeProfile>(
    initialTheme?.profile ?? defaultProfile,
  );
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const setThemeInput = (input: ThemeInput) => {
    setTokens(input.tokens);
    setProfile(input.profile);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const colorMode = profile.colorMode;

    const handleChange = (e: MediaQueryListEvent) => {
      if (colorMode === 'system') {
        setIsDark(e.matches);
        applyCompiledThemeToDOM(tokens, profile, e.matches);
      }
    };

    // Initial setup
    if (colorMode === 'system') {
      setIsDark(mediaQuery.matches);
      applyCompiledThemeToDOM(tokens, profile, mediaQuery.matches);
    } else {
      setIsDark(colorMode === 'dark');
      applyCompiledThemeToDOM(tokens, profile, colorMode === 'dark');
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [tokens, profile, mounted]);

  const resolvedColorScheme = (isDark ? tokens.colors?.dark : tokens.colors?.light)
    ?? defaultTokens.colors.light;

  const nextThemeDefault = profile.colorMode === 'system' ? 'system' : profile.colorMode;

  return (
    <M3ThemeContext.Provider value={{ tokens, profile, setThemeInput, resolvedColorScheme }}>
      <NextThemesProvider
        attribute="class"
        defaultTheme={nextThemeDefault}
        enableSystem={profile.colorMode === 'system'}
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </M3ThemeContext.Provider>
  );
}

export { defaultTokens, defaultProfile };
