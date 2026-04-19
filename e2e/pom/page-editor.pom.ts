import { expect, type Locator, type Page } from '@playwright/test';

export type PanelTab = 'edit' | 'ai' | 'seo';
export type Viewport = 'desktop' | 'tablet' | 'mobile';

export class PageEditorPom {
  constructor(private readonly page: Page) {}

  async goto(websiteId: string, pageId: string): Promise<void> {
    await this.page.goto(`/dashboard/${websiteId}/pages/${pageId}/edit`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await this.page.waitForSelector('[class*="studio-shell"]', { timeout: 30000 });
  }

  topbar(): Locator {
    return this.page.locator('[class*="studio-shell"]').first();
  }

  async clickSave(): Promise<void> {
    await this.page.getByRole('button', { name: /^Save$/ }).click();
  }

  async waitForSaved(): Promise<void> {
    await expect(this.page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 20000 });
  }

  async save(): Promise<void> {
    await this.clickSave();
    await this.waitForSaved();
  }

  async saveViaHotkey(): Promise<void> {
    const isMac = process.platform === 'darwin';
    await this.page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');
    await this.waitForSaved();
  }

  async publish(): Promise<void> {
    await this.page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(this.page.getByRole('button', { name: /^Publish$/ })).not.toHaveText(/Publishing/i, {
      timeout: 20000,
    });
  }

  async openTranscreate(): Promise<void> {
    await this.page.getByRole('button', { name: /Traducir a/i }).click();
    await expect(this.page.getByRole('dialog')).toBeVisible();
  }

  async setViewport(viewport: Viewport): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(`^${viewport}`, 'i') }).first().click();
  }

  async switchPanel(tab: PanelTab): Promise<void> {
    const label = tab === 'edit' ? 'Edit' : tab === 'ai' ? 'AI' : 'SEO';
    await this.page.getByRole('tab', { name: label, exact: true }).click();
  }

  async undo(): Promise<void> {
    const isMac = process.platform === 'darwin';
    await this.page.keyboard.press(isMac ? 'Meta+z' : 'Control+z');
  }

  async redo(): Promise<void> {
    const isMac = process.platform === 'darwin';
    await this.page.keyboard.press(isMac ? 'Meta+Shift+z' : 'Control+Shift+z');
  }

  async openAddSection(): Promise<void> {
    await this.page.getByRole('button', { name: /^Add Section$/ }).click();
  }

  sectionCanvas(): Locator {
    return this.page.locator('main, [role="main"]').first();
  }

  sectionItems(): Locator {
    return this.sectionCanvas().locator('[data-section-id], [data-section-type]');
  }

  async selectSection(sectionId: string): Promise<void> {
    await this.sectionCanvas().locator(`[data-section-id="${sectionId}"]`).click();
  }

  async reorderSection(fromIndex: number, toIndex: number): Promise<void> {
    const items = this.sectionItems();
    const from = items.nth(fromIndex);
    const to = items.nth(toIndex);
    await from.dragTo(to);
  }

  async back(): Promise<void> {
    await this.page.getByRole('button', { name: /Back to pages/i }).click();
  }
}
