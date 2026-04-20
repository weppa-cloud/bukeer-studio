/**
 * @bukeer/theme-sdk v3.1.0
 *
 * Theme Platform v3 — canonical design tokens, theme profiles, and compiler
 * for Bukeer websites. Single source of truth for all theme types and validation.
 *
 * @example
 * ```ts
 * import { parseTheme, validateTheme, compileTheme, previewTheme } from '@bukeer/theme-sdk';
 *
 * const parsed = parseTheme(rawInput);
 * if (!parsed.success) throw new Error(parsed.errors.map(e => e.message).join(', '));
 *
 * const validation = validateTheme(parsed.tokens, parsed.profile);
 * if (!validation.valid) throw new Error('Theme validation failed');
 *
 * const compiled = compileTheme(parsed.tokens, parsed.profile, { target: 'web' });
 * const preview = previewTheme(parsed.tokens, parsed.profile);
 * ```
 */

export { SDK_VERSION } from './version';

// ---------------------------------------------------------------------------
// Contracts — Types & Schemas
// ---------------------------------------------------------------------------

// Design Tokens
export {
  DESIGN_TOKENS_SCHEMA_VERSION,
  DesignTokensSchema,
  ColorSchemeSchema,
  ColorTokensSchema,
  TypographyTokensSchema,
  TypefaceSchema,
  ShapeTokensSchema,
  ElevationTokensSchema,
  MotionTokensSchema,
  SpacingTokensSchema,
  RadiusEnum,
  ElevationLevelEnum,
  MotionPresetEnum,
  TypeScaleEnum,
  SpacingScaleEnum,
  SpacingDensityEnum,
  FontWeightEnum,
} from './contracts/design-tokens';

export type {
  DesignTokens,
  ColorScheme,
  ColorTokens,
  Typeface,
  TypographyTokens,
  ShapeTokens,
  ElevationTokens,
  MotionTokens,
  SpacingTokens,
  RadiusValue,
  ElevationLevel,
  MotionPreset,
  TypeScale,
  SpacingScale,
  SpacingDensity,
  FontWeight,
} from './contracts/design-tokens';

// Theme Profile
export {
  THEME_PROFILE_SCHEMA_VERSION,
  ThemeProfileSchema,
  BrandIdentitySchema,
  BrandMoodEnum,
  LayoutIntentSchema,
  LayoutVariantEnum,
  HeroStyleEnum,
  NavStyleEnum,
  FooterStyleEnum,
  SectionStyleIntentEnum,
  SectionStyleOverridesSchema,
  ColorModeEnum,
} from './contracts/theme-profile';

export type {
  ThemeProfile,
  BrandMood,
  BrandIdentity,
  LayoutVariant,
  HeroStyle,
  NavStyle,
  FooterStyle,
  LayoutIntent,
  SectionStyleIntent,
  ColorMode,
} from './contracts/theme-profile';

// Runtime Output
export {
  RUNTIME_OUTPUT_SCHEMA_VERSION,
  WebRuntimeOutputSchema,
  FlutterRuntimeOutputSchema,
  RuntimeOutputSchema,
  CompileMetadataSchema,
  CssVariableSchema,
  FlutterColorSchemeSchema,
  FlutterTextThemeSchema,
  FlutterShapeSchema,
} from './contracts/runtime-output';

export type {
  WebRuntimeOutput,
  FlutterRuntimeOutput,
  RuntimeOutput,
  CompileMetadata,
  CssVariable,
  FlutterColorSchemeOutput,
  FlutterTextThemeOutput,
  FlutterShapeOutput,
} from './contracts/runtime-output';

// Preset
export {
  ThemePresetSchema,
  PresetMetadataSchema,
  PresetQualityChecklistSchema,
  PresetVersionSchema,
  PresetCategoryEnum,
} from './contracts/preset';

export type {
  ThemePreset,
  PresetMetadata,
  PresetQualityChecklist,
  PresetVersion,
  PresetCategory,
} from './contracts/preset';

// ---------------------------------------------------------------------------
// SDK — Core Functions
// ---------------------------------------------------------------------------

export { parseTheme } from './sdk/parse';
export type { ParseResult, ParseError, ParseOutput } from './sdk/parse';

export { validateTheme } from './sdk/validate';
export type { ValidationResult, ValidationIssue, ValidationSeverity } from './sdk/validate';

export { compileTheme } from './sdk/compile';
export type { CompileResult, CompileOptions, CompileTarget } from './sdk/compile';

export { previewTheme } from './sdk/preview';
export type { ThemePreview, ThemePreviewColors } from './sdk/preview';

// ---------------------------------------------------------------------------
// Compiler — Generators
// ---------------------------------------------------------------------------

export { generateCssOutput, hexToHsl } from './compiler/css-generator';
export { generateFlutterOutput } from './compiler/flutter-generator';
export { computeHash, canonicalize } from './compiler/snapshot';

// ---------------------------------------------------------------------------
// Guardrails
// ---------------------------------------------------------------------------

export { checkContrast, getContrastRatio, getRelativeLuminance } from './guardrails/accessibility';
export type { ContrastViolation } from './guardrails/accessibility';

export { validateFonts, FONT_ALLOWLIST, VALID_FALLBACKS } from './guardrails/font-policy';
export type { FontViolation } from './guardrails/font-policy';

export { lintTheme } from './guardrails/lint';
export type { LintViolation } from './guardrails/lint';

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export {
  TOURISM_PRESETS,
  getPresetBySlug,
  getPresetsByCategory,
  ADVENTURE_PRESET,
  LUXURY_PRESET,
  TROPICAL_PRESET,
  CORPORATE_PRESET,
  BOUTIQUE_PRESET,
  CULTURAL_PRESET,
  ECO_PRESET,
  ROMANTIC_PRESET,
} from './presets/tourism-presets';

export {
  COLOMBIA_CARIBE_PRESET,
  COLOMBIA_PRESETS,
  getColombiaPresetBySlug,
  ALL_SYSTEM_PRESETS,
} from './presets/colombia-presets';
