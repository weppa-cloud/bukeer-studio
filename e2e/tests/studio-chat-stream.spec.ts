import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';
import { PageEditorPom } from '../pom/page-editor.pom';

test.describe('Studio chat — copilot stream @p0-editor', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.skip(({ isMobile }) => isMobile, 'Studio chat panel is desktop-only.');

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test('user message triggers mocked assistant stream', async ({ page }) => {
    await page.route('**/api/ai/studio-chat', async (route) => {
      // AI SDK v5 UI message stream chunks over SSE.
      const stream = [
        'data: {"type":"start","messageId":"m1"}\n\n',
        'data: {"type":"text-start","id":"t1"}\n\n',
        'data: {"type":"text-delta","id":"t1","delta":"Mock assistant response."}\n\n',
        'data: {"type":"text-end","id":"t1"}\n\n',
        'data: {"type":"finish","finishReason":"stop"}\n\n',
        'data: [DONE]\n\n',
      ].join('');
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'X-Vercel-AI-UI-Message-Stream': 'v1',
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
