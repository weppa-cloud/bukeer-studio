/**
 * CSS Variable Generator — compiles DesignTokens + ThemeProfile into CSS custom properties.
 */

import type {
  ChartColors,
  DesignTokens,
  ColorScheme,
  RadiusValue,
  ElevationLevel,
  SpacingDensity,
} from '../contracts/design-tokens';
import type { ThemeProfile } from '../contracts/theme-profile';
import type { CssVariable, WebRuntimeOutput } from '../contracts/runtime-output';
import { RUNTIME_OUTPUT_SCHEMA_VERSION } from '../contracts/runtime-output';
import { SDK_VERSION } from '../version';
import { computeHash } from './snapshot';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateCssOutput(
  tokens: DesignTokens,
  profile: ThemeProfile,
  inputHash: string,
): WebRuntimeOutput {
  const chartVars = generateChartVars(tokens.colors.chart);
  const lightVars = [...generateColorVars(tokens.colors.light, tokens.colors.accents), ...chartVars];
  const darkVars = [...generateColorVars(tokens.colors.dark, tokens.colors.accents), ...chartVars];
  const invariantVars = generateInvariantVars(tokens, profile);

  const dataAttributes: Record<string, string> = {
    'layout-variant': profile.layout.variant,
    'hero-style': profile.layout.heroStyle,
    'nav-style': profile.layout.navStyle,
    'motion-preset': tokens.motion.preset,
  };

  const fontImports = buildFontImports(tokens);

  const allVars = [...lightVars, ...invariantVars];
  const outputHash = computeHash(JSON.stringify(allVars));

  return {
    $schema: RUNTIME_OUTPUT_SCHEMA_VERSION,
    target: 'web',
    metadata: {
      sdkVersion: SDK_VERSION,
      tokensVersion: tokens.$schema,
      profileVersion: profile.$schema,
      compiledAt: new Date().toISOString(),
      inputHash,
      outputHash,
    },
    light: lightVars,
    dark: darkVars,
    invariant: invariantVars,
    dataAttributes,
    fontImports,
  };
}

// ---------------------------------------------------------------------------
// Color Variables
// ---------------------------------------------------------------------------

function generateColorVars(
  scheme: ColorScheme,
  accents: DesignTokens['colors']['accents'] | undefined,
): CssVariable[] {
  const vars: CssVariable[] = [];
  const cat = 'color' as const;

  // Shadcn/UI semantic mappings
  vars.push({ name: 'background', value: hexToHsl(scheme.background), category: cat });
  vars.push({ name: 'foreground', value: hexToHsl(scheme.onSurface), category: cat });
  vars.push({ name: 'card', value: hexToHsl(scheme.surface), category: cat });
  vars.push({ name: 'card-foreground', value: hexToHsl(scheme.onSurface), category: cat });
  vars.push({ name: 'popover', value: hexToHsl(scheme.surface), category: cat });
  vars.push({ name: 'popover-foreground', value: hexToHsl(scheme.onSurface), category: cat });
  vars.push({ name: 'primary', value: hexToHsl(scheme.primary), category: cat });
  vars.push({ name: 'primary-foreground', value: hexToHsl(scheme.onPrimary), category: cat });
  vars.push({ name: 'secondary', value: hexToHsl(scheme.secondary), category: cat });
  vars.push({ name: 'secondary-foreground', value: hexToHsl(scheme.onSecondary), category: cat });
  vars.push({ name: 'muted', value: hexToHsl(scheme.surfaceContainerHighest), category: cat });
  vars.push({ name: 'muted-foreground', value: hexToHsl(scheme.onSurfaceVariant), category: cat });
  vars.push({ name: 'accent', value: hexToHsl(scheme.tertiaryContainer), category: cat });
  vars.push({ name: 'accent-foreground', value: hexToHsl(scheme.onTertiaryContainer), category: cat });
  if (accents?.accent2) {
    vars.push({ name: 'accent-2', value: hexToHsl(accents.accent2), category: cat });
  }
  if (accents?.accent3) {
    vars.push({ name: 'accent-3', value: hexToHsl(accents.accent3), category: cat });
  }
  vars.push({ name: 'destructive', value: hexToHsl(scheme.error), category: cat });
  vars.push({ name: 'destructive-foreground', value: hexToHsl(scheme.onError), category: cat });
  vars.push({ name: 'border', value: hexToHsl(scheme.outlineVariant), category: cat });
  vars.push({ name: 'input', value: hexToHsl(scheme.outline), category: cat });
  vars.push({ name: 'ring', value: hexToHsl(scheme.primary), category: cat });

  // M3-specific tokens
  vars.push({ name: 'primary-container', value: hexToHsl(scheme.primaryContainer), category: cat });
  vars.push({ name: 'on-primary-container', value: hexToHsl(scheme.onPrimaryContainer), category: cat });
  vars.push({ name: 'secondary-container', value: hexToHsl(scheme.secondaryContainer), category: cat });
  vars.push({ name: 'on-secondary-container', value: hexToHsl(scheme.onSecondaryContainer), category: cat });
  vars.push({ name: 'tertiary', value: hexToHsl(scheme.tertiary), category: cat });
  vars.push({ name: 'on-tertiary', value: hexToHsl(scheme.onTertiary), category: cat });
  vars.push({ name: 'tertiary-container', value: hexToHsl(scheme.tertiaryContainer), category: cat });
  vars.push({ name: 'on-tertiary-container', value: hexToHsl(scheme.onTertiaryContainer), category: cat });
  vars.push({ name: 'surface-tint', value: hexToHsl(scheme.surfaceTint), category: cat });
  vars.push({ name: 'inverse-surface', value: hexToHsl(scheme.inverseSurface), category: cat });
  vars.push({ name: 'on-inverse-surface', value: hexToHsl(scheme.onInverseSurface), category: cat });
  vars.push({ name: 'inverse-primary', value: hexToHsl(scheme.inversePrimary), category: cat });

  // Surface container levels
  vars.push({ name: 'surface-container-lowest', value: hexToHsl(scheme.surfaceContainerLowest), category: cat });
  vars.push({ name: 'surface-container-low', value: hexToHsl(scheme.surfaceContainerLow), category: cat });
  vars.push({ name: 'surface-container', value: hexToHsl(scheme.surfaceContainer), category: cat });
  vars.push({ name: 'surface-container-high', value: hexToHsl(scheme.surfaceContainerHigh), category: cat });
  vars.push({ name: 'surface-container-highest', value: hexToHsl(scheme.surfaceContainerHighest), category: cat });

  return vars;
}

// ---------------------------------------------------------------------------
// Chart / data-viz Variables (shared across light & dark)
// ---------------------------------------------------------------------------

function generateChartVars(chart: ChartColors | undefined): CssVariable[] {
  if (!chart) return [];

  const cat = 'color' as const;
  const vars: CssVariable[] = [];
  const slots: Array<[keyof ChartColors, string]> = [
    ['c1', 'chart-1'],
    ['c2', 'chart-2'],
    ['c3', 'chart-3'],
    ['c4', 'chart-4'],
    ['c5', 'chart-5'],
  ];

  for (const [key, varName] of slots) {
    const hex = chart[key];
    if (hex) {
      vars.push({ name: varName, value: hexToHsl(hex), category: cat });
    }
  }

  return vars;
}

// ---------------------------------------------------------------------------
// Invariant Variables (mode-independent)
// ---------------------------------------------------------------------------

function generateInvariantVars(tokens: DesignTokens, profile: ThemeProfile): CssVariable[] {
  const vars: CssVariable[] = [];
  const density = resolveSpacingDensity(tokens.spacing.density, tokens.spacing.scale);
  const densityMultiplier = densityToMultiplier(density);
  const spacingRamp = buildSpacingRamp(tokens.spacing.baseUnit, densityMultiplier);
  const sectionPaddingPx = tokens.spacing.baseUnit * 8 * tokens.spacing.sectionPaddingMultiplier * densityMultiplier;
  const containerPx = tokens.spacing.containerMaxPx ?? profile.layout.maxContentWidth;
  const easingValue = customEasingToValue(tokens.motion.customEasing) ?? easingToValue(tokens.motion.easing);

  // Typography
  vars.push({ name: 'font-heading', value: `"${tokens.typography.display.family}", ${tokens.typography.display.fallback}`, category: 'typography' });
  vars.push({ name: 'font-body', value: `"${tokens.typography.body.family}", ${tokens.typography.body.fallback}`, category: 'typography' });
  vars.push({ name: 'font-heading-weight', value: tokens.typography.display.weight, category: 'typography' });
  vars.push({ name: 'font-body-weight', value: tokens.typography.body.weight, category: 'typography' });
  vars.push({ name: 'type-scale', value: typeScaleToValue(tokens.typography.scale), category: 'typography' });
  vars.push({ name: 'body-line-height', value: String(tokens.typography.bodyLineHeight), category: 'typography' });
  vars.push({ name: 'letter-spacing', value: `${tokens.typography.letterSpacing}em`, category: 'typography' });

  // Shape
  const radius = tokens.shape.radius;
  vars.push({ name: 'radius', value: radiusToValue(radius), category: 'shape' });
  vars.push({ name: 'radius-sm', value: radiusToValue(tokens.shape.inputRadius ?? shrinkRadius(radius)), category: 'shape' });
  vars.push({ name: 'radius-md', value: radiusToValue(radius), category: 'shape' });
  vars.push({ name: 'radius-lg', value: radiusToValue(tokens.shape.cardRadius ?? growRadius(radius)), category: 'shape' });
  vars.push({ name: 'radius-button', value: radiusToValue(tokens.shape.buttonRadius ?? radius), category: 'shape' });

  // Elevation
  vars.push({ name: 'elevation-card', value: elevationToShadow(tokens.elevation.cardElevation), category: 'elevation' });
  vars.push({ name: 'elevation-nav', value: elevationToShadow(tokens.elevation.navElevation), category: 'elevation' });
  vars.push({ name: 'elevation-hero', value: elevationToShadow(tokens.elevation.heroElevation), category: 'elevation' });

  // Layout variant styles
  const variantConfig = layoutVariantConfig[profile.layout.variant] ?? layoutVariantConfig.modern;
  vars.push({ name: 'layout-elevation', value: variantConfig.elevation, category: 'layout' });
  vars.push({ name: 'layout-border', value: variantConfig.borderStyle, category: 'layout' });
  vars.push({ name: 'container', value: `${containerPx}px`, category: 'layout' });
  vars.push({ name: 'max-content-width', value: `${containerPx}px`, category: 'layout' });

  // Motion
  vars.push({ name: 'transition-duration', value: `${tokens.motion.durationMs}ms`, category: 'motion' });
  vars.push({ name: 'ease', value: easingValue, category: 'motion' });
  vars.push({ name: 'transition-easing', value: easingValue, category: 'motion' });

  // Spacing
  vars.push({ name: 'spacing-unit', value: `${formatPx(tokens.spacing.baseUnit * densityMultiplier)}px`, category: 'spacing' });
  vars.push({ name: 'section-padding', value: `${formatPx(sectionPaddingPx)}px`, category: 'spacing' });
  vars.push({ name: 'section-py', value: `${formatPx(sectionPaddingPx)}px`, category: 'spacing' });
  vars.push({ name: 'card-pad', value: `${formatPx(spacingRamp[3])}px`, category: 'spacing' });
  vars.push({ name: 'gutter', value: `${formatPx(spacingRamp[5])}px`, category: 'spacing' });
  for (let i = 0; i < spacingRamp.length; i += 1) {
    vars.push({ name: `sp-${i + 1}`, value: `${formatPx(spacingRamp[i])}px`, category: 'spacing' });
  }

  return vars;
}

// ---------------------------------------------------------------------------
// Layout Variant Configuration
// ---------------------------------------------------------------------------

const layoutVariantConfig: Record<string, { elevation: string; borderStyle: string }> = {
  modern: { elevation: '0 4px 6px -1px rgba(0,0,0,0.1)', borderStyle: 'none' },
  classic: { elevation: 'none', borderStyle: '2px solid hsl(var(--border))' },
  minimal: { elevation: 'none', borderStyle: 'none' },
  bold: { elevation: '0 20px 25px -5px rgba(0,0,0,0.15)', borderStyle: '4px solid hsl(var(--primary))' },
};

// ---------------------------------------------------------------------------
// Conversion Helpers
// ---------------------------------------------------------------------------

export function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function radiusToValue(r: RadiusValue): string {
  const map: Record<RadiusValue, string> = {
    none: '0',
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  };
  return map[r] ?? '0.5rem';
}

function shrinkRadius(r: RadiusValue): RadiusValue {
  const order: RadiusValue[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl', 'full'];
  const idx = order.indexOf(r);
  return idx > 0 ? order[idx - 1] : r;
}

function growRadius(r: RadiusValue): RadiusValue {
  const order: RadiusValue[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl', 'full'];
  const idx = order.indexOf(r);
  return idx < order.length - 1 ? order[idx + 1] : r;
}

function elevationToShadow(level: ElevationLevel): string {
  const map: Record<ElevationLevel, string> = {
    flat: 'none',
    subtle: '0 1px 3px rgba(0,0,0,0.08)',
    raised: '0 4px 6px -1px rgba(0,0,0,0.1)',
    floating: '0 10px 15px -3px rgba(0,0,0,0.12)',
    dramatic: '0 20px 25px -5px rgba(0,0,0,0.15)',
  };
  return map[level] ?? 'none';
}

function typeScaleToValue(scale: string): string {
  const map: Record<string, string> = {
    compact: '0.875',
    default: '1',
    large: '1.125',
  };
  return map[scale] ?? '1';
}

function easingToValue(easing: string): string {
  const map: Record<string, string> = {
    linear: 'linear',
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    organic: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
  };
  return map[easing] ?? 'cubic-bezier(0.2, 0.7, 0.2, 1)';
}

function buildFontImports(tokens: DesignTokens): string[] {
  const fonts = new Set<string>([
    tokens.typography.display.family,
    tokens.typography.body.family,
  ]);
  const urls = new Set<string>();

  for (const font of fonts) {
    if (font === 'Bricolage Grotesque') {
      urls.add('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@8..144,200..800&display=swap');
      continue;
    }
    if (font === 'Instrument Serif') {
      urls.add('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
      continue;
    }
    const encoded = font.replace(/ /g, '+');
    urls.add(`https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700&display=swap`);
  }

  return Array.from(urls);
}

function customEasingToValue(customEasing: DesignTokens['motion']['customEasing']): string | null {
  if (!customEasing) return null;
  const [x1, y1, x2, y2] = customEasing;
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

function resolveSpacingDensity(
  density: SpacingDensity | undefined,
  scale: DesignTokens['spacing']['scale'],
): SpacingDensity {
  if (density) return density;
  const fallbackByScale: Record<DesignTokens['spacing']['scale'], SpacingDensity> = {
    compact: 'snug',
    default: 'roomy',
    relaxed: 'airy',
  };
  return fallbackByScale[scale];
}

function densityToMultiplier(density: SpacingDensity): number {
  const multiplier: Record<SpacingDensity, number> = {
    snug: 0.9,
    roomy: 1,
    airy: 1.2,
  };
  return multiplier[density];
}

function buildSpacingRamp(baseUnit: number, densityMultiplier: number): number[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((step) => baseUnit * step * densityMultiplier);
}

function formatPx(value: number): string {
  return Number(value.toFixed(2)).toString();
}
