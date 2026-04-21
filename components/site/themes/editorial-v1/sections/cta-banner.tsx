/**
 * editorial-v1 CTA Banner section — adapter for `cta_banner` DB section type.
 *
 * The `cta_banner` section type shares the same content shape as `cta`
 * (title, subtitle, ctaText, ctaUrl, ctas[], backgroundImageUrl, etc.).
 * `CtaSection` already handles both the authored `ctas[]` array and the
 * legacy `ctaText`/`ctaUrl` fields, so we simply re-export it as the
 * handler for this section type.
 *
 * No new rendering logic needed.
 */

export { CtaSection as CtaBannerSection } from './cta';
export { CtaSection as default } from './cta';
