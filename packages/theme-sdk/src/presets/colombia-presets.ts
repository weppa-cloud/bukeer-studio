/**
 * Colombia-specific system presets.
 *
 * COLOMBIA_CARIBE_PRESET is aligned with the designer reference default
 * palette ("claude design 1"), which maps to `colombiatours.travel` per
 * Epic #250. See `themes/references/claude design 1/project/styles.css`
 * — first `:root { }` block.
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
    name: 'Colombia Tours Caribe (Designer Default)',
    slug: 'colombia-caribe',
    description:
      'Paleta caribeña por defecto del designer reference (sea teal + cream + coral + amarillo + leaf). Alineada con el spec de ColombiaTours.travel (Epic #250).',
    category: 'tropical',
    emoji: '🏝️',
    tags: ['colombia', 'caribe', 'playa', 'islas', 'tropical', 'designer-default'],
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
      // Sea teal seed (--c-primary)
      seedColor: '#0e5b5b',
      accents: {
        accent2: '#f3b13b', // amarillo (--c-accent-2)
        accent3: '#6ea842', // leaf (--c-accent-3)
      },
      // Chart palette — c2 coral (hotel), c3 amarillo (service), c5 leaf (activity)
      chart: { c2: '#e85c3c', c3: '#f3b13b', c5: '#6ea842' },
      light: {
        // --- Primary (sea teal) ---
        primary: '#0e5b5b',
        onPrimary: '#fffaf0',
        primaryContainer: '#c3d2cb',
        onPrimaryContainer: '#0f4c4b',
        // --- Secondary (coral) ---
        secondary: '#e85c3c',
        onSecondary: '#fffaf0',
        secondaryContainer: '#f9d3c3',
        onSecondaryContainer: '#4a1a0d',
        // --- Tertiary (leaf) ---
        tertiary: '#6ea842',
        onTertiary: '#fffaf0',
        tertiaryContainer: '#dbe6c5',
        onTertiaryContainer: '#1e3814',
        // --- Error ---
        error: '#B3261E',
        onError: '#FFFFFF',
        errorContainer: '#F9DEDC',
        onErrorContainer: '#410E0B',
        // --- Surface ramps — warm cream (interpolated #fffaf0 → #efe6d3) ---
        surface: '#fffaf0',
        onSurface: '#112827',
        surfaceContainerLowest: '#fffaf0',
        surfaceContainerLow: '#fbf5e9',
        surfaceContainer: '#f7f0e2',
        surfaceContainerHigh: '#f3ebda',
        surfaceContainerHighest: '#efe6d3',
        onSurfaceVariant: '#3b534f', // --c-ink-2
        outline: '#7a8a84', // --c-muted
        outlineVariant: '#d6c9ad', // --c-line-2
        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: '#1e3b37',
        onInverseSurface: '#fffaf0',
        inversePrimary: '#93b2ad',
        surfaceTint: '#0e5b5b',
        background: '#f6f1e8', // --c-bg
      },
      dark: {
        // Dark coherent variant — primary becomes lighter tint of sea teal
        primary: '#93b2ad',
        onPrimary: '#00302f',
        primaryContainer: '#0e5b5b',
        onPrimaryContainer: '#c3d2cb',
        secondary: '#ff8a6e', // lighter coral
        onSecondary: '#5a1a0a',
        secondaryContainer: '#8a2f18',
        onSecondaryContainer: '#f9d3c3',
        tertiary: '#9fc97a', // lighter leaf
        onTertiary: '#1e3814',
        tertiaryContainer: '#3d5e24',
        onTertiaryContainer: '#dbe6c5',
        error: '#F2B8B5',
        onError: '#601410',
        errorContainer: '#8C1D18',
        onErrorContainer: '#F9DEDC',
        surface: '#0b1f1e',
        onSurface: '#e8ddc4',
        surfaceContainerLowest: '#071514',
        surfaceContainerLow: '#0f2625',
        surfaceContainer: '#132d2b',
        surfaceContainerHigh: '#1a3936',
        surfaceContainerHighest: '#224541',
        onSurfaceVariant: '#c9bfa8',
        outline: '#93a49f',
        outlineVariant: '#3b534f',
        shadow: '#000000',
        scrim: '#000000',
        inverseSurface: '#e8ddc4',
        onInverseSurface: '#1e3b37',
        inversePrimary: '#0e5b5b',
        surfaceTint: '#93b2ad',
        background: '#071514',
      },
    },
    typography: {
      // Designer uses Bricolage Grotesque for display headings
      display: { family: 'Bricolage Grotesque', fallback: 'sans-serif', weight: '500' },
      // Body runs on Inter per designer spec (DIFFERENT from previous preset)
      body: { family: 'Inter', fallback: 'sans-serif', weight: '400' },
      scale: 'default',
      bodyLineHeight: 1.6,
      // Designer applies tight tracking on display (negative letter-spacing)
      letterSpacing: -0.01,
    },
    shape: { radius: 'lg', buttonRadius: 'full', cardRadius: 'xl' },
    elevation: { cardElevation: 'raised', navElevation: 'subtle', heroElevation: 'flat' },
    motion: {
      preset: 'moderate',
      durationMs: 250,
      easing: 'organic',
      // Designer --ease: cubic-bezier(.2,.7,.2,1)
      customEasing: [0.2, 0.7, 0.2, 1],
      reducedMotion: true,
    },
    spacing: {
      baseUnit: 4,
      scale: 'default',
      density: 'roomy',
      containerMaxPx: 1200,
      sectionPaddingMultiplier: 2.5,
    },
  },
  profile: {
    $schema: THEME_PROFILE_SCHEMA_VERSION,
    brand: { mood: 'adventurous', name: 'Colombia Tours' },
    colorMode: 'system',
    layout: {
      variant: 'modern',
      heroStyle: 'split',
      navStyle: 'sticky',
      footerStyle: 'full',
      maxContentWidth: 1200,
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

export const COLOMBIA_PRESETS: ThemePreset[] = [
  COLOMBIA_CARIBE_PRESET,
];

export function getColombiaPresetBySlug(slug: string): ThemePreset | undefined {
  return COLOMBIA_PRESETS.find((p) => p.metadata.slug === slug);
}

export const ALL_SYSTEM_PRESETS: ThemePreset[] = [
  ...TOURISM_PRESETS,
  ...COLOMBIA_PRESETS,
];
