/**
 * F2 / EPIC #419 — gclid-capture unit tests.
 *
 * Covers the edge-runtime surface (NextRequest/NextResponse helpers).
 * Browser helpers (`captureClickIdsFromUrl`, `readClickIds`) are exercised
 * via existing ColombiaTours integration tests and unchanged by F2.
 */

import {
  captureClickIds,
  getStoredClickIds,
  setClickIdsCookie,
  clickIdInternals,
  type ClickIdSet,
} from '@/lib/analytics/gclid-capture';

// Minimal stand-in for next/server's NextRequest. Only the surfaces our
// helpers touch (nextUrl.searchParams, cookies.get) need to be honoured.
function makeNextRequest(input: {
  url: string;
  cookies?: Record<string, string>;
}) {
  const u = new URL(input.url);
  return {
    nextUrl: u,
    cookies: {
      get(name: string) {
        const value = input.cookies?.[name];
        return value === undefined ? undefined : { name, value };
      },
    },
  } as unknown as Parameters<typeof captureClickIds>[0];
}

interface CookieRecord {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

function makeNextResponse() {
  const cookies: CookieRecord[] = [];
  return {
    cookies: {
      set(name: string, value: string, options?: Record<string, unknown>) {
        cookies.push({ name, value, options });
      },
      _all: cookies,
    },
  } as unknown as Parameters<typeof setClickIdsCookie>[0] & {
    cookies: { _all: CookieRecord[] };
  };
}

describe('captureClickIds', () => {
  it('extracts the four supported click ids from the URL', () => {
    const req = makeNextRequest({
      url: 'https://example.com/?gclid=ABC&gbraid=DEF&wbraid=GHI&fbclid=JKL',
    });
    expect(captureClickIds(req)).toEqual({
      gclid: 'ABC',
      gbraid: 'DEF',
      wbraid: 'GHI',
      fbclid: 'JKL',
    });
  });

  it('ignores unrelated query params and missing keys', () => {
    const req = makeNextRequest({
      url: 'https://example.com/?utm_source=foo&q=hello&gclid=xyz',
    });
    expect(captureClickIds(req)).toEqual({ gclid: 'xyz' });
  });

  it('rejects malformed click ids (special chars beyond URL-safe)', () => {
    const req = makeNextRequest({
      url: 'https://example.com/?gclid=bad;value&gbraid=ok-1.2_3',
    });
    expect(captureClickIds(req)).toEqual({ gbraid: 'ok-1.2_3' });
  });

  it('returns an empty set when no click ids are present', () => {
    const req = makeNextRequest({ url: 'https://example.com/landing' });
    expect(captureClickIds(req)).toEqual({});
  });
});

describe('setClickIdsCookie + getStoredClickIds round-trip', () => {
  it('writes 90-day cookies for each supplied click id', () => {
    const res = makeNextResponse();
    setClickIdsCookie(res, { gclid: 'TEST-GCLID', wbraid: 'WB-1' });
    const all = (res as unknown as { cookies: { _all: CookieRecord[] } }).cookies
      ._all;
    expect(all).toHaveLength(2);
    const byName = Object.fromEntries(all.map((c) => [c.name, c]));
    expect(byName['bk_gclid'].value).toBe('TEST-GCLID');
    expect(byName['bk_gclid'].options?.maxAge).toBe(
      clickIdInternals.COOKIE_MAX_AGE_SECONDS,
    );
    expect(byName['bk_gclid'].options?.sameSite).toBe('lax');
    expect(byName['bk_gclid'].options?.httpOnly).toBe(false);
    expect(byName['bk_wbraid'].value).toBe('WB-1');
  });

  it('honours custom maxAge and secure overrides', () => {
    const res = makeNextResponse();
    setClickIdsCookie(
      res,
      { gclid: 'X' },
      { maxAgeSeconds: 60, secure: true },
    );
    const c = (res as unknown as { cookies: { _all: CookieRecord[] } }).cookies
      ._all[0];
    expect(c.options?.maxAge).toBe(60);
    expect(c.options?.secure).toBe(true);
  });

  it('writes nothing for an empty set', () => {
    const res = makeNextResponse();
    setClickIdsCookie(res, {});
    expect(
      (res as unknown as { cookies: { _all: CookieRecord[] } }).cookies._all,
    ).toHaveLength(0);
  });

  it('reads stored click ids from cookies when URL has none (round-trip)', () => {
    const ids: ClickIdSet = { gclid: 'STORED-GCLID' };
    // Simulate the cookie that setClickIdsCookie would have written:
    const req = makeNextRequest({
      url: 'https://example.com/contact',
      cookies: { bk_gclid: ids.gclid! },
    });
    expect(getStoredClickIds(req)).toEqual({ gclid: 'STORED-GCLID' });
  });

  it('URL params override stored cookies (newest click wins)', () => {
    const req = makeNextRequest({
      url: 'https://example.com/?gclid=URL-FRESH',
      cookies: { bk_gclid: 'COOKIE-OLD' },
    });
    expect(getStoredClickIds(req)).toEqual({ gclid: 'URL-FRESH' });
  });

  it('ignores cookies with malformed values (defence in depth)', () => {
    const req = makeNextRequest({
      url: 'https://example.com/',
      cookies: { bk_gclid: 'bad;value' },
    });
    expect(getStoredClickIds(req)).toEqual({});
  });
});

describe('clickIdInternals', () => {
  it('exposes the cookie name builder for downstream callers', () => {
    expect(clickIdInternals.cookieName('gclid')).toBe('bk_gclid');
    expect(clickIdInternals.cookieName('fbclid')).toBe('bk_fbclid');
  });

  it('uses 90 days as the cookie expiry — matches Google Ads conversion window', () => {
    expect(clickIdInternals.COOKIE_MAX_AGE_SECONDS).toBe(90 * 24 * 60 * 60);
  });
});
