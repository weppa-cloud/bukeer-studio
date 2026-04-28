import crypto from 'node:crypto';

import { getTokenForMode, sanitizeSecrets } from './config.js';
import type { MetaAdsConfig, MetaApiClient } from './types.js';

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown,
  ) {
    super(message);
    this.name = 'MetaApiError';
  }
}

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export function createAppSecretProof(accessToken: string, appSecret: string): string {
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

export class HttpMetaApiClient implements MetaApiClient {
  constructor(
    private readonly config: MetaAdsConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async get(path: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return this.request('GET', path, params, false);
  }

  async post(path: string, body: Record<string, unknown> = {}, options: { write?: boolean } = {}): Promise<unknown> {
    return this.request('POST', path, body, Boolean(options.write));
  }

  private async request(method: 'GET' | 'POST', pathValue: string, payload: Record<string, unknown>, write: boolean): Promise<unknown> {
    if (pathValue.startsWith('http://') || pathValue.startsWith('https://')) {
      throw new Error('Absolute URLs are not allowed for Meta API requests');
    }

    const token = getTokenForMode(this.config, write);
    const cleanPath = pathValue.startsWith('/') ? pathValue.slice(1) : pathValue;
    const url = new URL(`https://graph.facebook.com/${this.config.metaApiVersion}/${cleanPath}`);
    url.searchParams.set('access_token', token);
    if (this.config.appSecret) url.searchParams.set('appsecret_proof', createAppSecretProof(token, this.config.appSecret));

    const init: RequestInit = { method };
    if (method === 'GET') {
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
    } else {
      init.headers = { 'content-type': 'application/json' };
      init.body = JSON.stringify(payload);
    }

    const response = await this.fetchImpl(url, init);
    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : {};
    if (!response.ok) {
      throw new MetaApiError(`Meta API request failed with status ${response.status}`, response.status, sanitizeSecrets(data));
    }
    return sanitizeSecrets(data);
  }
}
