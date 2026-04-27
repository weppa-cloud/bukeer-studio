#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BASE_URL = 'https://colombiatours.travel';
const DEFAULT_LIMIT = 300;
const USER_AGENT = 'BukeerPostCutoverAudit/1.0 (+https://bukeer.com)';

const args = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(args.baseUrl ?? DEFAULT_BASE_URL);
const limit = Number.parseInt(args.limit ?? String(DEFAULT_LIMIT), 10);
const outDir = args.outDir ?? path.join('artifacts', 'seo', todayIso());

const criticalPaths = [
  '/',
  '/en',
  '/paquetes',
  '/experiencias',
  '/actividades',
  '/destinos',
  '/blog',
  '/planners',
  '/privacy',
  '/terms',
  '/cancellation',
  '/site/colombiatours/paquetes',
  '/l/tour-a-guatape-desde-medellin/',
  '/cat/destinos/medellin/',
  '/paquetes/bogota-esencial-cultura-y-sal-4-dias',
  '/paquetes/colombia-en-familia-15-dias-aventura-y-confort',
  '/blog/viajar-por-colombia-en-15-dias',
  '/blog/guia-completa-para-viajar-a-colombia',
  '/paquetes-a-colombia-todo-incluido-en-9-dias',
  '/agencia-de-viajes-a-colombia-para-mexicanos',
  '/agencia-de-viajes-a-colombia-para-espanoles',
  '/los-mejores-paquetes-de-viajes-a-colombia',
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outDir, { recursive: true });

  const sitemapUrls = await fetchSitemapUrls(`${baseUrl}/sitemap.xml`);
  const sampledUrls = stableSample(sitemapUrls, Math.max(0, limit - criticalPaths.length));
  const urls = uniqueUrls([
    ...criticalPaths.map((pathname) => new URL(pathname, baseUrl).toString()),
    ...sampledUrls,
  ]).slice(0, limit);

  const startedAt = new Date().toISOString();
  const results = [];
  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    process.stdout.write(`[${index + 1}/${urls.length}] ${url}\n`);
    results.push(await auditUrl(url));
  }

  const endedAt = new Date().toISOString();
  const summary = summarize(results, { startedAt, endedAt, baseUrl, limit, sitemapCount: sitemapUrls.length });

  await writeFile(path.join(outDir, 'post-cutover-light-crawl.json'), JSON.stringify({ summary, results }, null, 2));
  await writeFile(path.join(outDir, 'post-cutover-light-crawl.csv'), toCsv(results));
  await writeFile(path.join(outDir, 'post-cutover-light-crawl.md'), toMarkdown(summary, results));

  console.log(JSON.stringify(summary, null, 2));
}

async function fetchSitemapUrls(sitemapUrl, seen = new Set()) {
  if (seen.has(sitemapUrl)) return [];
  seen.add(sitemapUrl);

  const response = await fetchWithTimeout(sitemapUrl, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap ${sitemapUrl}: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeXml(match[1].trim()));
  const nestedSitemaps = locs.filter((url) => /sitemap.*\.xml(?:$|\?)/i.test(url));
  if (nestedSitemaps.length > 0) {
    const nested = [];
    for (const nestedUrl of nestedSitemaps) {
      nested.push(...await fetchSitemapUrls(nestedUrl, seen));
    }
    return nested;
  }
  return locs.filter((url) => url.startsWith(baseUrl));
}

async function auditUrl(url) {
  const started = Date.now();
  try {
    const response = await fetchWithTimeout(url, { redirect: 'manual' });
    const status = response.status;
    const location = response.headers.get('location') ?? '';
    const contentType = response.headers.get('content-type') ?? '';
    const finalUrl = isRedirect(status) && location ? new URL(location, url).toString() : url;

    let body = '';
    if (contentType.includes('text/html')) {
      body = await response.text();
    }

    const title = extractTag(body, 'title');
    const h1 = extractFirstHeading(body);
    const metaDescription = extractMeta(body, 'description');
    const canonical = extractLink(body, 'canonical');
    const robots = extractMeta(body, 'robots');
    const hreflangCount = [...body.matchAll(/rel=["']alternate["'][^>]*hreflang=/gi)].length
      + [...body.matchAll(/hreflang=["'][^"']+["'][^>]*rel=["']alternate["']/gi)].length;
    const jsonLdCount = [...body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi)].length;
    const visualNotFound = isVisualNotFound({ title, h1 });
    const noindex = /noindex/i.test(robots);

    const issues = [];
    if (status >= 400) issues.push(`http_${status}`);
    if (isRedirect(status) && !location) issues.push('redirect_missing_location');
    if (status === 200 && visualNotFound) issues.push('visual_not_found_with_200');
    if (status === 200 && !title) issues.push('missing_title');
    if (status === 200 && !h1) issues.push('missing_h1');
    if (status === 200 && title && title.length > 65) issues.push('long_title');
    if (status === 200 && !metaDescription) issues.push('missing_meta_description');
    if (status === 200 && metaDescription && metaDescription.length > 170) issues.push('long_meta_description');
    if (status === 200 && !canonical) issues.push('missing_canonical');
    if (status === 200 && noindex && !isExpectedNoindex(url)) issues.push('unexpected_noindex');
    if (status === 200 && url.includes('/en') && hreflangCount === 0) issues.push('missing_hreflang_en_url');

    return {
      url,
      status,
      finalUrl,
      location,
      ms: Date.now() - started,
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      h1,
      canonical,
      robots,
      hreflangCount,
      jsonLdCount,
      visualNotFound,
      issues,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      finalUrl: url,
      location: '',
      ms: Date.now() - started,
      title: '',
      titleLength: 0,
      metaDescription: '',
      metaDescriptionLength: 0,
      h1: '',
      canonical: '',
      robots: '',
      hreflangCount: 0,
      jsonLdCount: 0,
      visualNotFound: false,
      issues: ['fetch_error'],
      error: error.message,
    };
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, {
      ...options,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function summarize(results, meta) {
  const byIssue = {};
  for (const result of results) {
    for (const issue of result.issues) {
      byIssue[issue] = (byIssue[issue] ?? 0) + 1;
    }
  }
  return {
    ...meta,
    crawled: results.length,
    ok200: results.filter((result) => result.status === 200).length,
    redirects: results.filter((result) => isRedirect(result.status)).length,
    errors: results.filter((result) => result.status === 0 || result.status >= 400).length,
    issueCount: results.filter((result) => result.issues.length > 0).length,
    byIssue,
  };
}

function toCsv(results) {
  const headers = [
    'url',
    'status',
    'finalUrl',
    'location',
    'ms',
    'titleLength',
    'metaDescriptionLength',
    'h1',
    'canonical',
    'robots',
    'hreflangCount',
    'jsonLdCount',
    'visualNotFound',
    'issues',
  ];
  return [
    headers.join(','),
    ...results.map((result) => headers.map((header) => csvCell(Array.isArray(result[header]) ? result[header].join('|') : result[header])).join(',')),
  ].join('\n');
}

function toMarkdown(summary, results) {
  const issueRows = Object.entries(summary.byIssue)
    .sort((a, b) => b[1] - a[1])
    .map(([issue, count]) => `| ${issue} | ${count} |`)
    .join('\n') || '| none | 0 |';

  const topIssues = results
    .filter((result) => result.issues.length > 0)
    .slice(0, 50)
    .map((result) => `| ${result.status} | ${result.url} | ${result.issues.join(', ')} |`)
    .join('\n') || '| — | — | — |';

  return `# Post-Cutover Light Crawl

## Summary

| Metric | Value |
|---|---:|
| Started | ${summary.startedAt} |
| Ended | ${summary.endedAt} |
| Base URL | ${summary.baseUrl} |
| Sitemap URLs discovered | ${summary.sitemapCount} |
| URLs crawled | ${summary.crawled} |
| HTTP 200 | ${summary.ok200} |
| Redirects | ${summary.redirects} |
| Fetch/HTTP errors | ${summary.errors} |
| URLs with issues | ${summary.issueCount} |

## Issues

| Issue | Count |
|---|---:|
${issueRows}

## Top Issue URLs

| Status | URL | Issues |
|---:|---|---|
${topIssues}
`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    parsed[key] = next && !next.startsWith('--') ? next : 'true';
    if (next && !next.startsWith('--')) index += 1;
  }
  return parsed;
}

function extractTag(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return cleanText(match?.[1] ?? '');
}

function extractFirstHeading(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return cleanText(match?.[1] ?? '');
}

function extractMeta(html, name) {
  const patternA = new RegExp(`<meta[^>]+name=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
  const patternB = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapeRegExp(name)}["'][^>]*>`, 'i');
  return decodeHtml(cleanText(html.match(patternA)?.[1] ?? html.match(patternB)?.[1] ?? ''));
}

function extractLink(html, rel) {
  const patternA = new RegExp(`<link[^>]+rel=["']${escapeRegExp(rel)}["'][^>]+href=["']([^"']*)["'][^>]*>`, 'i');
  const patternB = new RegExp(`<link[^>]+href=["']([^"']*)["'][^>]+rel=["']${escapeRegExp(rel)}["'][^>]*>`, 'i');
  return decodeHtml(cleanText(html.match(patternA)?.[1] ?? html.match(patternB)?.[1] ?? ''));
}

function stableSample(urls, count) {
  return [...urls].sort().slice(0, count);
}

function uniqueUrls(urls) {
  return [...new Set(urls.map((url) => url.replace(/#.*$/, '')))];
}

function isRedirect(status) {
  return status >= 300 && status < 400;
}

function isExpectedNoindex(url) {
  return /\/(privacy|terms|cancellation)(?:\/)?$/i.test(url);
}

function isVisualNotFound({ title, h1 }) {
  return /^(p[aá]gina no encontrada|page not found|post no encontrado|paquete no encontrado)/i.test(title)
    || /^(p[aá]gina no encontrada|page not found|post no encontrado|paquete no encontrado)$/i.test(h1);
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function cleanText(value) {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decodeXml(value) {
  return decodeHtml(value);
}

function decodeHtml(value) {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function csvCell(value) {
  const stringValue = value === undefined || value === null ? '' : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
