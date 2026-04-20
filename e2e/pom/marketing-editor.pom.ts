/**
 * EPIC #214 · W4 #218 — Marketing editor POM.
 *
 * Covers `/dashboard/[websiteId]/products/[slug]/marketing`:
 *  - DescriptionEditor (`marketing-editor-description`)
 *  - HighlightsEditor (`marketing-editor-highlights`)
 *  - InclusionsExclusionsEditor (`marketing-editor-inclusions-exclusions`)
 *  - RecommendationsEditor (`marketing-editor-recommendations`)
 *  - InstructionsEditor (`marketing-editor-instructions`)
 *  - SocialImagePicker (`marketing-editor-social-image`)
 *  - GalleryCurator
 *
 * Only `description` + `program_highlights` are exercised by the W4 specs in
 * this wave; other surfaces are exposed here so future waves (W4.1 follow-up,
 * W6 matrix) can reuse without duplicating locators.
 *
 * Does NOT wire hotel editor surfaces (ADR-025 Flutter-owner).
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class MarketingEditorPom {
  constructor(private readonly page: Page) {}

  async goto(websiteId: string, slug: string): Promise<void> {
    await this.page.goto(`/dashboard/${websiteId}/products/${slug}/marketing`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await expect(this.page.getByTestId('marketing-editor-description')).toBeVisible({
      timeout: 20000,
    });
  }

  descriptionSection(): Locator {
    return this.page.getByTestId('marketing-editor-description');
  }

  highlightsSection(): Locator {
    return this.page.getByTestId('marketing-editor-highlights');
  }

  async setDescription(next: string): Promise<void> {
    const section = this.descriptionSection();
    const textarea = section.getByRole('textbox', { name: /Contenido/i }).first();
    await textarea.fill('');
    await textarea.fill(next);
    await section.getByRole('button', { name: /^Guardar$/ }).click();
    await expect(section.getByRole('status', { name: /Guardado/i })).toBeVisible({
      timeout: 15_000,
    });
  }

  async replaceHighlights(next: string[]): Promise<void> {
    const section = this.highlightsSection();

    // Remove all existing items (editor allows up to 12).
    for (let safety = 0; safety < 12; safety += 1) {
      const removeButtons = section.getByRole('button', { name: /^Eliminar\s+\d+$/ });
      const count = await removeButtons.count();
      if (count === 0) break;
      await removeButtons.first().click();
    }

    // Add + fill requested items.
    for (let i = 0; i < next.length; i += 1) {
      await section.getByRole('button', { name: /Agregar highlight/i }).click();
      const input = section.getByRole('textbox', { name: new RegExp(`^Highlight ${i + 1}$`) });
      await input.fill(next[i]);
    }

    await section.getByRole('button', { name: /^Guardar$/ }).click();
    await expect(section.getByRole('status', { name: /Guardado/i })).toBeVisible({
      timeout: 15_000,
    });
  }
}
