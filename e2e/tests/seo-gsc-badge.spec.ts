import { expect, test, type Page } from '@playwright/test';
import { getFirstWebsiteId } from './helpers';

const WEBSITE_ID_OVERRIDE = process.env.E2E_WEBSITE_ID ?? '';

type IntegrationStatusMock = {
  gscConnected?: boolean;
  delayMs?: number;
};

async function setupAnalyticsWithMockedStatus(page: Page, mock: IntegrationStatusMock): Promise<string> {
  const websiteId = WEBSITE_ID_OVERRIDE || await getFirstWebsiteId(page);

  await page.addInitScript((id: string) => {
    localStorage.removeItem(`seo_wizard_${id}`);
  }, websiteId);

  await page.route('**/api/seo/integrations/status?websiteId=*', async (route) => {
    if (mock.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, mock.delayMs));
    }

    if (typeof mock.gscConnected !== 'boolean') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          websiteId,
          gsc: {
            connected: false,
            configurationComplete: false,
            tokenExpiry: null,
            siteUrl: null,
            lastError: null,
          },
          ga4: {
            connected: false,
            configurationComplete: false,
            tokenExpiry: null,
            propertyId: null,
            lastError: null,
          },
          dataforseo: { connected: false, enabled: false },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        websiteId,
        gsc: {
          connected: mock.gscConnected,
          configurationComplete: mock.gscConnected,
          tokenExpiry: null,
          siteUrl: mock.gscConnected ? 'sc-domain:example.com' : null,
          lastError: null,
        },
        ga4: {
          connected: false,
          configurationComplete: false,
          tokenExpiry: null,
          propertyId: null,
          lastError: null,
        },
        dataforseo: { connected: false, enabled: false },
      }),
    });
  });

  await page.goto(`/dashboard/${websiteId}/analytics`);
  await expect(page.getByText('Configura tu SEO en 5 minutos')).toBeVisible();
  return websiteId;
}

async function openWizardOnGscStep(page: Page) {
  await page.getByRole('button', { name: 'Iniciar configuración →' }).click();
  await expect(page.getByText('¡Configura tu SEO en 5 minutos!')).toBeVisible();
  const wizard = page.locator('div.fixed.inset-0').first();

  await wizard.getByRole('button', { name: 'Comenzar →' }).click();
  await expect(wizard.getByRole('heading', { name: 'Información básica' })).toBeVisible();

  await wizard.getByPlaceholder('Ej: Colombia Tours Boutique').fill('Bukeer Test Agency');
  await wizard.locator('select').first().selectOption('colombia');
  await wizard.locator('select').nth(2).selectOption('boutique');
  await wizard.getByRole('button', { name: 'Siguiente →' }).click();

  await expect(wizard.getByRole('heading', { name: 'Palabras clave principales' })).toBeVisible();
  const keywordsArea = wizard.getByPlaceholder('tours colombia, paquetes ecoturismo, viajes sierra nevada');
  await keywordsArea.fill('tours colombia');
  await keywordsArea.press('Enter');
  await wizard.getByRole('button', { name: 'Siguiente →' }).click();

  await expect(wizard.getByRole('heading', { name: 'Competidores' })).toBeVisible();
  await wizard.getByRole('button', { name: 'Siguiente →' }).click();

  await expect(wizard.getByRole('heading', { name: 'Conectar Google Search Console' })).toBeVisible();
  return wizard;
}

test.describe('SEO Wizard GSC Badge States', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('shows "Conectado" badge when GSC is connected', async ({ page }) => {
    await setupAnalyticsWithMockedStatus(page, { gscConnected: true });
    const wizard = await openWizardOnGscStep(page);

    await expect(wizard.getByText('Conectado', { exact: true })).toBeVisible();
    await expect(wizard.getByText('No conectado')).toHaveCount(0);
    await expect(wizard.getByRole('button', { name: 'Conectar GSC →' })).toHaveCount(0);
  });

  test('shows "No conectado" badge and connect CTA when GSC is disconnected', async ({ page }) => {
    await setupAnalyticsWithMockedStatus(page, { gscConnected: false });
    const wizard = await openWizardOnGscStep(page);

    await expect(wizard.getByText('No conectado')).toBeVisible();
    await expect(wizard.getByRole('button', { name: 'Conectar GSC →' })).toBeVisible();
  });

  test('shows "Verificando..." while integration status is still loading', async ({ page }) => {
    await setupAnalyticsWithMockedStatus(page, { delayMs: 12000 });
    const wizard = await openWizardOnGscStep(page);

    await expect(wizard.getByText('Verificando...')).toBeVisible();
    await expect(wizard.getByRole('button', { name: 'Conectar GSC →' })).toHaveCount(0);
  });
});
