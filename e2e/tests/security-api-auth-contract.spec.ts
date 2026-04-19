import { test, expect, request as playwrightRequest } from '@playwright/test';

/**
 * Contract tests for API-level auth boundaries. These issue unauthenticated
 * HTTP calls via a fresh request context (no storageState). Wave2 adds
 * transcreate-stream, translations/bulk, and media/upload; all must reject
 * anonymous requests.
 */
test.describe('Security — API auth contract', () => {
  test('POST /api/ai/editor/generate-section rejects anonymous calls', async ({ baseURL }) => {
    const ctx = await playwrightRequest.newContext({ baseURL });
    const response = await ctx.post('/api/ai/editor/generate-section', {
      data: { websiteId: '00000000-0000-4000-8000-000000000000' },
    });
    expect([401, 403, 400]).toContain(response.status());
    await ctx.dispose();
  });

  test('POST /api/seo/content-intelligence/transcreate rejects anonymous', async ({ baseURL }) => {
    const ctx = await playwrightRequest.newContext({ baseURL });
    const response = await ctx.post('/api/seo/content-intelligence/transcreate', {
      data: { action: 'create_draft' },
    });
    expect([401, 403, 400]).toContain(response.status());
    await ctx.dispose();
  });

  test('POST /api/seo/translations/bulk rejects anonymous', async ({ baseURL }) => {
    const ctx = await playwrightRequest.newContext({ baseURL });
    const response = await ctx.post('/api/seo/translations/bulk', {
      data: { websiteId: 'x', jobIds: [], action: 'apply' },
    });
    expect([401, 403, 400]).toContain(response.status());
    await ctx.dispose();
  });

  test('POST /api/revalidate rejects missing/invalid secret', async ({ baseURL }) => {
    const ctx = await playwrightRequest.newContext({ baseURL });
    const response = await ctx.post('/api/revalidate', {
      data: { path: '/', secret: 'definitely-not-the-secret' },
    });
    expect([401, 403, 400]).toContain(response.status());
    await ctx.dispose();
  });

  test('POST /api/media/upload rejects anonymous multipart', async ({ baseURL }) => {
    const ctx = await playwrightRequest.newContext({ baseURL });
    const response = await ctx.post('/api/media/upload', {
      multipart: {
        websiteId: 'x',
        entityType: 'package',
        entityId: 'y',
        usageContext: 'gallery',
        locale: 'es-CO',
      },
    });
    expect([401, 403, 400]).toContain(response.status());
    await ctx.dispose();
  });
});
