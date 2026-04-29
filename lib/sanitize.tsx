import { marked } from "marked";
import { sanitizeHtmlWithAllowlist } from "@/lib/security/simple-html-sanitize";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "code",
    "pre",
    "blockquote",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "div",
    "span",
    "figure",
    "figcaption",
  ],
  ALLOWED_ATTR: [
    "href",
    "src",
    "alt",
    "title",
    "class",
    "id",
    "loading",
    "decoding",
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
  ],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
};

/**
 * Sanitizes HTML content, removing potentially dangerous elements and attributes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtmlWithAllowlist(html, {
    allowedTags: PURIFY_CONFIG.ALLOWED_TAGS,
    allowedAttrs: PURIFY_CONFIG.ALLOWED_ATTR,
    forbidTags: PURIFY_CONFIG.FORBID_TAGS,
    forbidAttrs: PURIFY_CONFIG.FORBID_ATTR,
  });
}

/**
 * Renders markdown to HTML and sanitizes the output.
 * If content already looks like HTML, it just sanitizes it.
 */
export function renderMarkdown(content: string): string {
  if (!content) return "";

  // Check if content looks like HTML (has HTML tags)
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(content);

  if (looksLikeHtml) {
    return sanitizeHtml(content);
  }

  // Parse markdown and sanitize
  const rawHtml = marked.parse(content, { gfm: true, breaks: true });
  return sanitizeHtml(rawHtml as string);
}

/**
 * Wrap standalone <p><img ...></p> with editorial <figure> + <figcaption>.
 * Alt text → caption. Images without alt text get no caption.
 * Skips images that are already inside <figure>.
 */
function wrapImagesToFigures(html: string): string {
  // Match <p> containing ONLY an <img> (no other text nodes)
  return html.replace(
    /<p>\s*(<img([^>]*)>)\s*<\/p>/gi,
    (_, imgTag: string, imgAttrs: string) => {
      const altMatch = imgAttrs.match(/alt="([^"]*)"/i);
      const alt = altMatch ? altMatch[1].trim() : "";
      const caption =
        alt && alt !== ""
          ? `\n  <figcaption class="blog-figure__caption">${alt}</figcaption>`
          : "";
      return `<figure class="blog-figure">\n  ${imgTag}${caption}\n</figure>`;
    },
  );
}

/**
 * Add loading="lazy" and decoding="async" to inline images (skip first for LCP).
 */
function addLazyLoading(html: string): string {
  let count = 0;
  return html.replace(/<img([^>]*)>/g, (match, attrs: string) => {
    count++;
    if (count === 1) return match; // Keep first image eager for LCP
    if (attrs.includes("loading=")) return match;
    return `<img${attrs} loading="lazy" decoding="async">`;
  });
}

/**
 * Add fallback alt text to images missing the alt attribute.
 */
function addAltFallback(html: string, fallback: string): string {
  const safe = fallback.replace(/"/g, "&quot;");
  return html.replace(/<img([^>]*)>/g, (match, attrs: string) => {
    if (attrs.includes("alt=")) return match;
    return `<img${attrs} alt="${safe}">`;
  });
}

/**
 * Normalize legacy internal links before rendering editorial HTML.
 *
 * WordPress imports can contain `/site/<tenant>/...` preview URLs or absolute
 * tenant URLs with trailing slashes. Those are valid for users, but crawlers
 * count them as "links to redirects". Keep external links untouched.
 */
function normalizeInternalAnchorHrefs(html: string): string {
  return html.replace(
    /\shref=(["'])([^"']+)\1/gi,
    (match, quote: string, rawHref: string) => {
      const href = normalizeInternalHref(rawHref);
      if (href === rawHref) return match;
      return ` href=${quote}${href}${quote}`;
    },
  );
}

function normalizeInternalHref(rawHref: string): string {
  if (
    !rawHref ||
    rawHref.startsWith("#") ||
    rawHref.startsWith("mailto:") ||
    rawHref.startsWith("tel:") ||
    rawHref.startsWith("whatsapp:")
  ) {
    return rawHref;
  }

  try {
    if (rawHref.startsWith("/")) {
      return normalizeInternalPath(rawHref);
    }

    const url = new URL(rawHref);
    const host = url.hostname.toLowerCase();
    const isKnownPublicHost =
      host === "colombiatours.travel" ||
      host.endsWith(".bukeer.com") ||
      host.endsWith(".bukeer.travel");
    if (!isKnownPublicHost) return rawHref;

    url.pathname = normalizeInternalPath(url.pathname);
    return url.toString();
  } catch {
    return rawHref;
  }
}

function normalizeInternalPath(pathname: string): string {
  let normalized = pathname.replace(/^\/site\/[^/]+(?=\/|$)/, "") || "/";
  if (normalized !== "/" && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

interface SafeHtmlProps {
  content: string;
  className?: string;
  /** Fallback alt text for images missing alt attribute */
  fallbackAlt?: string;
}

/**
 * React component for safely rendering HTML/Markdown content.
 * Sanitizes content on the server to prevent XSS attacks.
 * Adds lazy loading to inline images and fallback alt text.
 */
export function SafeHtml({ content, className, fallbackAlt }: SafeHtmlProps) {
  let html = renderMarkdown(content);
  html = wrapImagesToFigures(html);
  html = addLazyLoading(html);
  if (fallbackAlt) html = addAltFallback(html, fallbackAlt);
  html = normalizeInternalAnchorHrefs(html);
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
