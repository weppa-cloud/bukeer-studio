import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export const DEFAULT_ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
export const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
export const DEFAULT_MAX_ACTIVE = 5;

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = "true";
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchRows(sb, table, columns = "*", options = {}) {
  let query = sb.from(table).select(columns);
  if (options.websiteId) query = query.eq("website_id", options.websiteId);
  if (options.orderBy) {
    query = query.order(options.orderBy, {
      ascending: options.ascending ?? false,
    });
  }
  query = query.limit(options.limit ?? 5000);
  const { data, error } = await query;
  if (error) {
    return { rows: [], error: error.message };
  }
  return { rows: data ?? [], error: null };
}

export async function upsertRows(sb, table, rows, onConflict, chunkSize = 100) {
  const result = { table, rows: rows.length, chunks: 0, errors: [] };
  for (const chunk of chunks(rows, chunkSize)) {
    const { error } = await sb.from(table).upsert(chunk, { onConflict });
    result.chunks += 1;
    if (error) {
      result.errors.push(error.message);
      throw new Error(`${table} upsert failed: ${error.message}`);
    }
  }
  return result;
}

export async function writeArtifacts(outDir, basename, report, markdown) {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, `${basename}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await fs.writeFile(path.join(outDir, `${basename}.md`), markdown);
}

export function fingerprint(...parts) {
  return crypto
    .createHash("sha256")
    .update(parts.map((part) => stableString(part)).join("|"))
    .digest("hex");
}

export function stableString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  return JSON.stringify(value, Object.keys(value).sort());
}

export function chunks(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
}

export function canonicalUrl(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.startsWith("http://") || text.startsWith("https://"))
    return text.replace(/\/$/, "");
  if (text.startsWith("/"))
    return `https://colombiatours.travel${text}`.replace(/\/$/, "");
  return text;
}

export function inferEntity(row) {
  const url = canonicalUrl(
    row.canonical_url ??
      row.source_url ??
      row.page_url ??
      row.landing_page ??
      row.url,
  );
  if (url) return { entity_type: "url", entity_key: url };
  const keyword = row.keyword ?? row.query ?? row.cluster;
  if (keyword)
    return {
      entity_type: row.keyword ? "keyword" : "query",
      entity_key: String(keyword),
    };
  return { entity_type: "artifact", entity_key: row.id ?? fingerprint(row) };
}

export function statusFromGates(
  freshness,
  quality = "PASS",
  correlation = "WATCH",
) {
  if ([freshness, quality, correlation].includes("BLOCKED")) return "blocked";
  if ([freshness, quality, correlation].includes("WATCH")) return "watch";
  return "candidate";
}

export function freshnessFromDates(observedAt, maxAgeDays = 8) {
  if (!observedAt) return "WATCH";
  const ts = new Date(observedAt).getTime();
  if (!Number.isFinite(ts)) return "WATCH";
  const ageDays = (Date.now() - ts) / 86_400_000;
  if (ageDays <= maxAgeDays) return "PASS";
  if (ageDays <= maxAgeDays * 3) return "WATCH";
  return "BLOCKED";
}

export function runRef(
  provider,
  profileId,
  runId,
  accountId,
  websiteId,
  overrides = {},
) {
  const observed = overrides.observed_at ?? new Date().toISOString();
  return {
    account_id: accountId,
    website_id: websiteId,
    profile_id: profileId,
    provider,
    provider_family: providerFamily(provider),
    run_id: runId,
    cadence: overrides.cadence ?? "backfill",
    status: overrides.status ?? "success",
    started_at: overrides.started_at ?? null,
    completed_at: overrides.completed_at ?? observed,
    window_start: overrides.window_start ?? null,
    window_end: overrides.window_end ?? null,
    observed_at: observed,
    row_count: Number(overrides.row_count ?? 0),
    cost: overrides.cost ?? null,
    currency: overrides.currency ?? null,
    freshness_status:
      overrides.freshness_status ?? freshnessFromDates(observed),
    quality_status: overrides.quality_status ?? "PASS",
    artifact_path: overrides.artifact_path ?? null,
    error_class: overrides.error_class ?? null,
    evidence: overrides.evidence ?? {},
  };
}

export function providerFamily(provider) {
  if (["gsc", "ga4"].includes(provider)) return "first_party";
  if (provider === "dataforseo") return "seo_provider";
  if (["meta_ads", "google_ads"].includes(provider)) return "paid";
  if (provider === "tracking") return "tracking";
  return "manual";
}

export function candidateFromRow({
  row,
  table,
  accountId,
  websiteId,
  sourceProfile,
  workType,
  title,
  nextAction,
  baseline,
  priorityScore,
  confidenceScore,
  freshnessStatus,
  qualityStatus = "PASS",
  correlationStatus = "WATCH",
  status,
  evidence = {},
}) {
  const entity = inferEntity(row);
  const candidateKey = fingerprint(
    table,
    sourceProfile,
    workType,
    entity.entity_type,
    entity.entity_key,
    row.id ?? row.fact_fingerprint ?? row.source_url ?? row.keyword ?? "",
  );
  const finalFreshness =
    freshnessStatus ??
    freshnessFromDates(
      row.updated_at ?? row.observed_at ?? row.created_at ?? row.fetched_at,
    );
  const finalStatus =
    status ?? statusFromGates(finalFreshness, qualityStatus, correlationStatus);
  return {
    account_id: accountId,
    website_id: websiteId,
    candidate_key: candidateKey,
    entity_type: entity.entity_type,
    entity_key: entity.entity_key,
    work_type: workType,
    title,
    market: row.market ?? null,
    locale: row.locale ?? null,
    channel: row.channel ?? null,
    source_profiles: [sourceProfile],
    source_fact_refs: [
      {
        table,
        id: row.id ?? null,
        key: row.fact_fingerprint ?? row.source_url ?? row.keyword ?? null,
      },
    ],
    profile_run_ids: [],
    window_start: row.window_start ?? row.baseline_start ?? null,
    window_end: row.window_end ?? row.baseline_end ?? null,
    freshness_status: finalFreshness,
    quality_status: qualityStatus,
    correlation_status: correlationStatus,
    priority_score: Number(
      priorityScore ??
        row.priority_score ??
        row.ICE_score ??
        row.RICE_score ??
        0,
    ),
    confidence_score: Number(confidenceScore ?? 0.5),
    baseline: baseline ?? inferBaseline(row),
    hypothesis: row.hypothesis ?? null,
    confounders: [],
    next_action: nextAction,
    status: finalStatus,
    reject_reason:
      finalStatus === "blocked"
        ? "missing freshness/baseline/source confidence for automatic promotion"
        : null,
    evidence: compact({
      migration_source: table,
      ...evidence,
      source_row: row,
    }),
  };
}

export function inferBaseline(row) {
  const pieces = [];
  if (row.gsc_impressions_28d !== undefined)
    pieces.push(
      `GSC ${row.gsc_clicks_28d ?? 0} clicks / ${row.gsc_impressions_28d ?? 0} impressions`,
    );
  if (row.ga4_sessions_28d !== undefined)
    pieces.push(`GA4 ${row.ga4_sessions_28d ?? 0} sessions`);
  if (row.clicks !== undefined || row.impressions !== undefined)
    pieces.push(
      `${row.clicks ?? 0} clicks / ${row.impressions ?? 0} impressions`,
    );
  if (row.sessions !== undefined) pieces.push(`${row.sessions ?? 0} sessions`);
  if (row.severity) pieces.push(`Severity ${row.severity}`);
  if (row.operational_severity)
    pieces.push(`Operational severity ${row.operational_severity}`);
  return pieces.length ? pieces.join("; ") : null;
}

export function renderTable(rows, columns) {
  if (!rows.length) return "_No rows._\n";
  const header = `| ${columns.map((c) => c.label).join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows
    .map(
      (row) =>
        `| ${columns.map((c) => escapeCell(c.value(row))).join(" | ")} |`,
    )
    .join("\n");
  return `${header}\n${sep}\n${body}\n`;
}

function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}
