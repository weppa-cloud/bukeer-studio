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
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
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

interface SafeHtmlProps {
  content: string;
  className?: string;
}

/**
 * React component for safely rendering HTML/Markdown content.
 * Sanitizes content on the server to prevent XSS attacks.
 */
export function SafeHtml({ content, className }: SafeHtmlProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
