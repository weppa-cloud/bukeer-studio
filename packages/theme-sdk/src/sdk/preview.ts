/**
 * previewTheme() — Generate a preview-friendly summary of a theme.
 *
 * Useful for UI previews, preset cards, and theme comparison.
 */

import type { DesignTokens } from '../contracts/design-tokens';
import type { ThemeProfile } from '../contracts/theme-profile';
import { hexToHsl } from '../compiler/css-generator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThemePreviewColors {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  surface: string;
  error: string;
}

export interface ThemePreview {
  /** Brand name */
  name: string;
  /** Brand mood */
  mood: string;
  /** Tagline */
  tagline?: string;
  /** Key colors for preview swatches (hex) */
  colors: {
    light: ThemePreviewColors;
    dark: ThemePreviewColors;
  };
  /** Typography summary */
  typography: {
    headingFont: string;
    bodyFont: string;
    editorialSerif: string;
    scale: string;
  };
  /** Layout summary */
  layout: {
    variant: string;
    heroStyle: string;
    radius: string;
  };
  /** CSS string for inline preview styling */
  previewCss: string;
}

// ---------------------------------------------------------------------------
// previewTheme
// ---------------------------------------------------------------------------

export function previewTheme(
  tokens: DesignTokens,
  profile: ThemeProfile,
): ThemePreview {
  const extractColors = (scheme: typeof tokens.colors.light): ThemePreviewColors => ({
    primary: scheme.primary,
    secondary: scheme.secondary,
    tertiary: scheme.tertiary,
    background: scheme.background,
    surface: scheme.surface,
    error: scheme.error,
  });

  // Generate minimal CSS for inline preview
  const light = tokens.colors.light;
  const previewCss = [
    `--preview-primary: ${hexToHsl(light.primary)};`,
    `--preview-bg: ${hexToHsl(light.background)};`,
    `--preview-surface: ${hexToHsl(light.surface)};`,
    `--preview-text: ${hexToHsl(light.onSurface)};`,
    `--preview-font-heading: "${tokens.typography.display.family}";`,
    `--preview-font-body: "${tokens.typography.body.family}";`,
  ].join(' ');

  return {
    name: profile.brand.name,
    mood: profile.brand.mood,
    tagline: profile.brand.tagline,
    colors: {
      light: extractColors(tokens.colors.light),
      dark: extractColors(tokens.colors.dark),
    },
    typography: {
      headingFont: tokens.typography.display.family,
      bodyFont: tokens.typography.body.family,
      editorialSerif: tokens.typography.editorialSerif?.family ?? 'Instrument Serif',
      scale: tokens.typography.scale,
    },
    layout: {
      variant: profile.layout.variant,
      heroStyle: profile.layout.heroStyle,
      radius: tokens.shape.radius,
    },
    previewCss,
  };
}
