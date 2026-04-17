import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3001/site/colombiatours/destinos/medellin', { waitUntil: 'networkidle', timeout: 45000 });

const info = await page.evaluate(() => {
  const sections = Array.from(document.querySelectorAll('h2, h3'));
  const headings = sections.map(h => ({ tag: h.tagName, text: h.textContent?.trim().slice(0,60), y: h.getBoundingClientRect().top + window.scrollY }));
  const markers = document.querySelectorAll('button[aria-label^="Hotel:"], button[aria-label^="Actividad:"], button[aria-label^="Servicio:"], button[aria-label^="Destino:"]').length;
  const croquis = document.querySelector('[data-testid="map-croquis-fallback"]');
  const croquisBox = croquis ? croquis.getBoundingClientRect() : null;
  const maplibreCanvas = document.querySelector('canvas.maplibregl-canvas');
  const mapDiv = document.querySelector('.maplibregl-map');
  return { headings: headings.slice(0,15), markers, croquisBox, hasMaplibreCanvas: !!maplibreCanvas, hasMapDiv: !!mapDiv, docHeight: document.body.scrollHeight };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
