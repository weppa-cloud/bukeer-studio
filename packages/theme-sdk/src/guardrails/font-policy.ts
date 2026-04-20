/**
 * Font Policy — allowlist + fallback enforcement for theme fonts.
 */

import type { DesignTokens } from '../contracts/design-tokens';
import type { ValidationSeverity } from '../sdk/validate';

// ---------------------------------------------------------------------------
// Font Allowlist
// ---------------------------------------------------------------------------

/**
 * Allowlisted Google Fonts for Bukeer websites.
 * These fonts are verified for:
 * - Good web performance (WOFF2 available)
 * - Multi-language support (Latin Extended)
 * - Tourism-appropriate aesthetics
 */
export const FONT_ALLOWLIST = new Set([
  // Sans-serif (modern, clean)
  'Inter',
  'Montserrat',
  'Open Sans',
  'Lato',
  'Poppins',
  'Nunito',
  'Raleway',
  'Source Sans 3',
  'DM Sans',
  'Outfit',
  'Plus Jakarta Sans',
  'Figtree',
  'Geist',

  // Serif (elegant, editorial)
  'Playfair Display',
  'Merriweather',
  'Lora',
  'Cormorant Garamond',
  'Libre Baskerville',
  'DM Serif Display',
  'Instrument Serif',
  'Fraunces',
  'Crimson Pro',

  // Display (bold, expressive)
  'Sora',
  'Space Grotesk',
  'Bricolage Grotesque',
  'Clash Display',

  // Monospace (code, technical)
  'JetBrains Mono',
  'Fira Code',
]);

/**
 * Valid CSS fallback stacks.
 */
export const VALID_FALLBACKS = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'system-ui',
  'cursive',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FontViolation {
  code: string;
  severity: ValidationSeverity;
  message: string;
  path: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateFonts(tokens: DesignTokens): FontViolation[] {
  const violations: FontViolation[] = [];

  // Check display font
  if (!FONT_ALLOWLIST.has(tokens.typography.display.family)) {
    violations.push({
      code: 'not-allowlisted',
      severity: 'warning',
      message: `Display font "${tokens.typography.display.family}" is not in the allowlist. Allowed: ${Array.from(FONT_ALLOWLIST).slice(0, 5).join(', ')}...`,
      path: 'tokens.typography.display.family',
    });
  }

  // Check body font
  if (!FONT_ALLOWLIST.has(tokens.typography.body.family)) {
    violations.push({
      code: 'not-allowlisted',
      severity: 'warning',
      message: `Body font "${tokens.typography.body.family}" is not in the allowlist. Allowed: ${Array.from(FONT_ALLOWLIST).slice(0, 5).join(', ')}...`,
      path: 'tokens.typography.body.family',
    });
  }

  // Check fallback stacks
  if (!VALID_FALLBACKS.has(tokens.typography.display.fallback)) {
    violations.push({
      code: 'invalid-fallback',
      severity: 'error',
      message: `Display font fallback "${tokens.typography.display.fallback}" is not valid. Use: ${Array.from(VALID_FALLBACKS).join(', ')}`,
      path: 'tokens.typography.display.fallback',
    });
  }

  if (!VALID_FALLBACKS.has(tokens.typography.body.fallback)) {
    violations.push({
      code: 'invalid-fallback',
      severity: 'error',
      message: `Body font fallback "${tokens.typography.body.fallback}" is not valid. Use: ${Array.from(VALID_FALLBACKS).join(', ')}`,
      path: 'tokens.typography.body.fallback',
    });
  }

  // Warn if display and body are the same
  if (tokens.typography.display.family === tokens.typography.body.family) {
    violations.push({
      code: 'same-font',
      severity: 'info',
      message: `Display and body fonts are both "${tokens.typography.display.family}". Consider using different fonts for visual hierarchy.`,
      path: 'tokens.typography',
    });
  }

  return violations;
}
