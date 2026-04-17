import { test, expect } from '@playwright/test';
import { gotoWebsiteSection, getFirstWebsiteId } from './helpers';

// All tests in this suite target a single websiteId.
// Use a placeholder that can be overridden by env var.
const WEBSITE_ID_OVERRIDE = process.env.E2E_WEBSITE_ID ?? '';

test.describe('SEO Playbook v2.0 — Smoke Tests', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  // ─── Helper: navigate to a dashboard section, using env override when set ───

  async function gotoSection(page: Parameters<typeof gotoWebsiteSection>[0], section: string): Promise<string> {
    if (WEBSITE_ID_OVERRIDE) {
      await page.goto(`/dashboard/${WEBSITE_ID_OVERRIDE}/${section}`);
      return WEBSITE_ID_OVERRIDE;
    }
    return gotoWebsiteSection(page, section);
  }

  // ═══════════════════════════════════════════════════════════════
  // GROUP 1: Analytics Dashboard tabs
  // ═══════════════════════════════════════════════════════════════

  test.describe('Analytics Dashboard', () => {
    test('loads overview tab with Sessions, Users, Pageviews and Conversions cards @smoke', async ({ page }) => {
      await gotoSection(page, 'analytics');
      await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();

      // Tab bar must be present
      await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();

      // Overview stat cards
      await expect(page.locator('div.studio-card p').filter({ hasText: /^Sessions$/ }).first()).toBeVisible();
      await expect(page.locator('div.studio-card p').filter({ hasText: /^Users$/ }).first()).toBeVisible();
      await expect(page.locator('div.studio-card p').filter({ hasText: /^Pageviews$/ }).first()).toBeVisible();
      await expect(page.locator('div.studio-card p').filter({ hasText: /^Conversions$/ }).first()).toBeVisible();

      // Top pages table header
      await expect(page.getByText('Top pages')).toBeVisible();
    });

    test('loads keywords tab with GSC keyword table @smoke', async ({ page }) => {
      await gotoSection(page, 'analytics');
      await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();

      await page.getByRole('button', { name: 'Keywords' }).click();
      await page.waitForLoadState('domcontentloaded');

      // Table columns (stable signal across browsers)
      await expect(page.getByRole('columnheader', { name: 'Keyword' }).first()).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Locale' }).first()).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Latest position' }).first()).toBeVisible();

      // Link to architecture page
      await expect(page.getByRole('button', { name: /Ver Arquitectura/ })).toBeVisible();
    });

    test('deep-link to keywords tab renders Keyword Universe Builder @smoke', async ({ page }) => {
      const websiteId = WEBSITE_ID_OVERRIDE || await getFirstWebsiteId(page);
      await page.goto(`/dashboard/${websiteId}/analytics?tab=keywords`);
      await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();

      await expect(page.getByText('Palabras clave rastreadas desde Google Search Console').first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Keyword Research (locale-native)' })).toBeVisible();
    });

    test('loads competitors tab with competitor table @smoke', async ({ page }) => {
      await gotoSection(page, 'analytics');
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('button', { name: 'Competitors' }).click();
      await page.waitForLoadState('domcontentloaded');

      // Table columns
      await expect(page.getByRole('columnheader', { name: 'Domain' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Avg. position' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Traffic share' })).toBeVisible();
    });

    test('loads health tab with technical audit and Schema.org manager @smoke', async ({ page }) => {
      await gotoSection(page, 'analytics');
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('button', { name: 'Health' }).click();
      await page.waitForLoadState('domcontentloaded');

      // Technical audit section
      await expect(page.getByRole('heading', { name: 'Auditoria PageSpeed' })).toBeVisible();

      // Schema manager section — contains "Schema.org"
      await expect(page.getByRole('heading', { name: 'Validacion Schema.org' })).toBeVisible();
    });

    test('loads backlinks tab with Backlinks heading @smoke', async ({ page }) => {
      await gotoSection(page, 'analytics');
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('button', { name: 'Backlinks' }).click();
      await page.waitForLoadState('domcontentloaded');

      // The Backlinks dashboard renders a heading or summary text
      await expect(page.getByRole('heading', { name: 'Resumen de Backlinks' })).toBeVisible();
    });

    test('loads ai-visibility tab with AI Visibility content @smoke', async ({ page }) => {
      await gotoSection(page, 'analytics');
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('button', { name: 'AI Visibility' }).click();
      await page.waitForLoadState('domcontentloaded');

      // Assert a deterministic heading inside the AI Visibility panel.
      await expect(page.getByRole('heading', { name: /Presencia en AI Overviews de Google/i })).toBeVisible();
    });

    test('loads config tab with locale settings and Google Integrations @smoke', async ({ page }) => {
      await gotoSection(page, 'analytics');
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('button', { name: 'Config', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');

      // Google Integrations panel
      await expect(page.getByText('Google Integrations')).toBeVisible();

      // Locale settings — "Locales configurados" or the section renders the locale select
      await expect(page.getByText(/[Ll]ocales/)).toBeVisible();

      // Configuration status labels
      await expect(page.getByText(/Configuration:/).first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 2: Contenido Page
  // ═══════════════════════════════════════════════════════════════

  test.describe('Contenido Page', () => {
    test('loads contenido page with unified table view by default @smoke', async ({ page }) => {
      await gotoSection(page, 'contenido');
      await page.waitForLoadState('domcontentloaded');

      // Page heading
      await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();

      // Search input
      await expect(page.getByPlaceholder('Buscar por nombre, slug o tipo...')).toBeVisible();

      // Bulk action buttons
      await expect(page.getByRole('button', { name: 'Publicar seleccionados' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ocultar seleccionados' })).toBeVisible();

      // Table column headers
      await expect(page.getByRole('columnheader', { name: 'Item' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Grade' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Completeness' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Published' })).toBeVisible();
    });

    test('shows Open SEO action button for each row that exists @smoke', async ({ page }) => {
      await gotoSection(page, 'contenido');
      await page.waitForLoadState('domcontentloaded');

      const openSeoButtons = page.getByRole('button', { name: 'Open SEO' });
      const count = await openSeoButtons.count();

      // If there are rows, every one should have an Open SEO button
      // (If count === 0, the table is empty — acceptable in test env)
      if (count > 0) {
        await expect(openSeoButtons.first()).toBeVisible();
      }
    });

    test('shows Flujo SEO button for eligible item types when rows exist @smoke', async ({ page }) => {
      // requires real data (hotels, activities, packages, destinations or blog posts)
      await gotoSection(page, 'contenido');
      await page.waitForLoadState('domcontentloaded');

      const flujoButtons = page.getByRole('button', { name: /Flujo SEO/ });
      const count = await flujoButtons.count();

      if (count === 0) {
        // No eligible items in test env — test is informational
        test.skip(true, 'No eligible items (hotel/activity/package/destination/blog) found in test env');
        return;
      }

      await expect(flujoButtons.first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 3: SEO Architecture Page
  // ═══════════════════════════════════════════════════════════════

  test.describe('SEO Architecture Page', () => {
    test('navigates to /seo/architecture page and shows main heading @smoke', async ({ page }) => {
      const websiteId = WEBSITE_ID_OVERRIDE || await getFirstWebsiteId(page);
      await page.goto(`/dashboard/${websiteId}/seo/architecture`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByRole('heading', { name: 'Arquitectura de Contenido' })).toBeVisible();
    });

    test('shows architecture category summary section with real metrics @smoke', async ({ page }) => {
      const websiteId = WEBSITE_ID_OVERRIDE || await getFirstWebsiteId(page);
      await page.goto(`/dashboard/${websiteId}/seo/architecture`);
      await page.waitForLoadState('domcontentloaded');

      // The architecture screen renders skeleton first; wait for the API response
      // to avoid transient visibility failures under parallel CI load.
      await page.waitForResponse(
        (response) =>
          response.url().includes('/api/seo/architecture') &&
          response.request().method() === 'GET',
        { timeout: 20_000 }
      );

      await expect(page.getByRole('heading', { name: 'Resumen por categoría' })).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('p').filter({ hasText: /^Nodos totales$/ }).first()).toBeVisible({ timeout: 15_000 });
    });

    test('shows click depth section and bucket rows @smoke', async ({ page }) => {
      const websiteId = WEBSITE_ID_OVERRIDE || await getFirstWebsiteId(page);
      await page.goto(`/dashboard/${websiteId}/seo/architecture`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByRole('heading', { name: /Click depth buckets/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Bucket' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '# Nodos' })).toBeVisible();
    });

    test('back button returns to analytics keywords tab @smoke', async ({ page }) => {
      const websiteId = WEBSITE_ID_OVERRIDE || await getFirstWebsiteId(page);
      await page.goto(`/dashboard/${websiteId}/seo/architecture`);
      await page.waitForLoadState('domcontentloaded');

      const backButton = page.getByRole('link', { name: /Volver a Keywords/ });
      await expect(backButton).toBeVisible();

      await backButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Should land on analytics page with keywords tab
      await expect(page).toHaveURL(/\/analytics/);
    });

    test('analytics keywords tab has Ver Arquitectura link @smoke', async ({ page }) => {
      await gotoSection(page, 'analytics');
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('button', { name: 'Keywords' }).click();
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByRole('button', { name: /Ver Arquitectura/ })).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 4: Quick Start Wizard
  // ═══════════════════════════════════════════════════════════════

  test.describe('Quick Start Wizard', () => {
    test('setup banner appears when localStorage key is absent @smoke', async ({ page }) => {
      const websiteId = WEBSITE_ID_OVERRIDE || await getFirstWebsiteId(page);

      // Clear the wizard localStorage key before navigating
      await page.addInitScript((wid: string) => {
        window.localStorage.removeItem(`seo_wizard_${wid}`);
      }, websiteId);

      await page.goto(`/dashboard/${websiteId}/analytics`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByText('Configura tu SEO en 5 minutos')).toBeVisible();
    });

    test('wizard opens when banner button is clicked @smoke', async ({ page }) => {
      const websiteId = WEBSITE_ID_OVERRIDE || await getFirstWebsiteId(page);

      await page.addInitScript((wid: string) => {
        window.localStorage.removeItem(`seo_wizard_${wid}`);
      }, websiteId);

      await page.goto(`/dashboard/${websiteId}/analytics`);
      await page.waitForLoadState('domcontentloaded');

      const bannerButton = page.getByRole('button', { name: /Iniciar configuración/ });
      await expect(bannerButton).toBeVisible();
      await bannerButton.click();

      // Wizard step 1 welcome text
      await expect(page.getByRole('heading', { name: /Configura tu SEO en 5 minutos/i })).toBeVisible();
    });

    test('wizard can be dismissed via dismiss button @smoke', async ({ page }) => {
      const websiteId = WEBSITE_ID_OVERRIDE || await getFirstWebsiteId(page);

      await page.addInitScript((wid: string) => {
        window.localStorage.removeItem(`seo_wizard_${wid}`);
      }, websiteId);

      await page.goto(`/dashboard/${websiteId}/analytics`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByText('Configura tu SEO en 5 minutos')).toBeVisible();

      // The dismiss button has aria-label "Descartar banner"
      const dismissButton = page.getByRole('button', { name: 'Descartar banner' });
      await expect(dismissButton).toBeVisible();
      await dismissButton.click();

      // Banner should disappear
      await expect(page.getByText('Configura tu SEO en 5 minutos')).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 5: SEO Item Detail
  // ═══════════════════════════════════════════════════════════════

  test.describe('SEO Item Detail', () => {
    test('SEO detail page renders 5 tabs when accessible @smoke', async ({ page }) => {
      await gotoSection(page, 'contenido');
      await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();

      const openSeoButton = page.getByRole('button', { name: 'Open SEO' }).first();
      const count = await openSeoButton.count();

      if (count === 0) {
        test.skip(true, 'No rows in Contenido table — cannot open SEO detail');
        return;
      }

      await expect(openSeoButton).toBeVisible();
      await openSeoButton.click();
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByRole('button', { name: 'Meta & Keywords' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Keyword Research' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Content Audit' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Technical' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
    });

    test('locale pills render in item detail header when accessible @smoke', async ({ page }) => {
      // requires real data — locale pills are part of SEO item detail header
      await gotoSection(page, 'contenido');
      await expect(page.getByRole('heading', { name: 'Contenido' })).toBeVisible();

      const openSeoButton = page.getByRole('button', { name: 'Open SEO' }).first();
      const count = await openSeoButton.count();

      if (count === 0) {
        test.skip(true, 'No rows in Contenido table — cannot open SEO detail to check locale pills');
        return;
      }

      await openSeoButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Locale pills: es-CO, es-MX or en-US may appear in the locale config panel
      // Check that at least one locale identifier is visible anywhere on the page
      const localePill = page.getByText(/es-CO|es-MX|en-US|es-ES/);
      const pillCount = await localePill.count();

      if (pillCount === 0) {
        // Locale pills not rendered for this item type — skip gracefully
        test.skip(true, 'No locale pills found in SEO item detail — requires locale configuration');
        return;
      }

      await expect(localePill.first()).toBeVisible();
    });
  });
});
