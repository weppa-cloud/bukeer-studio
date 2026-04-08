/**
 * compileTheme() — Compile validated tokens + profile into runtime outputs.
 */

import type { DesignTokens } from '../contracts/design-tokens';
import type { ThemeProfile } from '../contracts/theme-profile';
import type { WebRuntimeOutput, FlutterRuntimeOutput } from '../contracts/runtime-output';
import { generateCssOutput } from '../compiler/css-generator';
import { generateFlutterOutput } from '../compiler/flutter-generator';
import { canonicalize, computeHash } from '../compiler/snapshot';
import { CORPORATE_PRESET } from '../presets/tourism-presets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompileTarget = 'web' | 'flutter' | 'all';

export interface CompileOptions {
  target?: CompileTarget;
}

export interface CompileResult {
  web?: WebRuntimeOutput;
  flutter?: FlutterRuntimeOutput;
  /** Deterministic input hash (same tokens+profile = same hash) */
  inputHash: string;
}

// ---------------------------------------------------------------------------
// compileTheme
// ---------------------------------------------------------------------------

export function compileTheme(
  tokens: DesignTokens,
  profile: ThemeProfile,
  options: CompileOptions = {},
): CompileResult {
  const target = options.target ?? 'all';
  const safeTokens = deepFill(tokens, CORPORATE_PRESET.tokens);
  const safeProfile = deepFill(profile, CORPORATE_PRESET.profile);

  // Deterministic input hash
  const inputHash = computeHash(canonicalize({ tokens: safeTokens, profile: safeProfile }));

  const result: CompileResult = { inputHash };

  if (target === 'web' || target === 'all') {
    result.web = generateCssOutput(safeTokens, safeProfile, inputHash);
  }

  if (target === 'flutter' || target === 'all') {
    result.flutter = generateFlutterOutput(safeTokens, inputHash);
  }

  return result;
}

function deepFill<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null) {
    return cloneFallback(fallback);
  }

  if (Array.isArray(fallback)) {
    return (Array.isArray(value) ? value : fallback) as T;
  }

  if (!isRecord(fallback)) {
    return value as T;
  }

  if (!isRecord(value)) {
    return cloneFallback(fallback);
  }

  const fallbackRecord = fallback as Record<string, unknown>;
  const valueRecord = value as Record<string, unknown>;
  const merged: Record<string, unknown> = {};

  for (const key of Object.keys(fallbackRecord)) {
    merged[key] = deepFill(valueRecord[key], fallbackRecord[key]);
  }

  for (const key of Object.keys(valueRecord)) {
    if (!(key in merged)) {
      merged[key] = valueRecord[key];
    }
  }

  return merged as T;
}

function cloneFallback<T>(fallback: T): T {
  return JSON.parse(JSON.stringify(fallback)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
