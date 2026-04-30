#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_SINCE = "2026-04-28T00:00:00Z";
const DEFAULT_OUT_DIR = `artifacts/seo/${todayIso()}-waflow-crm-reconciliation`;

const args = parseArgs(process.argv.slice(2));
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const since = args.since ?? DEFAULT_SINCE;
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const apply = args.apply === "true";
const maxLinkMinutes = Number(args.maxLinkMinutes ?? 2);
const pageSize = Number(args.pageSize ?? 1000);
const allTime = since === "all";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (apply && allTime) {
    throw new Error(
      "--apply true is disabled with --since all. Run a bounded window for controlled CRM mutation.",
    );
  }

  await fs.mkdir(outDir, { recursive: true });

  const website = await single(
    sb
      .from("websites")
      .select("id, account_id, subdomain, status")
      .eq("id", websiteId),
    "website",
  );

  const [leads, events, requests, itineraries] = await Promise.all([
    fetchAll(
      scopedSince(
        sb
          .from("waflow_leads")
          .select("*")
          .eq("website_id", websiteId)
          .order("created_at", { ascending: true }),
        "created_at",
      ),
      "waflow_leads",
    ),
    fetchAll(
      scopedSince(
        sb
          .from("funnel_events")
          .select("*")
          .eq("website_id", websiteId)
          .order("occurred_at", { ascending: true }),
        "created_at",
      ),
      "funnel_events",
    ),
    fetchAll(
      scopedSince(
        sb
          .from("requests")
          .select(
            "id, short_id, account_id, created_at, updated_at, chatwoot_conversation_id, itinerary_id, request_stage, pipeline_status, lead_source, lead_source_detail, custom_fields",
          )
          .eq("account_id", website.account_id)
          .order("created_at", { ascending: true }),
        "created_at",
      ),
      "requests",
    ),
    fetchAll(
      scopedSince(
        sb
          .from("itineraries")
          .select("id, id_fm, account_id, created_at, status, custom_fields")
          .eq("account_id", website.account_id)
          .order("created_at", { ascending: true }),
        "created_at",
      ),
      "itineraries",
    ),
  ]);

  const submittedLeads = leads.filter((lead) => lead.submitted_at);
  const refs = new Map();

  for (const lead of submittedLeads) {
    ensure(refs, lead.reference_code).leads.push(lead);
  }

  for (const event of events) {
    ensure(refs, event.reference_code).events.push(event);
  }

  for (const request of requests) {
    for (const ref of extractRefs(request.custom_fields)) {
      ensure(refs, ref).requests.push(request);
    }
  }

  for (const itinerary of itineraries) {
    for (const ref of extractRefs(itinerary.custom_fields)) {
      ensure(refs, ref).itineraries.push(itinerary);
    }
  }

  const rows = [...refs.values()]
    .map((row) => buildRow(row, requests, maxLinkMinutes))
    .sort((a, b) =>
      String(b.last_activity_at ?? "").localeCompare(
        String(a.last_activity_at ?? ""),
      ),
    );

  const applyResults = apply
    ? await applyHighConfidenceLinks(rows)
    : { applied: false, updated: [], skipped: [] };

  const summary = buildSummary(rows, {
    website,
    since,
    leads,
    submittedLeads,
    events,
    requests,
    itineraries,
    applyResults,
    allRequests: requests,
  });

  const report = { summary, rows, applyResults };
  await fs.writeFile(
    path.join(outDir, "waflow-crm-reconciliation.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, "waflow-crm-reconciliation.md"),
    renderMarkdown(report),
  );

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Artifacts written to ${outDir}`);
}

function buildRow(row, requests, maxLinkMinutes) {
  const eventNames = row.events.map((event) => event.event_name);
  const has = (name) => eventNames.includes(name);
  const submitted = row.leads.some((lead) => lead.submitted_at);
  const lead = row.leads[0] ?? null;
  const exactRequest = row.requests.at(-1) ?? null;
  const exactItinerary = row.itineraries.at(-1) ?? null;
  const highConfidenceCandidates = lead
    ? requests
        .map((request) => ({
          request,
          delta_minutes: minutesBetween(lead.created_at, request.created_at),
        }))
        .filter(
          (candidate) =>
            candidate.delta_minutes >= -2 &&
            candidate.delta_minutes <= maxLinkMinutes,
        )
        .sort((a, b) => Math.abs(a.delta_minutes) - Math.abs(b.delta_minutes))
    : [];

  let lifecycle_status = "not_submitted_or_open";
  if (has("booking_confirmed")) lifecycle_status = "complete_booking_confirmed";
  else if (has("quote_sent")) lifecycle_status = "quote_no_booking";
  else if (has("qualified_lead")) lifecycle_status = "qualified_no_quote";
  else if (has("waflow_submit")) lifecycle_status = "lead_only";
  else if (submitted) lifecycle_status = "submitted_missing_funnel";

  if (
    has("booking_confirmed") &&
    (!has("waflow_submit") || !has("qualified_lead") || !has("quote_sent"))
  ) {
    lifecycle_status = "booking_without_full_prior_chain";
  }

  const crm_link_status = exactRequest
    ? "linked_exact_reference"
    : highConfidenceCandidates.length === 1
      ? "candidate_time_window_high_confidence"
      : highConfidenceCandidates.length > 1
        ? "ambiguous_time_window"
        : "unlinked";

  const bestCandidate = highConfidenceCandidates[0]?.request ?? null;

  return {
    reference_code: row.reference_code,
    lifecycle_status,
    crm_link_status,
    submitted,
    event_chain: [...new Set(eventNames)],
    event_count: row.events.length,
    lead_created_at: lead?.created_at ?? null,
    last_activity_at:
      row.events.at(-1)?.occurred_at ?? lead?.created_at ?? null,
    exact_request: exactRequest ? publicRequest(exactRequest) : null,
    candidate_request: bestCandidate
      ? {
          ...publicRequest(bestCandidate),
          delta_minutes: round1(highConfidenceCandidates[0].delta_minutes),
        }
      : null,
    exact_itinerary: exactItinerary ? publicItinerary(exactItinerary) : null,
    source: {
      source_url: lead?.source_url ?? lead?.payload?.attribution?.source_url,
      page_path: lead?.page_path ?? lead?.payload?.attribution?.page_path,
    },
  };
}

async function applyHighConfidenceLinks(rows) {
  const updated = [];
  const skipped = [];

  for (const row of rows) {
    if (
      row.crm_link_status !== "candidate_time_window_high_confidence" ||
      !row.candidate_request
    ) {
      skipped.push({
        reference_code: row.reference_code,
        reason: row.crm_link_status,
      });
      continue;
    }

    const { data: current, error: currentError } = await sb
      .from("requests")
      .select("id, custom_fields")
      .eq("id", row.candidate_request.id)
      .single();

    if (currentError) throw currentError;

    const nextCustomFields = {
      ...(current.custom_fields ?? {}),
      growth_reference_code: row.reference_code,
      growth_source_website_id: websiteId,
      growth_source_url: row.source.source_url ?? null,
      growth_page_path: row.source.page_path ?? null,
      growth_link_method: "time_window_high_confidence",
      growth_linked_at: new Date().toISOString(),
    };

    const { error: updateError } = await sb
      .from("requests")
      .update({ custom_fields: nextCustomFields })
      .eq("id", current.id);

    if (updateError) throw updateError;
    updated.push({
      reference_code: row.reference_code,
      request_id: current.id,
      short_id: row.candidate_request.short_id,
    });
  }

  return { applied: true, updated, skipped };
}

function buildSummary(
  rows,
  {
    website,
    since,
    leads,
    submittedLeads,
    events,
    requests,
    itineraries,
    applyResults,
  },
) {
  const byLifecycle = countBy(rows, "lifecycle_status");
  const byCrmLink = countBy(rows, "crm_link_status");
  const byRequestStage = countByMapped(
    requests,
    (request) => request.request_stage ?? request.pipeline_status ?? "null",
  );
  const byRequestSource = countByMapped(
    requests,
    (request) => request.lead_source ?? "null",
  );
  const submittedRefs = new Set(
    submittedLeads.map((lead) => lead.reference_code).filter(Boolean),
  );
  const waflowSubmitRefs = new Set(
    events
      .filter((event) => event.event_name === "waflow_submit")
      .map((event) => event.reference_code)
      .filter(Boolean),
  );
  const submittedWithoutReference = submittedLeads
    .filter((lead) => !lead.reference_code)
    .map((lead) => ({
      id: lead.id,
      created_at: lead.created_at,
      submitted_at: lead.submitted_at,
      step: lead.step,
      source: lead.payload?.source ?? null,
      placement: lead.payload?.placement ?? null,
    }));
  const submittedMissingFunnel = [...submittedRefs].filter(
    (referenceCode) => !waflowSubmitRefs.has(referenceCode),
  );
  const extraFunnelSubmitRefs = [...waflowSubmitRefs].filter(
    (referenceCode) => !submittedRefs.has(referenceCode),
  );
  const requestsWithReference = requests.filter(
    (request) => extractRefs(request.custom_fields).length > 0,
  );
  const requestsWithConversation = requests.filter(
    (request) => request.chatwoot_conversation_id,
  );
  const requestsWithItinerary = requests.filter(
    (request) => request.itinerary_id,
  );
  const duplicateConversationGroups =
    buildDuplicateConversationGroups(requests);
  const waflowSubmitEvents = events.filter(
    (event) => event.event_name === "waflow_submit",
  );

  return {
    website,
    since,
    mode: apply ? "apply" : "dry-run",
    max_link_minutes: maxLinkMinutes,
    page_size: pageSize,
    counts: {
      waflow_leads: leads.length,
      submitted_waflow_leads: submittedLeads.length,
      waflow_submit_events: waflowSubmitEvents.length,
      funnel_events: events.length,
      requests_window: requests.length,
      itineraries_window: itineraries.length,
      reference_codes: rows.length,
      requests_with_chatwoot_conversation_id: requestsWithConversation.length,
      requests_with_growth_reference: requestsWithReference.length,
      requests_with_itinerary_id: requestsWithItinerary.length,
      duplicate_conversation_groups: duplicateConversationGroups.length,
    },
    parity: {
      submitted_minus_waflow_submit:
        submittedLeads.length - waflowSubmitEvents.length,
      submitted_without_reference: submittedWithoutReference,
      submitted_missing_funnel_refs: submittedMissingFunnel,
      extra_funnel_submit_refs: extraFunnelSubmitRefs,
    },
    by_lifecycle: byLifecycle,
    by_crm_link: byCrmLink,
    by_request_stage: byRequestStage,
    by_request_source: byRequestSource,
    duplicate_conversation_groups_sample: duplicateConversationGroups.slice(
      0,
      25,
    ),
    apply: applyResults,
  };
}

function renderMarkdown({ summary, rows, applyResults }) {
  const lines = [
    "# WAFlow CRM Reconciliation",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${summary.mode}`,
    `Since: ${summary.since}`,
    `Website: ${summary.website.subdomain} (${summary.website.id})`,
    "",
    "## Summary",
    "",
    `- Submitted WAFlow leads: ${summary.counts.submitted_waflow_leads}`,
    `- WAFlow submit events: ${summary.counts.waflow_submit_events}`,
    `- Parity delta: ${summary.parity.submitted_minus_waflow_submit}`,
    `- Submitted without reference: ${summary.parity.submitted_without_reference.length}`,
    `- Submitted missing funnel refs: ${summary.parity.submitted_missing_funnel_refs.length}`,
    `- Extra funnel submit refs: ${summary.parity.extra_funnel_submit_refs.length}`,
    `- Reference codes: ${summary.counts.reference_codes}`,
    `- Requests in window: ${summary.counts.requests_window}`,
    `- Itineraries in window: ${summary.counts.itineraries_window}`,
    `- Requests with Chatwoot conversation: ${summary.counts.requests_with_chatwoot_conversation_id}`,
    `- Requests with Growth reference: ${summary.counts.requests_with_growth_reference}`,
    `- Requests with itinerary: ${summary.counts.requests_with_itinerary_id}`,
    `- Duplicate conversation groups: ${summary.counts.duplicate_conversation_groups}`,
    "",
    "## Parity Details",
    "",
    "### Submitted without reference",
    "",
    "| id | created_at | source | placement |",
    "| --- | --- | --- | --- |",
    ...summary.parity.submitted_without_reference.map(
      (lead) =>
        `| ${lead.id} | ${lead.created_at} | ${lead.source ?? ""} | ${lead.placement ?? ""} |`,
    ),
    "",
    "### Submitted missing funnel refs",
    "",
    summary.parity.submitted_missing_funnel_refs.length
      ? summary.parity.submitted_missing_funnel_refs
          .map((referenceCode) => `- ${referenceCode}`)
          .join("\n")
      : "- none",
    "",
    "### Extra funnel submit refs",
    "",
    summary.parity.extra_funnel_submit_refs.length
      ? summary.parity.extra_funnel_submit_refs
          .map((referenceCode) => `- ${referenceCode}`)
          .join("\n")
      : "- none",
    "",
    "## Lifecycle",
    "",
    ...Object.entries(summary.by_lifecycle).map(
      ([status, count]) => `- ${status}: ${count}`,
    ),
    "",
    "## CRM Link Status",
    "",
    ...Object.entries(summary.by_crm_link).map(
      ([status, count]) => `- ${status}: ${count}`,
    ),
    "",
    "## CRM Request Stages",
    "",
    ...Object.entries(summary.by_request_stage).map(
      ([status, count]) => `- ${status}: ${count}`,
    ),
    "",
    "## CRM Request Sources",
    "",
    ...Object.entries(summary.by_request_source).map(
      ([status, count]) => `- ${status}: ${count}`,
    ),
    "",
    "## Duplicate Conversation Groups Sample",
    "",
    "| chatwoot_conversation_id | requests |",
    "| --- | --- |",
    ...summary.duplicate_conversation_groups_sample.map(
      (group) =>
        `| ${group.chatwoot_conversation_id} | ${group.request_short_ids.join(", ")} |`,
    ),
    "",
    "## Rows",
    "",
    "| reference_code | lifecycle | crm_link | events | request | delta_min |",
    "| --- | --- | --- | --- | --- | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.reference_code} | ${row.lifecycle_status} | ${row.crm_link_status} | ${row.event_chain.join(" -> ")} | ${row.exact_request?.short_id ?? row.candidate_request?.short_id ?? ""} | ${row.candidate_request?.delta_minutes ?? ""} |`,
    ),
    "",
    "## Apply Results",
    "",
    `- Applied: ${applyResults.applied}`,
    `- Updated: ${applyResults.updated.length}`,
    `- Skipped: ${applyResults.skipped.length}`,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function extractRefs(customFields) {
  if (!customFields || typeof customFields !== "object") return [];
  return [
    customFields.reference_code,
    customFields.growth_reference_code,
    customFields.waflow_reference_code,
    customFields.waflow?.reference_code,
    customFields.growth?.reference_code,
  ].filter(Boolean);
}

function ensure(map, referenceCode) {
  if (!referenceCode)
    return { leads: [], events: [], requests: [], itineraries: [] };
  if (!map.has(referenceCode)) {
    map.set(referenceCode, {
      reference_code: referenceCode,
      leads: [],
      events: [],
      requests: [],
      itineraries: [],
    });
  }
  return map.get(referenceCode);
}

function publicRequest(request) {
  return {
    id: request.id,
    short_id: request.short_id,
    created_at: request.created_at,
    chatwoot_conversation_id: request.chatwoot_conversation_id,
    request_stage: request.request_stage ?? request.pipeline_status ?? null,
    lead_source: request.lead_source,
    itinerary_id: request.itinerary_id,
  };
}

function publicItinerary(itinerary) {
  return {
    id: itinerary.id,
    id_fm: itinerary.id_fm,
    created_at: itinerary.created_at,
    status: itinerary.status,
  };
}

async function single(query, label) {
  const { data, error } = await query.single();
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function many(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

async function fetchAll(query, label) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await query.range(from, to);
    if (error) throw new Error(`${label}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
    from += pageSize;
  }
}

function scopedSince(query, column) {
  return allTime ? query : query.gte(column, since);
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] ?? 0) + 1;
    return acc;
  }, {});
}

function countByMapped(rows, mapper) {
  return rows.reduce((acc, row) => {
    const key = mapper(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function buildDuplicateConversationGroups(requests) {
  const groups = new Map();
  for (const request of requests) {
    if (!request.chatwoot_conversation_id) continue;
    const key = String(request.chatwoot_conversation_id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(request);
  }

  return [...groups.entries()]
    .filter(([, groupedRequests]) => groupedRequests.length > 1)
    .map(([conversationId, groupedRequests]) => ({
      chatwoot_conversation_id: conversationId,
      request_count: groupedRequests.length,
      request_short_ids: groupedRequests.map((request) => request.short_id),
      active_request:
        selectActiveRequest(groupedRequests)?.short_id ??
        groupedRequests.at(-1)?.short_id ??
        null,
    }))
    .sort((a, b) => b.request_count - a.request_count);
}

function selectActiveRequest(requests) {
  const byStage = new Map();
  for (const request of requests) {
    const stage = request.request_stage ?? request.pipeline_status;
    if (!byStage.has(stage)) byStage.set(stage, []);
    byStage.get(stage).push(request);
  }

  for (const stage of ["new_lead", "qualified", "proposal_sent"]) {
    const candidates = byStage.get(stage);
    if (candidates?.length) return candidates.at(-1);
  }

  for (const stage of ["closed_won", "closed_lost"]) {
    const candidates = byStage.get(stage);
    if (candidates?.length) return candidates.at(-1);
  }

  return requests.at(-1) ?? null;
}

function minutesBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
