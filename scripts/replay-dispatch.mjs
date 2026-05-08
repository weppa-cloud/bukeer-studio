#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const META_DESTINATIONS = ["meta", "meta_messaging"];
const DEFAULT_LIMIT = 100;
const DEFAULT_STATUSES = ["skipped", "failed"];

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  printHelp();
  process.exit(0);
}

const apply = args.apply === "true";
const destination = args.destination ?? "meta";
const since = args.since ?? hoursAgoIso(24);
const until = args.until ?? new Date().toISOString();
const limit = Number(args.limit ?? DEFAULT_LIMIT);
const replayStatuses = String(args.statuses ?? DEFAULT_STATUSES.join(","))
  .split(",")
  .map((status) => status.trim())
  .filter(Boolean);
const includeMissing = args.includeMissing !== "false";
const outDir = args.outDir;

if (destination !== "meta") {
  fail("Only --destination=meta is implemented. Other destinations are deferred.");
}

if (!Number.isFinite(limit) || limit <= 0 || limit > 1000) {
  fail("--limit must be a number between 1 and 1000");
}

const endpoint = args.endpoint ?? dispatchEndpointFromEnv();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

if (apply && !endpoint) {
  fail(
    "Missing dispatcher endpoint. Set NEXT_PUBLIC_SUPABASE_URL or pass --endpoint=https://.../functions/v1/dispatch-funnel-event",
  );
}

const { createClient } = await import("@supabase/supabase-js");

const sb = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const mappedEventNames = await fetchMappedEventNames();
  const events = await fetchFunnelEvents(mappedEventNames);
  const logsByEventId = await fetchMetaLogs(events);
  const candidates = buildCandidates(events, logsByEventId);

  const applyResults = apply
    ? await applyReplay(candidates)
    : candidates.map((candidate) => ({
        event_id: candidate.event_id,
        action: "dry_run",
        reason: candidate.reason,
      }));

  const report = {
    mode: apply ? "apply" : "dry_run",
    destination,
    window: { since, until },
    filters: {
      limit,
      replay_statuses: replayStatuses,
      include_missing: includeMissing,
      website_id: args.websiteId ?? null,
      account_id: args.accountId ?? null,
      event_name: args.eventName ?? null,
    },
    counts: {
      mapped_event_names: mappedEventNames.length,
      scanned_events: events.length,
      candidates: candidates.length,
      applied: applyResults.filter((result) => result.action === "replayed").length,
      failed: applyResults.filter((result) => result.action === "failed").length,
    },
    candidates,
    apply_results: applyResults,
  };

  if (outDir) {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
      path.join(outDir, "dispatch-replay-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  }

  console.log(JSON.stringify(redactReportForStdout(report), null, 2));

  if (applyResults.some((result) => result.action === "failed")) {
    process.exitCode = 1;
  }
}

async function fetchMappedEventNames() {
  const { data, error } = await sb
    .from("event_destination_mapping")
    .select("funnel_event_name, destination, enabled")
    .in("destination", META_DESTINATIONS)
    .eq("enabled", true);

  if (error) throw new Error(`event_destination_mapping read failed: ${error.message}`);

  const mapped = [...new Set((data ?? []).map((row) => row.funnel_event_name))].sort();
  if (args.eventName) {
    if (!mapped.includes(args.eventName)) {
      throw new Error(
        `Event ${args.eventName} is not enabled for destination ${destination}`,
      );
    }
    return [args.eventName];
  }

  return mapped;
}

async function fetchFunnelEvents(mappedEventNames) {
  if (mappedEventNames.length === 0) return [];

  let query = sb
    .from("funnel_events")
    .select(
      "event_id, pixel_event_id, event_name, occurred_at, created_at, account_id, website_id, reference_code, dispatch_status, dispatch_attempt_count, dispatch_attempted_at",
    )
    .in("event_name", mappedEventNames)
    .gte("occurred_at", since)
    .lt("occurred_at", until)
    .order("occurred_at", { ascending: true })
    .limit(limit);

  if (args.websiteId) query = query.eq("website_id", args.websiteId);
  if (args.accountId) query = query.eq("account_id", args.accountId);

  const { data, error } = await query;
  if (error) throw new Error(`funnel_events read failed: ${error.message}`);
  return data ?? [];
}

async function fetchMetaLogs(events) {
  const eventIds = [
    ...new Set(events.map((event) => event.pixel_event_id || event.event_id)),
  ];
  const logsByEventId = new Map();

  for (const chunk of chunks(eventIds, 100)) {
    if (chunk.length === 0) continue;

    const { data, error } = await sb
      .from("meta_conversion_events")
      .select("event_id, event_name, status, sent_at, error, created_at")
      .eq("provider", "meta")
      .in("event_id", chunk);

    if (error) throw new Error(`meta_conversion_events read failed: ${error.message}`);

    for (const log of data ?? []) {
      const current = logsByEventId.get(log.event_id) ?? [];
      current.push(log);
      logsByEventId.set(log.event_id, current);
    }
  }

  return logsByEventId;
}

function buildCandidates(events, logsByEventId) {
  const candidates = [];

  for (const event of events) {
    const destinationEventId = event.pixel_event_id || event.event_id;
    const logs = logsByEventId.get(destinationEventId) ?? [];
    const replayableLogs = logs.filter((log) => replayStatuses.includes(log.status));
    const missing = logs.length === 0;

    if (!missing && replayableLogs.length === 0) continue;
    if (missing && !includeMissing) continue;

    candidates.push({
      event_id: event.event_id,
      destination_event_id: destinationEventId,
      event_name: event.event_name,
      occurred_at: event.occurred_at,
      account_id: event.account_id,
      website_id: event.website_id,
      reference_code: event.reference_code,
      dispatch_status: event.dispatch_status,
      dispatch_attempt_count: event.dispatch_attempt_count,
      dispatch_attempted_at: event.dispatch_attempted_at,
      reason: missing ? "missing_meta_log" : `meta_log_${replayableLogs[0].status}`,
      meta_logs: logs.map((log) => ({
        event_name: log.event_name,
        status: log.status,
        sent_at: log.sent_at,
        created_at: log.created_at,
        error: log.error,
      })),
    });
  }

  return candidates;
}

async function applyReplay(candidates) {
  const results = [];

  for (const candidate of candidates) {
    const reopen =
      candidate.dispatch_status === "dispatched" ||
      candidate.dispatch_status === "failed";

    try {
      if (reopen) {
        const { error } = await sb
          .from("funnel_events")
          .update({
            dispatch_status: "pending",
            dispatch_attempted_at: null,
          })
          .eq("event_id", candidate.event_id);

        if (error) throw new Error(`reopen failed: ${error.message}`);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRole}`,
        },
        body: JSON.stringify({ funnel_event_id: candidate.event_id }),
      });
      const body = await responseText(response);

      if (!response.ok) {
        if (reopen) await restoreDispatchStatus(candidate);
        results.push({
          event_id: candidate.event_id,
          action: "failed",
          status: response.status,
          reason: body,
        });
        continue;
      }

      results.push({
        event_id: candidate.event_id,
        action: "replayed",
        status: response.status,
        response: safeJson(body),
      });
    } catch (error) {
      if (reopen) await restoreDispatchStatus(candidate).catch(() => {});
      results.push({
        event_id: candidate.event_id,
        action: "failed",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

async function restoreDispatchStatus(candidate) {
  const { error } = await sb
    .from("funnel_events")
    .update({
      dispatch_status: candidate.dispatch_status,
      dispatch_attempted_at: candidate.dispatch_attempted_at,
    })
    .eq("event_id", candidate.event_id);

  if (error) throw new Error(`restore failed: ${error.message}`);
}

function redactReportForStdout(report) {
  return {
    ...report,
    candidates: report.candidates.slice(0, 20),
    note:
      report.candidates.length > 20
        ? `stdout truncated to 20 candidates; use --out-dir for full report`
        : undefined,
  };
}

async function responseText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function chunks(values, size) {
  const out = [];
  for (let index = 0; index < values.length; index += size) {
    out.push(values.slice(index, index + size));
  }
  return out;
}

function parseArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      parsed.help = "true";
      continue;
    }
    if (arg === "--apply") {
      parsed.apply = "true";
      continue;
    }
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match) fail(`Unsupported argument: ${arg}`);
    parsed[toCamelCase(match[1])] = match[2];
  }
  return parsed;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function dispatchEndpointFromEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/functions/v1/dispatch-funnel-event`;
}

function hoursAgoIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function loadEnvFile(file) {
  return fs
    .readFile(file, "utf8")
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match || process.env[match[1]] !== undefined) continue;
        process.env[match[1]] = unquote(match[2]);
      }
    })
    .catch(() => {});
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`Dispatch replay CLI

Dry-run is the default. Use --apply to reopen selected rows and invoke the
dispatch-funnel-event Edge Function.

Usage:
  npm run dispatch:replay -- --destination=meta --since=2026-05-08T00:00:00Z --until=2026-05-08T01:00:00Z
  npm run dispatch:replay -- --destination=meta --since=2026-05-08T00:00:00Z --until=2026-05-08T01:00:00Z --apply

Options:
  --destination=meta       Destination to replay. Only meta is implemented.
  --since=<iso>            Window start. Defaults to 24h ago.
  --until=<iso>            Window end. Defaults to now.
  --website-id=<uuid>      Optional website filter.
  --account-id=<uuid>      Optional account filter.
  --event-name=<name>      Optional funnel event filter.
  --statuses=a,b           Meta log statuses to replay. Defaults to skipped,failed.
  --include-missing=false  Exclude events with no Meta log. Included by default.
  --limit=<n>              Max funnel rows to scan. Defaults to 100, max 1000.
  --endpoint=<url>         Override dispatcher function URL.
  --out-dir=<path>         Write full dispatch-replay-report.json.
  --apply                  Perform replay. Without this, no writes or dispatches run.
`);
}
