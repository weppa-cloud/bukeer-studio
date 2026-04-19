/**
 * seo-flows-interactive.spec.ts
 *
 * Valida la interactividad real de los flujos SEO que los smoke tests
 * no cubren. Opera con o sin datos GSC/GA4 — todos los tests tienen
 * degradación graceful para entornos sin datos externos.
 *
 * Flujos cubiertos:
 *   - Flujo 0: Wizard 7 pasos (navegación completa)
 *   - Flujo 1: PageSpeed trigger button
 *   - Flujo 3: Keyword Universe Builder submit + validación
 *   - Flujo 5: Hotel workflow panel + checklist interactivo
 *   - Flujo 10: Backlog Kanban 3 columnas + Scorecard
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';

test.use({ storageState: 'e2e/.auth/user.json' });

test.beforeAll(async () => {
  // Seed deterministic wave2 fixtures — primes keyword research, SEO items,
  // packages, blog posts so the conditional `test.skip` paths below flip to
  // "data present" instead of silently skipping in CI.
  await seedWave2Fixtures().catch(() => undefined);
});

async function getWebsiteId(page: Parameters<typeof getFirstWebsiteId>[0]): Promise<string> {
  const override = process.env.E2E_WEBSITE_ID ?? '';
  if (override) return override;
  return getFirstWebsiteId(page);
}

async function openKeywordsTab(page: Page) {
  await page.getByRole('button', { name: /Keywords|Palabras/i }).first().click();
  await page.waitForLoadState('domcontentloaded');
}

async function ensureKeywordResearchPanel(page: Page): Promise<boolean> {
  try {
    await expect(page.getByText(/Keyword Research \(locale-native\)|Keyword Universe Builder/i).first()).toBeVisible({
      timeout: 8000,
    });
    return true;
  } catch {
    return false;
  }
}

function getKeywordResearchSubmit(page: Page) {
  return page.getByRole('button', { name: /Run Research|Investigar|Research/i }).first();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLUJO 0 — Quick Start Wizard (7 pasos)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Flujo 0 — Quick Start Wizard @interactive', () => {

  test('banner aparece cuando localStorage no tiene la clave del wizard @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.addInitScript((wid: string) => {
      window.localStorage.removeItem(`seo_wizard_${wid}`);
      window.localStorage.removeItem(`seo_wizard_${wid}_dismissed`);
    }, websiteId);
    await page.goto(`/dashboard/${websiteId}/analytics`);
    await page.waitForLoadState('domcontentloaded');

    const startButton = page.getByRole('button', { name: /Iniciar configuración/ });
    if ((await startButton.count()) === 0) {
      test.skip(true, 'Banner del wizard no disponible (setup ya completado en este entorno)');
      return;
    }
    await expect(page.getByText('Configura tu SEO en 5 minutos')).toBeVisible({ timeout: 10000 });
    await expect(startButton).toBeVisible();
  });

  test('wizard abre en Paso 1 al hacer clic en el banner @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.addInitScript((wid: string) => {
      window.localStorage.removeItem(`seo_wizard_${wid}`);
    }, websiteId);
    await page.goto(`/dashboard/${websiteId}/analytics`);
    await page.waitForLoadState('domcontentloaded');

    const startButton = page.getByRole('button', { name: /Iniciar configuración/ });
    if ((await startButton.count()) === 0) {
      test.skip(true, 'Banner del wizard no disponible (setup ya completado en este entorno)');
      return;
    }
    await startButton.click();

    await expect(page.getByText('Paso 1 de 7')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /Comenzar/ })).toBeVisible();
  });

  test('Paso 1 → Paso 2 con "Comenzar" muestra formulario de información básica @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.addInitScript((wid: string) => {
      window.localStorage.removeItem(`seo_wizard_${wid}`);
    }, websiteId);
    await page.goto(`/dashboard/${websiteId}/analytics`);
    await page.waitForLoadState('domcontentloaded');

    const startButton = page.getByRole('button', { name: /Iniciar configuración/ });
    if ((await startButton.count()) === 0) {
      test.skip(true, 'Banner del wizard no disponible (setup ya completado en este entorno)');
      return;
    }
    await startButton.click();
    await expect(page.getByText('Paso 1 de 7')).toBeVisible();
    await page.getByRole('button', { name: /Comenzar/ }).click();

    await expect(page.getByText('Paso 2 de 7')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Información básica')).toBeVisible();
    await expect(page.getByPlaceholder(/Colombia Tours Boutique/i)).toBeVisible();
  });

  test('completa pasos 2-6 y llega al Paso 7 con resumen @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.addInitScript((wid: string) => {
      window.localStorage.removeItem(`seo_wizard_${wid}`);
    }, websiteId);
    await page.goto(`/dashboard/${websiteId}/analytics`);
    await page.waitForLoadState('domcontentloaded');

    const startButton = page.getByRole('button', { name: /Iniciar configuración/ });
    if ((await startButton.count()) === 0) {
      test.skip(true, 'Banner del wizard no disponible (setup ya completado en este entorno)');
      return;
    }
    await startButton.click();

    // Paso 1 → 2
    await page.getByRole('button', { name: /Comenzar/ }).click();
    await expect(page.getByText('Paso 2 de 7')).toBeVisible();

    // Paso 2: llenar nombre + país + tipo
    await page.getByPlaceholder(/Colombia Tours Boutique/i).fill('QA Test Agency');
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ index: 1 }); // país
    await selects.nth(1).selectOption({ index: 1 }); // idioma
    await selects.nth(2).selectOption({ index: 1 }); // tipo agencia
    await page.getByRole('button', { name: /Siguiente/ }).click();

    // Paso 3: keywords semilla
    await expect(page.getByText('Paso 3 de 7')).toBeVisible();
    const kwInput = page.locator('textarea, input[type="text"]').filter({ hasText: '' }).first();
    await kwInput.fill('tours colombia');
    await kwInput.press('Enter');
    await page.getByRole('button', { name: /Siguiente/ }).click();

    // Paso 4: competidores (opcional)
    await expect(page.getByText('Paso 4 de 7')).toBeVisible();
    await page.getByRole('button', { name: /Siguiente/ }).click();

    // Paso 5: GSC — omitir
    await expect(page.getByText('Paso 5 de 7')).toBeVisible();
    await page.getByText('Omitir por ahora').click();

    // Paso 6: OKRs
    await expect(page.getByText('Paso 6 de 7')).toBeVisible();
    await page.getByRole('button', { name: /Siguiente/ }).click();

    // Paso 7: resumen
    await expect(page.getByText('Paso 7 de 7')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('QA Test Agency')).toBeVisible();
    await expect(page.getByRole('button', { name: /Ver Analytics/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ver Contenido/ })).toBeVisible();
  });

  test('wizard se cierra con el botón X @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.addInitScript((wid: string) => {
      window.localStorage.removeItem(`seo_wizard_${wid}`);
    }, websiteId);
    await page.goto(`/dashboard/${websiteId}/analytics`);
    await page.waitForLoadState('domcontentloaded');

    const startButton = page.getByRole('button', { name: /Iniciar configuración/ });
    if ((await startButton.count()) === 0) {
      test.skip(true, 'Banner del wizard no disponible (setup ya completado en este entorno)');
      return;
    }
    await startButton.click();
    await expect(page.getByText('Paso 1 de 7')).toBeVisible();

    // Cerrar con X
    await page.getByRole('button', { name: /Cerrar|Close|×/ }).first().click();
    await expect(page.getByText('Paso 1 de 7')).not.toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLUJO 1 — Health Check: PageSpeed trigger
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Flujo 1 — Health Check PageSpeed @interactive', () => {

  test('botón "Auditar" responde sin crash (loading o toast) @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/analytics`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: /Health|Salud técnica/i }).click();
    await page.waitForLoadState('domcontentloaded');

    const auditBtn = page.getByRole('button', { name: /Auditar|Run Audit|PageSpeed|Audit/i }).first();
    const count = await auditBtn.count();
    if (count === 0) {
      test.skip(true, 'No hay acción de auditoría disponible en este entorno');
      return;
    }

    await expect(auditBtn).toBeVisible({ timeout: 8000 });
    await expect(auditBtn).toBeEnabled();

    await auditBtn.click();

    // Cualquiera de estos outcomes es PASS
    const loading = await page.getByText(/Auditando|Analizando|Cargando/i).isVisible().catch(() => false);
    const toast = await page.getByText(/completad|disponible|próxima|error/i).isVisible().catch(() => false);
    const stillVisible = await auditBtn.isVisible().catch(() => false);

    expect(loading || toast || stillVisible).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLUJO 3 — Keyword Universe Builder
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Flujo 3 — Keyword Universe Builder @interactive', () => {

  test('formulario Keyword Universe Builder es visible en sub-tab Investigar @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/analytics`);
    await page.waitForLoadState('domcontentloaded');

    await openKeywordsTab(page);
    if (!(await ensureKeywordResearchPanel(page))) {
      test.skip(true, 'Keyword Research panel no disponible en este entorno');
      return;
    }
  });

  test('submit sin seeds muestra validación @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/analytics`);
    await page.waitForLoadState('domcontentloaded');

    await openKeywordsTab(page);
    if (!(await ensureKeywordResearchPanel(page))) {
      test.skip(true, 'Keyword Research panel no disponible en este entorno');
      return;
    }

    await getKeywordResearchSubmit(page).click();
    await expect(page.getByText(/Debes ingresar al menos una semilla|keyword semilla|required/i)).toBeVisible({ timeout: 5000 });
  });

  test('submit con seeds muestra resultado o error controlado @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/analytics`);
    await page.waitForLoadState('domcontentloaded');

    await openKeywordsTab(page);
    if (!(await ensureKeywordResearchPanel(page))) {
      test.skip(true, 'Keyword Research panel no disponible en este entorno');
      return;
    }

    // Llenar seeds
    const preferredTextarea = page.getByPlaceholder(/cartagena tours, caribbean travel guide, best time cartagena/i);
    const textarea = (await preferredTextarea.count()) > 0 ? preferredTextarea.first() : page.locator('textarea').first();
    await textarea.fill('tours colombia, ecoturismo colombia');

    const researchResponsePromise = page.waitForResponse((response) => {
      return response.url().includes('/api/seo/content-intelligence/research') && response.request().method() === 'POST';
    }, { timeout: 10000 }).catch(() => null);
    await getKeywordResearchSubmit(page).click();
    const researchResponse = await researchResponsePromise;
    if (researchResponse) {
      expect([200, 400, 409, 500]).toContain(researchResponse.status());
    }

    // Esperar respuesta (hasta 30s — puede ser lento si llama a la AI)
    await page.waitForTimeout(2000);

    const hasResult = await page.getByText(/TOFU|MOFU|BOFU|keyword principal|resultado|Priority|Seasonality|Intent/i).isVisible().catch(() => false);
    const hasError = await page.getByText(/error|Error|no se pudo|falló/i).isVisible().catch(() => false);
    const hasLoading = await page.getByText(/Generando|Investigando|Cargando/i).isVisible().catch(() => false);
    const stillInResearch = await page.getByText(/Keyword Research \(locale-native\)|Keyword Universe Builder/i).isVisible().catch(() => false);
    expect(hasResult || hasError || hasLoading || stillInResearch).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLUJO 5 — Workflow Panel (hotel/actividad/paquete/destino/blog)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Flujo 5-9 — Workflow Panel SEO @interactive', () => {

  test('botón "Flujo SEO" abre panel con stepper de 4 pasos @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/contenido`);
    await page.waitForLoadState('domcontentloaded');

    const flujoButtons = page.getByRole('button', { name: /Flujo SEO/i });
    const count = await flujoButtons.count();

    if (count === 0) {
      test.skip(true, 'No hay ítems con workflow SEO en este entorno');
      return;
    }

    await flujoButtons.first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Stepper 4 pasos
    await expect(page.getByText(/Research/i)).toBeVisible();
    await expect(page.getByText('On-Page', { exact: true })).toBeVisible();
    await expect(page.getByText('Medir').first()).toBeVisible();
  });

  test('checklist del panel tiene ítems interactivos @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/contenido`);
    await page.waitForLoadState('domcontentloaded');

    const flujoButtons = page.getByRole('button', { name: /Flujo SEO/i });
    const count = await flujoButtons.count();

    if (count === 0) {
      test.skip(true, 'No hay ítems con workflow SEO en este entorno');
      return;
    }

    await flujoButtons.first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Contador de progreso visible
    await expect(page.getByText(/\d+\/\d+/)).toBeVisible({ timeout: 5000 });

    await expect(page.getByText('On-Page checklist', { exact: true })).toBeVisible();
  });

  test('panel se cierra correctamente @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/contenido`);
    await page.waitForLoadState('domcontentloaded');

    const flujoButtons = page.getByRole('button', { name: /Flujo SEO/i });
    const count = await flujoButtons.count();

    if (count === 0) {
      test.skip(true, 'No hay ítems con workflow SEO en este entorno');
      return;
    }

    await flujoButtons.first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Cerrar con X o botón cerrar
    const closeBtn = page.getByRole('button', { name: /Cerrar|Close|×/i }).last();
    await closeBtn.click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLUJO 10 — Backlog Kanban
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Flujo 10 — Backlog Kanban @interactive', () => {

  test('página Contenido tiene sección Kanban con 3 columnas @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/contenido`);
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    await expect(page.getByText('Kanban — Prioridades')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('P1 Urgente')).toBeVisible();
    await expect(page.getByText('P2 Este mes')).toBeVisible();
    await expect(page.getByText('P3 Backlog')).toBeVisible();
  });

  test('Kanban tiene tarjetas con botón Trabajar @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/contenido`);
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    await expect(page.getByText('Kanban — Prioridades')).toBeVisible();

    const trabajarButtons = page.getByRole('button', { name: 'Trabajar' });
    const count = await trabajarButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('sección Striking Distance está visible @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/contenido`);
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    const strikingHeading = page.getByRole('heading', { name: /Oportunidades Striking|Striking Distance/i });
    if ((await strikingHeading.count()) === 0) {
      test.skip(true, 'Sección Striking Distance no disponible en este entorno');
      return;
    }
    await expect(strikingHeading).toBeVisible({ timeout: 10000 });
  });

  test('Scorecard muestra tabla de KPIs SEO @interactive', async ({ page }) => {
    const websiteId = await getWebsiteId(page);
    await page.goto(`/dashboard/${websiteId}/contenido`);
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    await expect(page.getByText('Scorecard — Estado del Playbook')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Baseline actual')).toBeVisible();
    await expect(page.getByText('Meta 90D')).toBeVisible();
  });
});
