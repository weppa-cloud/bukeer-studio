/**
 * Sanitizer for editorial-v1 section headings.
 *
 * Headings (section title, subtitle) come from operator-controlled
 * `section.content` fields. Designer copy uses:
 *   - `<em>` for serif italic accent-2 emphasis
 *   - `<span class='serif'>` for inline serif emphasis across a phrase
 *   - `<br>` for explicit line breaks
 *
 * We trust the source but still sanitize: unknown tags stripped; attributes
 * stripped except `class` on `<span>`. Comments and CDATA are dropped.
 */

const ALLOWED_TAGS = new Set(['em', 'br', 'span']);

export function sanitizeEditorialHtml(raw: string | undefined | null): string {
  if (!raw) return '';
  const noComments = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  return noComments.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (match, name, attrs) => {
    const tag = String(name).toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    const isClosing = match.startsWith('</');
    if (isClosing) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'span') {
      const classMatch = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs || '');
      const className = (classMatch?.[1] ?? classMatch?.[2] ?? '').trim();
      if (className) {
        return `<span class="${className.replace(/"/g, '&quot;')}">`;
      }
      return '<span>';
    }
    return `<${tag}>`;
  });
}

/**
 * Returns `{ __html }` ready for `dangerouslySetInnerHTML`, or `undefined` when
 * the input sanitizes to empty.
 */
export function editorialHtml(raw: string | undefined | null): { __html: string } | undefined {
  const html = sanitizeEditorialHtml(raw);
  return html ? { __html: html } : undefined;
}
