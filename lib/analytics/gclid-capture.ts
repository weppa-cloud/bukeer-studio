/**
 * Click-ID capture helpers (browser + edge runtime). F2 / EPIC #419.
 */

import type { NextRequest, NextResponse } from 'next/server';

const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid'] as const;
export type ClickIdKey = (typeof CLICK_ID_KEYS)[number];

const GOOGLE_CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid'] as const;
export type GoogleClickIdKey = (typeof GOOGLE_CLICK_ID_KEYS)[number];

const COOKIE_PREFIX = 'bk_';
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
const MAX_VALUE_LENGTH = 1024;

export type ClickIdSet = Partial<Record<ClickIdKey, string>>;

function sanitize(raw: string | null | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (!/^[A-Za-z0-9_\-.]+$/.test(trimmed)) return undefined;
  return trimmed.slice(0, MAX_VALUE_LENGTH);
}

function cookieName(key: ClickIdKey): string {
  return `${COOKIE_PREFIX}${key}`;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function readBrowserCookie(name: string): string | undefined {
  if (!isBrowser()) return undefined;
  const target = `${name}=`;
  const found = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(target));
  if (!found) return undefined;
  try {
    return decodeURIComponent(found.slice(target.length));
  } catch {
    return undefined;
  }
}

function writeBrowserCookie(name: string, value: string): void {
  if (!isBrowser()) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

export function captureClickIdsFromUrl(): void {
  if (!isBrowser()) return;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return;
  }
  for (const key of GOOGLE_CLICK_ID_KEYS) {
    const fresh = sanitize(params.get(key));
    if (fresh) writeBrowserCookie(cookieName(key), fresh);
  }
}

export function readClickIds(): Partial<Record<GoogleClickIdKey, string>> {
  if (!isBrowser()) return {};
  const out: Partial<Record<GoogleClickIdKey, string>> = {};
  let params: URLSearchParams | null = null;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    params = null;
  }
  for (const key of GOOGLE_CLICK_ID_KEYS) {
    const fromCookie = sanitize(readBrowserCookie(cookieName(key)));
    if (fromCookie) {
      out[key] = fromCookie;
      continue;
    }
    const fromUrl = sanitize(params?.get(key) ?? null);
    if (fromUrl) out[key] = fromUrl;
  }
  return out;
}

export function captureClickIds(request: NextRequest): ClickIdSet {
  const out: ClickIdSet = {};
  const params = request.nextUrl.searchParams;
  for (const key of CLICK_ID_KEYS) {
    const fresh = sanitize(params.get(key));
    if (fresh) out[key] = fresh;
  }
  return out;
}

export function getStoredClickIds(request: NextRequest): ClickIdSet {
  const out: ClickIdSet = {};
  const params = request.nextUrl.searchParams;
  for (const key of CLICK_ID_KEYS) {
    const fromUrl = sanitize(params.get(key));
    if (fromUrl) {
      out[key] = fromUrl;
      continue;
    }
    const fromCookie = sanitize(request.cookies.get(cookieName(key))?.value);
    if (fromCookie) out[key] = fromCookie;
  }
  return out;
}

export function setClickIdsCookie(
  response: NextResponse,
  ids: ClickIdSet,
  options: { secure?: boolean; maxAgeSeconds?: number } = {},
): NextResponse {
  const maxAge = options.maxAgeSeconds ?? COOKIE_MAX_AGE_SECONDS;
  const secure = options.secure ?? process.env.NODE_ENV === 'production';

  for (const key of CLICK_ID_KEYS) {
    const value = ids[key];
    if (!value) continue;
    response.cookies.set(cookieName(key), value, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure,
      maxAge,
    });
  }
  return response;
}

export const clickIdInternals = {
  CLICK_ID_KEYS,
  COOKIE_PREFIX,
  COOKIE_MAX_AGE_SECONDS,
  cookieName,
  sanitize,
};
