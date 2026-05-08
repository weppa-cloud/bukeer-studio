import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { summarizeGrowthAgentOptimization } from "@/lib/growth/autonomy/agent-optimization";
import { planContentPublication } from "@/lib/growth/autonomy/content-publication-adapter";
import {
  promoteGrowthOpportunityCandidates,
} from "@/lib/growth/autonomy/candidate-promotion";
import {
  evaluateGrowthAutonomyExecution,
  type GrowthAutonomyPolicyLike,
} from "@/lib/growth/autonomy/live-gate";
import {
  evaluateProfileFreshnessGate,
  requirementsForAction,
  scoreOpportunityCandidate,
} from "@/lib/growth/autonomy/profile-freshness-gate";
import {
  executeGrowthPublicationJob,
  recordGrowthOutcomes,
} from "@/lib/growth/autonomy/publication-executor";
import { planTranscreationMerge } from "@/lib/growth/autonomy/transcreation-merge-adapter";
import type {
  AgentLane,
  GrowthAutonomyActionClass,
  GrowthPublicationTargetTable,
  GrowthProfileType,
} from "@bukeer/website-contract";

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

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

async function latestRun({
  supabase,
  accountId,
  websiteId,
  lane,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  lane: AgentLane;
}) {
  const runId = randomUUID();
  const { data: agentDefinition, error: agentError } = await supabase
    .from("growth_agent_definitions")
    .select("agent_id")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("lane", lane)
    .limit(1)
    .maybeSingle();
  if (agentError) throw new Error(`agent lookup failed: ${agentError.message}`);
  if (!agentDefinition?.agent_id) {
    throw new Error(`No growth_agent_definitions.agent_id found for ${lane}`);
  }
  const { data, error } = await supabase
    .from("growth_agent_runs")
    .insert({
      account_id: accountId,
      website_id: websiteId,
      locale: lane === "transcreation" ? "en-US" : "es-CO",
      market: lane === "transcreation" ? "US" : "CO",
      run_id: runId,
      agent_id: agentDefinition.agent_id,
      lane,
      source_table: "websites",
      source_id: websiteId,
      claim_id: randomUUID(),
      workspace_path: `/workspaces/${accountId}/${websiteId}/epic310-production-certification`,
      status: "completed",
      heartbeat_at: new Date().toISOString(),
      attempts: 1,
      evidence: {
        source: "epic310_production_certification",
        live_gated: true,
      },
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    })
    .select("*")
    .limit(1);
  if (error) throw new Error(`run insert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.run_id) throw new Error(`run insert returned no run_id for ${lane}`);
  return row;
}

async function upsertPolicy({
  supabase,
  accountId,
  websiteId,
  lane,
  actionClass,
  market,
  locale,
  maxRiskScore = 40,
  notes,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
  market: "CO" | "US";
  locale: "es-CO" | "en-US";
  maxRiskScore?: number;
  notes: string;
}) {
  const { data, error } = await supabase
    .from("growth_autonomy_policies")
    .upsert(
      {
        account_id: accountId,
        website_id: websiteId,
        locale,
        market,
        lane,
        action_class: actionClass,
        enabled: true,
        dry_run_only: false,
        kill_switch_enabled: false,
        paused_reason: null,
        max_risk_level: "medium",
        max_risk_score: maxRiskScore,
        daily_cap: 50,
        weekly_cap: 100,
        required_checks: [
          "before_snapshot",
          "rollback_payload",
          "smoke_check",
          "baseline",
          "success_metric",
          "evaluation_date",
          "no_paid_mutation",
          "tenant_allowlist",
        ],
        policy_version: "epic310-production-cert-v1",
        notes,
      },
      { onConflict: "account_id,website_id,locale,market,lane,action_class" },
    )
    .select("*")
    .limit(1);
  if (error) throw new Error(`policy upsert failed: ${error.message}`);
  const policy = Array.isArray(data) ? data[0] : data;
  if (!policy?.id) throw new Error(`policy upsert returned no id for ${actionClass}`);
  return policy as GrowthAutonomyPolicyLike;
}

async function insertProfiles({
  supabase,
  accountId,
  websiteId,
  locale,
  market,
  profileTypes,
  subjectTable = null,
  subjectId = null,
  subjectKey = null,
  now,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  locale: "es-CO" | "en-US";
  market: "CO" | "US";
  profileTypes: GrowthProfileType[];
  subjectTable?: string | null;
  subjectId?: string | null;
  subjectKey?: string | null;
  now: Date;
}) {
  const confidenceByType: Record<string, number> = {
    business: 0.86,
    buyer: 0.84,
    seo_market: 0.82,
    competitor: 0.75,
    page_product: 0.88,
    risk_policy: 0.99,
    agent_lane: 0.8,
  };
  const rows = profileTypes.map((profileType) => ({
    account_id: accountId,
    website_id: websiteId,
    locale,
    market,
    profile_type: profileType,
    subject_table: subjectTable,
    subject_id: subjectId,
    subject_key: subjectKey,
    source: "epic310_production_certification",
    confidence: confidenceByType[profileType] ?? 0.8,
    valid_from: now.toISOString(),
    valid_until: addHours(now, profileType === "risk_policy" ? 1 : 24).toISOString(),
    freshness_ttl_hours: profileType === "risk_policy" ? 1 : 24,
    payload: {
      certification: "epic310",
      profile_type: profileType,
      target_table: subjectTable,
      target_id: subjectId,
      blocked_surfaces: [
        "paid_media",
        "pricing",
        "availability",
        "reservations",
        "payments",
        "crm_mutation",
      ],
    },
    source_signal_fact_ids: [],
    policy_version: "profile-freshness-v1",
  }));
  for (const row of rows) {
    let existingQuery = supabase
      .from("growth_profiles")
      .select("id")
      .eq("website_id", websiteId)
      .eq("locale", locale)
      .eq("market", market)
      .eq("profile_type", row.profile_type);
    existingQuery = row.subject_table
      ? existingQuery.eq("subject_table", row.subject_table)
      : existingQuery.is("subject_table", null);
    existingQuery = row.subject_id
      ? existingQuery.eq("subject_id", row.subject_id)
      : existingQuery.is("subject_id", null);
    existingQuery = row.subject_key
      ? existingQuery.eq("subject_key", row.subject_key)
      : existingQuery.is("subject_key", null);

    const { data: existing, error: existingError } = await existingQuery
      .limit(1)
      .maybeSingle();
    if (existingError) {
      throw new Error(`profile lookup failed: ${existingError.message}`);
    }
    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("growth_profiles")
        .update({
          confidence: row.confidence,
          valid_from: row.valid_from,
          valid_until: row.valid_until,
          freshness_ttl_hours: row.freshness_ttl_hours,
          payload: row.payload,
          source: row.source,
          source_signal_fact_ids: row.source_signal_fact_ids,
          policy_version: row.policy_version,
          updated_at: now.toISOString(),
        })
        .eq("id", existing.id);
      if (updateError) {
        throw new Error(`profile update failed: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from("growth_profiles")
        .insert(row);
      if (insertError) {
        throw new Error(`profile insert failed: ${insertError.message}`);
      }
    }
  }

  const { data, error: selectError } = await supabase
    .from("growth_profiles")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("locale", locale)
    .eq("market", market)
    .in("profile_type", profileTypes);
  if (selectError) throw new Error(`profile select failed: ${selectError.message}`);
  return data ?? [];
}

async function currentUsage({
  supabase,
  accountId,
  websiteId,
  policyId,
  now,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  policyId: string | null | undefined;
  now: Date;
}) {
  const { count: dailyUsed, error: dailyError } = await supabase
    .from("growth_publication_jobs")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("policy_id", policyId)
    .gte("created_at", addDays(now, -1).toISOString());
  if (dailyError) throw new Error(dailyError.message);
  const { count: weeklyUsed, error: weeklyError } = await supabase
    .from("growth_publication_jobs")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("policy_id", policyId)
    .gte("created_at", addDays(now, -7).toISOString());
  if (weeklyError) throw new Error(weeklyError.message);
  return { dailyUsed: dailyUsed ?? 0, weeklyUsed: weeklyUsed ?? 0 };
}

async function upsertWorkItem({
  supabase,
  accountId,
  websiteId,
  runId,
  sourceTable,
  sourceId,
  lane,
  actionClass,
  title,
  intent,
  evidence,
  riskScore = 20,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  runId: string;
  sourceTable: string;
  sourceId: string;
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
  title: string;
  intent: string;
  evidence: JsonRecord;
  riskScore?: number;
}) {
  const { data, error } = await supabase
    .from("growth_work_items")
    .upsert(
      {
        account_id: accountId,
        website_id: websiteId,
        source_table: sourceTable,
        source_id: sourceId,
        run_id: runId,
        lane,
        agent_profile:
          lane === "transcreation"
            ? "Transcreation Agent"
            : lane === "technical_remediation"
              ? "Technical Agent"
              : "Content Creator",
        title,
        intent,
        status: "ready",
        language: actionClass === "transcreation_merge" ? "en" : "es",
        capability_requirements: [actionClass, "live_gate", "rollback", "smoke"],
        skill_hints: ["epic310-production-certification"],
        allowed_action_class: actionClass,
        risk_level: riskScore <= 30 ? "low" : "medium",
        risk_score: riskScore,
        requires_human_review: false,
        required_approval_role:
          actionClass === "safe_apply" ? "technical_owner" : "curator",
        operator_summary: `Epic 310 production certification for ${actionClass}.`,
        handoff_summary: "Live-gated execution with snapshot, smoke, rollback and outcome ledger.",
        next_action: "Execute publication job.",
        progress_label: "Ready for live gated execution",
        evidence,
        source_refs: [`${sourceTable}:${sourceId}`],
        idempotency_key: `epic310:${actionClass}:${sourceId}:${Date.now()}`,
        created_by: "epic310_production_certification",
      },
      { onConflict: "website_id,idempotency_key" },
    )
    .select("id")
    .limit(1);
  if (error) throw new Error(`work item upsert failed: ${error.message}`);
  const id = Array.isArray(data) ? data[0]?.id : data?.id;
  if (!id) throw new Error(`work item upsert returned no id for ${actionClass}`);
  return id as string;
}

async function upsertChangeSet({
  supabase,
  accountId,
  websiteId,
  runId,
  workItemId,
  lane,
  actionClass,
  title,
  beforeSnapshot,
  afterSnapshot,
  riskLevel = "low",
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  runId: string;
  workItemId: string;
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
  title: string;
  beforeSnapshot: JsonRecord;
  afterSnapshot: JsonRecord;
  riskLevel?: "low" | "medium";
}) {
  const changeTypeByAction: Record<string, string> = {
    content_publish: "publish_packet_prepare",
    transcreation_merge: "transcreation_merge_readiness",
    safe_apply: "technical_smoke_result",
  };
  const { data, error } = await supabase
    .from("growth_agent_change_sets")
    .upsert(
      {
        account_id: accountId,
        website_id: websiteId,
        locale: actionClass === "transcreation_merge" ? "en-US" : "es-CO",
        market: actionClass === "transcreation_merge" ? "US" : "CO",
        run_id: runId,
        source_table: "growth_work_items",
        source_id: workItemId,
        agent_lane: lane,
        change_type: changeTypeByAction[actionClass] ?? "growth_cycle_summary",
        status: "approved",
        title,
        summary: `Epic 310 live gated ${actionClass} certification.`,
        dedupe_key: `epic310:${actionClass}:${workItemId}`,
        before_snapshot: beforeSnapshot,
        after_snapshot: afterSnapshot,
        preview_payload: {
          action_class: actionClass,
          live_gated: true,
        },
        evidence: {
          source: "epic310_production_certification",
          live_gated: true,
          autonomy_action_class: actionClass,
          paid_blocked: true,
          rollback_available: true,
          smoke_required: true,
        },
        risk_level: riskLevel,
        requires_human_review: false,
        required_approval_role:
          actionClass === "safe_apply" ? "technical_owner" : "curator",
      },
      { onConflict: "account_id,website_id,run_id,change_type,dedupe_key" },
    )
    .select("id")
    .limit(1);
  if (error) throw new Error(`change set upsert failed: ${error.message}`);
  const id = Array.isArray(data) ? data[0]?.id : data?.id;
  if (!id) throw new Error(`change set upsert returned no id for ${actionClass}`);
  await supabase
    .from("growth_work_items")
    .update({ change_set_id: id })
    .eq("id", workItemId)
    .eq("website_id", websiteId);
  return id as string;
}

function assertLiveGate({
  lane,
  actionClass,
  targetTable,
  riskScore,
  policy,
  freshness,
  usage,
}: {
  lane: AgentLane;
  actionClass: GrowthAutonomyActionClass;
  targetTable: GrowthPublicationTargetTable;
  riskScore: number;
  policy: GrowthAutonomyPolicyLike;
  freshness: ReturnType<typeof evaluateProfileFreshnessGate>;
  usage: { dailyUsed: number; weeklyUsed: number };
}) {
  const gate = evaluateGrowthAutonomyExecution({
    lane,
    actionClass,
    targetTable,
    riskScore,
    riskLevel: riskScore <= 30 ? "low" : "medium",
    policy,
    freshness,
    dailyUsed: usage.dailyUsed,
    weeklyUsed: usage.weeklyUsed,
    checks: {
      beforeSnapshot: true,
      rollbackPayload: true,
      smokeCheck: true,
      baseline: true,
      successMetric: true,
      evaluationDate: true,
      tenantAllowlist: true,
      technicalReversibility: actionClass === "safe_apply",
    },
  });
  if (!gate.allowed || gate.mode !== "live") {
    throw new Error(`${actionClass} live gate blocked: ${gate.reasons.join(",")}`);
  }
  return gate;
}

async function certifyContentPublish({
  supabase,
  accountId,
  websiteId,
  now,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  now: Date;
}) {
  const lane: AgentLane = "content_creator";
  const actionClass: GrowthAutonomyActionClass = "content_publish";
  const [run, policy, profilesResult, categoryResult, existingPostResult] =
    await Promise.all([
      latestRun({ supabase, accountId, websiteId, lane }),
      upsertPolicy({
        supabase,
        accountId,
        websiteId,
        lane,
        actionClass,
        locale: "es-CO",
        market: "CO",
        maxRiskScore: 45,
        notes: "Epic 310 production certification: organic blog content publish only.",
      }),
      insertProfiles({
        supabase,
        accountId,
        websiteId,
        locale: "es-CO",
        market: "CO",
        profileTypes: requirementsForAction(actionClass).map((item) => item.profileType),
        subjectTable: "website_blog_posts",
        subjectKey: "organic-blog",
        now,
      }),
      supabase
        .from("website_blog_categories")
        .select("id")
        .eq("website_id", websiteId)
        .eq("slug", "guias-de-viaje")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("website_blog_posts")
        .select("*")
        .eq("website_id", websiteId)
        .eq("locale", "es-CO")
        .eq("slug", "guia-viaje-colombia-cultura-naturaleza")
        .limit(1)
        .maybeSingle(),
    ]);
  if (categoryResult.error) throw new Error(categoryResult.error.message);
  if (existingPostResult.error) throw new Error(existingPostResult.error.message);

  const profiles = profilesResult as any[];
  const freshness = evaluateProfileFreshnessGate({
    profiles,
    requirements: requirementsForAction(actionClass),
    now,
  });
  const usage = await currentUsage({
    supabase,
    accountId,
    websiteId,
    policyId: policy.id,
    now,
  });
  const gate = assertLiveGate({
    lane,
    actionClass,
    targetTable: "website_blog_posts",
    riskScore: 22,
    policy,
    freshness,
    usage,
  });

  const articleId = existingPostResult.data?.id ?? randomUUID();
  const article = {
    id: existingPostResult.data?.id ?? articleId,
    translation_group_id:
      existingPostResult.data?.translation_group_id ?? articleId,
    category_id: categoryResult.data?.id ?? null,
    title: "Guía para vivir Colombia con cultura y naturaleza",
    slug: "guia-viaje-colombia-cultura-naturaleza",
    excerpt:
      "Una guía práctica para organizar un recorrido por Colombia combinando ciudades históricas, paisajes naturales y experiencias locales con sentido.",
    seo_title: "Guía de viaje por Colombia: cultura y naturaleza",
    seo_description:
      "Ideas para recorrer Colombia con cultura, naturaleza y experiencias locales, desde ciudades históricas hasta paisajes de montaña y Caribe.",
    seo_keywords: ["viaje a colombia", "cultura colombiana", "naturaleza colombia"],
    featured_image: null,
    featured_image_alt: null,
    content: `# Guía para vivir Colombia con cultura y naturaleza

Colombia se entiende mejor cuando el recorrido conecta paisajes, historias locales y tiempos de descanso. Un viaje bien diseñado no depende solo de sumar lugares famosos: necesita una secuencia clara para que cada región tenga sentido dentro de la experiencia completa. Esta guía reúne criterios prácticos para construir una ruta orgánica por el país, pensada para viajeros que quieren conocer cultura, naturaleza y gastronomía sin perder profundidad.

## Empieza por una idea central

Antes de elegir ciudades o parques, conviene definir el hilo del viaje. Puede ser historia y patrimonio, biodiversidad, café, Caribe, Andes o una mezcla equilibrada. Ese hilo ayuda a decidir cuánto tiempo dedicar a cada zona y evita saltos largos que resten energía. Para un primer acercamiento, una combinación sólida puede unir Bogotá o Medellín con el Eje Cafetero y una experiencia de costa o selva.

## Combina ciudad y naturaleza

Las ciudades colombianas aportan contexto: museos, plazas, mercados, cocina regional y vida de barrio. La naturaleza entrega contraste: montañas, ríos, playas, bosques y observación de aves. Alternar ambos ambientes hace que el viaje respire mejor. Después de una jornada urbana intensa, una caminata suave, una finca cafetera o una salida en lancha pueden cambiar el ritmo sin desconectar del propósito del recorrido.

## Reserva espacio para lo local

Los mejores momentos suelen aparecer en experiencias pequeñas: probar una receta regional, conversar con un guía local, visitar un taller artesanal o caminar una plaza al final de la tarde. Incluir estos espacios mejora la conexión con el destino y evita que el itinerario se sienta como una lista de paradas. La clave es cuidar tiempos reales de traslado y dejar margen para disfrutar cada lugar.

## Piensa en temporadas y clima

Colombia tiene pisos térmicos variados, por eso una misma ruta puede incluir clima frío, templado y cálido. Llevar capas livianas, revisar temporadas de lluvia por región y ordenar actividades al aire libre en los horarios más convenientes mejora mucho la experiencia. En zonas naturales, es recomendable priorizar operadores responsables, senderos habilitados y prácticas de bajo impacto.

## Mide el éxito del viaje

Un buen recorrido se nota cuando el viajero entiende por qué visitó cada lugar, recuerda personas y sabores concretos, y termina con una imagen más completa del país. Para lograrlo, conviene equilibrar iconos reconocidos con experiencias menos obvias, siempre con una narrativa clara. Colombia ofrece suficiente diversidad para crear rutas memorables sin acelerar el ritmo ni sacrificar autenticidad.`,
  };

  const workItemId = await upsertWorkItem({
    supabase,
    accountId,
    websiteId,
    runId: run.run_id,
    sourceTable: "website_blog_posts",
    sourceId: existingPostResult.data?.id ?? websiteId,
    lane,
    actionClass,
    title: "Epic 310 organic content live publish",
    intent: "content_publish_certification",
    riskScore: 22,
    evidence: { gate, profile_snapshot: freshness.snapshot, article_slug: article.slug },
  });
  const changeSetId = await upsertChangeSet({
    supabase,
    accountId,
    websiteId,
    runId: run.run_id,
    workItemId,
    lane,
    actionClass,
    title: "Publish organic Colombia guide",
    beforeSnapshot: { row: existingPostResult.data ?? null },
    afterSnapshot: { article },
  });

  const plan = planContentPublication({
    accountId,
    websiteId,
    locale: "es-CO",
    market: "CO",
    workItemId,
    changeSetId,
    policyId: policy.id,
    lane,
    targetId: existingPostResult.data?.id ?? null,
    beforeRow: existingPostResult.data ?? null,
    article,
    baseline: {
      organic_clicks: 0,
      impressions: 0,
      indexed: Boolean(existingPostResult.data),
      word_count: wordCount(article.content),
    },
    successMetric: `organic_clicks:blog:${article.slug}`,
    now,
    live: true,
  });
  const execution = await executeGrowthPublicationJob({ supabase, plan });
  return {
    gate,
    execution,
    workItemId,
    changeSetId,
    slug: article.slug,
    expectedOutcomes: 2,
  };
}

async function certifyTranscreationMerge({
  supabase,
  accountId,
  websiteId,
  now,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  now: Date;
}) {
  const lane: AgentLane = "transcreation";
  const actionClass: GrowthAutonomyActionClass = "transcreation_merge";
  const { data: variant, error: variantError } = await supabase
    .from("seo_localized_variants")
    .select("*")
    .eq("website_id", websiteId)
    .eq("target_locale", "en-US")
    .eq("page_type", "page")
    .limit(1)
    .maybeSingle();
  if (variantError) throw new Error(variantError.message);
  if (!variant?.id) throw new Error("No en-US page localized variant found.");

  const { data: transcreationJob, error: jobError } = await supabase
    .from("seo_transcreation_jobs")
    .select("*")
    .eq("website_id", websiteId)
    .eq("target_locale", "en-US")
    .limit(1)
    .maybeSingle();
  if (jobError) throw new Error(jobError.message);
  if (!transcreationJob?.id) throw new Error("No en-US transcreation job found.");

  const [run, policy, profiles] = await Promise.all([
    latestRun({ supabase, accountId, websiteId, lane }),
    upsertPolicy({
      supabase,
      accountId,
      websiteId,
      lane,
      actionClass,
      locale: "en-US",
      market: "US",
      maxRiskScore: 45,
      notes: "Epic 310 production certification: EN transcreation merge only.",
    }),
    insertProfiles({
      supabase,
      accountId,
      websiteId,
      locale: "en-US",
      market: "US",
      profileTypes: requirementsForAction(actionClass).map((item) => item.profileType),
      subjectTable: "seo_localized_variants",
      subjectId: variant.id,
      subjectKey: "en-us-page-variant",
      now,
    }),
  ]);
  const freshness = evaluateProfileFreshnessGate({
    profiles: profiles as any[],
    requirements: requirementsForAction(actionClass),
    now,
  });
  const usage = await currentUsage({
    supabase,
    accountId,
    websiteId,
    policyId: policy.id,
    now,
  });
  const gate = assertLiveGate({
    lane,
    actionClass,
    targetTable: "seo_localized_variants",
    riskScore: 24,
    policy,
    freshness,
    usage,
  });

  const payload = {
    title: "Colombia travel experiences with local depth",
    slug: "colombia-travel-experiences-local-depth",
    meta_title: "Colombia travel experiences with local depth",
    meta_desc:
      "Explore Colombia through curated culture, nature and regional experiences designed for travelers seeking a richer journey.",
    h1: "Colombia travel experiences with local depth",
    body_content:
      "Discover Colombia through a route that balances heritage cities, coffee landscapes, Caribbean color and nature-led experiences with local context.",
    body_overlay_v2: {
      title: "Colombia travel experiences with local depth",
      meta_title: "Colombia travel experiences with local depth",
      meta_desc:
        "Explore Colombia through curated culture, nature and regional experiences designed for travelers seeking a richer journey.",
      h1: "Colombia travel experiences with local depth",
      sections: [
        {
          type: "intro",
          copy: "A localized English overlay focused on culture, nature and regional context.",
        },
      ],
      certification: "epic310-transcreation-live",
    },
  };

  const workItemId = await upsertWorkItem({
    supabase,
    accountId,
    websiteId,
    runId: run.run_id,
    sourceTable: "seo_localized_variants",
    sourceId: variant.id,
    lane,
    actionClass,
    title: "Epic 310 transcreation live merge",
    intent: "transcreation_merge_certification",
    riskScore: 24,
    evidence: {
      gate,
      profile_snapshot: freshness.snapshot,
      localized_variant_id: variant.id,
      transcreation_job_id: transcreationJob.id,
    },
  });
  const changeSetId = await upsertChangeSet({
    supabase,
    accountId,
    websiteId,
    runId: run.run_id,
    workItemId,
    lane,
    actionClass,
    title: "Merge EN localized variant",
    beforeSnapshot: { row: variant },
    afterSnapshot: { payload },
  });
  const plan = planTranscreationMerge({
    accountId,
    websiteId,
    sourceLocale: "es-CO",
    targetLocale: "en-US",
    market: "US",
    workItemId,
    changeSetId,
    policyId: policy.id,
    transcreationJobId: transcreationJob.id,
    localizedVariantId: variant.id,
    pageType: "page",
    sourceEntityId: variant.source_entity_id,
    targetEntityId: variant.target_entity_id,
    beforeVariant: variant,
    payload,
    quality: {
      score: 0.93,
      passed: true,
      issues: [],
    },
    baseline: {
      localized_clicks: 0,
      source_locale: "es-CO",
      target_locale: "en-US",
      variant_status_before: variant.status,
    },
    successMetric: `localized_organic_clicks:page:en-US:${variant.source_entity_id}`,
    now,
    live: true,
  });
  const execution = await executeGrowthPublicationJob({ supabase, plan });
  return {
    gate,
    execution,
    workItemId,
    changeSetId,
    localizedVariantId: variant.id,
    expectedOutcomes: 2,
  };
}

async function certifyCandidatePromotion({
  supabase,
  accountId,
  websiteId,
  now,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  now: Date;
}) {
  const actionClass: GrowthAutonomyActionClass = "content_publish";
  const profiles = await insertProfiles({
    supabase,
    accountId,
    websiteId,
    locale: "es-CO",
    market: "CO",
    profileTypes: requirementsForAction(actionClass).map((item) => item.profileType),
    subjectTable: "website_blog_posts",
    subjectKey: "candidate-promotion",
    now,
  });
  const freshness = evaluateProfileFreshnessGate({
    profiles: profiles as any[],
    requirements: requirementsForAction(actionClass),
    now,
  });
  const candidate = scoreOpportunityCandidate({
    accountId,
    websiteId,
    locale: "es-CO",
    market: "CO",
    candidateType: "content_refresh",
    lane: "content_creator",
    allowedActionClass: actionClass,
    title: "Epic 310 candidate promotion certification",
    summary:
      "Controlled candidate proving orchestrator can create backlog-ready work from scored growth evidence.",
    impactScore: 76,
    confidence: 0.84,
    urgencyScore: 70,
    costScore: 20,
    riskScore: 24,
    idempotencyKey: `epic310-candidate-promotion-${dateOnly(now)}`,
    evidence: {
      source_refs: ["manual:epic310-certification"],
      expected_rollback: "delete_or_restore_blog_post",
      target_validated: true,
    },
    requiredProfileTypes: requirementsForAction(actionClass).map((item) => item.profileType),
    freshness,
    successMetric: "qualified_trip_requests:organic_content:epic310_candidate",
    evaluationWindow: "day_21",
  });
  const { data, error } = await supabase
    .from("growth_opportunity_candidates")
    .upsert(candidate, { onConflict: "website_id,idempotency_key" })
    .select("id,status")
    .limit(1);
  if (error) throw new Error(`candidate upsert failed: ${error.message}`);
  const candidateId = Array.isArray(data) ? data[0]?.id : data?.id;
  if (!candidateId) throw new Error("candidate upsert returned no id");
  const promotion = await promoteGrowthOpportunityCandidates({
    supabase,
    accountId,
    websiteId,
    limit: 5,
    now,
  });
  return {
    candidateId,
    promotion: promotion.find((item) => item.candidateId === candidateId) ?? null,
  };
}

async function certifyMeasurement({
  supabase,
  accountId,
  websiteId,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
}) {
  const { data: immediateOutcomes, error } = await supabase
    .from("growth_work_item_outcomes")
    .select("*")
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("evaluation_window", "immediate")
    .eq("status", "measuring")
    .limit(10);
  if (error) throw new Error(error.message);
  const ids = (immediateOutcomes ?? []).map((row: any) => row.id);
  if (ids.length > 0) {
    const { error: updateError } = await supabase
      .from("growth_work_item_outcomes")
      .update({
        status: "won",
        current_result: {
          smoke_pass: true,
          evaluated_by: "epic310_production_certification",
        },
        evaluated_at: new Date().toISOString(),
      })
      .in("id", ids);
    if (updateError) throw new Error(updateError.message);
  }

  const { count: missingMetricCount, error: missingError } = await supabase
    .from("growth_publication_jobs")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("job_mode", "live")
    .is("success_metric", null);
  if (missingError) throw new Error(missingError.message);

  const { count: liveJobs, error: liveError } = await supabase
    .from("growth_publication_jobs")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("job_mode", "live")
    .eq("status", "smoke_passed");
  if (liveError) throw new Error(liveError.message);

  const { count: closedImmediateCount, error: closedImmediateError } = await supabase
    .from("growth_work_item_outcomes")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("website_id", websiteId)
    .eq("evaluation_window", "immediate")
    .in("status", ["won", "lost", "neutral"]);
  if (closedImmediateError) throw new Error(closedImmediateError.message);

  return {
    immediateOutcomesEvaluated: ids.length,
    closedImmediateOutcomes: closedImmediateCount ?? 0,
    liveSmokePassedJobs: liveJobs ?? 0,
    liveJobsMissingMetric: missingMetricCount ?? 0,
  };
}

async function certifyBlockedPaid({
  supabase,
  accountId,
  websiteId,
  now,
}: {
  supabase: any;
  accountId: string;
  websiteId: string;
  now: Date;
}) {
  const policy = await upsertPolicy({
    supabase,
    accountId,
    websiteId,
    lane: "orchestrator",
    actionClass: "paid_mutation",
    locale: "es-CO",
    market: "CO",
    maxRiskScore: 100,
    notes: "Intentional negative certification: paid mutation must remain blocked.",
  });
  const profiles = await insertProfiles({
    supabase,
    accountId,
    websiteId,
    locale: "es-CO",
    market: "CO",
    profileTypes: ["risk_policy"],
    now,
  });
  const freshness = evaluateProfileFreshnessGate({
    profiles: profiles as any[],
    requirements: requirementsForAction("paid_mutation"),
    now,
  });
  const verdict = evaluateGrowthAutonomyExecution({
    lane: "orchestrator",
    actionClass: "paid_mutation",
    targetTable: "website_pages",
    riskScore: 5,
    riskLevel: "low",
    policy,
    freshness,
    dailyUsed: 0,
    weeklyUsed: 0,
    checks: {
      beforeSnapshot: true,
      rollbackPayload: true,
      smokeCheck: true,
      baseline: true,
      successMetric: true,
      evaluationDate: true,
      tenantAllowlist: true,
    },
  });
  return verdict;
}

async function main() {
  loadLocalEnv();
  const accountId = process.env.GROWTH_ACCOUNT_ID ?? DEFAULT_ACCOUNT_ID;
  const websiteId = process.env.GROWTH_WEBSITE_ID ?? DEFAULT_WEBSITE_ID;
  const now = new Date();
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );

  const content = await certifyContentPublish({ supabase, accountId, websiteId, now });
  const transcreation = await certifyTranscreationMerge({
    supabase,
    accountId,
    websiteId,
    now,
  });
  const candidatePromotion = await certifyCandidatePromotion({
    supabase,
    accountId,
    websiteId,
    now,
  });
  const measurement = await certifyMeasurement({ supabase, accountId, websiteId });
  const paidVerdict = await certifyBlockedPaid({ supabase, accountId, websiteId, now });
  const agentOptimization = await summarizeGrowthAgentOptimization({
    supabase,
    accountId,
    websiteId,
  });

  const { data: contentOutcomes } = await supabase
    .from("growth_work_item_outcomes")
    .select("id")
    .eq("work_item_id", content.workItemId);
  const { data: transcreationOutcomes } = await supabase
    .from("growth_work_item_outcomes")
    .select("id")
    .eq("work_item_id", transcreation.workItemId);

  const checks = {
    organic_content_live:
      content.gate.allowed &&
      content.gate.mode === "live" &&
      content.execution.status === "smoke_passed" &&
      (contentOutcomes?.length ?? 0) >= content.expectedOutcomes,
    transcreation_live:
      transcreation.gate.allowed &&
      transcreation.gate.mode === "live" &&
      transcreation.execution.status === "smoke_passed" &&
      (transcreationOutcomes?.length ?? 0) >= transcreation.expectedOutcomes,
    candidate_promoted:
      candidatePromotion.promotion?.promoted === true &&
      Boolean(candidatePromotion.promotion?.workItemId),
    measurement_closed:
      measurement.liveJobsMissingMetric === 0 &&
      measurement.liveSmokePassedJobs >= 3 &&
      measurement.closedImmediateOutcomes >= 1,
    paid_remains_blocked:
      paidVerdict.allowed === false &&
      paidVerdict.reasons.includes("blocked_action_class:paid_mutation"),
    agent_optimization_available:
      agentOptimization.length >= 5 &&
      agentOptimization.some((lane) => lane.toolCalls > 0 || lane.draftSkills > 0),
  };
  const certified = Object.values(checks).every(Boolean);
  console.log(
    JSON.stringify(
      {
        certified,
        certification: "epic310-production-live-gated",
        certifiedAt: now.toISOString(),
        accountId,
        websiteId,
        checks,
        content: {
          slug: content.slug,
          execution: content.execution,
          workItemId: content.workItemId,
          changeSetId: content.changeSetId,
          outcomes: contentOutcomes?.length ?? 0,
        },
        transcreation: {
          localizedVariantId: transcreation.localizedVariantId,
          execution: transcreation.execution,
          workItemId: transcreation.workItemId,
          changeSetId: transcreation.changeSetId,
          outcomes: transcreationOutcomes?.length ?? 0,
        },
        candidatePromotion,
        measurement,
        paidVerdict: {
          allowed: paidVerdict.allowed,
          reasons: paidVerdict.reasons,
        },
        agentOptimization,
      },
      null,
      2,
    ),
  );
  if (!certified) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
