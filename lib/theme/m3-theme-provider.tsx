'use client';

/**
 * M3 Theme Provider — v3.0 (powered by @bukeer/theme-sdk)
 *
 * Consumes DesignTokens + ThemeProfile from SDK and compiles
 * them into CSS variables for the entire application.
 *
 * No local type definitions — all types from @bukeer/theme-sdk.
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes';
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

function applyCompiledThemeToDOM(
  tokens: DesignTokens,
  profile: ThemeProfile,
  isDark: boolean,
) {
  const compiled = compileTheme(tokens, profile, { target: 'web' });
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
    initialTheme?.tokens ?? defaultTokens,
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

  const resolvedColorScheme = isDark ? tokens.colors.dark : tokens.colors.light;

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
