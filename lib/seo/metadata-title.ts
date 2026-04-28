const DEFAULT_MAX_TITLE_LENGTH = 65;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripTrailingBrand(title: string, siteName: string): string {
  const trimmedSiteName = siteName.trim();
  if (!trimmedSiteName) return title.trim();

  const brandPattern = escapeRegExp(trimmedSiteName);
  const trailingBrand = new RegExp(`\\s*[|\\-–—:]\\s*${brandPattern}\\s*$`, 'iu');
  let normalized = title.trim();

  while (trailingBrand.test(normalized)) {
    normalized = normalized.replace(trailingBrand, '').trim();
  }

  return normalized;
}

function trimToWordBoundary(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const slice = trimmed.slice(0, maxLength + 1);
  const lastSpace = slice.lastIndexOf(' ');
  const candidate = lastSpace >= Math.floor(maxLength * 0.6)
    ? slice.slice(0, lastSpace)
    : slice.slice(0, maxLength);

  return candidate.replace(/[|,\-–—:;.\s]+$/u, '').trim();
}

export function normalizePublicMetadataTitle(
  title: string | null | undefined,
  siteName: string | null | undefined,
  maxLength = DEFAULT_MAX_TITLE_LENGTH,
): string {
  const fallback = (siteName || '').trim();
  const rawTitle = (title || fallback).trim();
  if (!rawTitle) return '';

  const cleanSiteName = fallback;
  const withoutBrand = cleanSiteName ? stripTrailingBrand(rawTitle, cleanSiteName) : rawTitle;
  const templateReserve = cleanSiteName ? ` | ${cleanSiteName}`.length : 0;
  const available = Math.max(24, maxLength - templateReserve);

  return trimToWordBoundary(withoutBrand, available);
}
