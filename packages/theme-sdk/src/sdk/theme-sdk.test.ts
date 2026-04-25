/**
 * @bukeer/theme-sdk — Comprehensive test suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseTheme,
  validateTheme,
  compileTheme,
  previewTheme,
  checkContrast,
  getContrastRatio,
  getRelativeLuminance,
  validateFonts,
  lintTheme,
  TOURISM_PRESETS,
  COLOMBIA_CARIBE_PRESET,
  ALL_SYSTEM_PRESETS,
  getPresetBySlug,
  getPresetsByCategory,
  hexToHsl,
  computeHash,
  canonicalize,
  FONT_ALLOWLIST,
  DESIGN_TOKENS_SCHEMA_VERSION,
  THEME_PROFILE_SCHEMA_VERSION,
  DesignTokensSchema,
  ThemeProfileSchema,
} from '../index';

import type { DesignTokens, ThemeProfile } from '../index';

// ---------------------------------------------------------------------------
// Test fixture: valid minimal theme
// ---------------------------------------------------------------------------

function makeValidTokens(): DesignTokens {
  return JSON.parse(JSON.stringify(TOURISM_PRESETS[0].tokens));
}

function makeValidProfile(): ThemeProfile {
  return JSON.parse(JSON.stringify(TOURISM_PRESETS[0].profile));
}

function stripCompiledAt<T>(value: T): T {
  const copy = JSON.parse(JSON.stringify(value)) as T;
  if (typeof copy === 'object' && copy !== null && 'web' in copy) {
    const withWeb = copy as { web?: { metadata?: Record<string, unknown> } };
    if (withWeb.web?.metadata) {
      delete withWeb.web.metadata.compiledAt;
    }
  }
  return copy;
}

// ---------------------------------------------------------------------------
// parseTheme
// ---------------------------------------------------------------------------

describe('parseTheme', () => {
  it('parses valid tokens + profile', () => {
    const result = parseTheme({
      tokens: makeValidTokens(),
      profile: makeValidProfile(),
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.ok(result.tokens);
      assert.ok(result.profile);
    }
  });

  it('rejects null input', () => {
    const result = parseTheme(null);
    assert.equal(result.success, false);
  });

  it('rejects missing tokens', () => {
    const result = parseTheme({ profile: makeValidProfile() });
    assert.equal(result.success, false);
  });

  it('rejects invalid color format', () => {
    const tokens = makeValidTokens();
    tokens.colors.seedColor = 'not-a-color';
    const result = parseTheme({ tokens, profile: makeValidProfile() });
    assert.equal(result.success, false);
  });

  it('auto-injects $schema version if missing', () => {
    const tokens = { ...makeValidTokens() };
    delete (tokens as Record<string, unknown>)['$schema'];
    const profile = { ...makeValidProfile() };
    delete (profile as Record<string, unknown>)['$schema'];

    const result = parseTheme({ tokens, profile });
    assert.equal(result.success, true);
  });
});

// ---------------------------------------------------------------------------
// validateTheme
// ---------------------------------------------------------------------------

describe('validateTheme', () => {
  it('validates a good theme without errors', () => {
    const result = validateTheme(makeValidTokens(), makeValidProfile());
    assert.equal(result.summary.errors, 0);
  });

  it('returns valid=true for presets', () => {
    for (const preset of TOURISM_PRESETS) {
      const result = validateTheme(preset.tokens, preset.profile);
      assert.equal(result.valid, true, `Preset "${preset.metadata.slug}" should be valid`);
    }
  });
});

// ---------------------------------------------------------------------------
// compileTheme
// ---------------------------------------------------------------------------

describe('compileTheme', () => {
  it('compiles for web target', () => {
    const result = compileTheme(makeValidTokens(), makeValidProfile(), { target: 'web' });
    assert.ok(result.web);
    assert.equal(result.flutter, undefined);
    assert.ok(result.web.light.length > 0);
    assert.ok(result.web.dark.length > 0);
    assert.ok(result.web.invariant.length > 0);
  });

  it('compiles for flutter target', () => {
    const result = compileTheme(makeValidTokens(), makeValidProfile(), { target: 'flutter' });
    assert.ok(result.flutter);
    assert.equal(result.web, undefined);
    assert.equal(result.flutter.useMaterial3, true);
    assert.ok(result.flutter.seedColor);
  });

  it('compiles for all targets by default', () => {
    const result = compileTheme(makeValidTokens(), makeValidProfile());
    assert.ok(result.web);
    assert.ok(result.flutter);
  });

  it('produces deterministic input hash', () => {
    const tokens = makeValidTokens();
    const profile = makeValidProfile();
    const r1 = compileTheme(tokens, profile);
    const r2 = compileTheme(tokens, profile);
    assert.equal(r1.inputHash, r2.inputHash);
  });

  it('generates font imports', () => {
    const result = compileTheme(makeValidTokens(), makeValidProfile(), { target: 'web' });
    assert.ok(result.web!.fontImports.length > 0);
    assert.ok(result.web!.fontImports[0].includes('fonts.googleapis.com'));
  });

  it('emits a font-serif invariant variable', () => {
    const result = compileTheme(makeValidTokens(), makeValidProfile(), { target: 'web' });
    const invariantVars = new Map(result.web!.invariant.map((entry) => [entry.name, entry.value]));
    assert.equal(invariantVars.has('font-serif'), true);
    assert.match(invariantVars.get('font-serif')!, /Instrument Serif|serif/);
  });

  it('generates data attributes', () => {
    const result = compileTheme(makeValidTokens(), makeValidProfile(), { target: 'web' });
    assert.ok(result.web!.dataAttributes['layout-variant']);
    assert.ok(result.web!.dataAttributes['hero-style']);
  });

  it('hydrates seed-only payloads instead of crashing', () => {
    const seedOnlyTokens = {
      $schema: DESIGN_TOKENS_SCHEMA_VERSION,
      colors: { seedColor: '#006B60' },
    } as unknown as DesignTokens;

    const partialProfile = {
      $schema: THEME_PROFILE_SCHEMA_VERSION,
      brand: { mood: 'corporate', name: 'Fallback Brand' },
    } as unknown as ThemeProfile;

    const result = compileTheme(seedOnlyTokens, partialProfile, { target: 'web' });
    assert.ok(result.web);
    assert.ok(result.web!.light.length > 0);
    assert.ok(result.web!.dark.length > 0);
    assert.ok(result.web!.invariant.length > 0);
  });

  it('produces deterministic web snapshots when compiledAt is excluded', () => {
    const r1 = compileTheme(makeValidTokens(), makeValidProfile(), { target: 'web' });
    const r2 = compileTheme(makeValidTokens(), makeValidProfile(), { target: 'web' });
    assert.deepEqual(stripCompiledAt(r1), stripCompiledAt(r2));
  });

  it('parses and compiles colombia-tours-caribe preset', () => {
    const parsed = parseTheme({
      tokens: COLOMBIA_CARIBE_PRESET.tokens,
      profile: COLOMBIA_CARIBE_PRESET.profile,
    });
    assert.equal(parsed.success, true);
    assert.equal(COLOMBIA_CARIBE_PRESET.metadata.slug, 'colombia-tours-caribe');
    assert.equal(COLOMBIA_CARIBE_PRESET.profile.brand.name, 'ColombiaTours');
    assert.equal(COLOMBIA_CARIBE_PRESET.profile.brand.mood, 'tropical');
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.typography.display.family, 'Bricolage Grotesque');
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.typography.display.weight, '500');
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.typography.body.family, 'Inter');
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.colors.seedColor, '#0E5B5B');
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.colors.accents!.accent2, '#F3B13B');
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.colors.accents!.accent3, '#6EA842');
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.colors.light.tertiary, '#E85C3C');
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.motion.durationMs, 250);
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.motion.easing, 'organic');
    assert.deepEqual(COLOMBIA_CARIBE_PRESET.tokens.motion.customEasing, [0.2, 0.7, 0.2, 1]);
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.spacing.density, 'roomy');
    assert.equal(COLOMBIA_CARIBE_PRESET.tokens.spacing.containerMaxPx, 1240);

    const compiled = compileTheme(COLOMBIA_CARIBE_PRESET.tokens, COLOMBIA_CARIBE_PRESET.profile, { target: 'web' });
    assert.ok(compiled.web);
    const varNames = new Set(compiled.web!.invariant.map((v) => v.name));
    assert.ok(varNames.has('container'));
    assert.ok(varNames.has('ease'));
    const lightNames = new Set(compiled.web!.light.map((v) => v.name));
    assert.ok(lightNames.has('accent-2'));
    assert.ok(lightNames.has('accent-3'));
    assert.ok(compiled.web!.fontImports.some((url) => url.includes('Bricolage+Grotesque:opsz,wght@8..144,200..800')));
    // Body font is Inter per designer reference default palette
    assert.ok(compiled.web!.fontImports.some((url) => url.includes('family=Inter')));
  });
});

// ---------------------------------------------------------------------------
// previewTheme
// ---------------------------------------------------------------------------

describe('previewTheme', () => {
  it('returns preview with colors and typography', () => {
    const preview = previewTheme(makeValidTokens(), makeValidProfile());
    assert.ok(preview.name);
    assert.ok(preview.mood);
    assert.ok(preview.colors.light.primary);
    assert.ok(preview.colors.dark.primary);
    assert.ok(preview.typography.headingFont);
    assert.ok(preview.typography.editorialSerif);
    assert.ok(preview.previewCss);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('accessibility', () => {
  it('calculates contrast ratio correctly', () => {
    // White on black = 21:1
    const ratio = getContrastRatio('#FFFFFF', '#000000');
    assert.ok(ratio >= 20.9 && ratio <= 21.1);
  });

  it('calculates relative luminance correctly', () => {
    assert.ok(getRelativeLuminance('#FFFFFF') > 0.99);
    assert.ok(getRelativeLuminance('#000000') < 0.01);
  });

  it('detects low contrast pairs', () => {
    const tokens = makeValidTokens();
    // Force a bad contrast pair
    tokens.colors.light.onPrimary = tokens.colors.light.primary;
    const violations = checkContrast(tokens);
    assert.ok(violations.length > 0);
    assert.ok(violations.some(v => v.mode === 'light'));
  });

  it('ensures WCAG AA for critical color pairs including optional accents', () => {
    const tokens = COLOMBIA_CARIBE_PRESET.tokens;

    const primaryOnPrimary = getContrastRatio(tokens.colors.light.primary, tokens.colors.light.onPrimary);
    const surfaceOnSurface = getContrastRatio(tokens.colors.light.surface, tokens.colors.light.onSurface);
    const accent2OnSurface = getContrastRatio(tokens.colors.accents!.accent2!, tokens.colors.light.onSurface);
    const accent3OnSurface = getContrastRatio(tokens.colors.accents!.accent3!, tokens.colors.light.onSurface);

    assert.ok(primaryOnPrimary >= 4.5, `primary/onPrimary should be >= 4.5, got ${primaryOnPrimary}`);
    assert.ok(surfaceOnSurface >= 4.5, `surface/onSurface should be >= 4.5, got ${surfaceOnSurface}`);
    assert.ok(accent2OnSurface >= 4.5, `accent2/onSurface should be >= 4.5, got ${accent2OnSurface}`);
    assert.ok(accent3OnSurface >= 4.5, `accent3/onSurface should be >= 4.5, got ${accent3OnSurface}`);
  });
});

// ---------------------------------------------------------------------------
// Font Policy
// ---------------------------------------------------------------------------

describe('font-policy', () => {
  it('accepts allowlisted fonts', () => {
    const violations = validateFonts(makeValidTokens());
    const errors = violations.filter(v => v.severity === 'error');
    assert.equal(errors.length, 0);
  });

  it('warns on non-allowlisted fonts', () => {
    const tokens = makeValidTokens();
    tokens.typography.display.family = 'Comic Sans MS';
    const violations = validateFonts(tokens);
    assert.ok(violations.some(v => v.code === 'not-allowlisted'));
  });

  it('errors on invalid fallback', () => {
    const tokens = makeValidTokens();
    tokens.typography.display.fallback = 'invalid-fallback';
    const violations = validateFonts(tokens);
    assert.ok(violations.some(v => v.code === 'invalid-fallback' && v.severity === 'error'));
  });

  it('has at least 20 fonts in allowlist', () => {
    assert.ok(FONT_ALLOWLIST.size >= 20);
  });
});

// ---------------------------------------------------------------------------
// Lint Rules
// ---------------------------------------------------------------------------

describe('lint', () => {
  it('warns on bold layout + flat elevation', () => {
    const tokens = makeValidTokens();
    tokens.elevation.cardElevation = 'flat';
    const profile = makeValidProfile();
    profile.layout.variant = 'bold';
    const violations = lintTheme(tokens, profile);
    assert.ok(violations.some(v => v.code === 'bold-flat-conflict'));
  });

  it('errors on identical light/dark backgrounds', () => {
    const tokens = makeValidTokens();
    tokens.colors.dark.background = tokens.colors.light.background;
    const violations = lintTheme(tokens, makeValidProfile());
    assert.ok(violations.some(v => v.code === 'identical-mode-backgrounds' && v.severity === 'error'));
  });
});

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

describe('presets', () => {
  it('has exactly 8 tourism presets', () => {
    assert.equal(TOURISM_PRESETS.length, 8);
  });

  it('all presets have unique slugs', () => {
    const slugs = TOURISM_PRESETS.map(p => p.metadata.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it('all presets have unique IDs', () => {
    const ids = TOURISM_PRESETS.map(p => p.metadata.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('all presets are system presets', () => {
    for (const p of TOURISM_PRESETS) {
      assert.equal(p.metadata.isSystem, true, `${p.metadata.slug} should be system`);
    }
  });

  it('getPresetBySlug finds existing preset', () => {
    const p = getPresetBySlug('luxury');
    assert.ok(p);
    assert.equal(p.metadata.name, 'Lujo');
  });

  it('getPresetBySlug returns undefined for unknown', () => {
    assert.equal(getPresetBySlug('nonexistent'), undefined);
  });

  it('getPresetsByCategory returns matching presets', () => {
    const results = getPresetsByCategory('tropical');
    assert.equal(results.length, 1);
    assert.equal(results[0].metadata.slug, 'tropical');
  });

  it('all presets pass schema validation', () => {
    for (const preset of TOURISM_PRESETS) {
      const tokensResult = DesignTokensSchema.safeParse(preset.tokens);
      assert.ok(tokensResult.success, `${preset.metadata.slug} tokens should validate: ${!tokensResult.success ? JSON.stringify(tokensResult.error.issues.slice(0, 3)) : 'ok'}`);

      const profileResult = ThemeProfileSchema.safeParse(preset.profile);
      assert.ok(profileResult.success, `${preset.metadata.slug} profile should validate: ${!profileResult.success ? JSON.stringify(profileResult.error.issues.slice(0, 3)) : 'ok'}`);
    }
  });

  it('all presets compile without errors', () => {
    for (const preset of TOURISM_PRESETS) {
      const compiled = compileTheme(preset.tokens, preset.profile);
      assert.ok(compiled.web, `${preset.metadata.slug} web output`);
      assert.ok(compiled.flutter, `${preset.metadata.slug} flutter output`);
    }
  });

  it('exposes all system presets (8 tourism + colombia-tours-caribe)', () => {
    assert.equal(ALL_SYSTEM_PRESETS.length, 9);
    assert.ok(
      ALL_SYSTEM_PRESETS.some(
        (preset) => preset.metadata.slug === 'colombia-tours-caribe',
      ),
    );
  });

  it('maintains backward compatibility for all tourism presets', () => {
    for (const preset of TOURISM_PRESETS) {
      assert.equal(preset.metadata.isSystem, true);
      const parsed = parseTheme({ tokens: preset.tokens, profile: preset.profile });
      assert.equal(parsed.success, true, `${preset.metadata.slug} should parse successfully`);
      const compiled = compileTheme(preset.tokens, preset.profile, { target: 'web' });
      assert.ok(compiled.web?.light.length, `${preset.metadata.slug} should compile web vars`);
    }
  });

  it('schema v3.1.0 additions do not introduce required fields in tourism presets', () => {
    // Regression guard — tourism presets predate accent-2/3 + density + custom easing.
    // All new fields must be .optional(); zero breakage for pre-existing presets.
    for (const preset of TOURISM_PRESETS) {
      assert.equal(
        preset.tokens.colors.accents,
        undefined,
        `${preset.metadata.slug} should not declare optional accents`,
      );
      assert.equal(
        preset.tokens.spacing.density,
        undefined,
        `${preset.metadata.slug} should not declare optional density`,
      );
      assert.equal(
        preset.tokens.motion.customEasing,
        undefined,
        `${preset.metadata.slug} should not declare optional customEasing`,
      );
    }
  });

  it('caribe preset WCAG AA contrast on dark scheme', () => {
    const tokens = COLOMBIA_CARIBE_PRESET.tokens;
    const dark = tokens.colors.dark;
    const primaryPair = getContrastRatio(dark.primary, dark.onPrimary);
    const surfacePair = getContrastRatio(dark.surface, dark.onSurface);
    const tertiaryPair = getContrastRatio(dark.tertiary, dark.onTertiary);
    // Accent colors paint UI elements over the surface (not text) — check
    // against `dark.surface`, the actual rendering background.
    const accent2OnSurface = getContrastRatio(tokens.colors.accents!.accent2!, dark.surface);
    const accent3OnSurface = getContrastRatio(tokens.colors.accents!.accent3!, dark.surface);
    assert.ok(primaryPair >= 4.5, `dark primary/onPrimary >= 4.5, got ${primaryPair}`);
    assert.ok(surfacePair >= 4.5, `dark surface/onSurface >= 4.5, got ${surfacePair}`);
    assert.ok(tertiaryPair >= 4.5, `dark tertiary/onTertiary >= 4.5, got ${tertiaryPair}`);
    assert.ok(accent2OnSurface >= 3, `dark accent2 over surface >= 3 (non-text), got ${accent2OnSurface}`);
    assert.ok(accent3OnSurface >= 3, `dark accent3 over surface >= 3 (non-text), got ${accent3OnSurface}`);
  });

  it('caribe preset density emits full sp-1..sp-8 + section-py + card-pad + gutter', () => {
    const compiled = compileTheme(COLOMBIA_CARIBE_PRESET.tokens, COLOMBIA_CARIBE_PRESET.profile, {
      target: 'web',
    });
    const invariants = new Set(compiled.web!.invariant.map((v) => v.name));
    for (const name of ['sp-1', 'sp-2', 'sp-3', 'sp-4', 'sp-5', 'sp-6', 'sp-7', 'sp-8']) {
      assert.ok(invariants.has(name), `expected invariant ${name} under density=roomy`);
    }
    assert.ok(invariants.has('section-py'));
    assert.ok(invariants.has('card-pad'));
    assert.ok(invariants.has('gutter'));
  });
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

describe('utilities', () => {
  it('hexToHsl converts correctly', () => {
    const white = hexToHsl('#FFFFFF');
    assert.equal(white, '0 0% 100%');

    const black = hexToHsl('#000000');
    assert.equal(black, '0 0% 0%');
  });

  it('computeHash is deterministic', () => {
    const h1 = computeHash('test input');
    const h2 = computeHash('test input');
    assert.equal(h1, h2);
  });

  it('computeHash differs for different inputs', () => {
    const h1 = computeHash('input A');
    const h2 = computeHash('input B');
    assert.notEqual(h1, h2);
  });

  it('canonicalize sorts keys', () => {
    const a = canonicalize({ z: 1, a: 2 });
    const b = canonicalize({ a: 2, z: 1 });
    assert.equal(a, b);
  });
});
