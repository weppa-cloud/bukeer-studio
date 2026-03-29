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

  // Apply CSS variable bridge — maps shadcn tokens to theme-component variables
  // so section variants from themed templates work pixel-perfect
  applyBridgeVariables(root);

  // Inject Google Fonts dynamically
  injectFontLinks(compiled.web.fontImports);
}

/**
 * CSS Variable Bridge — derives theme-component variables from shadcn tokens.
 *
 * Section components from themed templates use inline styles like
 * `style={{ color: "var(--accent)" }}`. This bridge maps existing
 * shadcn CSS variables to the names those components expect.
 *
 * Every theme automatically gets these bridge variables — no manual
 * per-theme configuration needed.
 */
function applyBridgeVariables(root: HTMLElement) {
  const s = getComputedStyle(root);

  // Read current shadcn HSL values
  const bg = s.getPropertyValue('--background').trim();
  const card = s.getPropertyValue('--card').trim();
  const foreground = s.getPropertyValue('--foreground').trim();
  const primary = s.getPropertyValue('--primary').trim();
  const primaryFg = s.getPropertyValue('--primary-foreground').trim();
  const mutedFg = s.getPropertyValue('--muted-foreground').trim();
  const border = s.getPropertyValue('--border').trim();

  if (!bg) return; // Not yet initialized

  // Direct aliases
  root.style.setProperty('--bg', `hsl(${bg})`);
  root.style.setProperty('--bg-card', `hsl(${card})`);
  root.style.setProperty('--accent', `hsl(${primary})`);
  root.style.setProperty('--accent-hover', `hsl(${primary} / 0.8)`);
  root.style.setProperty('--accent-text', `hsl(${primaryFg})`);
  root.style.setProperty('--text-heading', `hsl(${foreground})`);
  root.style.setProperty('--text-primary', `hsl(${foreground})`);
  root.style.setProperty('--text-secondary', `hsl(${mutedFg})`);
  root.style.setProperty('--text-muted', `hsl(${mutedFg} / 0.7)`);

  // Derived with opacity
  root.style.setProperty('--border-subtle', `hsl(${border} / 0.5)`);
  root.style.setProperty('--border-medium', `hsl(${border})`);
  root.style.setProperty('--card-badge-bg', `hsl(${bg} / 0.7)`);
  root.style.setProperty('--card-badge-border', `hsl(${border} / 0.5)`);
  root.style.setProperty('--card-badge-text', `hsl(${mutedFg})`);
  root.style.setProperty('--card-gradient', `hsl(${card} / 0.6)`);
  root.style.setProperty('--card-meta', `hsl(${mutedFg} / 0.7)`);
  root.style.setProperty('--nav-bg-scroll', `hsl(${bg} / 0.8)`);
  root.style.setProperty('--nav-link', `hsl(${mutedFg})`);
  root.style.setProperty('--nav-link-hover', `hsl(${foreground})`);
  root.style.setProperty('--nav-link-hover-bg', `hsl(${foreground} / 0.06)`);
  root.style.setProperty('--stat-border', `hsl(${border} / 0.3)`);
  root.style.setProperty('--spotlight-color', `hsl(${primary} / 0.08)`);

  // Responsive display typography
  root.style.setProperty('--text-display-xl', 'clamp(3rem, 6vw, 6rem)');
  root.style.setProperty('--text-display-lg', 'clamp(2.25rem, 4vw, 4rem)');
  root.style.setProperty('--text-display-md', 'clamp(1.75rem, 3vw, 3rem)');
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
        <ThemeBridgeSync tokens={tokens} profile={profile} />
        {children}
      </NextThemesProvider>
    </M3ThemeContext.Provider>
  );
}

/**
 * ThemeBridgeSync — listens to next-themes changes and re-applies
 * compiled theme + bridge variables when the user toggles dark/light.
 *
 * Must be inside NextThemesProvider to access useTheme().
 */
function ThemeBridgeSync({ tokens, profile }: { tokens: DesignTokens; profile: ThemeProfile }) {
  const { resolvedTheme } = useNextTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const dark = resolvedTheme === 'dark';
    applyCompiledThemeToDOM(tokens, profile, dark);
  }, [resolvedTheme, tokens, profile]);

  return null;
}

export { defaultTokens, defaultProfile };
