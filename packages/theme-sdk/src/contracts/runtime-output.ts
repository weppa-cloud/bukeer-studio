/**
 * @bukeer/theme-sdk — Runtime Output Contracts v3.0
 *
 * Defines the shape of compiled theme output for each target:
 * - Web: CSS custom properties (variables)
 * - Flutter: Material ThemeData-compatible mapping
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export const RUNTIME_OUTPUT_SCHEMA_VERSION = '3.0.0';

/** Compile metadata attached to every output */
export const CompileMetadataSchema = z.object({
  /** SDK version that produced this output */
  sdkVersion: z.string(),
  /** Schema version of the source tokens */
  tokensVersion: z.string(),
  /** Schema version of the source profile */
  profileVersion: z.string(),
  /** ISO 8601 timestamp of compilation */
  compiledAt: z.string().datetime(),
  /** Deterministic hash of inputs (tokens + profile) */
  inputHash: z.string(),
  /** Deterministic hash of output */
  outputHash: z.string(),
});

// ---------------------------------------------------------------------------
// Web Runtime Output — CSS Custom Properties
// ---------------------------------------------------------------------------

/** A single CSS variable entry */
export const CssVariableSchema = z.object({
  /** Variable name without -- prefix */
  name: z.string(),
  /** HSL value for colors, rem/px for dimensions, string for fonts */
  value: z.string(),
  /** Token category for documentation */
  category: z.enum(['color', 'typography', 'spacing', 'shape', 'elevation', 'motion', 'layout']),
});

export const WebRuntimeOutputSchema = z.object({
  $schema: z.literal(RUNTIME_OUTPUT_SCHEMA_VERSION),
  target: z.literal('web'),
  metadata: CompileMetadataSchema,
  /** Light mode CSS variables */
  light: z.array(CssVariableSchema),
  /** Dark mode CSS variables */
  dark: z.array(CssVariableSchema),
  /** Mode-independent CSS variables (typography, spacing, shape, motion) */
  invariant: z.array(CssVariableSchema),
  /** Data attributes to set on root element */
  dataAttributes: z.record(z.string(), z.string()),
  /** Google Fonts import URLs */
  fontImports: z.array(z.string().url()),
});

// ---------------------------------------------------------------------------
// Flutter Runtime Output — ThemeData Mapping
// ---------------------------------------------------------------------------

/** Flutter color value (hex string for now, could be int in future) */
const FlutterColor = z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/);

export const FlutterColorSchemeSchema = z.object({
  primary: FlutterColor,
  onPrimary: FlutterColor,
  primaryContainer: FlutterColor,
  onPrimaryContainer: FlutterColor,
  secondary: FlutterColor,
  onSecondary: FlutterColor,
  secondaryContainer: FlutterColor,
  onSecondaryContainer: FlutterColor,
  tertiary: FlutterColor,
  onTertiary: FlutterColor,
  tertiaryContainer: FlutterColor,
  onTertiaryContainer: FlutterColor,
  error: FlutterColor,
  onError: FlutterColor,
  errorContainer: FlutterColor,
  onErrorContainer: FlutterColor,
  surface: FlutterColor,
  onSurface: FlutterColor,
  onSurfaceVariant: FlutterColor,
  outline: FlutterColor,
  outlineVariant: FlutterColor,
  shadow: FlutterColor,
  scrim: FlutterColor,
  inverseSurface: FlutterColor,
  onInverseSurface: FlutterColor,
  inversePrimary: FlutterColor,
  surfaceTint: FlutterColor,
  background: FlutterColor,
});

export const FlutterTextThemeSchema = z.object({
  displayFontFamily: z.string(),
  bodyFontFamily: z.string(),
  displayFontWeight: z.string(),
  bodyFontWeight: z.string(),
});

export const FlutterShapeSchema = z.object({
  /** Border radius in logical pixels */
  borderRadius: z.number(),
  buttonBorderRadius: z.number(),
  cardBorderRadius: z.number(),
  inputBorderRadius: z.number(),
});

export const FlutterRuntimeOutputSchema = z.object({
  $schema: z.literal(RUNTIME_OUTPUT_SCHEMA_VERSION),
  target: z.literal('flutter'),
  metadata: CompileMetadataSchema,
  /** Light ColorScheme values */
  lightColorScheme: FlutterColorSchemeSchema,
  /** Dark ColorScheme values */
  darkColorScheme: FlutterColorSchemeSchema,
  /** Text theme configuration */
  textTheme: FlutterTextThemeSchema,
  /** Shape / border radius configuration */
  shape: FlutterShapeSchema,
  /** Seed color for dynamic theming */
  seedColor: FlutterColor,
  /** Whether to use Material 3 */
  useMaterial3: z.literal(true),
});

// ---------------------------------------------------------------------------
// Union: any runtime output
// ---------------------------------------------------------------------------

export const RuntimeOutputSchema = z.discriminatedUnion('target', [
  WebRuntimeOutputSchema,
  FlutterRuntimeOutputSchema,
]);

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

export type CompileMetadata = z.infer<typeof CompileMetadataSchema>;
export type CssVariable = z.infer<typeof CssVariableSchema>;
export type WebRuntimeOutput = z.infer<typeof WebRuntimeOutputSchema>;
export type FlutterColorSchemeOutput = z.infer<typeof FlutterColorSchemeSchema>;
export type FlutterTextThemeOutput = z.infer<typeof FlutterTextThemeSchema>;
export type FlutterShapeOutput = z.infer<typeof FlutterShapeSchema>;
export type FlutterRuntimeOutput = z.infer<typeof FlutterRuntimeOutputSchema>;
export type RuntimeOutput = z.infer<typeof RuntimeOutputSchema>;
