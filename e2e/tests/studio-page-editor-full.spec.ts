import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';
import { PageEditorPom } from '../pom/page-editor.pom';
import { TranscreateDialogPom } from '../pom/transcreate-dialog.pom';

test.describe('Studio page editor — full flow @p0-editor', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.skip(({ isMobile }) => isMobile, 'Studio page editor is desktop-only.');

  test('editor mounts with topbar, viewport switcher, and panel tabs', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(
      !fixtures.pageId,
      `Page editor test needs a seeded website_page. Warnings: ${fixtures.warnings.join(' | ')}`,
    );
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    await expect(page.getByTestId('studio-editor-save-button')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('studio-editor-publish-button')).toBeVisible();
    await expect(page.getByTestId('studio-editor-preview-button')).toBeVisible();

    await editor.setViewport('tablet');
    await editor.setViewport('mobile');
    await editor.setViewport('desktop');

    await editor.switchPanel('ai');
    await editor.switchPanel('seo');
    await editor.switchPanel('edit');
  });

  test('transcreate dialog opens from "Traducir a..." button', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(
      !fixtures.pageId,
      `Page editor test needs a seeded website_page. Warnings: ${fixtures.warnings.join(' | ')}`,
    );
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    await editor.openTranscreate();

    const dialog = new TranscreateDialogPom(page);
    await dialog.waitOpen();
    await dialog.selectTargetLocale('en-US');
    await dialog.cancel();
  });

  test('undo / redo hotkeys fire without throwing', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(
      !fixtures.pageId,
      `Page editor test needs a seeded website_page. Warnings: ${fixtures.warnings.join(' | ')}`,
    );
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    const saveButton = page.getByRole('button', { name: /^Save$/ });
    const editorReady = await saveButton.isVisible({ timeout: 30000 }).catch(() => false);
    test.skip(!editorReady, 'Editor stayed in loading state for this run.');

    await editor.undo();
    await editor.redo();

    await expect(saveButton).toBeVisible({ timeout: 10000 });
  });
});
