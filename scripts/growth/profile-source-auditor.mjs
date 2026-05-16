#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_LOCALES = ["en-US", "pt-BR", "fr-FR", "de-DE"];
const DEFAULT_PROFILE_TYPES = [
  "business",
  "buyer",
  "seo_market",
  "competitor",
  "page_product",
  "risk_policy",
];
const DEFAULT_ACTION_CLASSES = [
  "safe_apply",
  "content_publish",
  "transcreation_merge",
];
const VERDICTS = [
  "PASS_AUTONOMOUS",
  "PASS_CANARY_ONLY",
  "FAIL_MISSING_PROFILE",
  "FAIL_STALE",
  "FAIL_LOCALE_MISMATCH",
  "FAIL_MISSING_SOURCE_REFS",
  "FAIL_PROVIDER_CACHE_EMPTY",
  "FAIL_LOW_CONFIDENCE",
];
const VERDICT_PRECEDENCE = [
  "FAIL_MISSING_PROFILE",
  "FAIL_LOCALE_MISMATCH",
  "FAIL_MISSING_SOURCE_REFS",
  "FAIL_PROVIDER_CACHE_EMPTY",
  "FAIL_STALE",
  "FAIL_LOW_CONFIDENCE",
  "PASS_CANARY_ONLY",
  "PASS_AUTONOMOUS",
];
const DISALLOWED_FLAGS = new Set([
  "apply",
  "repair",
  "refresh-provider",
  "dispatch",
  "cron",
  "publish",
]);
const SECRET_KEY_RE = /token|secret|password|authorization|api[_-]?key|service[_-]?role|access[_-]?token|refresh[_-]?token/i;
const SECRET_VALUE_RE = /\bBearer\s+[A-Za-z0-9._-]+|\bBasic\s+[A-Za-z0-9+/=]+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|[A-Za-z0-9_\-]{40,}|([?&](?:token|key|secret|authorization|access_token|refresh_token)=)[^\s&]+/i;
const FRESHNESS_HOURS = {
  growth_gsc_cache: 24,
  growth_ga4_cache: 6,
  growth_dataforseo_cache: 24 * 7,
};
const SOURCE_NAMES = [
  "growth_profiles",
  "growth_signal_facts",
  "growth_profile_runs",
  "growth_gsc_cache",
  "growth_ga4_cache",
  "growth_dataforseo_cache",
  "growth_agent_definitions",
  "growth_work_item_outcomes",
  "growth_publication_jobs",
  "funnel_events",
];

main().catch((error) => {
  const exitCode = error?.usage === true ? 2 : 1;
  console.error(redactString(error?.message ?? String(error)));
  process.exitCode = exitCode;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await assertStaticSafety();
  const now = new Date(args.now ?? new Date().toISOString());
  const outDir = args.outDir ?? path.join("artifacts/growth", `${dateStamp(now)}-profile-source-auditor`);
  const dataset = args.fixture
    ? await loadFixture(args.fixture)
    : await loadLiveDataset(args, now);
  const reportNow = args.now ? now : dataset.generatedAt ? new Date(dataset.generatedAt) : now;
  const report = buildReport(dataset, args, reportNow);
  await writeReports(report, args.format, outDir);
  writeStdout(report, args.stdout, outDir);
  const failOn = new Set(args.failOn);
  if (report.action_audits.some((audit) => failOn.has(audit.verdict))) {
    process.exitCode = 1;
  }
}

export function parseArgs(argv) {
  const raw = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) throw usageError(`Unknown positional argument: ${arg}`);
    const body = arg.slice(2);
    const [key, ...rest] = body.split("=");
    if (DISALLOWED_FLAGS.has(key)) throw usageError(`Disallowed v1 mutation flag: --${key}`);
    raw[key] = rest.length ? rest.join("=") : true;
  }
  const includeDefaultLocale = raw["include-default-locale"] === true;
  const locales = csv(raw.locales, DEFAULT_LOCALES);
  if (includeDefaultLocale && !locales.includes("es-CO")) locales.push("es-CO");
  const markets = csv(raw.markets, locales.map(localeToMarket));
  const format = choice(raw.format ?? "both", ["json", "markdown", "both"], "format");
  const stdout = choice(raw.stdout ?? "summary", ["json", "summary", "none"], "stdout");
  return {
    accountId: String(raw["account-id"] ?? DEFAULT_ACCOUNT_ID),
    websiteId: String(raw["website-id"] ?? DEFAULT_WEBSITE_ID),
    locales,
    markets,
    profileTypes: csv(raw["profile-types"], DEFAULT_PROFILE_TYPES),
    actionClasses: csv(raw["action-classes"], DEFAULT_ACTION_CLASSES),
    format,
    stdout,
    outDir: raw["out-dir"] ? String(raw["out-dir"]) : null,
    fixture: raw.fixture ? String(raw.fixture) : null,
    maxAgeHoursProfile: raw["max-age-hours-profile"] ? Number(raw["max-age-hours-profile"]) : null,
    requireSourceRefs: raw["require-source-refs"] === undefined ? true : bool(raw["require-source-refs"]),
    allowNeoControlledRefreshCanary: raw["allow-neo-controlled-refresh-canary"] === undefined ? true : bool(raw["allow-neo-controlled-refresh-canary"]),
    sampleLimit: raw["sample-limit"] ? Number(raw["sample-limit"]) : 10,
    failOn: csv(raw["fail-on"], []),
    now: raw.now ? String(raw.now) : null,
  };
}

function usageError(message) {
  const error = new Error(message);
  error.usage = true;
  return error;
}

function csv(value, fallback) {
  if (value === undefined || value === null || value === false) return [...fallback];
  if (value === true) return [...fallback];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function bool(value) {
  if (value === true) return true;
  if (value === false || value === undefined) return false;
  return !["false", "0", "no"].includes(String(value).toLowerCase());
}

function choice(value, allowed, name) {
  const text = String(value);
  if (!allowed.includes(text)) throw usageError(`Invalid --${name}: ${text}`);
  return text;
}

function localeToMarket(locale) {
  const map = { "en-US": "US", "pt-BR": "BR", "fr-FR": "EU", "de-DE": "EU", "es-CO": "CO" };
  return map[locale] ?? "OTHER";
}

function requirementsForAction(actionClass) {
  if (actionClass === "safe_apply") {
    return [
      { profile_type: "page_product", max_age_hours: 1, min_confidence: 0.7 },
      { profile_type: "risk_policy", max_age_hours: 1, min_confidence: 0.95 },
    ];
  }
  if (actionClass === "content_publish") {
    return [
      { profile_type: "business", max_age_hours: 24 * 30, min_confidence: 0.75 },
      { profile_type: "buyer", max_age_hours: 24 * 30, min_confidence: 0.72 },
      { profile_type: "seo_market", max_age_hours: 24 * 7, min_confidence: 0.7 },
      { profile_type: "page_product", max_age_hours: 1, min_confidence: 0.68 },
      { profile_type: "risk_policy", max_age_hours: 1, min_confidence: 0.95 },
    ];
  }
  if (actionClass === "transcreation_merge") {
    return [
      { profile_type: "business", max_age_hours: 24 * 30, min_confidence: 0.75 },
      { profile_type: "buyer", max_age_hours: 24 * 30, min_confidence: 0.72 },
      { profile_type: "seo_market", max_age_hours: 24 * 7, min_confidence: 0.7 },
      { profile_type: "competitor", max_age_hours: 24 * 7, min_confidence: 0.65 },
      { profile_type: "page_product", max_age_hours: 1, min_confidence: 0.68 },
      { profile_type: "risk_policy", max_age_hours: 1, min_confidence: 0.95 },
    ];
  }
  return [{ profile_type: "risk_policy", max_age_hours: 1, min_confidence: 0.95 }];
}

async function loadFixture(fixturePath) {
  const content = await fs.readFile(fixturePath, "utf8");
  const fixture = JSON.parse(content);
  return normalizeDataset(fixture, "fixture");
}

async function loadLiveDataset(args) {
  loadDotEnv(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for live read-only audit");
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const errors = [];
  const tables = {};
  tables.growth_profiles = await readTable(sb, "growth_profiles", args, errors, "valid_until");
  const sourceIds = [...new Set(tables.growth_profiles.rows.flatMap((row) => asArray(row.source_signal_fact_ids)).filter(Boolean))];
  tables.growth_signal_facts = await readTable(sb, "growth_signal_facts", args, errors, "updated_at", (query) => sourceIds.length ? query.in("id", sourceIds) : query.limit(0));
  tables.growth_profile_runs = await readTable(sb, "growth_profile_runs", args, errors, "completed_at");
  tables.growth_gsc_cache = await readTable(sb, "growth_gsc_cache", args, errors, "fetched_at");
  tables.growth_ga4_cache = await readTable(sb, "growth_ga4_cache", args, errors, "fetched_at");
  tables.growth_dataforseo_cache = await readTable(sb, "growth_dataforseo_cache", args, errors, "fetched_at");
  tables.growth_agent_definitions = await readTable(sb, "growth_agent_definitions", args, errors, "updated_at");
  tables.growth_work_item_outcomes = await readTable(sb, "growth_work_item_outcomes", args, errors, "evaluation_date");
  tables.growth_publication_jobs = await readTable(sb, "growth_publication_jobs", args, errors, "updated_at");
  tables.funnel_events = await readTable(sb, "funnel_events", args, errors, "occurred_at");
  return normalizeDataset({ tables, errors }, "live-readonly");
}

async function readTable(sb, table, args, errors, orderColumn, decorate = (query) => query) {
  try {
    let query = sb.from(table).select("*").eq("account_id", args.accountId).eq("website_id", args.websiteId).limit(Math.max(args.sampleLimit * 10, 100));
    if (table === "growth_profiles" || table === "growth_signal_facts") query = query.in("locale", args.locales);
    query = decorate(query);
    if (orderColumn) query = query.order(orderColumn, { ascending: false, nullsFirst: false });
    const { data, error } = await query;
    if (error) {
      errors.push({ source: table, message: error.message, fatal: false });
      return { rows: [], status: "UNAVAILABLE", error: error.message };
    }
    return { rows: data ?? [], status: "AVAILABLE", error: null };
  } catch (error) {
    errors.push({ source: table, message: error.message, fatal: false });
    return { rows: [], status: "UNAVAILABLE", error: error.message };
  }
}

function normalizeDataset(input, mode) {
  const tables = input.tables ?? input;
  const normalized = { mode, generatedAt: input.generated_at ?? null, tables: {}, errors: input.errors ?? [] };
  for (const source of SOURCE_NAMES) {
    const value = tables[source] ?? [];
    if (Array.isArray(value)) normalized.tables[source] = { rows: value, status: "AVAILABLE", error: null };
    else normalized.tables[source] = { rows: value.rows ?? [], status: value.status ?? "AVAILABLE", error: value.error ?? null };
  }
  return normalized;
}

export function buildReport(dataset, args, now = new Date()) {
  const sourceSummaries = summarizeSources(dataset, args, now);
  const profileRows = dataset.tables.growth_profiles.rows.filter((row) => args.locales.includes(row.locale));
  const factsById = new Map(dataset.tables.growth_signal_facts.rows.map((row) => [String(row.id), row]));
  const runs = dataset.tables.growth_profile_runs.rows;
  const latestProfileByKey = latestProfiles(profileRows);
  const actionAudits = [];
  const localeAudits = [];
  const marketsByLocale = Object.fromEntries(args.locales.map((locale, index) => [locale, args.markets[index] ?? localeToMarket(locale)]));

  for (const locale of args.locales) {
    const market = marketsByLocale[locale] ?? localeToMarket(locale);
    const localeActionAudits = [];
    for (const actionClass of args.actionClasses) {
      const requirements = requirementsForAction(actionClass).filter((req) => args.profileTypes.includes(req.profile_type));
      const profileAudits = requirements.map((req) => evaluateProfile({ req, locale, market, latestProfileByKey, factsById, runs, sourceSummaries, args, now }));
      const agentStatus = evaluateAgents(dataset.tables.growth_agent_definitions.rows, locale, market, actionClass);
      const reasons = profileAudits.flatMap((audit) => audit.reasons);
      if (agentStatus.enabled_mismatched > 0) reasons.push("enabled_agent_definition_locale_market_mismatch");
      const verdicts = profileAudits.map((audit) => audit.verdict);
      if (agentStatus.enabled_mismatched > 0) verdicts.push("FAIL_LOCALE_MISMATCH");
      const verdict = chooseVerdict(verdicts);
      const actionAudit = { locale, market, action_class: actionClass, verdict, reasons: unique(reasons), required_profiles: profileAudits, agent_definition_status: agentStatus };
      actionAudits.push(actionAudit);
      localeActionAudits.push({ action_class: actionClass, verdict });
    }
    localeAudits.push({ locale, market, actions: localeActionAudits, verdict: chooseVerdict(localeActionAudits.map((item) => item.verdict)) });
  }

  const allVerdictsForRollup = [
    ...actionAudits.map((audit) => audit.verdict),
    ...actionAudits.flatMap((audit) => audit.required_profiles.map((profile) => profile.verdict)),
  ];
  const verdictCounts = countBy(allVerdictsForRollup, (verdict) => verdict, VERDICTS);
  const autonomousReadyLocales = localeAudits.filter((audit) => audit.actions.every((action) => action.verdict === "PASS_AUTONOMOUS")).map((audit) => audit.locale);
  const canaryOnlyLocales = localeAudits.filter((audit) => audit.actions.some((action) => action.verdict === "PASS_CANARY_ONLY") && audit.actions.every((action) => !action.verdict.startsWith("FAIL_"))).map((audit) => audit.locale);
  const blockedLocales = localeAudits.filter((audit) => audit.actions.some((action) => action.verdict.startsWith("FAIL_"))).map((audit) => audit.locale);
  const topBlockers = Object.entries(countReasons(actionAudits.flatMap((audit) => audit.reasons))).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  const status = actionAudits.some((audit) => audit.verdict.startsWith("FAIL_")) ? "FAIL" : actionAudits.some((audit) => audit.verdict === "PASS_CANARY_ONLY") ? "PASS_WITH_CANARY_ONLY" : "PASS";

  return redactObject({
    schema_version: "growth-profile-source-auditor/v1",
    generated_at: now.toISOString(),
    mode: dataset.mode,
    account_id: args.accountId,
    website_id: args.websiteId,
    requested_locales: args.locales,
    requested_markets: args.markets,
    requested_action_classes: args.actionClasses,
    status,
    safety: { readonly: true, writes_attempted: 0, provider_calls_attempted: 0, crons_modified: 0, dispatch_attempted: 0, secrets_redacted: true },
    thresholds: Object.fromEntries(args.actionClasses.map((actionClass) => [actionClass, requirementsForAction(actionClass)])),
    rollup: { verdict_counts: verdictCounts, autonomous_ready_locales: autonomousReadyLocales, canary_only_locales: canaryOnlyLocales, blocked_locales: blockedLocales, top_blockers: topBlockers },
    sources: sourceSummaries,
    locale_audits: localeAudits,
    action_audits: actionAudits,
    redaction: { fields_redacted: ["token", "secret", "password", "authorization", "api_key", "service_role", "access_token", "refresh_token"], sample_limit: args.sampleLimit },
    errors: dataset.errors.map((error) => ({ ...error, message: redactString(error.message) })),
  });
}

function evaluateProfile({ req, locale, market, latestProfileByKey, factsById, runs, sourceSummaries, args, now }) {
  const effectiveMaxAge = args.maxAgeHoursProfile ?? req.max_age_hours;
  const profile = latestProfileByKey.get(profileKey(locale, market, req.profile_type));
  if (!profile) {
    return blankProfileAudit(locale, market, req, "FAIL_MISSING_PROFILE", [`missing_growth_profile:${req.profile_type}`], effectiveMaxAge);
  }
  const reasons = [];
  const verdicts = [];
  const validFrom = dateValue(profile.valid_from ?? profile.updated_at ?? profile.created_at);
  const validUntil = dateValue(profile.valid_until);
  const ageHours = validFrom ? hoursBetween(validFrom, now) : null;
  if ((validUntil && validUntil <= now) || (ageHours !== null && ageHours > effectiveMaxAge)) {
    verdicts.push("FAIL_STALE");
    reasons.push(`stale_profile:${req.profile_type}`);
  }
  const confidence = Number(profile.confidence ?? 0);
  if (confidence < req.min_confidence) {
    verdicts.push("FAIL_LOW_CONFIDENCE");
    reasons.push(`low_profile_confidence:${req.profile_type}`);
  }
  if (profile.locale !== locale || normalizeMarket(profile.market) !== normalizeMarket(market)) {
    verdicts.push("FAIL_LOCALE_MISMATCH");
    reasons.push(`profile_locale_market_mismatch:${profile.locale}/${profile.market}`);
  }
  const sourceIds = asArray(profile.source_signal_fact_ids).map(String).filter(Boolean);
  const missingIds = sourceIds.filter((id) => !factsById.has(id));
  if (args.requireSourceRefs && sourceIds.length === 0) {
    verdicts.push("FAIL_MISSING_SOURCE_REFS");
    reasons.push(`empty_source_signal_fact_ids:${req.profile_type}`);
  }
  if (missingIds.length) {
    verdicts.push("FAIL_MISSING_SOURCE_REFS");
    reasons.push(`missing_source_signal_fact_ids:${missingIds.length}`);
  }
  const factSummary = summarizeFacts(sourceIds.map((id) => factsById.get(id)).filter(Boolean), locale, market, req.min_confidence, now);
  if (sourceIds.length > 0 && factSummary.fresh === 0) {
    verdicts.push("FAIL_STALE");
    reasons.push(`no_fresh_source_facts:${req.profile_type}`);
  }
  if (factSummary.locale_mismatch > 0) {
    verdicts.push("FAIL_LOCALE_MISMATCH");
    reasons.push(`source_fact_locale_market_mismatch:${factSummary.locale_mismatch}`);
  }
  if (factSummary.low_confidence > 0 && factSummary.fresh === factSummary.low_confidence) {
    verdicts.push("FAIL_LOW_CONFIDENCE");
    reasons.push(`low_source_fact_confidence:${req.profile_type}`);
  }
  const providerSummary = profileProviderSummary(req.profile_type, sourceSummaries, locale, market);
  if (providerBlocks(req.profile_type, providerSummary)) {
    verdicts.push("FAIL_PROVIDER_CACHE_EMPTY");
    reasons.push(`required_provider_cache_unavailable:${req.profile_type}`);
  }
  const latestRun = latestRunForProfile(runs, profile, locale, market, req.profile_type);
  const source = String(profile.source ?? latestRun?.source ?? "");
  if (args.allowNeoControlledRefreshCanary && isControlledSource(source) && !verdicts.some((verdict) => verdict.startsWith("FAIL_"))) {
    verdicts.push("PASS_CANARY_ONLY");
    reasons.push(`controlled_refresh_source:${source}`);
  }
  const verdict = chooseVerdict(verdicts);
  return {
    locale,
    market,
    profile_type: req.profile_type,
    subject_table: profile.subject_table ?? null,
    subject_id: profile.subject_id ?? null,
    subject_key: profile.subject_key ?? null,
    verdict,
    reasons: unique(reasons),
    profile_id: profile.id,
    confidence,
    min_confidence: req.min_confidence,
    age_hours: ageHours === null ? undefined : Number(ageHours.toFixed(2)),
    max_age_hours: effectiveMaxAge,
    valid_until: profile.valid_until,
    source_signal_fact_ids_count: sourceIds.length,
    missing_source_signal_fact_ids: missingIds,
    source_fact_summary: factSummary,
    provider_cache_summary: providerSummary,
    latest_run: latestRun ? { id: latestRun.id, status: latestRun.status, source: latestRun.source, completed_at: latestRun.completed_at ?? null, canary_only_reason: isControlledSource(latestRun.source) ? "controlled_refresh_source" : null } : undefined,
  };
}

function blankProfileAudit(locale, market, req, verdict, reasons, maxAgeHours) {
  return {
    locale,
    market,
    profile_type: req.profile_type,
    subject_table: null,
    subject_id: null,
    subject_key: null,
    verdict,
    reasons,
    min_confidence: req.min_confidence,
    max_age_hours: maxAgeHours,
    source_signal_fact_ids_count: 0,
    missing_source_signal_fact_ids: [],
    source_fact_summary: { fresh: 0, stale: 0, low_confidence: 0, locale_mismatch: 0, sources: {} },
    provider_cache_summary: emptyProviderSummary(),
  };
}

function latestProfiles(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = profileKey(row.locale, row.market, row.profile_type);
    const current = map.get(key);
    if (!current || compareProfileRows(row, current) < 0) map.set(key, row);
  }
  return map;
}

function compareProfileRows(a, b) {
  return Date.parse(b.valid_until ?? b.updated_at ?? b.created_at ?? 0) - Date.parse(a.valid_until ?? a.updated_at ?? a.created_at ?? 0);
}

function profileKey(locale, market, profileType) {
  return `${locale}|${normalizeMarket(market)}|${profileType}`;
}

function normalizeMarket(market) {
  return String(market ?? "OTHER").toUpperCase();
}

function summarizeFacts(facts, locale, market, minConfidence, now) {
  const summary = { fresh: 0, stale: 0, low_confidence: 0, locale_mismatch: 0, sources: {} };
  for (const fact of facts) {
    const source = String(fact.source ?? "unknown");
    summary.sources[source] = (summary.sources[source] ?? 0) + 1;
    const expiresAt = dateValue(fact.expires_at);
    const observedAt = dateValue(fact.observed_at ?? fact.updated_at ?? fact.created_at);
    const stale = (expiresAt && expiresAt <= now) || (!expiresAt && observedAt && hoursBetween(observedAt, now) > 24 * 30);
    if (stale) summary.stale += 1;
    else summary.fresh += 1;
    if (Number(fact.confidence ?? 1) < minConfidence) summary.low_confidence += 1;
    const factLocale = fact.locale;
    const factMarket = normalizeMarket(fact.market);
    if (factLocale && factLocale !== locale) summary.locale_mismatch += 1;
    else if (factMarket && factMarket !== "OTHER" && factMarket !== normalizeMarket(market)) summary.locale_mismatch += 1;
  }
  return summary;
}

function summarizeSources(dataset, args, now) {
  const summaries = {};
  for (const name of SOURCE_NAMES) {
    const source = dataset.tables[name] ?? { rows: [], status: "UNAVAILABLE", error: "not loaded" };
    const freshnessSla = FRESHNESS_HOURS[name] ?? null;
    const latest = latestTimestamp(source.rows);
    const ageHours = latest ? hoursBetween(new Date(latest), now) : null;
    const freshRows = freshnessSla ? source.rows.filter((row) => {
      const ts = latestRowTimestamp(row);
      return ts && hoursBetween(new Date(ts), now) <= freshnessSla && (!row.expires_at || new Date(row.expires_at) > now);
    }).length : undefined;
    summaries[name] = {
      table: name,
      source_status: source.status === "AVAILABLE" ? "AVAILABLE" : "UNAVAILABLE",
      row_count: source.rows.length,
      fresh_row_count: freshRows,
      latest_at: latest,
      freshness_sla_hours: freshnessSla,
      error: source.error ? redactString(source.error) : null,
      samples: source.rows.slice(0, args.sampleLimit).map((row) => sampleRow(row)),
    };
  }
  return summaries;
}

function latestTimestamp(rows) {
  const timestamps = rows.map(latestRowTimestamp).filter(Boolean).map((value) => new Date(value).getTime()).filter(Number.isFinite);
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function latestRowTimestamp(row) {
  return row.fetched_at ?? row.observed_at ?? row.completed_at ?? row.evaluation_date ?? row.occurred_at ?? row.valid_from ?? row.updated_at ?? row.created_at ?? null;
}

function sampleRow(row) {
  const sample = {};
  for (const key of ["id", "locale", "market", "profile_type", "source", "status", "confidence", "valid_until", "fetched_at", "expires_at", "updated_at", "created_at", "payload", "config"]) {
    if (row[key] !== undefined) sample[key] = key === "payload" || key === "config" ? summarizePayload(row[key]) : row[key];
  }
  return redactObject(sample);
}

function summarizePayload(value) {
  if (!value || typeof value !== "object") return value;
  return { keys: Object.keys(value).sort(), redacted_sample: redactObject(value) };
}

function profileProviderSummary(profileType, sources, locale, market) {
  const summary = emptyProviderSummary();
  if (profileType === "seo_market") {
    summary.growth_gsc_cache.required = true;
    summary.growth_dataforseo_cache.required = true;
  }
  if (profileType === "competitor") summary.growth_dataforseo_cache.required = true;
  for (const name of Object.keys(summary)) {
    const source = sources[name];
    const samples = source?.samples ?? [];
    const hasLocaleScopedSamples = samples.some((row) => row && typeof row === "object" && (row.locale || row.market));
    const scopedSamples = samples.filter((row) => rowMatchesLocaleMarket(row, locale, market));
    const hasScopedEvidence = scopedSamples.length > 0;
    const rowCount = hasScopedEvidence ? scopedSamples.length : hasLocaleScopedSamples ? 0 : source?.row_count ?? 0;
    const freshRowCount = hasScopedEvidence
      ? scopedSamples.filter((row) => !row.expires_at || new Date(row.expires_at) > new Date()).length
      : hasLocaleScopedSamples ? 0 : source?.fresh_row_count ?? 0;
    summary[name].row_count = rowCount;
    summary[name].fresh_row_count = freshRowCount;
    summary[name].latest_at = hasScopedEvidence ? latestTimestamp(scopedSamples) : source?.latest_at ?? null;
    summary[name].status = !summary[name].required ? "NOT_REQUIRED" : source?.source_status === "UNAVAILABLE" ? "UNAVAILABLE" : rowCount === 0 ? "EMPTY" : freshRowCount > 0 ? "FRESH" : "STALE";
  }
  return summary;
}

function rowMatchesLocaleMarket(row, locale, market) {
  if (!row || typeof row !== "object") return false;
  const rowLocale = row.locale;
  const rowMarket = row.market;
  if (!rowLocale && !rowMarket) return false;
  if (rowLocale && rowLocale !== locale) return false;
  if (rowMarket && normalizeMarket(rowMarket) !== normalizeMarket(market)) return false;
  return true;
}

function emptyProviderSummary() {
  return {
    growth_gsc_cache: { required: false, row_count: 0, fresh_row_count: 0, latest_at: null, status: "NOT_REQUIRED" },
    growth_ga4_cache: { required: false, row_count: 0, fresh_row_count: 0, latest_at: null, status: "NOT_REQUIRED" },
    growth_dataforseo_cache: { required: false, row_count: 0, fresh_row_count: 0, latest_at: null, status: "NOT_REQUIRED" },
  };
}

function providerBlocks(profileType, summary) {
  if (profileType === "seo_market") {
    return [summary.growth_gsc_cache, summary.growth_dataforseo_cache].every((entry) => entry.status !== "FRESH");
  }
  if (profileType === "competitor") return summary.growth_dataforseo_cache.status !== "FRESH";
  return false;
}

function latestRunForProfile(runs, profile, locale, market, profileType) {
  return runs.filter((run) => {
    if (run.profile_id && profile.id && run.profile_id === profile.id) return true;
    if (asArray(run.output_profile_ids).includes(profile.id)) return true;
    return run.locale === locale && normalizeMarket(run.market) === normalizeMarket(market) && run.profile_type === profileType;
  }).sort((a, b) => Date.parse(b.completed_at ?? b.updated_at ?? b.created_at ?? 0) - Date.parse(a.completed_at ?? a.updated_at ?? a.created_at ?? 0))[0] ?? null;
}

function isControlledSource(source) {
  return /neo_controlled_refresh|manual|human|controlled/i.test(String(source ?? ""));
}

function evaluateAgents(agentRows, locale, market, actionClass) {
  const status = { enabled_compatible: 0, enabled_mismatched: 0, disabled: 0, mismatches: [] };
  for (const agent of agentRows) {
    const allowed = asArray(agent.allowed_action_classes);
    if (agent.scope_locale && agent.scope_locale !== locale) continue;
    const actionRelevant = allowed.length === 0 || allowed.includes(actionClass);
    if (!actionRelevant) continue;
    if (agent.enabled === false || String(agent.status ?? "").toLowerCase() === "disabled") {
      status.disabled += 1;
      continue;
    }
    const localeCompatible = !agent.locale || agent.locale === locale;
    const marketCompatible = !agent.market || normalizeMarket(agent.market) === normalizeMarket(market);
    if (localeCompatible && marketCompatible) status.enabled_compatible += 1;
    else {
      status.enabled_mismatched += 1;
      status.mismatches.push({ agent_id: agent.agent_id ?? agent.id, lane: agent.lane, locale: agent.locale, market: agent.market });
    }
  }
  return status;
}

function chooseVerdict(verdicts) {
  const list = verdicts.filter(Boolean);
  if (!list.length) return "PASS_AUTONOMOUS";
  for (const verdict of VERDICT_PRECEDENCE) if (list.includes(verdict)) return verdict;
  return "PASS_AUTONOMOUS";
}

async function writeReports(report, format, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  if (format === "json" || format === "both") {
    await fs.writeFile(path.join(outDir, "profile-source-auditor-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  if (format === "markdown" || format === "both") {
    await fs.writeFile(path.join(outDir, "profile-source-auditor-report.md"), renderMarkdown(report));
  }
}

function writeStdout(report, stdout, outDir) {
  if (stdout === "none") return;
  const summary = { status: report.status, mode: report.mode, outDir, verdict_counts: report.rollup.verdict_counts, blocked_locales: report.rollup.blocked_locales, canary_only_locales: report.rollup.canary_only_locales };
  console.log(JSON.stringify(stdout === "json" ? report : summary, null, 2));
}

export function renderMarkdown(report) {
  return `# Growth Profile Source Auditor v1

Generated: ${report.generated_at}  
Status: \`${report.status}\`  
Mode: \`${report.mode}\`

## Executive rollup

- Autonomous-ready locales: ${report.rollup.autonomous_ready_locales.join(", ") || "none"}
- Canary-only locales: ${report.rollup.canary_only_locales.join(", ") || "none"}
- Blocked locales: ${report.rollup.blocked_locales.join(", ") || "none"}
- Top blockers: ${report.rollup.top_blockers.map((item) => `${item.reason} (${item.count})`).join(", ") || "none"}

## Safety statement

Read-only: true. Writes attempted: 0. Provider calls attempted: 0. Crons modified: 0. Dispatch attempted: 0. Secrets redacted: true.

## Verdict counts

${table(["verdict", "count"], Object.entries(report.rollup.verdict_counts).map(([verdict, count]) => [verdict, count]))}

## Locale/action matrix

${table(["locale", "market", "action class", "verdict", "primary blocker", "profile failures", "agent mismatches"], report.action_audits.map((audit) => [audit.locale, audit.market, audit.action_class, audit.verdict, audit.reasons[0] ?? "-", audit.required_profiles.filter((profile) => profile.verdict.startsWith("FAIL_")).map((profile) => profile.profile_type).join(", ") || "-", audit.agent_definition_status.enabled_mismatched]))}

## Profile details

${report.locale_audits.map((localeAudit) => `### ${localeAudit.locale} / ${localeAudit.market}\n\n${table(["profile type", "profile id", "confidence", "age h", "source refs", "provider status", "verdict"], profilesForLocale(report, localeAudit.locale).map((profile) => [profile.profile_type, shortId(profile.profile_id), profile.confidence === undefined ? "-" : `${profile.confidence}/${profile.min_confidence}`, profile.age_hours === undefined ? "-" : `${profile.age_hours}/${profile.max_age_hours}`, profile.source_signal_fact_ids_count, providerStatusText(profile.provider_cache_summary), profile.verdict]))}`).join("\n\n")}

## Source table health

${table(["table", "status", "rows", "fresh rows", "latest", "SLA h", "error"], Object.entries(report.sources).map(([name, source]) => [name, source.source_status, source.row_count, source.fresh_row_count ?? "-", source.latest_at ?? "-", source.freshness_sla_hours ?? "-", source.error ?? "-"]))}

## Agent definition locale/market mismatches

${report.action_audits.flatMap((audit) => audit.agent_definition_status.mismatches.map((mismatch) => `- ${audit.locale}/${audit.market} ${audit.action_class}: ${mismatch.agent_id} lane=${mismatch.lane ?? "-"} locale=${mismatch.locale ?? "-"} market=${mismatch.market ?? "-"}`)).join("\n") || "None."}

## Redacted samples

${Object.entries(report.sources).map(([name, source]) => `### ${name}\n\n\`\`\`json\n${JSON.stringify(source.samples ?? [], null, 2)}\n\`\`\``).join("\n\n")}

## Developer implementation checklist

- [x] Read-only fixture/live modes
- [x] JSON and Markdown reports
- [x] Explicit verdict enum and precedence
- [x] Source refs block autonomous use by default
- [x] Secret-like keys and values redacted

## QA acceptance checklist

- [ ] Fixture mode runs without Supabase credentials
- [ ] JSON report schema_version is growth-profile-source-auditor/v1
- [ ] Markdown has executive rollup, safety, matrix, source health and agent mismatch sections
- [ ] Every required verdict appears in fixture output
- [ ] Static mutation guard remains clean

## Tech-validator PLAN notes

Supabase remains SSOT in live mode. Kanban task prose is not used as evidence. The auditor is read-only by design and has no mutation mode in v1.
`;
}

function profilesForLocale(report, locale) {
  const byKey = new Map();
  for (const audit of report.action_audits.filter((item) => item.locale === locale)) {
    for (const profile of audit.required_profiles) {
      const key = `${profile.locale}|${profile.market}|${profile.profile_type}`;
      if (!byKey.has(key) || byKey.get(key).verdict === "PASS_AUTONOMOUS") byKey.set(key, profile);
    }
  }
  return [...byKey.values()].sort((a, b) => a.profile_type.localeCompare(b.profile_type));
}

function providerStatusText(summary) {
  return Object.entries(summary).filter(([, value]) => value.required).map(([key, value]) => `${key.replace("growth_", "")}:${value.status}`).join(", ") || "not required";
}

function table(headers, rows) {
  const safeRows = rows.length ? rows : [[...headers.map(() => "-")]];
  const allRows = [headers, ...safeRows].map((row) => row.map((cell) => String(cell ?? "").replace(/\|/g, "\\|")));
  const widths = headers.map((_, index) => Math.max(...allRows.map((row) => row[index]?.length ?? 0)));
  const render = (row) => `| ${row.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`;
  return [render(allRows[0]), render(widths.map((width) => "-".repeat(width))), ...allRows.slice(1).map(render)].join("\n");
}

function shortId(id) {
  if (!id) return "-";
  return String(id).length > 12 ? `${String(id).slice(0, 8)}…` : String(id);
}

function countBy(rows, fn, seed = []) {
  const counts = Object.fromEntries(seed.map((key) => [key, 0]));
  for (const row of rows) counts[fn(row)] = (counts[fn(row)] ?? 0) + 1;
  return counts;
}

function countReasons(reasons) {
  return reasons.reduce((acc, reason) => {
    acc[reason] = (acc[reason] ?? 0) + 1;
    return acc;
  }, {});
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursBetween(start, end) {
  return (end.getTime() - start.getTime()) / 36e5;
}

function dateStamp(date) {
  return date.toISOString().slice(0, 10);
}

function redactObject(value) {
  if (Array.isArray(value)) return value.map(redactObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, key === "secrets_redacted" ? val : SECRET_KEY_RE.test(key) ? "[REDACTED]" : redactObject(val)]));
  }
  if (typeof value === "string") return redactString(value);
  return value;
}

function redactString(value) {
  return String(value).replace(SECRET_VALUE_RE, (match, prefix) => prefix ? `${prefix}[REDACTED]` : "[REDACTED]");
}

function loadDotEnv(envPath) {
  try {
    const content = requireNodeFsRead(envPath);
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Missing .env.local is handled by the live credential check.
  }
}

function requireNodeFsRead(filePath) {
  return globalThis.process.getBuiltinModule ? globalThis.process.getBuiltinModule("fs").readFileSync(filePath, "utf8") : "";
}

async function assertStaticSafety() {
  const sourcePath = fileURLToPath(import.meta.url);
  const source = await fs.readFile(sourcePath, "utf8");
  const methodPattern = new RegExp("\\.(insert|" + "update|upsert|" + "delete)\\s*\\(");
  if (methodPattern.test(source)) throw new Error("Static safety check failed: mutation method found in auditor source");
  const commandPattern = new RegExp("hermes\\s+kanban", "i");
  if (commandPattern.test(source)) throw new Error("Static safety check failed: Kanban command found in auditor source");
}
