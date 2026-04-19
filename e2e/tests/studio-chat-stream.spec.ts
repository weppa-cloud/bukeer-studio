import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';
import { PageEditorPom } from '../pom/page-editor.pom';

test.describe('Studio chat — copilot stream @p0-editor', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  // #226 AC9 — desktop-only editor flow
  test.skip(({ isMobile }) => !!isMobile, 'desktop-only editor');

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test('user message triggers mocked assistant stream', async ({ page }) => {
    await page.route('**/api/ai/studio-chat', async (route) => {
      // #226.A — AI SDK v5 UI message stream (SSE). Each frame is a JSON-encoded
      // chunk matching `uiMessageChunkSchema` (text-start / text-delta / text-end)
      // followed by a [DONE] terminator. Matches the shape emitted by
      // `toUIMessageStreamResponse()` in `app/api/ai/studio-chat/route.ts`.
      //
      // The response header is `x-vercel-ai-ui-message-stream: v1` (v5 spec),
      // NOT the legacy v1 data-stream header `X-Vercel-AI-Data-Stream`.
      const TEXT_ID = 'mock-text-1';
      const chunks = [
        { type: 'text-start', id: TEXT_ID },
        { type: 'text-delta', id: TEXT_ID, delta: 'Mock assistant response.' },
        { type: 'text-end', id: TEXT_ID },
      ];
      const body =
        chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') +
        'data: [DONE]\n\n';

      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
          'x-vercel-ai-ui-message-stream': 'v1',
          'x-accel-buffering': 'no',
        },
        body,
      });
    });

    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.switchPanel('ai');

    const input = page.getByTestId('studio-chat-input');
    await expect(input).toBeVisible({ timeout: 15000 });

    await input.fill('Suggest an improvement to the hero section');
    await input.press('Enter');

    await expect(page.getByText('Mock assistant response.')).toBeVisible({ timeout: 10000 });
  });

  test('upstream error renders inline alert', async ({ page }) => {
    await page.route('**/api/ai/studio-chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Mocked stream failure' } }),
      });
    });

    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.switchPanel('ai');

    const input = page.getByTestId('studio-chat-input');
    await input.fill('Generate something');
    await input.press('Enter');

    await expect(page.getByTestId('studio-chat-error').first()).toBeVisible({ timeout: 10000 });
  });
});
