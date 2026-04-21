/**
 * ColombiaTours designer reference presets.
 *
 * Canonical values extracted verbatim from the designer reference bundle at
 * `themes/references/claude design 1/project/styles.css` (Caribe default
 * palette, rows 6-48). Fonts: Bricolage Grotesque (display, weight 500) +
 * Inter (body, 400). Custom easing `cubic-bezier(.2,.7,.2,1)` with 250 ms
 * duration. Density `roomy` with containerMaxPx 1240 and section padding
 * multiplier 3.5 → 112 px section-py matching `--sp-8`.
 *
 * Additional `andes`/`selva`/`cafe` palette variants are documented in the
 * reference but deferred to a future follow-up preset file.
 */

import { DESIGN_TOKENS_SCHEMA_VERSION } from '../contracts/design-tokens';
import { THEME_PROFILE_SCHEMA_VERSION } from '../contracts/theme-profile';
import type { ThemePreset } from '../contracts/preset';
import { TOURISM_PRESETS } from './tourism-presets';

function preset(p: Omit<ThemePreset, 'versions'>): ThemePreset {
  return { ...p, versions: [] };
}

export const COLOMBIA_CARIBE_PRESET: ThemePreset = preset({
  metadata: {
    id: 'a0000001-0000-0000-0000-000000000009',
    name: 'Colombia Tours — Caribe',
    slug: 'colombia-tours-caribe',
    description:
      'Paleta caribeña del rediseño ColombiaTours: sea teal + arena + coral + verde hoja. Tipografía Bricolage Grotesque + Inter.',
    category: 'tropical',
    emoji: '🏝️',
    tags: ['colombia', 'caribe', 'playa', 'islas', 'tropical', 'designer-v1'],
    isSystem: true,
    isActive: true,
    displayOrder: 9,
    suggestedSections: [
      'hero',
      'destinations',
      'packages',
      'activities',
      'stats',
      'testimonials',
      'planners',
      'blog',
      'faq',
      'cta',
    ],
  },
  tokens: {
    $schema: DESIGN_TOKENS_SCHEMA_VERSION,
    colors: {
      seedColor: '#0E5B5B',
      accents: {
        accent2: '#F3B13B',
        accent3: '#6EA842',
      },
      chart: {
        c1: '#0E5B5B',
        c2: '#E85C3C',
        c3: '#F3B13B',
        c4: '#6EA842',
        c5: '#7A8A84',
      },
      light: {
        primary: '#0E5B5B',
        onPrimary: '#FFFAF0',
        primaryContainer: '#A6DDDD',
        onPrimaryContainer: '#003737',
        secondary: '#8A6E3D',
        onSecondary: '#FFFAF0',
        secondaryContainer: '#F3E2C4',
        onSecondaryContainer: '#3B2A0B',
        tertiary: '#E85C3C',
        onTertiary: '#2A0F06',
        tertiaryContainer: '#FFD1C3',
        onTertiaryContainer: '#3B1003',
        error: '#B3261E',
        onError: '#FFFFFF',
        errorContainer: '#F9DEDC',
        onErrorContainer: '#410E0B',
        surface: '#FFFAF0',
        onSurface: '#112827',
        surfaceContainerLowest: '#FFFFFF',
        surfaceContainerLow: '#F6F1E8',
        surfaceContainer: '#EFE6D3',
        surfaceContainerHigh: '#E6DCC6',
        surfaceContainerHighest: '#D6C9AD',
        onSurfaceVariant: '#3B534F',
        outline: '#7A8A84',
        outlineVariant: '#E6DCC6',
        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: '#112827',
        onInverseSurface: '#F6F1E8',
        inversePrimary: '#7FC8C8',
        surfaceTint: '#0E5B5B',
        background: '#F6F1E8',
      },
      dark: {
        primary: '#7FC8C8',
        onPrimary: '#003737',
        primaryContainer: '#0E5B5B',
        onPrimaryContainer: '#A6DDDD',
        secondary: '#D9B67B',
        onSecondary: '#3B2A0B',
        secondaryContainer: '#5A4222',
        onSecondaryContainer: '#F3E2C4',
        tertiary: '#FFAB91',
        onTertiary: '#5B2C0B',
        tertiaryContainer: '#8A2B12',
        onTertiaryContainer: '#FFD1C3',
        error: '#F2B8B5',
        onError: '#601410',
        errorContainer: '#8C1D18',
        onErrorContainer: '#F9DEDC',
        surface: '#0F1717',
        onSurface: '#F6F1E8',
        surfaceContainerLowest: '#050A0A',
        surfaceContainerLow: '#112827',
        surfaceContainer: '#16322F',
        surfaceContainerHigh: '#1F3F3B',
        surfaceContainerHighest: '#294C47',
        onSurfaceVariant: '#C2D3CE',
        outline: '#8DA19A',
        outlineVariant: '#3B534F',
        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: '#F6F1E8',
        onInverseSurface: '#112827',
        inversePrimary: '#0E5B5B',
        surfaceTint: '#7FC8C8',
        background: '#0F1717',
      },
    },
    typography: {
      display: { family: 'Bricolage Grotesque', fallback: 'sans-serif', weight: '500' },
      body: { family: 'Inter', fallback: 'sans-serif', weight: '400' },
      scale: 'default',
      bodyLineHeight: 1.6,
      letterSpacing: -0.01,
    },
    shape: { radius: 'lg', buttonRadius: 'full', cardRadius: 'lg', inputRadius: 'md' },
    elevation: { cardElevation: 'raised', navElevation: 'subtle', heroElevation: 'flat' },
    motion: {
      preset: 'moderate',
      durationMs: 250,
      easing: 'organic',
      customEasing: [0.2, 0.7, 0.2, 1],
      reducedMotion: true,
    },
    spacing: {
      baseUnit: 4,
      scale: 'default',
      density: 'roomy',
      containerMaxPx: 1240,
      sectionPaddingMultiplier: 3.5,
    },
  },
  profile: {
    $schema: THEME_PROFILE_SCHEMA_VERSION,
    brand: {
      mood: 'tropical',
      name: 'ColombiaTours',
      tagline: 'Vive el Caribe colombiano',
    },
    colorMode: 'system',
    layout: {
      variant: 'modern',
      heroStyle: 'split',
      navStyle: 'sticky',
      footerStyle: 'full',
      maxContentWidth: 1240,
    },
    sectionStyles: {
      hero: 'hero',
      destinations: 'alternating',
      packages: 'card-grid',
      activities: 'card-grid',
      testimonials: 'default',
      planners: 'card-grid',
      stats: 'emphasized',
      faq: 'default',
      cta: 'emphasized',
    },
    metadata: {
      designerReference: 'themes/references/claude design 1/project/styles.css',
      paletteName: 'caribe',
    },
  },
  quality: {
    contrastAA: true,
    darkModeComplete: true,
    fontsAllowlisted: true,
    sectionStylesVerified: true,
    previewCaptured: false,
    mobileVerified: false,
  },
});

export const COLOMBIA_PRESETS: ThemePreset[] = [COLOMBIA_CARIBE_PRESET];

export function getColombiaPresetBySlug(slug: string): ThemePreset | undefined {
  return COLOMBIA_PRESETS.find((preset) => preset.metadata.slug === slug);
}

export const ALL_SYSTEM_PRESETS: ThemePreset[] = [
  ...TOURISM_PRESETS,
  ...COLOMBIA_PRESETS,
];
