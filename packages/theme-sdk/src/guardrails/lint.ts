/**
 * Theme Lint Rules — catch invalid or suboptimal token/profile combinations.
 */

import type { DesignTokens } from '../contracts/design-tokens';
import type { ThemeProfile } from '../contracts/theme-profile';
import type { ValidationSeverity } from '../sdk/validate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LintViolation {
  code: string;
  severity: ValidationSeverity;
  message: string;
  path?: string;
}

// ---------------------------------------------------------------------------
// Lint Rules
// ---------------------------------------------------------------------------

export function lintTheme(tokens: DesignTokens, profile: ThemeProfile): LintViolation[] {
  const violations: LintViolation[] = [];

  // Rule: bold layout + flat elevation = no visual hierarchy
  if (profile.layout.variant === 'bold' && tokens.elevation.cardElevation === 'flat') {
    violations.push({
      code: 'bold-flat-conflict',
      severity: 'warning',
      message: 'Bold layout variant with flat card elevation reduces visual hierarchy. Consider "raised" or "dramatic" elevation.',
      path: 'tokens.elevation.cardElevation',
    });
  }

  // Rule: minimal layout + dramatic elevation = visual contradiction
  if (profile.layout.variant === 'minimal' && tokens.elevation.cardElevation === 'dramatic') {
    violations.push({
      code: 'minimal-dramatic-conflict',
      severity: 'warning',
      message: 'Minimal layout variant with dramatic card elevation is visually contradictory. Consider "flat" or "subtle" elevation.',
      path: 'tokens.elevation.cardElevation',
    });
  }

  // Rule: "none" motion preset should have 0-ish duration
  if (tokens.motion.preset === 'none' && tokens.motion.durationMs > 200) {
    violations.push({
      code: 'motion-none-duration',
      severity: 'warning',
      message: `Motion preset is "none" but duration is ${tokens.motion.durationMs}ms. Set duration to 100ms or less for no-motion.`,
      path: 'tokens.motion.durationMs',
    });
  }

  // Rule: expressive motion should have non-trivial duration
  if (tokens.motion.preset === 'expressive' && tokens.motion.durationMs < 200) {
    violations.push({
      code: 'motion-expressive-duration',
      severity: 'info',
      message: `Expressive motion preset with ${tokens.motion.durationMs}ms duration may feel abrupt. Consider 300ms+.`,
      path: 'tokens.motion.durationMs',
    });
  }

  // Rule: compact spacing + large type scale = cramped
  if (tokens.spacing.scale === 'compact' && tokens.typography.scale === 'large') {
    violations.push({
      code: 'compact-large-conflict',
      severity: 'warning',
      message: 'Compact spacing with large type scale may cause text overflow. Consider "default" spacing.',
      path: 'tokens.spacing.scale',
    });
  }

  // Rule: "full" radius on cards looks odd in most layouts
  if (tokens.shape.radius === 'full') {
    violations.push({
      code: 'full-radius-global',
      severity: 'warning',
      message: 'Global "full" border radius (pill shape) applies to all elements. Consider using "xl" globally and "full" only for buttons.',
      path: 'tokens.shape.radius',
    });
  }

  // Rule: transparent nav + video hero = readability concern
  if (profile.layout.navStyle === 'transparent' && profile.layout.heroStyle === 'video') {
    violations.push({
      code: 'transparent-nav-video',
      severity: 'info',
      message: 'Transparent nav over video hero may have readability issues. Ensure nav text has adequate contrast overlay.',
      path: 'profile.layout.navStyle',
    });
  }

  // Rule: seed color should match primary
  if (tokens.colors.seedColor.toLowerCase() !== tokens.colors.light.primary.toLowerCase()) {
    violations.push({
      code: 'seed-primary-mismatch',
      severity: 'info',
      message: 'Seed color does not match light primary color. This is acceptable but may cause confusion.',
      path: 'tokens.colors.seedColor',
    });
  }

  // Rule: light and dark backgrounds should be sufficiently different
  const lightBg = tokens.colors.light.background;
  const darkBg = tokens.colors.dark.background;
  if (lightBg.toLowerCase() === darkBg.toLowerCase()) {
    violations.push({
      code: 'identical-mode-backgrounds',
      severity: 'error',
      message: 'Light and dark mode backgrounds are identical. Dark mode must have a distinct background.',
      path: 'tokens.colors',
    });
  }

  return violations;
}
