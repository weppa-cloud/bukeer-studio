'use client';

/**
 * SiteThemeScope — Scoped CSS variable wrapper for site sections in Studio.
 *
 * The Studio editor has its own theme (`--studio-*` variables on :root).
 * Site sections rendered in the canvas expect M3/shadcn CSS variables
 * (`--primary`, `--background`, etc.) that are normally set globally by
 * M3ThemeProvider. This component compiles the website's DesignTokens +
 * ThemeProfile and applies the resulting CSS variables to a scoped <div>,
 * keeping Studio and site themes isolated.
 */

import { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

import type {
  DesignTokens,
  ThemeProfile,
  CssVariable,
} from '@bukeer/theme-sdk';
import {
  compileTheme,
  TOURISM_PRESETS,
} from '@bukeer/theme-sdk';

// ---------------------------------------------------------------------------
// Fallback — Corporate preset
// ---------------------------------------------------------------------------

const fallbackPreset =
  TOURISM_PRESETS.find((p) => p.metadata.slug === 'corporate') ?? TOURISM_PRESETS[0];
const fallbackTokens: DesignTokens = fallbackPreset.tokens;
const fallbackProfile: ThemeProfile = fallbackPreset.profile;

// ---------------------------------------------------------------------------
// Helpers (extracted from m3-theme-provider logic)
// ---------------------------------------------------------------------------

function applyCssVariables(vars: CssVariable[], el: HTMLElement) {
  for (const v of vars) {
    el.style.setProperty(`--${v.name}`, v.value);
  }
}

/**
 * Bridge variables — maps compiled shadcn HSL tokens to the legacy
 * variable names that section components expect (e.g. `--accent`,
 * `--text-heading`, `--bg`).
 *
 * Mirrors the logic in m3-theme-provider.tsx `applyBridgeVariables`,
 * but reads computed styles from the scoped element instead of :root.
 */
function applyBridgeVariables(el: HTMLElement) {
  const s = getComputedStyle(el);

  const bg = s.getPropertyValue('--background').trim();
  const card = s.getPropertyValue('--card').trim();
  const foreground = s.getPropertyValue('--foreground').trim();
  const primary = s.getPropertyValue('--primary').trim();
  const primaryFg = s.getPropertyValue('--primary-foreground').trim();
  const mutedFg = s.getPropertyValue('--muted-foreground').trim();
  const border = s.getPropertyValue('--border').trim();

  if (!bg) return; // Variables not yet applied

  // Direct aliases
  el.style.setProperty('--bg', `hsl(${bg})`);
  el.style.setProperty('--bg-card', `hsl(${card})`);
  el.style.setProperty('--accent', `hsl(${primary})`);
  el.style.setProperty('--accent-hover', `hsl(${primary} / 0.8)`);
  el.style.setProperty('--accent-text', `hsl(${primaryFg})`);
  el.style.setProperty('--text-heading', `hsl(${foreground})`);
  el.style.setProperty('--text-primary', `hsl(${foreground})`);
  el.style.setProperty('--text-secondary', `hsl(${mutedFg})`);
  el.style.setProperty('--text-muted', `hsl(${mutedFg} / 0.7)`);

  // Derived with opacity — detect dark via class on scoped element or ancestors
  const isDark = el.closest('.dark') !== null || el.classList.contains('dark');
  el.style.setProperty('--border-subtle', `hsl(${border} / ${isDark ? 0.8 : 0.5})`);
  el.style.setProperty('--border-medium', `hsl(${border})`);
  el.style.setProperty('--card-badge-bg', `hsl(${bg} / ${isDark ? 0.5 : 0.7})`);
  el.style.setProperty('--card-badge-border', `hsl(${border} / ${isDark ? 0.7 : 0.5})`);
  el.style.setProperty('--card-badge-text', `hsl(${mutedFg})`);
  el.style.setProperty('--card-gradient', `hsl(${card} / 0.6)`);
  el.style.setProperty('--card-meta', `hsl(${mutedFg} / 0.7)`);
  el.style.setProperty('--nav-bg-scroll', `hsl(${bg} / 0.8)`);
  el.style.setProperty('--nav-link', `hsl(${mutedFg})`);
  el.style.setProperty('--nav-link-hover', `hsl(${foreground})`);
  el.style.setProperty('--nav-link-hover-bg', `hsl(${foreground} / 0.06)`);
  el.style.setProperty('--stat-border', `hsl(${border} / 0.3)`);
  el.style.setProperty('--spotlight-color', `hsl(${primary} / 0.08)`);

  // Responsive display typography
  el.style.setProperty('--text-display-xl', 'clamp(3rem, 6vw, 6rem)');
  el.style.setProperty('--text-display-lg', 'clamp(2.25rem, 4vw, 4rem)');
  el.style.setProperty('--text-display-md', 'clamp(1.75rem, 3vw, 3rem)');

  // Mono font for labels/badges
  el.style.setProperty(
    '--font-mono',
    '"DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  );
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
// Component
// ---------------------------------------------------------------------------

export interface SiteThemeScopeProps {
  /** Website theme object with tokens and profile */
  theme?: {
    tokens?: DesignTokens;
    profile?: ThemeProfile;
  };
  children: React.ReactNode;
  className?: string;
  /** Force a color scheme; defaults to profile.colorMode or 'light' */
  colorScheme?: 'light' | 'dark';
}

export function SiteThemeScope({
  theme,
  children,
  className,
  colorScheme,
}: SiteThemeScopeProps) {
  const scopeRef = useRef<HTMLDivElement>(null);

  const tokens = theme?.tokens ?? fallbackTokens;
  const profile = theme?.profile ?? fallbackProfile;

  // Determine whether to render dark or light mode
  const isDark = useMemo(() => {
    if (colorScheme) return colorScheme === 'dark';
    if (profile.colorMode === 'dark') return true;
    if (profile.colorMode === 'light') return false;
    // 'system' — check media query (SSR-safe: default to light)
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [colorScheme, profile.colorMode]);

  useEffect(() => {
    const el = scopeRef.current;
    if (!el) return;

    // Compile tokens into CSS variables
    let compiled;
    try {
      compiled = compileTheme(tokens, profile, { target: 'web' });
    } catch (e) {
      console.warn('[SiteThemeScope] compileTheme failed, using fallback:', e);
      compiled = compileTheme(fallbackTokens, fallbackProfile, { target: 'web' });
    }

    if (!compiled.web) return;

    // Set data attributes on scoped element
    for (const [key, value] of Object.entries(compiled.web.dataAttributes)) {
      el.setAttribute(`data-${key}`, value);
    }

    // Apply mode-dependent color variables
    const modeVars = isDark ? compiled.web.dark : compiled.web.light;
    applyCssVariables(modeVars, el);

    // Apply invariant variables (typography, shape, spacing, motion, layout)
    applyCssVariables(compiled.web.invariant, el);

    // Apply bridge variables (legacy aliases for section components)
    applyBridgeVariables(el);

    // Inject Google Fonts into <head>
    injectFontLinks(compiled.web.fontImports);

    // Also inject DM Mono for bridge --font-mono
    const monoUrl =
      'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap';
    injectFontLinks([monoUrl]);
  }, [tokens, profile, isDark]);

  return (
    <div
      ref={scopeRef}
      className={cn('studio-canvas-site', className)}
    >
      {children}
    </div>
  );
}
