import { chromium } from 'playwright';
const BASE = 'http://localhost:3001';
const OUT = '/Users/yeisongomez/Documents/Proyectos/Bukeer/bukeer-studio/qa-screenshots/maps-validation';

const shots = [
  { url: `${BASE}/site/colombiatours/destinos`, name: 'destinos-listing', scrollTo: '[data-testid="map-croquis-fallback"], .maplibregl-map' },
  { url: `${BASE}/site/colombiatours/destinos/cartagena-de-indias`, name: 'destinos-cartagena', scrollTo: '[data-testid="map-croquis-fallback"], .maplibregl-map' },
  { url: `${BASE}/site/colombiatours/destinos/medellin`, name: 'destinos-medellin', scrollTo: '[data-testid="map-croquis-fallback"], .maplibregl-map' },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

for (const shot of shots) {
  try {
    await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 45000 });
    // Scroll the map into view, trigger any lazy content on the way
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
    });
    if (shot.scrollTo) {
      const el = await page.locator(shot.scrollTo).first();
      if (await el.count() > 0) {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1500);
        await el.screenshot({ path: `${OUT}/${shot.name}-map.png` });
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${shot.name}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `${OUT}/${shot.name}-full.png`, fullPage: true });
    console.log(`OK ${shot.name}`);
  } catch (err) {
    console.log(`ERR ${shot.name}: ${err.message}`);
  }
}

await browser.close();
