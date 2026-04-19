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
    // #226.A — primary lookup uses the stable testid emitted by StudioTabs
    // (`${testIdPrefix}-${id}` → `studio-editor-panel-${tab}`). This avoids
    // collisions with picker/left-panel tabs AND masks the previous role="button"
    // fallback that silently matched unrelated buttons on page load races.
    const testId = `studio-editor-panel-${tab}-tab`;
    const label = tab === 'edit' ? 'Edit' : tab === 'ai' ? 'AI' : 'SEO';
    const tablist = this.page.getByTestId('studio-editor-panel-tabs');

    // Wait for the tablist to mount — failing here surfaces the real cause
    // (editor did not mount) instead of timing out on a stale fallback.
    await tablist.waitFor({ state: 'visible', timeout: 15_000 });

    // Primary — tab by testid (StudioTabs exposes `${testIdPrefix}-${id}`).
    const byTestId = tablist.getByTestId(`studio-editor-panel-${tab}`);
    if (await byTestId.count().catch(() => 0) > 0) {
      await byTestId.first().click({ timeout: 10_000 });
      return;
    }

    // Fallback 1 — scoped role=tab with exact label.
    const scoped = tablist.getByRole('tab', { name: label, exact: true });
    if (await scoped.count().catch(() => 0) > 0) {
      await scoped.first().click({ timeout: 10_000 });
      return;
    }

    // Fallback 2 — testid prefix without hyphen suffix (legacy layouts).
    const legacyPanelTestId = this.page.getByTestId(testId);
    if (await legacyPanelTestId.count().catch(() => 0) > 0) {
      await legacyPanelTestId.first().click({ timeout: 10_000 });
      return;
    }

    throw new Error(
      `switchPanel('${tab}'): editor tablist mounted but no tab matched. ` +
        `Expected testid "studio-editor-panel-${tab}" or role=tab name="${label}".`,
    );
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
