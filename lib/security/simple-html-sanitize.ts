const DANGEROUS_TAGS = new Set([
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
]);

const STRIP_CONTENT_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed']);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized) return false;
  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('vbscript:')
  ) {
    return false;
  }
  return true;
}

function parseAttributes(raw: string): Array<{ name: string; value: string }> {
  const attrs: Array<{ name: string; value: string }> = [];
  const attrRegex = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(raw))) {
    const name = (match[1] || '').toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    attrs.push({ name, value });
  }
  return attrs;
}

function stripDangerousTagBlocks(html: string): string {
  let result = html;
  STRIP_CONTENT_TAGS.forEach((tag) => {
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi');
    result = result.replace(re, '');
  });
  return result;
}

export function sanitizeHtmlWithAllowlist(
  html: string,
  options: {
    allowedTags: string[];
    allowedAttrs: string[];
    forbidTags?: string[];
    forbidAttrs?: string[];
  },
): string {
  if (!html) return '';

  const allowedTags = new Set(options.allowedTags.map((t) => t.toLowerCase()));
  const allowedAttrs = new Set(options.allowedAttrs.map((a) => a.toLowerCase()));
  const forbidTags = new Set((options.forbidTags || []).map((t) => t.toLowerCase()));
  const forbidAttrs = new Set((options.forbidAttrs || []).map((a) => a.toLowerCase()));

  const stripped = stripDangerousTagBlocks(html);

  return stripped.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (full, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    const isClosing = full.startsWith('</');

    if (DANGEROUS_TAGS.has(tag) || forbidTags.has(tag)) {
      return '';
    }

    if (!allowedTags.has(tag)) {
      return '';
    }

    if (isClosing) {
      return `</${tag}>`;
    }

    const attrs = parseAttributes(rawAttrs);
    const safeAttrs: string[] = [];

    for (const attr of attrs) {
      if (!allowedAttrs.has(attr.name)) continue;
      if (forbidAttrs.has(attr.name)) continue;
      if (attr.name.startsWith('on')) continue;

      if ((attr.name === 'href' || attr.name === 'src') && !isSafeUrl(attr.value)) {
        continue;
      }

      safeAttrs.push(`${attr.name}="${escapeHtml(attr.value)}"`);
    }

    return safeAttrs.length > 0 ? `<${tag} ${safeAttrs.join(' ')}>` : `<${tag}>`;
  });
}
