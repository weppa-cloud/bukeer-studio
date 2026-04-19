import { expect, type Locator, type Page } from '@playwright/test';

export type TranscreatePageType =
  | 'blog'
  | 'destination'
  | 'package'
  | 'activity'
  | 'page'
  | 'hotel'
  | 'transfer';

export class TranscreateDialogPom {
  constructor(private readonly page: Page) {}

  dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  async waitOpen(): Promise<void> {
    await expect(this.dialog()).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Traducir contenido' })).toBeVisible();
  }

  async selectSourceLocale(locale: string): Promise<void> {
    await this.dialog().locator('#transcreate-source-locale').selectOption(locale);
  }

  async selectTargetLocale(locale: string): Promise<void> {
    await this.dialog().locator('#transcreate-target-locale').selectOption(locale);
  }

  async selectPageType(type: TranscreatePageType): Promise<void> {
    await this.dialog().locator('#transcreate-page-type').selectOption(type);
  }

  async clickCreateDraft(): Promise<void> {
    await this.dialog().getByRole('button', { name: /Crear borrador/i }).click();
  }

  async clickGenerateWithAI(): Promise<void> {
    await this.dialog().getByRole('button', { name: /Generate with AI|Generando con IA|Guardando draft AI/i }).click();
  }

  async waitForAiPreview(): Promise<void> {
    const textarea = this.dialog().locator('textarea[readonly]');
    await expect(textarea).toBeVisible({ timeout: 30000 });
    await expect(textarea).not.toHaveValue('', { timeout: 30000 });
  }

  async clickSyncNow(): Promise<void> {
    await this.dialog().getByRole('button', { name: /Sincronizar ahora|Sincronizando/i }).click();
  }

  async expectError(code: string): Promise<void> {
    await expect(this.dialog().getByText(`[${code}]`, { exact: false })).toBeVisible();
  }

  async cancel(): Promise<void> {
    await this.dialog().getByRole('button', { name: /^Cancelar$/ }).click();
  }

  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.dialog()).toBeHidden({ timeout: 5000 });
  }
}
