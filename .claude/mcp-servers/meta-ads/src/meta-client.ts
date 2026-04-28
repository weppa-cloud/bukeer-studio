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
  private readonly requestTimestamps: number[] = [];

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

    const response = await this.fetchWithPolicy(url, init);
    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : {};
    if (!response.ok) {
      throw new MetaApiError(`Meta API request failed with status ${response.status}`, response.status, sanitizeSecrets(data));
    }
    return sanitizeSecrets(data);
  }

  private async fetchWithPolicy(url: URL, init: RequestInit): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      await this.waitForRateLimitSlot();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
      try {
        const response = await this.fetchImpl(url, { ...init, signal: controller.signal });
        if (!this.shouldRetry(response.status) || attempt === this.config.maxRetries) {
          return response;
        }
        lastError = new MetaApiError(`Meta API retryable status ${response.status}`, response.status, {});
      } catch (error) {
        lastError = error;
        if (attempt === this.config.maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
      } finally {
        clearTimeout(timeout);
      }
      await sleep(this.retryDelay(attempt));
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async waitForRateLimitSlot(): Promise<void> {
    const windowMs = 60_000;
    const now = Date.now();
    while (this.requestTimestamps.length > 0 && now - this.requestTimestamps[0] >= windowMs) {
      this.requestTimestamps.shift();
    }
    if (this.requestTimestamps.length >= this.config.rateLimitPerMinute) {
      const waitMs = windowMs - (now - this.requestTimestamps[0]);
      await sleep(Math.max(waitMs, 0));
    }
    this.requestTimestamps.push(Date.now());
  }

  private shouldRetry(status: number): boolean {
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }

  private isRetryableError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  private retryDelay(attempt: number): number {
    return this.config.retryBaseDelayMs * 2 ** attempt + Math.floor(Math.random() * 50);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
