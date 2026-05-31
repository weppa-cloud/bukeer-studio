#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BASE_URL = "https://colombiatours.travel";
const DEFAULT_OUT_DIR = "artifacts/seo/product-indexing-gate";
const PRODUCT_PREFIXES = [
  "/paquetes/",
  "/actividades/",
  "/packages/",
  "/activities/",
];
const LOCALIZED_LISTING_PATHS = [
  "/en/packages",
  "/en/activities",
  "/fr/forfaits",
  "/fr/activites",
  "/de/pakete",
  "/de/aktivitaten",
  "/pt-br/pacotes",
  "/pt-br/atividades",
];

const args = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(args.baseUrl ?? DEFAULT_BASE_URL);
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const limit = Number(args.limit ?? 0);
const includeDb = args.db !== false;

const startedAt = new Date().toISOString();

if (isCliEntryPoint()) {
  main().catch((error) => {
    console.error("[product-indexing-gate] failed", redactError(error));
    process.exit(1);
  });
}

async function main() {
  const urls = new Map();
  const sitemapUrls = await readSitemapProductUrls(baseUrl);
  for (const url of sitemapUrls) addSource(urls, url, "sitemap");

  for (const listingPath of [
    "/paquetes",
    "/actividades",
    "/packages",
    "/activities",
    ...LOCALIZED_LISTING_PATHS,
  ]) {
    const listingUrls = await readListingProductUrls(`${baseUrl}${listingPath}`);
    for (const url of listingUrls) addSource(urls, url, `listing:${listingPath}`);
  }

  if (includeDb) {
    const dbUrls = await readDbProductLikeUrls(baseUrl);
    for (const row of dbUrls) {
      const current = addSource(urls, row.url, row.source);
      if (current) current.db = row.db;
    }
  }

  let candidates = [...urls.values()].sort((a, b) => a.url.localeCompare(b.url));
  if (limit > 0) candidates = candidates.slice(0, limit);

  const checks = [];
  for (const candidate of candidates) {
    checks.push(await auditUrl(candidate));
  }

  const summary = summarize(checks);
  const report = {
    contract: "product_indexing_gate_v1",
    base_url: baseUrl,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    summary,
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  const stamp = startedAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `${stamp}-product-indexing-gate.json`);
  const mdPath = path.join(outDir, `${stamp}-product-indexing-gate.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, renderMarkdown(report));

  console.log(
    JSON.stringify(
      {
        status: summary.p0 === 0 && summary.p1 === 0 ? "PASS" : "FAIL",
        summary,
        jsonPath,
        mdPath,
      },
      null,
      2,
    ),
  );

  if (args.strict && (summary.p0 > 0 || summary.p1 > 0)) {
    process.exit(2);
  }
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--strict") {
      parsed.strict = true;
    } else if (arg === "--no-db") {
      parsed.db = false;
    } else if (arg.startsWith("--base-url=")) {
      parsed.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--base-url") {
      parsed.baseUrl = rawArgs[index + 1];
      index += 1;
    } else if (arg.startsWith("--out-dir=")) {
      parsed.outDir = arg.slice("--out-dir=".length);
    } else if (arg === "--out-dir") {
      parsed.outDir = rawArgs[index + 1];
      index += 1;
    } else if (arg.startsWith("--limit=")) {
      parsed.limit = arg.slice("--limit=".length);
    } else if (arg === "--limit") {
      parsed.limit = rawArgs[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function normalizeBaseUrl(input) {
  return String(input || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function addSource(map, url, source) {
  if (!isProductLikeUrl(url)) return null;
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  const row = map.get(normalized) ?? { url: normalized, sources: [] };
  if (!row.sources.includes(source)) row.sources.push(source);
  map.set(normalized, row);
  return row;
}

async function readSitemapProductUrls(siteBaseUrl) {
  const sitemapUrl = `${siteBaseUrl}/sitemap.xml`;
  const response = await fetch(sitemapUrl, { redirect: "follow" });
  if (!response.ok) return [];
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

async function readListingProductUrls(listingUrl) {
  try {
    const response = await fetch(listingUrl, { redirect: "follow" });
    if (!response.ok) return [];
    const html = await response.text();
    const origin = new URL(response.url).origin;
    return [...html.matchAll(/\shref=["']([^"']+)["']/g)]
      .map((match) => normalizeUrl(match[1], origin))
      .filter(Boolean)
      .filter(isProductLikeUrl);
  } catch {
    return [];
  }
}

async function readDbProductLikeUrls(siteBaseUrl) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return [];

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const host = new URL(siteBaseUrl).hostname;
  const { data: website } = await client
    .from("websites")
    .select("id, subdomain, custom_domain, default_locale")
    .or(`custom_domain.eq.${host},subdomain.eq.${host.split(".")[0]}`)
    .maybeSingle();

  if (!website?.id) return [];

  const { data: pages } = await client
    .from("website_pages")
    .select("id, slug, locale, is_published, robots_noindex, page_type, category_type, updated_at")
    .eq("website_id", website.id)
    .eq("is_published", true)
    .or(
      "slug.like.paquetes/%,slug.like.actividades/%,slug.like.packages/%,slug.like.activities/%",
    );

  return (pages ?? [])
    .filter((page) => typeof page.slug === "string" && page.slug.length > 0)
    .map((page) => ({
      url: `${siteBaseUrl}${publicPathForPageSlug(page, website)}`,
      source: "db:website_pages",
      db: {
        table: "website_pages",
        id: page.id,
        locale: page.locale,
        is_published: page.is_published,
        robots_noindex: page.robots_noindex,
        page_type: page.page_type,
        category_type: page.category_type,
        updated_at: page.updated_at,
      },
    }));
}

function publicPathForPageSlug(page, website) {
  const slug = page.slug.replace(/^\/+/, "");
  const locale = typeof page.locale === "string" ? page.locale : "";
  const defaultLocale = website.default_locale || "es-CO";
  if (!locale || locale === defaultLocale) return `/${slug}`;

  const localeLanguage = locale.split("-")[0]?.toLowerCase();
  const defaultLanguage = defaultLocale.split("-")[0]?.toLowerCase();
  if (!localeLanguage || localeLanguage === defaultLanguage) return `/${slug}`;

  return `/${localeLanguage}/${slug}`;
}

async function auditUrl(candidate) {
  try {
    const response = await fetch(candidate.url, { redirect: "follow" });
    const html = await response.text();
    const rendered = parseRenderedPage(response, html);
    const issues = classifyIssues(candidate, rendered);
    return {
      ...candidate,
      rendered,
      issues,
      verdict: issues.some((issue) => issue.severity === "P0")
        ? "P0"
        : issues.some((issue) => issue.severity === "P1")
          ? "P1"
          : issues.some((issue) => issue.severity === "P2")
            ? "P2"
            : "PASS",
    };
  } catch (error) {
    return {
      ...candidate,
      rendered: null,
      issues: [
        {
          severity: "P0",
          code: "fetch_failed",
          message: redactError(error),
        },
      ],
      verdict: "P0",
    };
  }
}

function parseRenderedPage(response, html) {
  const title = matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ??
    matchFirst(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const robots =
    matchFirst(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i) ??
    "";
  const canonical = matchFirst(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  );
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);
  const schemaTypes = [];
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const json = JSON.parse(match[1]);
      const rows = Array.isArray(json) ? json : [json];
      for (const row of rows) {
        if (Array.isArray(row?.["@graph"])) {
          for (const graphRow of row["@graph"]) schemaTypes.push(graphRow?.["@type"]);
        } else {
          schemaTypes.push(row?.["@type"]);
        }
      }
    } catch {
      schemaTypes.push("parse_error");
    }
  }

  return {
    status: response.status,
    final_url: response.url,
    title: stripHtml(title ?? ""),
    title_length: stripHtml(title ?? "").length,
    description_length: description?.length ?? 0,
    robots,
    x_robots_tag: response.headers.get("x-robots-tag"),
    canonical,
    h1,
    schema_types: schemaTypes.flat().filter(Boolean),
    bytes: html.length,
  };
}

function classifyIssues(candidate, rendered) {
  const issues = [];
  const inSitemapOrListing = candidate.sources.some(
    (source) => source === "sitemap" || source.startsWith("listing:"),
  );
  const dbSaysIndexable =
    candidate.db?.is_published === true && candidate.db?.robots_noindex !== true;
  const shouldBeIndexable = inSitemapOrListing || dbSaysIndexable;
  const renderedFinalUrl = rendered.final_url
    ? normalizeUrl(rendered.final_url)
    : null;
  const renderedCanonical = rendered.canonical
    ? normalizeUrl(rendered.canonical)
    : null;

  if (rendered.status !== 200) {
    issues.push({
      severity: "P0",
      code: "non_200",
      message: `Expected HTTP 200, got ${rendered.status}`,
    });
  }

  if (shouldBeIndexable && renderedFinalUrl && renderedFinalUrl !== candidate.url) {
    issues.push({
      severity: "P0",
      code: "public_url_redirects",
      message: `Public product URL redirects to ${renderedFinalUrl}`,
    });
  }

  if (shouldBeIndexable && /\bnoindex\b/i.test(rendered.robots || "")) {
    issues.push({
      severity: "P0",
      code: "public_url_noindex",
      message: "Public product URL is in sitemap/listing/DB but renders noindex",
    });
  }

  if (shouldBeIndexable && !rendered.canonical) {
    issues.push({
      severity: "P0",
      code: "missing_canonical",
      message: "Public product URL has no canonical",
    });
  }

  if (
    shouldBeIndexable &&
    renderedCanonical &&
    renderedCanonical !== candidate.url
  ) {
    issues.push({
      severity: "P0",
      code: "canonical_mismatch",
      message: `Public product URL canonical points to ${renderedCanonical}`,
    });
  }

  if (shouldBeIndexable && rendered.h1.length === 0) {
    issues.push({
      severity: "P0",
      code: "missing_h1",
      message: "Public product URL has no H1",
    });
  } else if (rendered.h1.length > 1) {
    issues.push({
      severity: "P1",
      code: "multiple_h1",
      message: `Expected one H1, found ${rendered.h1.length}`,
    });
  }

  const hasProductSchema = rendered.schema_types.some((type) =>
    [
      "Product",
      "Offer",
      "TouristTrip",
      "TouristAttraction",
      "FAQPage",
      "BreadcrumbList",
    ].includes(String(type)),
  );
  if (shouldBeIndexable && !hasProductSchema) {
    issues.push({
      severity: "P0",
      code: "missing_product_schema",
      message: "Public product URL has no product/travel structured data",
    });
  }

  if (shouldBeIndexable && rendered.title_length > 0 && rendered.title_length < 50) {
    issues.push({
      severity: "P2",
      code: "weak_title",
      message: `Title is short or generic (${rendered.title_length} chars)`,
    });
  }

  if (shouldBeIndexable && rendered.description_length > 0 && rendered.description_length < 80) {
    issues.push({
      severity: "P2",
      code: "weak_description",
      message: `Meta description is short (${rendered.description_length} chars)`,
    });
  }

  return issues;
}

function summarize(checks) {
  return checks.reduce(
    (acc, check) => {
      acc.total += 1;
      if (check.verdict === "PASS") acc.pass += 1;
      if (check.verdict === "P0") acc.p0 += 1;
      if (check.verdict === "P1") acc.p1 += 1;
      if (check.verdict === "P2") acc.p2 += 1;
      return acc;
    },
    { total: 0, pass: 0, p0: 0, p1: 0, p2: 0 },
  );
}

function renderMarkdown(report) {
  const lines = [
    "# Product Indexing Gate",
    "",
    `- Base URL: ${report.base_url}`,
    `- Started: ${report.started_at}`,
    `- Completed: ${report.completed_at}`,
    `- Total: ${report.summary.total}`,
    `- PASS: ${report.summary.pass}`,
    `- P0: ${report.summary.p0}`,
    `- P1: ${report.summary.p1}`,
    `- P2: ${report.summary.p2}`,
    "",
    "## Failures",
    "",
    "| Severity | URL | Sources | Issues |",
    "|---|---|---|---|",
  ];

  for (const check of report.checks.filter((row) => row.verdict !== "PASS")) {
    lines.push(
      `| ${check.verdict} | ${check.url} | ${check.sources.join(", ")} | ${check.issues
        .map((issue) => issue.code)
        .join(", ")} |`,
    );
  }

  lines.push("");
  lines.push("## PASS Sample");
  lines.push("");
  for (const check of report.checks.filter((row) => row.verdict === "PASS").slice(0, 20)) {
    lines.push(`- ${check.url}`);
  }

  return `${lines.join("\n")}\n`;
}

function normalizeUrl(value, origin = baseUrl) {
  try {
    return new URL(value, origin).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isProductLikeUrl(value) {
  try {
    const pathname = new URL(value, baseUrl).pathname;
    return PRODUCT_PREFIXES.some((prefix) =>
      stripLocalePrefix(pathname).startsWith(prefix),
    );
  } catch {
    return false;
  }
}

function stripLocalePrefix(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (/^[a-z]{2}(?:-[a-z]{2})?$/i.test(segments[0] || "")) {
    return `/${segments.slice(1).join("/")}`;
  }
  return pathname;
}

function matchFirst(value, pattern) {
  return value.match(pattern)?.[1] ?? null;
}

function stripHtml(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function redactError(error) {
  return error instanceof Error ? error.message : String(error);
}

function isCliEntryPoint() {
  return import.meta.url === `file://${process.argv[1]}`;
}
