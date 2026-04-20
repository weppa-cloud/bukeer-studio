/**
 * EPIC #214 · W4 #218 — Content editor POM.
 *
 * Covers `/dashboard/[websiteId]/products/[slug]/content`:
 *  - HeroOverrideEditor (aria-label "Personalización del hero")
 *  - VideoUrlEditor (aria-label "Video del producto")
 *  - SectionVisibilityToggle (aria-label "Visibilidad de secciones")
 *  - SectionsReorderEditor (aria-label "Orden de secciones")
 *  - CustomSectionsEditor (aria-label "Secciones personalizadas")
 *
 * Uses accessible names (aria-label) as primary locators because these
 * surfaces do not yet expose a stable `data-testid` per editor block (they
 * use `data-product-id` for the outer wrapper only).
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class ContentEditorPom {
  constructor(private readonly page: Page) {}

  async goto(websiteId: string, slug: string): Promise<void> {
    await this.page.goto(`/dashboard/${websiteId}/products/${slug}/content`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await expect(this.heroSection()).toBeVisible({ timeout: 20000 });
  }

  heroSection(): Locator {
    return this.page.locator('section[aria-label="Personalización del hero"]');
  }
  videoSection(): Locator {
    return this.page.locator('section[aria-label="Video del producto"]');
  }
  visibilitySection(): Locator {
    return this.page.locator('section[aria-label="Visibilidad de secciones"]');
  }
  reorderSection(): Locator {
    return this.page.locator('section[aria-label="Orden de secciones"]');
  }
  customSectionsSection(): Locator {
    return this.page.locator('section[aria-label="Secciones personalizadas"]');
  }

  async enableHeroOverride(): Promise<void> {
    const toggle = this.heroSection().getByRole('button', {
      name: /Personalizar hero para esta página/i,
    });
    const pressed = await toggle.getAttribute('aria-pressed');
    if (pressed !== 'true') await toggle.click();
    await expect(this.heroSection().getByLabel('Título', { exact: true })).toBeVisible();
  }

  async saveHeroOverride(next: { title?: string; subtitle?: string; backgroundImage?: string }): Promise<void> {
    await this.enableHeroOverride();
    const section = this.heroSection();
    if (typeof next.title === 'string') {
      await section.getByLabel('Título', { exact: true }).fill(next.title);
    }
    if (typeof next.subtitle === 'string') {
      await section.getByLabel('Subtítulo').fill(next.subtitle);
    }
    if (typeof next.backgroundImage === 'string') {
      await section.getByLabel('URL de imagen de hero').fill(next.backgroundImage);
    }
    await section.getByRole('button', { name: /^Guardar$/ }).click();
    await expect(section.locator('[role="status"]', { hasText: /Guardado/i })).toBeVisible({
      timeout: 15_000,
    });
  }

  async saveVideoUrl(url: string, caption?: string): Promise<void> {
    const section = this.videoSection();
    await section.getByLabel('URL del video').fill(url);
    if (typeof caption === 'string') {
      await section.getByLabel(/Título del video/).fill(caption);
    }
    await section.getByRole('button', { name: /^Guardar$/ }).click();
    await expect(section.locator('[role="status"]', { hasText: /Guardado/i })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Toggle visibility for a section by its accessible label.
   * Example: `toggleVisibility('hero', { hidden: true })`.
   */
  async toggleVisibility(sectionLabel: string, opts: { hidden: boolean }): Promise<void> {
    const toggle = this.visibilitySection().getByRole('button', {
      name: new RegExp(`Alternar visibilidad: ${sectionLabel}`, 'i'),
    });
    const pressed = await toggle.getAttribute('aria-pressed');
    const currentlyVisible = pressed === 'true';
    const wantVisible = !opts.hidden;
    if (currentlyVisible !== wantVisible) {
      await toggle.click();
    }
  }

  async nudgeSection(index: number, direction: 'up' | 'down'): Promise<void> {
    const labelSuffix = direction === 'up' ? 'Subir' : 'Bajar';
    const btns = this.reorderSection().getByRole('button', {
      name: new RegExp(`^${labelSuffix}:`),
    });
    await btns.nth(index).click();
  }

  customSectionItems(): Locator {
    return this.customSectionsSection().locator('[role="list"] > li');
  }

  async addCustomSection(kind: 'text' | 'image_text' | 'cta' | 'spacer'): Promise<void> {
    const section = this.customSectionsSection();
    await section.getByRole('button', { name: /Agregar sección/i }).click();
    const select = this.page.locator('#section-type');
    await select.selectOption(kind);
    await this.page.getByRole('button', { name: /^Agregar$/ }).click();
  }
}
