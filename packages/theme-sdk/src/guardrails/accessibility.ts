/**
 * Accessibility Guardrails — WCAG contrast checks for theme color pairs.
 */

import type { DesignTokens, ColorScheme } from '../contracts/design-tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContrastViolation {
  pair: string;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  level: 'AA' | 'AAA';
  mode: 'light' | 'dark';
}

// ---------------------------------------------------------------------------
// Critical color pairs — must pass WCAG AA (4.5:1 for normal text, 3:1 for large)
// ---------------------------------------------------------------------------

const CRITICAL_PAIRS: Array<{
  fg: keyof ColorScheme;
  bg: keyof ColorScheme;
  name: string;
  minRatio: number;
  level: 'AA' | 'AAA';
}> = [
  // Primary surfaces
  { fg: 'onPrimary', bg: 'primary', name: 'onPrimary/primary', minRatio: 4.5, level: 'AA' },
  { fg: 'onPrimaryContainer', bg: 'primaryContainer', name: 'onPrimaryContainer/primaryContainer', minRatio: 4.5, level: 'AA' },

  // Secondary surfaces
  { fg: 'onSecondary', bg: 'secondary', name: 'onSecondary/secondary', minRatio: 4.5, level: 'AA' },
  { fg: 'onSecondaryContainer', bg: 'secondaryContainer', name: 'onSecondaryContainer/secondaryContainer', minRatio: 4.5, level: 'AA' },

  // Tertiary surfaces
  { fg: 'onTertiary', bg: 'tertiary', name: 'onTertiary/tertiary', minRatio: 4.5, level: 'AA' },
  { fg: 'onTertiaryContainer', bg: 'tertiaryContainer', name: 'onTertiaryContainer/tertiaryContainer', minRatio: 4.5, level: 'AA' },

  // Error surfaces
  { fg: 'onError', bg: 'error', name: 'onError/error', minRatio: 4.5, level: 'AA' },
  { fg: 'onErrorContainer', bg: 'errorContainer', name: 'onErrorContainer/errorContainer', minRatio: 4.5, level: 'AA' },

  // General surfaces
  { fg: 'onSurface', bg: 'surface', name: 'onSurface/surface', minRatio: 4.5, level: 'AA' },
  { fg: 'onSurface', bg: 'background', name: 'onSurface/background', minRatio: 4.5, level: 'AA' },
  { fg: 'onSurfaceVariant', bg: 'surface', name: 'onSurfaceVariant/surface', minRatio: 3, level: 'AA' },

  // Inverse surfaces
  { fg: 'onInverseSurface', bg: 'inverseSurface', name: 'onInverseSurface/inverseSurface', minRatio: 4.5, level: 'AA' },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function checkContrast(tokens: DesignTokens): ContrastViolation[] {
  const violations: ContrastViolation[] = [];

  for (const mode of ['light', 'dark'] as const) {
    const scheme = tokens.colors[mode];
    for (const pair of CRITICAL_PAIRS) {
      const fg = scheme[pair.fg];
      const bg = scheme[pair.bg];
      const ratio = getContrastRatio(fg, bg);

      if (ratio < pair.minRatio) {
        violations.push({
          pair: pair.name,
          foreground: fg,
          background: bg,
          ratio,
          required: pair.minRatio,
          level: pair.level,
          mode,
        });
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// WCAG Contrast Ratio Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate WCAG 2.1 contrast ratio between two hex colors.
 * Returns ratio >= 1 (higher = more contrast).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a hex color per WCAG 2.1.
 */
export function getRelativeLuminance(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;

  const [r, g, b] = [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
