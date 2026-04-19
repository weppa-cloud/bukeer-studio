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
      // Minimal AI SDK v5 transport stream: emit a single text chunk.
      const stream = [
        '0:"Mock assistant response."\n',
        'd:{"finishReason":"stop"}\n',
      ].join('');
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
        body: stream,
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
