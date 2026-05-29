#!/usr/bin/env tsx

import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { buildGrowthProviderContextPacket } from "../../lib/growth/context-packets";

dotenv.config({ path: ".env.local" });

const ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
const WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const OUT_DIR = "docs/growth-sessions";
const OUT_FILE = "2026-05-29-colombiatours-growth-os-beta-diagnostic.md";
const REQUIRED_PROFILES = [
  "gsc_daily_complete_web_v1",
  "ga4_daily_web_traffic_v1",
  "dataforseo_serp_opportunity_v1",
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const supabase = createSupabase();
  const packet = await buildGrowthProviderContextPacket({
    supabase,
    accountId: ACCOUNT_ID,
    websiteId: WEBSITE_ID,
    workerLane: "content",
    workType: "growth_diagnostic",
    entity: {
      type: "website",
      id: WEBSITE_ID,
      canonical_url: "https://colombiatours.travel",
      locale: "es-CO",
      market: "CO",
      path: "/",
      slug: "colombiatours",
      metadata: { beta_partner: "ColombiaTours", issue: "#600" },
    },
    requiredProfileIds: REQUIRED_PROFILES,
    allowedActions: ["draft_growth_diagnostic"],
    now: new Date(),
  });

  const diagnostic = {
    generated_at: packet.generated_at,
    status: packet.status,
    dedupe_verdict: packet.dedupe_verdict,
    freshness_map: packet.freshness_map,
    source_profiles: packet.source_profiles.map((profile) => ({
      profile_id: profile.profile_id,
      provider: profile.provider,
      run_id: profile.run_id,
      source_refs: Array.isArray(profile.source_refs)
        ? profile.source_refs
        : Object.values(profile.source_refs).map(String),
    })),
    blocked_actions: packet.blocked_actions.map((entry) => entry.action),
    diagnosis: buildDiagnosis(packet),
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, OUT_FILE), toMarkdown(diagnostic));

  console.log(JSON.stringify({
    ok: true,
    status: diagnostic.status,
    dedupe_verdict: diagnostic.dedupe_verdict.verdict,
    dataforseo_status: diagnostic.freshness_map.dataforseo_serp_opportunity_v1?.status ?? null,
    output: path.join(OUT_DIR, OUT_FILE),
    provider_api_called: false,
    published_content: false,
  }, null, 2));
}

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function buildDiagnosis(packet: Awaited<ReturnType<typeof buildGrowthProviderContextPacket>>) {
  const gsc = packet.freshness_map.gsc_daily_complete_web_v1;
  const ga4 = packet.freshness_map.ga4_daily_web_traffic_v1;
  const dfs = packet.freshness_map.dataforseo_serp_opportunity_v1;
  const directProviderBlocked = packet.blocked_actions.some((entry) => entry.action === "call_provider_api_directly");

  const readyForNoProviderAgent =
    gsc?.status === "fresh" &&
    ga4?.status === "fresh" &&
    dfs?.status === "cost_gated" &&
    directProviderBlocked;

  return {
    verdict: readyForNoProviderAgent ? "diagnostic_ready_without_provider_calls" : "diagnostic_watch",
    primary_opportunity:
      "Preparar un brief de optimizacion para paginas existentes usando demanda GSC y comportamiento GA4 ya materializados; mantener SERP/DataForSEO como evidencia gobernada hasta aprobacion de costo.",
    why_now: [
      `GSC profile status: ${gsc?.status ?? "missing"}`,
      `GA4 profile status: ${ga4?.status ?? "missing"}`,
      `DataForSEO profile status: ${dfs?.status ?? "missing"}`,
      `Dedupe verdict: ${packet.dedupe_verdict.verdict}`,
    ],
    allowed_next_action:
      "Generar propuesta/brief interno; no publicar, no escalar contenido y no llamar APIs externas.",
    blocked_until_approval: [
      "Extraccion pagada DataForSEO SERP/Labs",
      "Mutaciones de paid media",
      "Publicacion automatica de contenido",
      "Llamadas directas a APIs proveedor desde agentes",
    ],
  };
}

function toMarkdown(report: ReturnType<typeof buildReportShape>) {
  return [
    "# ColombiaTours Growth OS Beta Diagnostic",
    "",
    `Generated: ${report.generated_at}`,
    `Status: \`${report.status}\``,
    `Dedupe: \`${report.dedupe_verdict.verdict}\` (${report.dedupe_verdict.reason ?? "n/a"})`,
    "",
    "## Provider State",
    "",
    "| Profile | Status | Quality | Run |",
    "| --- | --- | --- | --- |",
    ...Object.values(report.freshness_map).map((entry) =>
      `| \`${entry.profile_id}\` | \`${entry.status}\` | \`${entry.quality_status}\` | ${entry.run_id ? `\`${entry.run_id}\`` : "n/a"} |`,
    ),
    "",
    "## Diagnostic",
    "",
    `Verdict: \`${report.diagnosis.verdict}\``,
    "",
    `Primary opportunity: ${report.diagnosis.primary_opportunity}`,
    "",
    "Why now:",
    ...report.diagnosis.why_now.map((item) => `- ${item}`),
    "",
    `Allowed next action: ${report.diagnosis.allowed_next_action}`,
    "",
    "Blocked until approval:",
    ...report.diagnosis.blocked_until_approval.map((item) => `- ${item}`),
    "",
    "## Guardrails",
    "",
    "- Provider API called by this diagnostic: `false`.",
    "- Content published by this diagnostic: `false`.",
    "- Agents must consume context packet/snapshot data only.",
    "- `blocked_actions` includes `call_provider_api_directly`.",
    "",
    "## Source Profiles",
    "",
    ...report.source_profiles.map((profile) =>
      `- \`${profile.profile_id}\` (${profile.provider}) run=${profile.run_id ?? "n/a"} refs=${profile.source_refs.join(", ") || "none"}`,
    ),
    "",
  ].join("\n");
}

function buildReportShape(report: {
  generated_at: string;
  status: string;
  dedupe_verdict: Awaited<ReturnType<typeof buildGrowthProviderContextPacket>>["dedupe_verdict"];
  freshness_map: Awaited<ReturnType<typeof buildGrowthProviderContextPacket>>["freshness_map"];
  source_profiles: Array<{
    profile_id: string;
    provider: string;
    run_id: string | null;
    source_refs: string[];
  }>;
  blocked_actions: string[];
  diagnosis: ReturnType<typeof buildDiagnosis>;
}) {
  return report;
}
