import crypto from 'node:crypto';
import { SeoApiError } from '@/lib/seo/errors';

interface OAuthStatePayload {
  websiteId: string;
  provider: 'gsc' | 'ga4';
  userId: string;
  returnTo: string;
  exp: number;
}

function getSigningSecret() {
  return process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.REVALIDATE_SECRET || 'dev-insecure-secret';
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function signOAuthState(payload: Omit<OAuthStatePayload, 'exp'>, expiresInMinutes = 15) {
  const exp = Date.now() + expiresInMinutes * 60_000;
  const body: OAuthStatePayload = { ...payload, exp };
  const encodedPayload = encodeBase64Url(JSON.stringify(body));

  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const [encodedPayload, signature] = state.split('.');
  if (!encodedPayload || !signature) {
    throw new SeoApiError('VALIDATION_ERROR', 'Invalid OAuth state format', 400);
  }

  const expected = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  if (expected !== signature) {
    throw new SeoApiError('VALIDATION_ERROR', 'OAuth state signature mismatch', 400);
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as OAuthStatePayload;
  if (!payload.exp || Date.now() > payload.exp) {
    throw new SeoApiError('VALIDATION_ERROR', 'OAuth state expired', 400);
  }

  return payload;
}
