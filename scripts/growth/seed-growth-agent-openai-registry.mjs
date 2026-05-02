#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import process from "node:process";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env.local" });

const DEFAULT_ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_LOCALE = "es-CO";
const MARKETS = ["CO", "MX", "US", "EU", "OTHER"];
const PROMPT_VERSION = "colombiatours-agent-v1";

const LANE_CONFIG = {
  orchestrator: {
    name: "Growth Orchestrator / Blocked Router",
    mode: "observe_only",
    model: "gpt-5.4-mini",
    workflow_version: "orchestrator.v1",
    agreement_threshold: 0.9,
    max_concurrent_runs: 1,
    max_active_experiments: 5,
  },
  technical_remediation: {
    name: "Technical Remediation Agent",
    mode: "prepare_only",
    model: "gpt-5-codex",
    workflow_version: "technical-remediation.v1",
    agreement_threshold: 0.9,
    max_concurrent_runs: 1,
    max_active_experiments: 5,
  },
  transcreation: {
    name: "Transcreation Growth Agent",
    mode: "prepare_only",
    model: "gpt-5.5",
    workflow_version: "transcreation.v1",
    agreement_threshold: 0.9,
    max_concurrent_runs: 1,
    max_active_experiments: 5,
  },
  content_creator: {
    name: "Content Creator Agent",
    mode: "prepare_only",
    model: "gpt-5.5",
    workflow_version: "content-creator.v1",
    agreement_threshold: 0.9,
    max_concurrent_runs: 1,
    max_active_experiments: 5,
  },
  content_curator: {
    name: "Content Curator + Council Operator",
    mode: "prepare_only",
    model: "gpt-5.5",
    workflow_version: "content-curator.v1",
    agreement_threshold: 0.9,
    max_concurrent_runs: 1,
    max_active_experiments: 5,
  },
};

function parseArgs(argv) {
  const args = {
    apply: false,
    accountId: process.env.GROWTH_ACCOUNT_ID ?? DEFAULT_ACCOUNT_ID,
    websiteId: process.env.GROWTH_WEBSITE_ID ?? DEFAULT_WEBSITE_ID,
    locale: process.env.GROWTH_LOCALE ?? DEFAULT_LOCALE,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--accountId")
      args.accountId = argv[++i] ?? args.accountId;
    else if (arg === "--websiteId")
      args.websiteId = argv[++i] ?? args.websiteId;
    else if (arg === "--locale") args.locale = argv[++i] ?? args.locale;
  }
  return args;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function buildAgentRows(args) {
  return MARKETS.flatMap((market) =>
    Object.entries(LANE_CONFIG).map(([lane, config]) => ({
      account_id: args.accountId,
      website_id: args.websiteId,
      locale: args.locale,
      market,
      lane,
      name: config.name,
      enabled: true,
      mode: config.mode,
      model: config.model,
      prompt_version: PROMPT_VERSION,
      workflow_version: config.workflow_version,
      agreement_threshold: config.agreement_threshold,
      max_concurrent_runs: config.max_concurrent_runs,
      max_active_experiments: config.max_active_experiments,
      notes:
        "OpenAI model/workflow registry v1 for ColombiaTours Growth OS. Runtime may use compatible fallback transport until OPENAI_API_KEY is installed on VPS.",
    })),
  );
}

function buildContextPack(args) {
  return {
    account_id: args.accountId,
    website_id: args.websiteId,
    locale: args.locale,
    market: "CO",
    version: "1.0.0",
    is_active: true,
    markets: MARKETS,
    tone: "Expert travel advisor: clear, premium, local, commercially practical and evidence-led.",
    preferences: {
      brand: "ColombiaTours.travel",
      domain: "colombiatours.travel",
      audience: [
        "Colombian travelers",
        "Mexico market",
        "US/EN travelers",
        "high-intent custom trip leads",
      ],
      primary_conversion: "WhatsApp / WAFlow request and itinerary confirmed",
      council_policy:
        "Maximum five active experiments; operational remediation can execute in batches.",
      content_bar:
        "Content must beat the current SERP by adding ColombiaTours-specific value, local expertise, proof, CTA clarity and risk-aware travel guidance.",
    },
    content_rules: [
      "Never publish content, transcreation, paid mutation or experiment activation without human/Curator/Council approval.",
      "Creator cannot approve its own content.",
      "Include source facts, baseline, owner, success metric and evaluation date before Council-ready.",
      "For EN/locale work, do not expose sitemap or hreflang until quality gate passes.",
      "Respect people-first content, E-E-A-T, Who/How/Why and scaled-content risk gates.",
    ],
    rejected_patterns: [
      "generic SEO copy without ColombiaTours added value",
      "literal translation presented as transcreation",
      "experiment proposal without baseline",
      "action without source refs or freshness",
      "publishing unsupported EN content",
    ],
    examples: {
      good_handoff:
        "Landing has high GSC impressions, low CTR and GA4 sessions but weak CTA activation; prepare title/meta/CTA proposal with baseline and Council metric.",
      blocked_handoff:
        "EN URL has no audited translation; keep hidden from sitemap/hreflang and send to Transcreation review.",
    },
    learned_decisions: {
      itinerary_confirmed:
        "Accepted operational conversion while Wompi/Purchase remains out of scope.",
      llm_mentions: "Future WATCH until subscription/access decision.",
      backlinks:
        "Use fallback authority signals until paid Backlinks access is approved.",
    },
    notes:
      "Context pack v1 for ColombiaTours beta partner. Supabase/Bukeer Studio is operational SSOT; GitHub #310 tracks implementation gates.",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  }

  const agentRows = buildAgentRows(args);
  const contextPack = buildContextPack(args);

  if (!args.apply) {
    console.log(
      JSON.stringify(
        {
          dry_run: true,
          agent_rows: agentRows.length,
          lanes: Object.keys(LANE_CONFIG),
          markets: MARKETS,
          context_pack: {
            locale: contextPack.locale,
            market: contextPack.market,
            version: contextPack.version,
          },
          next: "Re-run with --apply to upsert registry rows.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error: upsertAgentsError } = await supabase
    .from("growth_agent_definitions")
    .upsert(agentRows, {
      onConflict: "account_id,website_id,locale,market,lane",
    });
  if (upsertAgentsError) {
    throw new Error(
      `growth_agent_definitions upsert failed: ${upsertAgentsError.message}`,
    );
  }

  const { error: deactivatePacksError } = await supabase
    .from("growth_agent_context_packs")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("account_id", args.accountId)
    .eq("website_id", args.websiteId)
    .eq("locale", args.locale)
    .eq("market", contextPack.market)
    .eq("is_active", true);
  if (deactivatePacksError) {
    throw new Error(
      `context pack deactivate failed: ${deactivatePacksError.message}`,
    );
  }

  const { error: upsertPackError } = await supabase
    .from("growth_agent_context_packs")
    .upsert(contextPack, {
      onConflict: "account_id,website_id,locale,market,version",
    });
  if (upsertPackError) {
    throw new Error(
      `growth_agent_context_packs upsert failed: ${upsertPackError.message}`,
    );
  }

  const { data: byLane, error: countError } = await supabase
    .from("growth_agent_definitions")
    .select("lane,model,market")
    .eq("account_id", args.accountId)
    .eq("website_id", args.websiteId)
    .eq("locale", args.locale)
    .eq("enabled", true);
  if (countError) {
    throw new Error(`registry readback failed: ${countError.message}`);
  }

  const laneCounts = {};
  for (const row of byLane ?? []) {
    laneCounts[row.lane] = (laneCounts[row.lane] ?? 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        applied: true,
        agent_rows_upserted: agentRows.length,
        enabled_rows_readback: byLane?.length ?? 0,
        lane_counts: laneCounts,
        context_pack: {
          locale: contextPack.locale,
          market: contextPack.market,
          version: contextPack.version,
          active: true,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
