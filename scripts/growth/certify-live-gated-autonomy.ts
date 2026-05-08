import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { executeGrowthPublicationJob } from "@/lib/growth/autonomy/publication-executor";
import {
  evaluateGrowthAutonomyExecution,
  type GrowthAutonomyPolicyLike,
} from "@/lib/growth/autonomy/live-gate";
import {
  evaluateProfileFreshnessGate,
  requirementsForAction,
} from "@/lib/growth/autonomy/profile-freshness-gate";
import { planTechnicalRemediation } from "@/lib/growth/autonomy/technical-remediation-adapter";

type JsonRecord = Record<string, unknown>;

const DEFAULT_ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + hours);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function main() {
  loadLocalEnv();
  const accountId = process.env.GROWTH_ACCOUNT_ID ?? DEFAULT_ACCOUNT_ID;
  const websiteId = process.env.GROWTH_WEBSITE_ID ?? DEFAULT_WEBSITE_ID;
  const certificationId =
    process.env.GROWTH_CERTIFICATION_ID ??
    `growth-live-gated-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const now = new Date();

  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id,account_id,subdomain,custom_domain,status")
    .eq("id", websiteId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (websiteError) throw new Error(websiteError.message);
  if (!website) throw new Error("ColombiaTours website not found.");

  const { data: targetSection, error: targetError } = await supabase
    .from("website_sections")
    .select("id,website_id,section_type,variant,display_order,is_enabled,config,updated_at")
    .eq("website_id", websiteId)
    .eq("section_type", "blog")
    .limit(1)
    .maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (!targetSection?.id) {
    throw new Error("No website_sections blog target found for certification.");
  }

  const { data: technicalRun, error: runError } = await supabase
    .from("growth_agent_runs")
    .select("run_id,agent_id,lane,status,locale,market,created_at")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("lane", "technical_remediation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (runError) throw new Error(runError.message);
  if (!technicalRun?.run_id) {
    throw new Error("No technical_remediation run exists to link change set.");
  }

  const policyPayload = {
    account_id: accountId,
    website_id: websiteId,
    locale: "es-CO",
    market: "CO",
    lane: "technical_remediation",
    action_class: "safe_apply",
    enabled: true,
    dry_run_only: false,
    kill_switch_enabled: false,
    paused_reason: null,
    max_risk_level: "low",
    max_risk_score: 20,
    daily_cap: 5,
    weekly_cap: 10,
    required_checks: [
      "before_snapshot",
      "rollback_payload",
      "smoke_check",
      "baseline",
      "success_metric",
      "evaluation_date",
      "no_paid_mutation",
      "tenant_allowlist",
      "technical_reversibility",
    ],
    policy_version: "paperclip-live-cert-v1",
    notes: `Live gated certification ${certificationId}. Technical config marker only; no pricing/reservation/payment/paid mutation.`,
  };
  const { data: policyRows, error: policyError } = await supabase
    .from("growth_autonomy_policies")
    .upsert(policyPayload, {
      onConflict: "account_id,website_id,locale,market,lane,action_class",
    })
    .select("*")
    .limit(1);
  if (policyError) throw new Error(policyError.message);
  const policy = (Array.isArray(policyRows) ? policyRows[0] : policyRows) as
    | GrowthAutonomyPolicyLike
    | undefined;
  if (!policy?.id) throw new Error("Policy upsert did not return id.");

  const profileRows = [
    {
      account_id: accountId,
      website_id: websiteId,
      locale: "es-CO",
      market: "CO",
      profile_type: "page_product",
      subject_table: "website_sections",
      subject_id: targetSection.id,
      subject_key: "home:blog-section",
      source: "growth_live_certification",
      confidence: 0.9,
      valid_from: now.toISOString(),
      valid_until: addHours(now, 1).toISOString(),
      freshness_ttl_hours: 1,
      payload: {
        target_table: "website_sections",
        target_id: targetSection.id,
        surface: "home_blog_section_config",
      },
      source_signal_fact_ids: [],
      policy_version: "profile-freshness-v1",
    },
    {
      account_id: accountId,
      website_id: websiteId,
      locale: "es-CO",
      market: "CO",
      profile_type: "risk_policy",
      subject_table: "website_sections",
      subject_id: targetSection.id,
      subject_key: "home:blog-section",
      source: "growth_live_certification",
      confidence: 0.99,
      valid_from: now.toISOString(),
      valid_until: addHours(now, 1).toISOString(),
      freshness_ttl_hours: 1,
      payload: {
        allowed_surface: "website_sections.config",
        blocked_surfaces: [
          "pricing",
          "availability",
          "reservations",
          "payments",
          "paid_media",
          "crm_mutation",
        ],
      },
      source_signal_fact_ids: [],
      policy_version: "profile-freshness-v1",
    },
  ];
  const { error: profilesError } = await supabase
    .from("growth_profiles")
    .insert(profileRows);
  if (profilesError) throw new Error(profilesError.message);

  const { data: profiles, error: freshProfilesError } = await supabase
    .from("growth_profiles")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("locale", "es-CO")
    .eq("market", "CO")
    .in("profile_type", ["page_product", "risk_policy"])
    .gte("valid_until", now.toISOString());
  if (freshProfilesError) throw new Error(freshProfilesError.message);
  const freshness = evaluateProfileFreshnessGate({
    profiles: profiles ?? [],
    requirements: requirementsForAction("safe_apply").map((requirement) => ({
      ...requirement,
      subjectTable: "website_sections",
      subjectId: targetSection.id,
    })),
    now,
  });

  const { count: dailyUsed } = await supabase
    .from("growth_publication_jobs")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("policy_id", policy.id)
    .gte("created_at", addDays(now, -1).toISOString());
  const { count: weeklyUsed } = await supabase
    .from("growth_publication_jobs")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("policy_id", policy.id)
    .gte("created_at", addDays(now, -7).toISOString());

  const beforeConfig = asRecord(targetSection.config);
  const afterConfig = {
    ...beforeConfig,
    growth_autonomy_certification: {
      certification_id: certificationId,
      certified_at: now.toISOString(),
      lane: "technical_remediation",
      action_class: "safe_apply",
      visible_surface_changed: false,
    },
  };

  const gate = evaluateGrowthAutonomyExecution({
    lane: "technical_remediation",
    actionClass: "safe_apply",
    targetTable: "website_sections",
    riskScore: 5,
    riskLevel: "low",
    policy,
    freshness,
    dailyUsed: dailyUsed ?? 0,
    weeklyUsed: weeklyUsed ?? 0,
    checks: {
      beforeSnapshot: true,
      rollbackPayload: true,
      smokeCheck: true,
      baseline: true,
      successMetric: true,
      evaluationDate: true,
      tenantAllowlist: true,
      technicalReversibility: true,
    },
  });
  if (!gate.allowed || gate.mode !== "live") {
    throw new Error(`Live gate blocked certification: ${gate.reasons.join(",")}`);
  }

  const workItemPayload = {
    account_id: accountId,
    website_id: websiteId,
    source_table: "website_sections",
    source_id: targetSection.id,
    run_id: technicalRun.run_id,
    lane: "technical_remediation",
    agent_profile: "Technical Agent",
    title: `Live gated certification - ${certificationId}`,
    intent: "technical_certification_safe_apply",
    status: "ready",
    language: "es",
    capability_requirements: ["safe_apply", "rollback", "smoke"],
    skill_hints: ["live-gated-autonomy-certification"],
    allowed_action_class: "safe_apply",
    risk_level: "low",
    risk_score: 5,
    requires_human_review: false,
    required_approval_role: "technical_owner",
    operator_summary:
      "Certification work item for Growth OS live-gated technical autonomy.",
    handoff_summary:
      "Applies a non-rendered config marker to website_sections.config with full rollback payload.",
    next_action: "Execute live safe_apply certification job.",
    progress_label: "Ready for live gated certification",
    evidence: {
      certification_id: certificationId,
      profile_snapshot: freshness.snapshot,
      gate,
      no_visible_surface_change: true,
    },
    source_refs: [`website_sections:${targetSection.id}`],
    idempotency_key: `live-cert:${certificationId}:work-item`,
    created_by: "growth_live_certification",
  };
  const { data: workRows, error: workError } = await supabase
    .from("growth_work_items")
    .upsert(workItemPayload, { onConflict: "website_id,idempotency_key" })
    .select("id")
    .limit(1);
  if (workError) throw new Error(workError.message);
  const workItemId = Array.isArray(workRows) ? workRows[0]?.id : workRows?.id;
  if (!workItemId) throw new Error("Work item upsert did not return id.");

  const changeSetPayload = {
    account_id: accountId,
    website_id: websiteId,
    locale: "es-CO",
    market: "CO",
    run_id: technicalRun.run_id,
    source_table: "growth_work_items",
    source_id: workItemId,
    agent_lane: "technical_remediation",
    change_type: "technical_smoke_result",
    status: "approved",
    title: `Live gated safe_apply certification - ${certificationId}`,
    summary:
      "Controlled certification of live technical safe_apply using website_sections.config marker.",
    dedupe_key: `live-cert:${certificationId}:change-set`,
    before_snapshot: {
      table: "website_sections",
      target_id: targetSection.id,
      config: beforeConfig,
    },
    after_snapshot: {
      table: "website_sections",
      target_id: targetSection.id,
      config: afterConfig,
    },
    preview_payload: {
      visible_surface_changed: false,
      target_path: "/",
    },
    evidence: {
      certification_id: certificationId,
      gate,
      rollback_available: true,
      blocked_surfaces: [
        "pricing",
        "availability",
        "reservations",
        "payments",
        "paid_media",
        "crm_mutation",
      ],
    },
    risk_level: "low",
    requires_human_review: false,
    required_approval_role: "technical_owner",
  };
  const { data: changeRows, error: changeError } = await supabase
    .from("growth_agent_change_sets")
    .upsert(changeSetPayload, {
      onConflict: "account_id,website_id,run_id,change_type,dedupe_key",
    })
    .select("id")
    .limit(1);
  if (changeError) throw new Error(changeError.message);
  const changeSetId = Array.isArray(changeRows)
    ? changeRows[0]?.id
    : changeRows?.id;
  if (!changeSetId) throw new Error("Change set upsert did not return id.");

  await supabase
    .from("growth_work_items")
    .update({ change_set_id: changeSetId })
    .eq("id", workItemId)
    .eq("website_id", websiteId);

  const plan = planTechnicalRemediation({
    accountId,
    websiteId,
    locale: "es-CO",
    market: "CO",
    workItemId,
    changeSetId,
    policyId: policy.id,
    targetTable: "website_sections",
    targetId: targetSection.id,
    targetPath: "/",
    beforeRow: { config: beforeConfig },
    patch: { config: afterConfig },
    baseline: {
      certification_id: certificationId,
      visible_surface_changed: false,
      previous_config_keys: Object.keys(beforeConfig).sort(),
    },
    successMetric: `technical_smoke_pass:live_certification:${certificationId}`,
    now,
    live: true,
  });

  const execution = await executeGrowthPublicationJob({ supabase, plan });

  const { data: job, error: jobError } = await supabase
    .from("growth_publication_jobs")
    .select("*")
    .eq("id", execution.publicationJobId)
    .maybeSingle();
  if (jobError) throw new Error(jobError.message);

  const { data: targetAfter, error: verifyTargetError } = await supabase
    .from("website_sections")
    .select("id,config,updated_at")
    .eq("id", targetSection.id)
    .eq("website_id", websiteId)
    .maybeSingle();
  if (verifyTargetError) throw new Error(verifyTargetError.message);

  const { count: outcomeCount, error: outcomeError } = await supabase
    .from("growth_work_item_outcomes")
    .select("*", { count: "exact", head: true })
    .eq("publication_job_id", execution.publicationJobId);
  if (outcomeError) throw new Error(outcomeError.message);

  const { data: workItemAfter } = await supabase
    .from("growth_work_items")
    .select("id,status,progress_label,completed_at")
    .eq("id", workItemId)
    .maybeSingle();
  const { data: changeSetAfter } = await supabase
    .from("growth_agent_change_sets")
    .select("id,status,requires_human_review,applied_at")
    .eq("id", changeSetId)
    .maybeSingle();

  const marker = asRecord(asRecord(targetAfter?.config).growth_autonomy_certification);
  const checks = {
    gate_live: gate.allowed && gate.mode === "live",
    execution_smoke_passed: execution.status === "smoke_passed",
    job_smoke_passed: job?.status === "smoke_passed",
    marker_applied: marker.certification_id === certificationId,
    outcomes_created: (outcomeCount ?? 0) >= 3,
    work_item_published_applied: workItemAfter?.status === "published_applied",
    change_set_applied:
      changeSetAfter?.status === "applied" &&
      changeSetAfter.requires_human_review === false,
  };
  const certified = Object.values(checks).every(Boolean);
  console.log(
    JSON.stringify(
      {
        certified,
        certificationId,
        accountId,
        websiteId,
        target: {
          table: "website_sections",
          id: targetSection.id,
          path: "/",
        },
        policy: {
          id: policy.id,
          lane: policy.lane,
          action_class: policy.action_class,
          dry_run_only: policy.dry_run_only,
          kill_switch_enabled: policy.kill_switch_enabled,
          daily_cap: policy.daily_cap,
          weekly_cap: policy.weekly_cap,
        },
        gate: {
          allowed: gate.allowed,
          mode: gate.mode,
          reasons: gate.reasons,
        },
        execution,
        publicationJobId: execution.publicationJobId,
        workItemId,
        changeSetId,
        outcomeCount,
        checks,
      },
      null,
      2,
    ),
  );
  if (!certified) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
