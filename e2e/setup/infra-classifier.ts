/**
 * Infra-outage classifier — wraps Playwright test errors and tags
 * infrastructure-level failures (connection refused, DNS, timeouts) so
 * the Recovery Gate runner can distinguish real regressions from
 * transient infra problems. Also detects viewport-layout flakes
 * so those can be retried with a narrow budget (see playwright.config.ts
 * AC8 viewport_flake retry logic).
 *
 * Usage:
 *   import { classifyError, isInfraOutage, isViewportFlake } from '../setup/infra-classifier';
 *
 *   try {
 *     await page.goto(...);
 *   } catch (e) {
 *     const kind = classifyError(e);
 *     if (kind === 'infra_outage') testInfo.annotations.push({ type: 'infra_outage', description: String(e) });
 *     throw e;
 *   }
 *
 * Conservative by design: we only classify errors we can match with high
 * confidence. Everything else bubbles up as a real failure.
 */

export type ErrorClassification = 'infra_outage' | 'viewport_flake' | 'other';

const INFRA_PATTERNS: ReadonlyArray<RegExp> = [
  /ECONNREFUSED/i,
  /ERR_CONNECTION_REFUSED/i,
  /ERR_NETWORK_CHANGED/i,
  /ERR_INTERNET_DISCONNECTED/i,
  /ERR_NAME_NOT_RESOLVED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /EHOSTUNREACH/i,
  /ENETUNREACH/i,
  /socket hang up/i,
  /connect ECONN/i,
  /read ECONN/i,
  /net::ERR_CONNECTION_RESET/i,
  /net::ERR_EMPTY_RESPONSE/i,
  /webServer .*did not start/i,
  /Timed out waiting .*webServer/i,
];

const VIEWPORT_FLAKE_PATTERNS: ReadonlyArray<RegExp> = [
  /element is not visible in viewport/i,
  /element .*outside of the viewport/i,
  /screenshot size mismatch/i,
  /expected .*viewport size/i,
  /Element is not stable/i,
  /scrollIntoView.*failed/i,
];

export function classifyError(error: unknown): ErrorClassification {
  const message = extractErrorMessage(error);
  if (!message) return 'other';
  if (INFRA_PATTERNS.some((re) => re.test(message))) return 'infra_outage';
  if (VIEWPORT_FLAKE_PATTERNS.some((re) => re.test(message))) return 'viewport_flake';
  return 'other';
}

export function isInfraOutage(error: unknown): boolean {
  return classifyError(error) === 'infra_outage';
}

export function isViewportFlake(error: unknown): boolean {
  return classifyError(error) === 'viewport_flake';
}

function extractErrorMessage(error: unknown): string {
  if (error == null) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    const parts: string[] = [error.message];
    if (typeof (error as { stack?: string }).stack === 'string') {
      parts.push(String((error as { stack?: string }).stack));
    }
    const cause = (error as { cause?: unknown }).cause;
    if (cause) parts.push(extractErrorMessage(cause));
    return parts.filter(Boolean).join('\n');
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Annotate the current Playwright TestInfo with the classification so the
 * custom reporter (and the Recovery Gate summary) can bucket results.
 * No-ops if testInfo is undefined (non-test contexts).
 */
export function annotateClassification(
  testInfo:
    | undefined
    | {
        annotations: Array<{ type: string; description?: string }>;
      },
  kind: ErrorClassification,
  description?: string,
): void {
  if (!testInfo) return;
  if (kind === 'other') return;
  testInfo.annotations.push({ type: kind, description });
}
