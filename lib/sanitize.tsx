import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'ul', 'ol', 'li',
    'strong', 'em', 'b', 'i', 'u',
    'code', 'pre', 'blockquote',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
    'figure', 'figcaption',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'loading', 'decoding'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

/**
 * Sanitizes HTML content, removing potentially dangerous elements and attributes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

/**
 * Renders markdown to HTML and sanitizes the output.
 * If content already looks like HTML, it just sanitizes it.
 */
export function renderMarkdown(content: string): string {
  if (!content) return '';

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
      const alt = altMatch ? altMatch[1].trim() : '';
      const caption = alt && alt !== '' ? `\n  <figcaption class="blog-figure__caption">${alt}</figcaption>` : '';
      return `<figure class="blog-figure">\n  ${imgTag}${caption}\n</figure>`;
    }
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
    if (attrs.includes('loading=')) return match;
    return `<img${attrs} loading="lazy" decoding="async">`;
  });
}

/**
 * Add fallback alt text to images missing the alt attribute.
 */
function addAltFallback(html: string, fallback: string): string {
  const safe = fallback.replace(/"/g, '&quot;');
  return html.replace(/<img([^>]*)>/g, (match, attrs: string) => {
    if (attrs.includes('alt=')) return match;
    return `<img${attrs} alt="${safe}">`;
  });
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
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
