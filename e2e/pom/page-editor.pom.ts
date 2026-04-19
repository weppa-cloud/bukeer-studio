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
    // #226 — prefer stable testid contract; fall back to role for legacy
    // picker/structure tabs that still use plain buttons.
    const testId = `studio-editor-panel-${tab}`;
    const byTestId = this.page.getByTestId(testId);
    const count = await byTestId.count().catch(() => 0);
    if (count > 0) {
      await byTestId.first().click({ timeout: 10_000 });
      return;
    }

    const label = tab === 'edit' ? 'Edit' : tab === 'ai' ? 'AI' : 'SEO';
    const tabByRole = this.page.getByRole('tab', { name: label, exact: true }).first();
    if (await tabByRole.isVisible().catch(() => false)) {
      await tabByRole.click();
      return;
    }

    await this.page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first().click();
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
    const addSectionButton = this.page.getByRole('button', { name: /^Add Section$/i }).first();
    if (await addSectionButton.isVisible().catch(() => false)) {
      await addSectionButton.click();
      return;
    }

    // If a section is selected, clear focus in the canvas so the empty-state CTA appears.
    await this.sectionCanvas().click({ position: { x: 12, y: 12 } }).catch(() => undefined);
    await addSectionButton.click({ timeout: 10_000 });
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
