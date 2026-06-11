/**
 * Evolución — the Bukeer product design system preset.
 *
 * Direction approved 2026-06-10 (Evolución vs Cabina vs Brisa). Tokens come
 * from the Claude Design handoff (`evolucion.tokens.json`, v3.1); the handoff
 * bundle lives in `bukeer-flutter/design/evolucion-handoff/`.
 *
 * Deviation from the handoff: light-mode `secondary`, `tertiary` and `error`
 * are darkened to the nearest hue-preserving shade that passes WCAG AA with
 * white text (#1FA597→#157E73, #EE8B60→#B05426, #E5484D→#D63A3F) — the SDK
 * guardrails reject system presets that fail AA. The original bright hues
 * remain available untouched in `colors.accents` and `colors.chart` for
 * decorative, non-text use, and in the dark palette (which passes as-is).
 *
 * This preset themes the Bukeer operational app (the new Next.js frontend,
 * bukeer-flutter#851 / bukeer-studio#612). It is NOT part of the agency
 * website gallery — see `ALL_SYSTEM_PRESETS`, which intentionally excludes it.
 */

import { DESIGN_TOKENS_SCHEMA_VERSION } from '../contracts/design-tokens';
import { THEME_PROFILE_SCHEMA_VERSION } from '../contracts/theme-profile';
import type { ThemePreset } from '../contracts/preset';

export const EVOLUCION_PRESET: ThemePreset = {
  metadata: {
    id: 'e0000001-0000-0000-0000-000000000001',
    name: 'Evolución',
    slug: 'evolucion',
    description:
      'Bukeer product design system — refined M3 continuity: brand purple #7C57B3, cleaner surfaces, Outfit + Readex Pro, medium density',
    category: 'custom',
    emoji: '💜',
    tags: ['bukeer', 'product', 'app', 'm3', 'internal'],
    isSystem: true,
    isActive: true,
    displayOrder: 0,
    suggestedSections: [],
  },
  tokens: {
    $schema: DESIGN_TOKENS_SCHEMA_VERSION,
    colors: {
      seedColor: '#7C57B3',
      accents: {
        accent2: '#1FA597',
        accent3: '#EE8B60',
      },
      light: {
        primary: '#7C57B3',
        onPrimary: '#FFFFFF',
        primaryContainer: '#EEE8F7',
        onPrimaryContainer: '#4A2F7E',
        secondary: '#157E73',
        onSecondary: '#FFFFFF',
        secondaryContainer: '#DDF4F1',
        onSecondaryContainer: '#0B6B62',
        tertiary: '#B05426',
        onTertiary: '#FFFFFF',
        tertiaryContainer: '#FBE9DF',
        onTertiaryContainer: '#A14E26',
        error: '#D63A3F',
        onError: '#FFFFFF',
        errorContainer: '#FDE7E8',
        onErrorContainer: '#B3261E',
        surface: '#F2F4F8',
        onSurface: '#14181B',
        surfaceContainerLowest: '#ECEFF4',
        surfaceContainerLow: '#F2F4F8',
        surfaceContainer: '#F6F8FB',
        surfaceContainerHigh: '#FFFFFF',
        surfaceContainerHighest: '#FFFFFF',
        onSurfaceVariant: '#57636C',
        outline: '#AEB8C2',
        outlineVariant: '#E0E3E7',
        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: '#2A2D35',
        onInverseSurface: '#F0F1F5',
        inversePrimary: '#C9B3E8',
        surfaceTint: '#7C57B3',
        background: '#F2F4F8',
      },
      dark: {
        primary: '#A98BD9',
        onPrimary: '#211046',
        primaryContainer: '#45306E',
        onPrimaryContainer: '#E5DAF6',
        secondary: '#5BD6C8',
        onSecondary: '#00332D',
        secondaryContainer: '#11433F',
        onSecondaryContainer: '#B2EFE7',
        tertiary: '#F2A37E',
        onTertiary: '#3F1C08',
        tertiaryContainer: '#4A2D1D',
        onTertiaryContainer: '#FBDECB',
        error: '#FF8A8F',
        onError: '#45070C',
        errorContainer: '#5C2226',
        onErrorContainer: '#FFD9DA',
        surface: '#15161E',
        onSurface: '#F2F3F7',
        surfaceContainerLowest: '#101117',
        surfaceContainerLow: '#1B1D24',
        surfaceContainer: '#23252F',
        surfaceContainerHigh: '#262830',
        surfaceContainerHighest: '#2A2D39',
        onSurfaceVariant: '#A9ADC6',
        outline: '#4A4E60',
        outlineVariant: '#313442',
        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: '#F2F3F7',
        onInverseSurface: '#1B1D24',
        inversePrimary: '#7C57B3',
        surfaceTint: '#A98BD9',
        background: '#15161E',
      },
      chart: {
        c1: '#7C57B3',
        c2: '#1FA597',
        c3: '#EE8B60',
        c4: '#4E80EE',
        c5: '#D9A514',
      },
    },
    typography: {
      display: { family: 'Outfit', fallback: 'sans-serif', weight: '500' },
      body: { family: 'Readex Pro', fallback: 'sans-serif', weight: '300' },
      scale: 'default',
      bodyLineHeight: 1.5,
      letterSpacing: 0,
    },
    shape: {
      radius: 'md',
      buttonRadius: 'md',
      cardRadius: 'lg',
      inputRadius: 'md',
    },
    elevation: {
      cardElevation: 'subtle',
      navElevation: 'flat',
      heroElevation: 'flat',
    },
    motion: {
      preset: 'subtle',
      durationMs: 200,
      easing: 'ease-out',
      reducedMotion: true,
    },
    spacing: {
      baseUnit: 4,
      scale: 'default',
      density: 'roomy',
      containerMaxPx: 1440,
      sectionPaddingMultiplier: 2,
    },
  },
  profile: {
    $schema: THEME_PROFILE_SCHEMA_VERSION,
    brand: { mood: 'corporate', name: 'Evolución' },
    colorMode: 'system',
    layout: {
      variant: 'modern',
      heroStyle: 'minimal',
      navStyle: 'sticky',
      footerStyle: 'compact',
      maxContentWidth: 1440,
    },
    sectionStyles: {},
    metadata: {
      source: 'claude-design-handoff-2026-06-10',
      epic: 'bukeer-studio#612',
    },
  },
  quality: {
    contrastAA: true,
    darkModeComplete: true,
    fontsAllowlisted: true,
    sectionStylesVerified: false,
    previewCaptured: true,
    mobileVerified: true,
  },
  versions: [],
};

export function getEvolucionPreset(): ThemePreset {
  return EVOLUCION_PRESET;
}
