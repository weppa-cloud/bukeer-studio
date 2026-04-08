/**
 * validateTheme() — Deep validation beyond schema: accessibility, font policy, semantic rules.
 */

import type { DesignTokens } from '../contracts/design-tokens';
import type { ThemeProfile } from '../contracts/theme-profile';
import { checkContrast, type ContrastViolation } from '../guardrails/accessibility';
import { validateFonts, type FontViolation } from '../guardrails/font-policy';
import { lintTheme, type LintViolation } from '../guardrails/lint';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Quick summary counts */
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

// ---------------------------------------------------------------------------
// validateTheme
// ---------------------------------------------------------------------------

export function validateTheme(
  tokens: DesignTokens,
  profile: ThemeProfile,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Accessibility — contrast checks
  const contrastViolations = checkContrast(tokens);
  for (const v of contrastViolations) {
    issues.push(contrastToIssue(v));
  }

  // 2. Font policy
  const fontViolations = validateFonts(tokens);
  for (const v of fontViolations) {
    issues.push(fontToIssue(v));
  }

  // 3. Lint rules
  const lintViolations = lintTheme(tokens, profile);
  for (const v of lintViolations) {
    issues.push(lintToIssue(v));
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const infos = issues.filter((i) => i.severity === 'info').length;

  return {
    valid: errors === 0,
    issues,
    summary: { errors, warnings, infos },
  };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function contrastToIssue(v: ContrastViolation): ValidationIssue {
  return {
    code: `a11y.contrast.${v.level}`,
    severity: v.level === 'AA' ? 'error' : 'warning',
    message: `${v.foreground}/${v.background} contrast ratio ${v.ratio.toFixed(2)}:1 fails WCAG ${v.level} (min ${v.required}:1) in ${v.mode} mode`,
    path: `tokens.colors.${v.mode}.${v.pair}`,
  };
}

function fontToIssue(v: FontViolation): ValidationIssue {
  return {
    code: `font.${v.code}`,
    severity: v.severity,
    message: v.message,
    path: v.path,
  };
}

function lintToIssue(v: LintViolation): ValidationIssue {
  return {
    code: `lint.${v.code}`,
    severity: v.severity,
    message: v.message,
    path: v.path,
  };
}
