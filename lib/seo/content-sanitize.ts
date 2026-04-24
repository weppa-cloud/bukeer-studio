/**
 * SEO Content Sanitizer
 * ---------------------
 * XSS-safe HTML sanitization for transcreate / auto-inject / user-pasted HTML
 * flows. Uses a server-safe allowlist sanitizer (no `jsdom`) so it can run
 * in Cloudflare Worker runtime.
 *
 * The schema is intentionally narrower than `lib/sanitize.tsx` — we only
 * allow the whitelist requested for blog-body content so auto-injected
 * anchors can't smuggle dangerous tags (`<script>`, `<iframe>`, event
 * handlers, etc.) into published pages.
 *
 * @see issue #145 — internal linking suggest endpoint + XSS sanitization
 */
import { sanitizeHtmlWithAllowlist } from '@/lib/security/simple-html-sanitize';

export interface SanitizeOptions {
  /** Allow `<a href rel target>` anchors. Default: true. */
  allowInternalLinks?: boolean;
  /** Allow `<img src alt>` tags. Default: true. */
  allowImages?: boolean;
  /** Hard cap on total `<a>` tags in the output. Default: 20. */
  maxLinks?: number;
}

const BASE_TAGS = ['p', 'ul', 'ol', 'li', 'h2', 'h3', 'strong', 'em', 'br'];
const LINK_TAGS = ['a'];
const IMG_TAGS = ['img'];

const LINK_ATTRS = ['href', 'rel', 'target'];
const IMG_ATTRS = ['src', 'alt'];

const BASE_FORBID_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'textarea',
  'button',
  'meta',
  'link',
  'base',
  'svg',
  'math',
  'video',
  'audio',
  'source',
];

const BASE_FORBID_ATTRS = [
  'onerror',
  'onload',
  'onclick',
  'onmouseover',
  'onfocus',
  'onblur',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onchange',
  'onsubmit',
  'style',
];

/**
 * Count `<a>` tags left after sanitization. If the count exceeds
 * `maxLinks`, strip anchors beyond the cap while keeping their inner text.
 */
function enforceMaxLinks(html: string, maxLinks: number): string {
  if (maxLinks <= 0) {
    return html.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
  }
  let count = 0;
  return html.replace(/<a\b[^>]*>(.*?)<\/a>/gi, (match, inner: string) => {
    count += 1;
    if (count <= maxLinks) return match;
    return inner;
  });
}

/**
 * Sanitize HTML for blog-body / transcreate output.
 *
 * Whitelist: `<a href rel target>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<h2>`,
 * `<h3>`, `<strong>`, `<em>`, `<img src alt>`, `<br>`. Everything else is
 * stripped (including `<script>`, `<iframe>`, inline event handlers, and
 * `<style>`).
 */
export function sanitizeContentHtml(html: string, options: SanitizeOptions = {}): string {
  if (!html) return '';

  const {
    allowInternalLinks = true,
    allowImages = true,
    maxLinks = 20,
  } = options;

  const allowedTags = [...BASE_TAGS];
  const allowedAttrs: string[] = [];

  if (allowInternalLinks) {
    allowedTags.push(...LINK_TAGS);
    allowedAttrs.push(...LINK_ATTRS);
  }
  if (allowImages) {
    allowedTags.push(...IMG_TAGS);
    allowedAttrs.push(...IMG_ATTRS);
  }

  const clean = sanitizeHtmlWithAllowlist(html, {
    allowedTags,
    allowedAttrs,
    forbidTags: BASE_FORBID_TAGS,
    forbidAttrs: BASE_FORBID_ATTRS,
  });

  return enforceMaxLinks(clean, maxLinks);
}
