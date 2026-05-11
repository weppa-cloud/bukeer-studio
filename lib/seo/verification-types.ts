/**
 * Verification system types for post-publish transcreation quality gate.
 *
 * Used by the Verifier Agent to determine whether a translated page
 * can be exposed to sitemaps and hreflang indexing.
 */

export type VerificationStatus = 'pass' | 'warn' | 'fail';

export interface VerificationCheck {
  name: string;
  label: string;
  critical: boolean;
  passed: boolean;
  detail?: string;
}

export interface VerificationRecord {
  id: string;
  url: string;
  locale: string;
  timestamp: string;
  status: VerificationStatus;
  checks: VerificationCheck[];
  sitemap_eligible: boolean;
  hreflang_eligible: boolean;
  metadata?: Record<string, unknown>;
}

export type VerificationResult = {
  status: VerificationStatus;
  checks: VerificationCheck[];
  sitemap_eligible: boolean;
  hreflang_eligible: boolean;
};
