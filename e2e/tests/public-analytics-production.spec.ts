import { test, expect, type Page } from '@playwright/test';

const RUN_PROD_ANALYTICS_SMOKE = process.env.PROD_ANALYTICS_SMOKE === '1';
const STRICT_ADS_ZERO = process.env.STRICT_ADS_ZERO === '1';
const MEASUREMENT_ID = process.env.PROD_ANALYTICS_GA4_ID ?? 'G-6ET7YRM7NS';
const HOST = process.env.PROD_ANALYTICS_HOST ?? 'https://colombiatours.travel';

type AnalyticsRequestKind =
  | 'gtag_js'
  | 'gtm_js'
  | 'ga4_hit'
  | 'meta'
  | 'clarity'
  | 'ads';

type AnalyticsRequest = {
  kind: AnalyticsRequestKind;
  url: string;
};

const ROUTES = ['/', '/paquetes', '/actividades'];

function classifyAnalyticsRequest(url: string): AnalyticsRequestKind | null {
  if (url.includes('googletagmanager.com/gtag/js')) return 'gtag_js';
  if (url.includes('googletagmanager.com/gtm.js')) return 'gtm_js';
  if (
    (url.includes('google-analytics.com') || url.includes('stats.g.doubleclick.net')) &&
    url.includes(MEASUREMENT_ID)
  ) {
    return 'ga4_hit';
  }
  if (/facebook\.com\/tr|connect\.facebook\.net/.test(url)) return 'meta';
  if (/clarity\.ms/.test(url)) return 'clarity';
  if (
    /googleadservices\.com|doubleclick\.net\/pagead|googlesyndication\.com|google\.com\/(rmkt|pagead|ccm)/.test(url)
  ) {
    return 'ads';
  }

  return null;
}

async function collectInitialAnalyticsRequests(page: Page, path: string): Promise<{
  status: number | null;
  requests: AnalyticsRequest[];
  htmlSignals: {
    lang: string;
    canonical: string | null;
    hasGa4Guard: boolean;
  };
}> {
  const requests: AnalyticsRequest[] = [];
  page.on('request', (request) => {
    const kind = classifyAnalyticsRequest(request.url());
    if (kind) {
      requests.push({ kind, url: request.url() });
    }
  });

  const url = new URL(path, HOST);
  url.searchParams.set('utm_source', 'google');
  url.searchParams.set('utm_medium', 'organic');
  url.searchParams.set('utm_campaign', 'prod_analytics_smoke');

  const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  const htmlSignals = await page.evaluate(() => ({
    lang: document.documentElement.lang || '',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    hasGa4Guard: document.documentElement.innerHTML.includes('__bukeerGa4PageviewSent'),
  }));

  return {
    status: response?.status() ?? null,
    requests,
    htmlSignals,
  };
}

test.describe('Production public analytics smoke', () => {
  test.skip(!RUN_PROD_ANALYTICS_SMOKE, 'Set PROD_ANALYTICS_SMOKE=1 to hit production analytics endpoints');

  for (const route of ROUTES) {
    test(`${route} sends reliable lightweight GA4 pageview before heavy tags`, async ({ page }, testInfo) => {
      const result = await collectInitialAnalyticsRequests(page, route);

      const ga4Hits = result.requests.filter((request) => request.kind === 'ga4_hit');
      const ga4Pageviews = ga4Hits.filter((request) => request.url.includes('en=page_view'));
      const gtagJs = result.requests.filter((request) => request.kind === 'gtag_js');
      const gtmJs = result.requests.filter((request) => request.kind === 'gtm_js');
      const meta = result.requests.filter((request) => request.kind === 'meta');
      const clarity = result.requests.filter((request) => request.kind === 'clarity');
      const ads = result.requests.filter((request) => request.kind === 'ads');

      await testInfo.attach('analytics-requests.json', {
        body: JSON.stringify({ route, ...result, counts: {
          gtag_js: gtagJs.length,
          ga4_hits: ga4Hits.length,
          ga4_pageviews: ga4Pageviews.length,
          gtm_js: gtmJs.length,
          meta: meta.length,
          clarity: clarity.length,
          ads: ads.length,
        } }, null, 2),
        contentType: 'application/json',
      });

      expect(result.status).toBe(200);
      expect(result.htmlSignals.lang).toBe('es');
      expect(result.htmlSignals.canonical).toContain(`${HOST}${route === '/' ? '' : route}`);
      expect(result.htmlSignals.hasGa4Guard).toBe(true);

      expect(gtagJs.length).toBe(1);
      expect(ga4Pageviews.length).toBeGreaterThanOrEqual(1);
      expect(ga4Pageviews[0].url).toContain(`tid=${MEASUREMENT_ID}`);
      expect(ga4Pageviews[0].url).toContain('dl=');
      expect(ga4Pageviews[0].url).toContain('dp=');
      expect(ga4Pageviews[0].url).toContain('utm_source');

      expect(gtmJs.length).toBe(0);
      expect(meta.length).toBe(0);
      expect(clarity.length).toBe(0);

      if (STRICT_ADS_ZERO) {
        expect(ads.length).toBe(0);
      } else {
        testInfo.annotations.push({
          type: 'known-residual',
          description: `Ads pings before interaction: ${ads.length}. Tracked in #336 until Google Ads destination cleanup.`,
        });
      }
    });
  }
});
