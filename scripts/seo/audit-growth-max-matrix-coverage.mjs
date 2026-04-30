#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const SPEC_PATH = "docs/specs/SPEC_GROWTH_OS_MAX_PERFORMANCE_MATRIX.md";
const REGISTRY_PATH = "scripts/seo/growth-provider-profile-registry.mjs";
const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const OUT_DIR = path.join(
  "artifacts",
  "seo",
  `${todayIso()}-growth-max-matrix-coverage`,
);

const SCAN_ROOTS = [
  "scripts/seo",
  "lib",
  "app",
  "docs",
  "supabase/migrations",
  "packages/website-contract/src",
  "artifacts/seo",
];

const TEXT_EXTENSIONS = new Set([
  ".csv",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
]);

const MAX_SCAN_BYTES = 2_000_000;
const SELF_PATH = "scripts/seo/audit-growth-max-matrix-coverage.mjs";

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const outDir = args.outDir ?? OUT_DIR;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const [registryResult, specProfiles, scanIndex] = await Promise.all([
    loadRegistryProfiles(),
    loadSpecProfiles(),
    buildScanIndex(),
  ]);

  const profiles = normalizeProfiles(
    registryResult.profiles.length > 0 ? registryResult.profiles : specProfiles,
  );
  const tables = collectTables(profiles);
  const supabase = await inspectSupabaseTables(tables);
  const matrix = profiles.map((profile) =>
    buildCoverageRow(profile, scanIndex, supabase),
  );
  const summary = summarize(matrix, registryResult, supabase);

  const report = {
    generated_at: new Date().toISOString(),
    website_id: websiteId,
    source: registryResult.profiles.length > 0 ? REGISTRY_PATH : SPEC_PATH,
    registry: {
      present: registryResult.present,
      loaded: registryResult.loaded,
      error: registryResult.error,
    },
    supabase,
    summary,
    matrix,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-coverage.json"),
    JSON.stringify(report, null, 2),
  );
  await fs.writeFile(
    path.join(outDir, "growth-max-matrix-coverage.md"),
    toMarkdown(report),
  );

  console.log(
    JSON.stringify(
      {
        outDir,
        source: report.source,
        profiles: matrix.length,
        summary,
        supabase: {
          enabled: supabase.enabled,
          tables_inspected: Object.keys(supabase.tables).length,
        },
      },
      null,
      2,
    ),
  );
}

async function loadRegistryProfiles() {
  const absolute = path.join(REPO_ROOT, REGISTRY_PATH);
  if (!(await exists(absolute))) {
    return { present: false, loaded: false, profiles: [], error: null };
  }

  try {
    const mod = await import(pathToFileURL(absolute).href);
    const candidates = [
      mod.GROWTH_PROVIDER_PROFILES,
      mod.GROWTH_PROVIDER_PROFILE_REGISTRY,
      mod.PROVIDER_PROFILE_REGISTRY,
      mod.GROWTH_MAX_MATRIX,
      mod.MAX_PERFORMANCE_MATRIX,
      mod.profiles,
      mod.default,
    ];
    const profiles = candidates.flatMap((candidate) =>
      profilesFromRegistryValue(candidate),
    );
    return {
      present: true,
      loaded: profiles.length > 0,
      profiles,
      error:
        profiles.length > 0 ? null : "No recognizable profile export found.",
    };
  } catch (error) {
    return { present: true, loaded: false, profiles: [], error: error.message };
  }
}

function profilesFromRegistryValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(profileFromObject).filter(Boolean);
  if (value instanceof Map)
    return [...value.values()].map(profileFromObject).filter(Boolean);
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => profileFromObject({ profile: key, ...entry }))
      .filter(Boolean);
  }
  return [];
}

function profileFromObject(input) {
  if (!input || typeof input !== "object") return null;
  const profile = clean(input.profile ?? input.id ?? input.slug ?? input.name);
  if (!profile) return null;
  return {
    provider:
      clean(input.provider ?? input.source ?? input.vendor) ??
      inferProvider(profile),
    family:
      clean(input.feature ?? input.family ?? input.api ?? input.name) ??
      profile,
    profile,
    raw_cache: splitCsvLike(
      input.raw_cache ??
        input.rawCache ??
        input.cache ??
        input.cache_table ??
        input.cacheTable,
    ),
    normalized_facts: splitCsvLike(
      input.normalized_facts ??
        input.normalizedFacts ??
        input.facts ??
        input.factTargets ??
        input.fact_tables ??
        input.factTables,
    ),
    backlog_output:
      clean(
        input.backlog_output ??
          input.backlogOutput ??
          input.inventoryOutputs ??
          input.inventory_use ??
          input.inventoryUse,
      ) ?? "",
    priority: clean(input.priority) ?? inferPriority(profile),
    registry_status: clean(input.status) ?? "",
    access_status: clean(input.accessStatus ?? input.access_status) ?? "",
    access_evidence: clean(input.accessEvidence ?? input.access_evidence) ?? "",
    extraction_scripts: splitCsvLike(
      input.extractionScripts ?? input.extraction_scripts,
    ),
    normalizer_scripts: splitCsvLike(
      input.normalizerScripts ?? input.normalizer_scripts,
    ),
    docs: splitCsvLike(input.docs),
    documented_source: REGISTRY_PATH,
  };
}

async function loadSpecProfiles() {
  const body = await fs.readFile(path.join(REPO_ROOT, SPEC_PATH), "utf8");
  const rows = [];
  let inMatrix = false;

  for (const line of body.split("\n")) {
    if (line.trim() === "## Provider Coverage Matrix") {
      inMatrix = true;
      continue;
    }
    if (inMatrix && line.startsWith("## ") && rows.length > 0) break;
    if (!inMatrix || !line.trim().startsWith("|")) continue;
    if (
      line.includes("---") ||
      line.includes("Source") ||
      line.includes("Feature/API")
    )
      continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => stripMarkdown(cell.trim()));
    if (cells.length < 8) continue;
    rows.push({
      provider: cells[0],
      family: cells[1],
      profile: cells[2],
      primary_question: cells[3],
      raw_cache: splitCsvLike(cells[4]),
      normalized_facts: splitCsvLike(cells[5]).filter(
        (table) => !/^none\b/i.test(table),
      ),
      backlog_output: cells[6],
      cadence: cells[7],
      priority: cells[8] ?? inferPriority(cells[2]),
      documented_source: SPEC_PATH,
    });
  }

  return rows;
}

function normalizeProfiles(profiles) {
  const byProfile = new Map();
  for (const profile of profiles) {
    if (!profile?.profile) continue;
    const normalized = {
      provider: clean(profile.provider) ?? inferProvider(profile.profile),
      family: clean(profile.family) ?? profile.profile,
      profile: clean(profile.profile),
      primary_question:
        clean(profile.primary_question) ?? clean(profile.question) ?? "",
      raw_cache: splitCsvLike(profile.raw_cache ?? profile.rawCache),
      normalized_facts: splitCsvLike(
        profile.normalized_facts ?? profile.normalizedFacts,
      ),
      backlog_output:
        clean(profile.backlog_output ?? profile.backlogOutput) ?? "",
      cadence: clean(profile.cadence) ?? "",
      priority: clean(profile.priority) ?? inferPriority(profile.profile),
      registry_status: clean(profile.registry_status) ?? "",
      access_status: clean(profile.access_status ?? profile.accessStatus) ?? "",
      access_evidence:
        clean(profile.access_evidence ?? profile.accessEvidence) ?? "",
      extraction_scripts: splitCsvLike(profile.extraction_scripts),
      normalizer_scripts: splitCsvLike(profile.normalizer_scripts),
      docs: splitCsvLike(profile.docs),
      documented_source: clean(profile.documented_source) ?? "",
    };
    byProfile.set(normalized.profile, normalized);
  }
  return [...byProfile.values()].sort((a, b) => {
    const priorityCompare =
      priorityWeight(a.priority) - priorityWeight(b.priority);
    if (priorityCompare !== 0) return priorityCompare;
    return `${a.provider}:${a.profile}`.localeCompare(
      `${b.provider}:${b.profile}`,
    );
  });
}

async function buildScanIndex() {
  const files = [];
  for (const root of SCAN_ROOTS) {
    const absolute = path.join(REPO_ROOT, root);
    if (await exists(absolute)) await collectTextFiles(absolute, files);
  }

  const entries = [];
  for (const absolute of files) {
    const stat = await fs.stat(absolute);
    if (stat.size > MAX_SCAN_BYTES) continue;
    const relative = path.relative(REPO_ROOT, absolute);
    if (relative === SELF_PATH) continue;
    entries.push({
      path: relative,
      lowerPath: relative.toLowerCase(),
      content: await fs.readFile(absolute, "utf8"),
    });
  }
  return entries;
}

async function collectTextFiles(dir, files) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name.startsWith(".") ||
      ["node_modules", "dist", ".next"].includes(entry.name)
    )
      continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTextFiles(absolute, files);
      continue;
    }
    if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }
}

function collectTables(profiles) {
  const tables = new Set(["growth_inventory"]);
  for (const profile of profiles) {
    for (const table of [...profile.raw_cache, ...profile.normalized_facts]) {
      if (looksLikeTable(table)) tables.add(table);
    }
  }
  return [...tables].sort();
}

async function inspectSupabaseTables(tables) {
  const env = await loadLocalEnv();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    return {
      enabled: false,
      reason: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
      tables: {},
    };
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const inspected = {};
    for (const table of tables) {
      inspected[table] = await countTable(sb, table);
    }
    return { enabled: true, website_id: websiteId, tables: inspected };
  } catch (error) {
    return {
      enabled: false,
      reason: `Supabase inspection failed: ${error.message}`,
      tables: {},
    };
  }
}

async function countTable(sb, table) {
  const scoped = await sb
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("website_id", websiteId);
  if (!scoped.error)
    return {
      exists: true,
      scoped_by_website_id: true,
      row_count: scoped.count ?? 0,
    };

  const unscoped = await sb
    .from(table)
    .select("*", { count: "exact", head: true });
  if (!unscoped.error) {
    return {
      exists: true,
      scoped_by_website_id: false,
      row_count: unscoped.count ?? 0,
      note: `website_id filter unavailable or failed: ${scoped.error.message}`,
    };
  }

  return {
    exists: false,
    scoped_by_website_id: null,
    row_count: null,
    error: unscoped.error.message,
  };
}

function buildCoverageRow(profile, scanIndex, supabase) {
  const profileRefs = findRefs(scanIndex, [profile.profile]);
  const familyRefs = findRefs(scanIndex, keywordsFor(profile.family));
  const declaredExtractionRefs = refsForDeclaredFiles(
    profile.extraction_scripts,
    scanIndex,
  );
  const declaredNormalizerRefs = refsForDeclaredFiles(
    profile.normalizer_scripts,
    scanIndex,
  );
  const declaredDocRefs = refsForDeclaredFiles(profile.docs, scanIndex);
  const docRefs = [...profileRefs, ...familyRefs].filter((ref) =>
    ref.path.startsWith("docs/"),
  );
  const extractionRefs = findRefs(scanIndex, extractionTermsFor(profile))
    .filter((ref) => ref.path !== REGISTRY_PATH)
    .filter(
      (ref) =>
        ref.path.startsWith("scripts/") ||
        ref.path.startsWith("lib/") ||
        ref.path.startsWith("app/api/"),
    );
  const rawRefs = findRefs(scanIndex, profile.raw_cache);
  const factRefs = findRefs(scanIndex, profile.normalized_facts);
  const factImplementationRefs = factRefs
    .filter((ref) => ref.path !== REGISTRY_PATH)
    .filter(
      (ref) =>
        ref.path.startsWith("scripts/") ||
        ref.path.startsWith("lib/") ||
        ref.path.startsWith("app/") ||
        ref.path.startsWith("supabase/"),
    );
  const inventoryRefs = findRefs(scanIndex, [
    "growth_inventory",
    profile.profile,
    profile.family,
  ])
    .filter((ref) => ref.path !== REGISTRY_PATH)
    .filter(
      (ref) =>
        ref.path.startsWith("scripts/") ||
        ref.path.startsWith("docs/growth-") ||
        ref.path.startsWith("supabase/"),
    );
  const councilRefs = findRefs(scanIndex, [
    profile.profile,
    profile.family,
  ]).filter(
    (ref) =>
      ref.path.startsWith("docs/growth-weekly/") ||
      ref.path.startsWith("docs/growth-sessions/"),
  );

  const rawCounts = countsFor(profile.raw_cache, supabase);
  const factCounts = countsFor(profile.normalized_facts, supabase);
  const inventoryCount = supabase.tables.growth_inventory?.row_count;
  const cacheHasRows = rawCounts.some((entry) => entry.row_count > 0);
  const factsHaveRows = factCounts.some((entry) => entry.row_count > 0);
  const factsTablesExist =
    factCounts.length === 0 ||
    factCounts.every((entry) => entry.exists === true);

  const documented =
    declaredDocRefs.length > 0 ||
    docRefs.length > 0 ||
    Boolean(profile.documented_source);
  const extracted =
    declaredExtractionRefs.length > 0 ||
    extractionRefs.length > 0 ||
    hasProfileCacheEvidence(profile, supabase);
  const persistedCache =
    rawRefs
      .filter((ref) => ref.path !== REGISTRY_PATH)
      .some(
        (ref) =>
          ref.path.startsWith("scripts/") ||
          ref.path.startsWith("lib/") ||
          ref.path.startsWith("supabase/"),
      ) || cacheHasRows;
  const normalizedFacts =
    declaredNormalizerRefs.length > 0 ||
    factImplementationRefs.length > 0 ||
    factsHaveRows ||
    factsTablesExist;
  const growthInventoryUsed =
    inventoryRefs.some(
      (ref) =>
        ref.matched.includes(profile.profile.toLowerCase()) ||
        ref.matched.includes(profile.family.toLowerCase()),
    ) ||
    (typeof inventoryCount === "number" &&
      inventoryCount > 0 &&
      extracted &&
      /inventory|row/i.test(profile.backlog_output));
  const councilUsed = councilRefs.length > 0;
  const gaps = gapsFor(
    {
      documented,
      extracted,
      persistedCache,
      normalizedFacts,
      growthInventoryUsed,
      councilUsed,
    },
    profile,
  );

  return {
    provider: profile.provider,
    family: profile.family,
    profile: profile.profile,
    available: true,
    documented,
    extracted,
    "persisted/cache": persistedCache,
    "normalized/facts": normalizedFacts,
    growth_inventory_used: growthInventoryUsed,
    council_used: councilUsed,
    access_status: profile.access_status,
    status: statusFor(
      {
        documented,
        extracted,
        persistedCache,
        normalizedFacts,
        growthInventoryUsed,
        councilUsed,
      },
      profile,
    ),
    priority: profile.priority,
    gaps,
    evidence: {
      docs: compactRefs(docRefs),
      declared_docs: declaredDocRefs,
      extraction: compactRefs([...declaredExtractionRefs, ...extractionRefs]),
      raw_cache: compactRefs(rawRefs),
      normalized_facts: compactRefs([
        ...declaredNormalizerRefs,
        ...factImplementationRefs,
      ]),
      growth_inventory: compactRefs(inventoryRefs),
      council: compactRefs(councilRefs),
      supabase_counts: {
        raw_cache: rawCounts,
        normalized_facts: factCounts,
        growth_inventory: supabase.tables.growth_inventory ?? null,
      },
    },
  };
}

function refsForDeclaredFiles(files, scanIndex) {
  const scannedFiles = new Set(scanIndex.map((entry) => entry.path));
  return splitCsvLike(files)
    .filter(Boolean)
    .filter((file) => scannedFiles.has(file))
    .map((file) => ({ path: file, matched: ["declared"] }));
}

function extractionTermsFor(profile) {
  const profileTokens = [profile.profile];
  const knownAliases = {
    dfs_onpage_full_comparable_v3: [
      "dfs_onpage_full_v2",
      "onpage",
      "crawl_task_id",
      "seo_audit_findings",
    ],
    dfs_onpage_rendered_sample_v1: [
      "rendered sample",
      "browser rendering",
      "load_resources",
    ],
    dfs_serp_priority_keywords_v1: [
      "serp snapshot",
      "serp-snapshot",
      "seo_serp_snapshots",
    ],
    dfs_serp_local_pack_v1: [
      "local finder",
      "local pack",
      "seo_local_serp_facts",
    ],
    dfs_keyword_volume_trends_v1: ["keyword volume", "keyword_opportunities"],
    dfs_labs_demand_cluster_v1: [
      "demand cluster",
      "topic_clusters",
      "keyword_ideas",
    ],
    dfs_labs_competitor_visibility_v1: [
      "competitor visibility",
      "competitors_domain",
    ],
    dfs_labs_gap_intersections_v1: ["gap intersections", "keyword_gap"],
    dfs_backlinks_authority_v1: ["backlinks_authority", "backlink_facts"],
    dfs_backlinks_competitor_gap_v1: ["backlink_gap", "backlinks competitors"],
    dfs_business_local_v1: ["business_local", "local reputation"],
    dfs_reviews_sentiment_v1: ["reviews_sentiment", "review_facts"],
    dfs_ai_geo_visibility_v1: [
      "geo_ai_visibility_v1",
      "ai visibility",
      "seo_ai_visibility_facts",
    ],
    dfs_content_brand_sentiment_v1: [
      "content_brand_sentiment",
      "content_sentiment",
    ],
    dfs_domain_competitive_baseline_v1: [
      "domain_competitive",
      "domain analytics",
    ],
    gsc_daily_complete_web_v1: [
      "daily complete",
      "date,page,query,country,device",
      "seo_gsc_daily_facts",
    ],
    gsc_council_28d_query_page_v1: [
      "query,page",
      "query_page",
      "seo_gsc_query_page_facts",
    ],
    gsc_market_device_appearance_v1: [
      "page,country",
      "page_device",
      "searchAppearance",
      "seo_gsc_segment_facts",
    ],
    ga4_landing_channel_v1: [
      "landing_channel",
      "landingPagePlusQueryString",
      "seo_ga4_landing_facts",
    ],
    ga4_source_campaign_v1: [
      "campaign_source_medium",
      "source_medium",
      "seo_ga4_campaign_facts",
    ],
    ga4_event_page_v1: [
      "event_page",
      "eventName,pagePath",
      "seo_ga4_event_facts",
    ],
    tracking_conversion_facts_v1: [
      "funnel_events",
      "meta_conversion_events",
      "conversion facts",
    ],
  };
  return [...profileTokens, ...(knownAliases[profile.profile] ?? [])];
}

function hasProfileCacheEvidence(profile, supabase) {
  if (!supabase.enabled) return false;
  const rawCounts = countsFor(profile.raw_cache, supabase);
  const hasRawRows = rawCounts.some((entry) => entry.row_count > 0);
  if (!hasRawRows) return false;
  if (/onpage|ai_geo|tracking/i.test(profile.profile)) return true;
  return false;
}

function findRefs(scanIndex, rawTerms) {
  const terms = splitCsvLike(rawTerms)
    .map((term) => term.toLowerCase())
    .filter(
      (term) => term.length >= 3 && !["none by default", "n/a"].includes(term),
    );
  if (terms.length === 0) return [];

  const refs = [];
  for (const entry of scanIndex) {
    const lowerContent = entry.content.toLowerCase();
    const matched = terms.filter(
      (term) => entry.lowerPath.includes(term) || lowerContent.includes(term),
    );
    if (matched.length > 0) {
      refs.push({
        path: entry.path,
        matched: [...new Set(matched)].slice(0, 5),
      });
    }
  }
  return refs;
}

function compactRefs(refs) {
  const byPath = new Map();
  for (const ref of refs) {
    if (!byPath.has(ref.path)) byPath.set(ref.path, new Set());
    for (const term of ref.matched) byPath.get(ref.path).add(term);
  }
  return [...byPath.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 12)
    .map(([file, terms]) => ({ file, matched: [...terms].slice(0, 8) }));
}

function countsFor(tables, supabase) {
  return splitCsvLike(tables)
    .filter(looksLikeTable)
    .map((table) => ({
      table,
      ...(supabase.tables[table] ?? { exists: null, row_count: null }),
    }));
}

function gapsFor(flags, profile) {
  const gaps = [];
  if (!flags.documented)
    gaps.push("Profile is not documented in scanned docs.");
  if (!flags.extracted && !isExcluded(profile))
    gaps.push("No extraction runner/client evidence found.");
  if (!flags.persistedCache && profile.raw_cache.length > 0)
    gaps.push(`No raw/cache evidence for ${profile.raw_cache.join(", ")}.`);
  if (!flags.normalizedFacts && profile.normalized_facts.length > 0)
    gaps.push(
      `No normalized fact evidence for ${profile.normalized_facts.join(", ")}.`,
    );
  if (
    !flags.growthInventoryUsed &&
    /row|inventory|backlog|council|attribution/i.test(profile.backlog_output)
  ) {
    gaps.push("No clear growth_inventory promotion/use evidence.");
  }
  if (!flags.councilUsed && ["P0", "P1"].includes(profile.priority))
    gaps.push(
      "No Council/session use evidence found for this priority profile.",
    );
  if (gaps.length === 0)
    gaps.push("No coverage gap detected by static/read-only audit.");
  return gaps;
}

function statusFor(flags, profile) {
  if (profile.access_status === "blocked_no_subscription")
    return "provider_access_blocked";
  if (isExcluded(profile)) return "excluded/watch";
  if (
    flags.documented &&
    flags.extracted &&
    flags.persistedCache &&
    flags.normalizedFacts &&
    flags.growthInventoryUsed &&
    flags.councilUsed
  ) {
    return "covered";
  }
  if (
    flags.documented &&
    (flags.extracted ||
      flags.persistedCache ||
      flags.normalizedFacts ||
      flags.growthInventoryUsed ||
      flags.councilUsed)
  ) {
    return "partial";
  }
  return "not_started";
}

function summarize(matrix, registryResult, supabase) {
  const byStatus = countBy(matrix, (row) => row.status);
  const byPriority = countBy(matrix, (row) => row.priority);
  return {
    total_profiles: matrix.length,
    registry_present: registryResult.present,
    registry_loaded: registryResult.loaded,
    supabase_enabled: supabase.enabled,
    by_status: byStatus,
    by_priority: byPriority,
    p0_p1_open_gaps: matrix.filter(
      (row) => ["P0", "P1"].includes(row.priority) && row.status !== "covered",
    ).length,
  };
}

function toMarkdown(report) {
  const rows = report.matrix.map((row) => [
    row.provider,
    row.family,
    row.profile,
    row.access_status || "n/a",
    yesNo(row.available),
    yesNo(row.documented),
    yesNo(row.extracted),
    yesNo(row["persisted/cache"]),
    yesNo(row["normalized/facts"]),
    yesNo(row.growth_inventory_used),
    yesNo(row.council_used),
    row.status,
    row.priority,
    row.gaps.join("<br>"),
  ]);

  return `# Growth Max Matrix Coverage Audit

Generated: ${report.generated_at}

Website: \`${report.website_id}\`  
Source: \`${report.source}\`  
Registry present: ${yesNo(report.registry.present)}  
Supabase counts: ${report.supabase.enabled ? "enabled" : `skipped (${report.supabase.reason})`}

## Summary

| Metric | Value |
|---|---:|
| Profiles | ${report.summary.total_profiles} |
| P0/P1 profiles with open gaps | ${report.summary.p0_p1_open_gaps} |
| Covered | ${report.summary.by_status.covered ?? 0} |
| Partial | ${report.summary.by_status.partial ?? 0} |
| Not started | ${report.summary.by_status.not_started ?? 0} |
| Excluded/watch | ${report.summary.by_status["excluded/watch"] ?? 0} |
| Provider access blocked | ${report.summary.by_status.provider_access_blocked ?? 0} |

## Matrix

| Provider | Family | Profile | Feature access | Available | Documented | Extracted | Persisted/cache | Normalized/facts | Growth inventory used | Council used | Status | Priority | Gaps |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`).join("\n")}
`;
}

async function loadLocalEnv() {
  const env = {};
  for (const file of [".env.local", ".dev.vars"]) {
    const absolute = path.join(REPO_ROOT, file);
    if (!(await exists(absolute))) continue;
    const body = await fs.readFile(absolute, "utf8");
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("="))
        continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
      env[key] = value;
    }
  }
  return env;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=");
    parsed[key] = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) index += 1;
  }
  return parsed;
}

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

function stripMarkdown(value) {
  return value.replace(/`/g, "").replace(/\s+/g, " ").trim();
}

function splitCsvLike(value) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(",");
  return raw
    .map((entry) => stripMarkdown(String(entry)).trim())
    .map((entry) => entry.replace(/\s+with\s+.*$/i, "").trim())
    .filter(Boolean);
}

function keywordsFor(value) {
  const text = clean(value) ?? "";
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 4 && !["dataforseo", "google", "source"].includes(word),
    );
  return [text, ...words];
}

function inferProvider(profile) {
  if (/^gsc_/i.test(profile)) return "GSC";
  if (/^ga4_/i.test(profile)) return "GA4";
  if (/^tracking_/i.test(profile)) return "Tracking";
  return "DataForSEO";
}

function inferPriority(profile) {
  if (/merchant|app_data|content_brand|domain_competitive/i.test(profile))
    return "P2";
  return "P1";
}

function isExcluded(profile) {
  return /excluded|no default|merchant_watch|app_data_watch/i.test(
    `${profile.backlog_output} ${profile.cadence} ${profile.profile}`,
  );
}

function looksLikeTable(value) {
  return /^[a-z][a-z0-9_]*$/.test(value) && value.includes("_");
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function priorityWeight(priority) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 9;
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = stripMarkdown(String(value));
  return text.length > 0 ? text : null;
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function escapeMarkdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

async function exists(absolutePath) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}
