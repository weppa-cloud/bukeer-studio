import {
  CORPORATE_PRESET,
  DESIGN_TOKENS_SCHEMA_VERSION,
  THEME_PROFILE_SCHEMA_VERSION,
} from '@bukeer/theme-sdk';
import type {
  BrandMood,
  DesignTokens,
  RadiusValue,
  ThemeProfile,
  Typeface,
  TypeScale,
} from '@bukeer/theme-sdk';

type UnknownRecord = Record<string, unknown>;
export interface NormalizedThemeInput {
  tokens: DesignTokens;
  profile: ThemeProfile;
}

interface NormalizeThemeOptions {
  brandName?: string | null;
}

interface DraftThemeOptions {
  brandName: string;
  brandMood: BrandMood;
  seedColor: string;
}

const DEFAULT_TOKENS = CORPORATE_PRESET.tokens;
const DEFAULT_PROFILE = CORPORATE_PRESET.profile;

export function normalizeThemeInput(
  theme: { tokens?: Record<string, unknown> | null; profile?: Record<string, unknown> | null } | null | undefined,
  options: NormalizeThemeOptions = {},
): NormalizedThemeInput | undefined {
  if (!theme?.tokens && !theme?.profile) return undefined;

  const tokensSource = toRecord(theme.tokens);
  const profileSource = toRecord(theme.profile);
  const legacyTypography = toRecord(profileSource.typography);
  const rawBrand = toRecord(profileSource.brand);
  const rawShape = toRecord(tokensSource.shape);
  const rawTypography = toRecord(tokensSource.typography);

  const normalizedTokens = deepMerge(DEFAULT_TOKENS, tokensSource) as DesignTokens;
  const normalizedProfile = deepMerge(DEFAULT_PROFILE, profileSource) as ThemeProfile;

  normalizedTokens.$schema = DESIGN_TOKENS_SCHEMA_VERSION;
  normalizedProfile.$schema = THEME_PROFILE_SCHEMA_VERSION;

  const legacyBrandMood = asBrandMood(profileSource.brandMood);
  if ((!rawBrand.mood || typeof rawBrand.mood !== 'string') && legacyBrandMood) {
    normalizedProfile.brand.mood = legacyBrandMood;
  }

  if ((!rawBrand.name || typeof rawBrand.name !== 'string') && options.brandName?.trim()) {
    normalizedProfile.brand.name = options.brandName.trim();
  }

  if ((!rawTypography.display || !toRecord(rawTypography.display).family) && typeof legacyTypography.headingFont === 'string') {
    normalizedTokens.typography.display.family = legacyTypography.headingFont;
  }

  if ((!rawTypography.body || !toRecord(rawTypography.body).family) && typeof legacyTypography.bodyFont === 'string') {
    normalizedTokens.typography.body.family = legacyTypography.bodyFont;
  }

  if (!rawTypography.scale && typeof legacyTypography.scale === 'string') {
    normalizedTokens.typography.scale = legacyTypography.scale as TypeScale;
  }

  if (!rawShape.radius && typeof profileSource.radius === 'number') {
    normalizedTokens.shape.radius = pxToRadius(profileSource.radius);
  }

  return {
    tokens: normalizeTokenFallbacks(normalizedTokens),
    profile: normalizeProfileFallbacks(normalizedProfile, options.brandName),
  };
}

export function createDraftTheme(options: DraftThemeOptions): NormalizedThemeInput {
  return normalizeThemeInput(
    {
      tokens: {
        colors: {
          seedColor: options.seedColor,
        },
      },
      profile: {
        brand: {
          mood: options.brandMood,
          name: options.brandName,
        },
      },
    },
    { brandName: options.brandName },
  )!;
}

function normalizeTokenFallbacks(tokens: DesignTokens): DesignTokens {
  const next = structuredClone(tokens);
  next.typography.editorialSerif = normalizeTypeface(
    next.typography.editorialSerif,
    { family: 'Instrument Serif', fallback: 'serif', weight: '400' },
  );
  next.typography.display = normalizeTypeface(next.typography.display, DEFAULT_TOKENS.typography.display);
  next.typography.body = normalizeTypeface(next.typography.body, DEFAULT_TOKENS.typography.body);
  return next;
}

function normalizeProfileFallbacks(profile: ThemeProfile, brandName?: string | null): ThemeProfile {
  const next = structuredClone(profile);
  next.brand.name = next.brand.name?.trim() || brandName?.trim() || DEFAULT_PROFILE.brand.name;
  return next;
}

function normalizeTypeface(typeface: Typeface | undefined, fallback: Typeface): Typeface {
  return {
    family: typeface?.family?.trim() || fallback.family,
    fallback: typeface?.fallback?.trim() || fallback.fallback,
    weight: typeface?.weight || fallback.weight,
  };
}

function deepMerge<T>(fallback: T, source: unknown): T {
  if (source === undefined || source === null) return structuredClone(fallback);
  if (Array.isArray(fallback)) return (Array.isArray(source) ? structuredClone(source) : structuredClone(fallback)) as T;
  if (!isRecord(fallback)) return source as T;
  if (!isRecord(source)) return structuredClone(fallback);

  const result: UnknownRecord = structuredClone(fallback as UnknownRecord);
  for (const [key, value] of Object.entries(source)) {
    if (key in result) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = structuredClone(value);
    }
  }
  return result as T;
}

function toRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asBrandMood(value: unknown): BrandMood | null {
  if (
    value === 'adventurous' ||
    value === 'luxurious' ||
    value === 'tropical' ||
    value === 'corporate' ||
    value === 'boutique' ||
    value === 'cultural' ||
    value === 'eco' ||
    value === 'romantic'
  ) {
    return value;
  }
  return null;
}

function pxToRadius(px: number): RadiusValue {
  if (px <= 0) return 'none';
  if (px <= 4) return 'sm';
  if (px <= 8) return 'md';
  if (px <= 12) return 'lg';
  if (px <= 18) return 'xl';
  return 'full';
}
