const DEFAULT_SAFE_REDIRECT = '/dashboard';

export function sanitizeInternalRedirect(
  value: string | null | undefined,
  fallback = DEFAULT_SAFE_REDIRECT,
): string {
  const candidate = value?.trim();

  if (!candidate) {
    return fallback;
  }

  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, 'https://bukeer.local');
    if (parsed.origin !== 'https://bukeer.local') {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
