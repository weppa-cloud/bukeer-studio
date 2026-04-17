/**
 * @bukeer/theme-sdk — Design Tokens Contract v3.0
 *
 * Canonical, versioned design token schema.
 * Single source of truth for all color, typography, spacing,
 * elevation, motion, and shape tokens.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema version — bump on breaking changes
// ---------------------------------------------------------------------------
export const DESIGN_TOKENS_SCHEMA_VERSION = '3.0.0';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
const HexColor = z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/, 'Must be a valid hex color (#RRGGBB or #RRGGBBAA)');

// ---------------------------------------------------------------------------
// Color Tokens
// ---------------------------------------------------------------------------

/** Full M3 color scheme — 29 semantic color roles */
export const ColorSchemeSchema = z.object({
  primary: HexColor,
  onPrimary: HexColor,
  primaryContainer: HexColor,
  onPrimaryContainer: HexColor,
  secondary: HexColor,
  onSecondary: HexColor,
  secondaryContainer: HexColor,
  onSecondaryContainer: HexColor,
  tertiary: HexColor,
  onTertiary: HexColor,
  tertiaryContainer: HexColor,
  onTertiaryContainer: HexColor,
  error: HexColor,
  onError: HexColor,
  errorContainer: HexColor,
  onErrorContainer: HexColor,
  surface: HexColor,
  onSurface: HexColor,
  surfaceContainerLowest: HexColor,
  surfaceContainerLow: HexColor,
  surfaceContainer: HexColor,
  surfaceContainerHigh: HexColor,
  surfaceContainerHighest: HexColor,
  onSurfaceVariant: HexColor,
  outline: HexColor,
  outlineVariant: HexColor,
  shadow: HexColor,
  scrim: HexColor,
  inverseSurface: HexColor,
  onInverseSurface: HexColor,
  inversePrimary: HexColor,
  surfaceTint: HexColor,
  background: HexColor,
});

/**
 * Chart / data-viz palette — used for markers, chips, and categorical viz.
 * Shared across light/dark modes. If omitted, globals.css provides OKLCH fallbacks.
 * Map markers use c2 (hotel), c3 (service), c5 (activity) by convention.
 */
export const ChartColorsSchema = z.object({
  c1: HexColor.optional(),
  c2: HexColor.optional(),
  c3: HexColor.optional(),
  c4: HexColor.optional(),
  c5: HexColor.optional(),
});

export const ColorTokensSchema = z.object({
  /** Seed color used to generate the palette */
  seedColor: HexColor,
  /** Light mode color scheme */
  light: ColorSchemeSchema,
  /** Dark mode color scheme */
  dark: ColorSchemeSchema,
  /** Optional chart / data-viz palette (shared across modes) */
  chart: ChartColorsSchema.optional(),
});

// ---------------------------------------------------------------------------
// Typography Tokens
// ---------------------------------------------------------------------------

export const FontWeightEnum = z.enum([
  '100', '200', '300', '400', '500', '600', '700', '800', '900',
]);

export const TypeScaleEnum = z.enum(['compact', 'default', 'large']);

export const TypefaceSchema = z.object({
  /** Font family name (must be in allowlist) */
  family: z.string().min(1),
  /** Fallback stack */
  fallback: z.string().default('sans-serif'),
  /** Default weight */
  weight: FontWeightEnum.default('400'),
});

export const TypographyTokensSchema = z.object({
  /** Display / heading typeface */
  display: TypefaceSchema,
  /** Body / paragraph typeface */
  body: TypefaceSchema,
  /** Type scale multiplier */
  scale: TypeScaleEnum.default('default'),
  /** Line height multiplier for body text (1.0 – 2.0) */
  bodyLineHeight: z.number().min(1.0).max(2.0).default(1.5),
  /** Letter spacing adjustment in em (-0.05 – 0.2) */
  letterSpacing: z.number().min(-0.05).max(0.2).default(0),
});

// ---------------------------------------------------------------------------
// Shape / Radius Tokens
// ---------------------------------------------------------------------------

export const RadiusEnum = z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl', 'full']);

export const ShapeTokensSchema = z.object({
  /** Global border radius */
  radius: RadiusEnum.default('md'),
  /** Button-specific radius override (null = use global) */
  buttonRadius: RadiusEnum.optional(),
  /** Card-specific radius override (null = use global) */
  cardRadius: RadiusEnum.optional(),
  /** Input-specific radius override (null = use global) */
  inputRadius: RadiusEnum.optional(),
});

// ---------------------------------------------------------------------------
// Elevation / Shadow Tokens
// ---------------------------------------------------------------------------

export const ElevationLevelEnum = z.enum(['flat', 'subtle', 'raised', 'floating', 'dramatic']);

export const ElevationTokensSchema = z.object({
  /** Default card elevation */
  cardElevation: ElevationLevelEnum.default('subtle'),
  /** Navigation bar elevation */
  navElevation: ElevationLevelEnum.default('raised'),
  /** Hero section elevation */
  heroElevation: ElevationLevelEnum.default('flat'),
});

// ---------------------------------------------------------------------------
// Motion / Animation Tokens
// ---------------------------------------------------------------------------

export const MotionPresetEnum = z.enum(['none', 'subtle', 'moderate', 'expressive']);

export const MotionTokensSchema = z.object({
  /** Global motion preset */
  preset: MotionPresetEnum.default('subtle'),
  /** Transition duration in ms (100 – 1000) */
  durationMs: z.number().int().min(100).max(1000).default(200),
  /** Easing function name */
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring']).default('ease-out'),
  /** Whether to respect prefers-reduced-motion */
  reducedMotion: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Spacing Tokens
// ---------------------------------------------------------------------------

export const SpacingScaleEnum = z.enum(['compact', 'default', 'relaxed']);

export const SpacingTokensSchema = z.object({
  /** Base spacing unit in px (4 – 12) */
  baseUnit: z.number().int().min(4).max(12).default(4),
  /** Global scale */
  scale: SpacingScaleEnum.default('default'),
  /** Section vertical padding multiplier (1x – 4x of base * 8) */
  sectionPaddingMultiplier: z.number().min(1).max(4).default(2),
});

// ---------------------------------------------------------------------------
// Design Tokens (root)
// ---------------------------------------------------------------------------

export const DesignTokensSchema = z.object({
  /** Schema version for forward compatibility */
  $schema: z.literal(DESIGN_TOKENS_SCHEMA_VERSION),
  colors: ColorTokensSchema,
  typography: TypographyTokensSchema,
  shape: ShapeTokensSchema,
  elevation: ElevationTokensSchema,
  motion: MotionTokensSchema,
  spacing: SpacingTokensSchema,
});

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

export type ColorScheme = z.infer<typeof ColorSchemeSchema>;
export type ChartColors = z.infer<typeof ChartColorsSchema>;
export type ColorTokens = z.infer<typeof ColorTokensSchema>;
export type Typeface = z.infer<typeof TypefaceSchema>;
export type TypographyTokens = z.infer<typeof TypographyTokensSchema>;
export type ShapeTokens = z.infer<typeof ShapeTokensSchema>;
export type ElevationTokens = z.infer<typeof ElevationTokensSchema>;
export type MotionTokens = z.infer<typeof MotionTokensSchema>;
export type SpacingTokens = z.infer<typeof SpacingTokensSchema>;
export type DesignTokens = z.infer<typeof DesignTokensSchema>;

export type RadiusValue = z.infer<typeof RadiusEnum>;
export type ElevationLevel = z.infer<typeof ElevationLevelEnum>;
export type MotionPreset = z.infer<typeof MotionPresetEnum>;
export type TypeScale = z.infer<typeof TypeScaleEnum>;
export type SpacingScale = z.infer<typeof SpacingScaleEnum>;
export type FontWeight = z.infer<typeof FontWeightEnum>;

export { HexColor };
