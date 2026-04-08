/**
 * Flutter ThemeData Generator — compiles DesignTokens into Material ThemeData mapping.
 */

import type { DesignTokens, ColorScheme, RadiusValue } from '../contracts/design-tokens';
import type { FlutterRuntimeOutput } from '../contracts/runtime-output';
import { RUNTIME_OUTPUT_SCHEMA_VERSION } from '../contracts/runtime-output';
import { SDK_VERSION } from '../version';
import { computeHash } from './snapshot';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateFlutterOutput(
  tokens: DesignTokens,
  inputHash: string,
): FlutterRuntimeOutput {
  const output: FlutterRuntimeOutput = {
    $schema: RUNTIME_OUTPUT_SCHEMA_VERSION,
    target: 'flutter',
    metadata: {
      sdkVersion: SDK_VERSION,
      tokensVersion: tokens.$schema,
      profileVersion: tokens.$schema, // Flutter output doesn't need profile version
      compiledAt: new Date().toISOString(),
      inputHash,
      outputHash: '', // computed below
    },
    lightColorScheme: mapColorScheme(tokens.colors.light),
    darkColorScheme: mapColorScheme(tokens.colors.dark),
    textTheme: {
      displayFontFamily: tokens.typography.display.family,
      bodyFontFamily: tokens.typography.body.family,
      displayFontWeight: tokens.typography.display.weight,
      bodyFontWeight: tokens.typography.body.weight,
    },
    shape: {
      borderRadius: radiusToPixels(tokens.shape.radius),
      buttonBorderRadius: radiusToPixels(tokens.shape.buttonRadius ?? tokens.shape.radius),
      cardBorderRadius: radiusToPixels(tokens.shape.cardRadius ?? tokens.shape.radius),
      inputBorderRadius: radiusToPixels(tokens.shape.inputRadius ?? tokens.shape.radius),
    },
    seedColor: tokens.colors.seedColor,
    useMaterial3: true,
  };

  output.metadata.outputHash = computeHash(JSON.stringify(output));

  return output;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapColorScheme(scheme: ColorScheme) {
  return {
    primary: scheme.primary,
    onPrimary: scheme.onPrimary,
    primaryContainer: scheme.primaryContainer,
    onPrimaryContainer: scheme.onPrimaryContainer,
    secondary: scheme.secondary,
    onSecondary: scheme.onSecondary,
    secondaryContainer: scheme.secondaryContainer,
    onSecondaryContainer: scheme.onSecondaryContainer,
    tertiary: scheme.tertiary,
    onTertiary: scheme.onTertiary,
    tertiaryContainer: scheme.tertiaryContainer,
    onTertiaryContainer: scheme.onTertiaryContainer,
    error: scheme.error,
    onError: scheme.onError,
    errorContainer: scheme.errorContainer,
    onErrorContainer: scheme.onErrorContainer,
    surface: scheme.surface,
    onSurface: scheme.onSurface,
    onSurfaceVariant: scheme.onSurfaceVariant,
    outline: scheme.outline,
    outlineVariant: scheme.outlineVariant,
    shadow: scheme.shadow,
    scrim: scheme.scrim,
    inverseSurface: scheme.inverseSurface,
    onInverseSurface: scheme.onInverseSurface,
    inversePrimary: scheme.inversePrimary,
    surfaceTint: scheme.surfaceTint,
    background: scheme.background,
  };
}

function radiusToPixels(r: RadiusValue): number {
  const map: Record<RadiusValue, number> = {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 999,
  };
  return map[r] ?? 8;
}
