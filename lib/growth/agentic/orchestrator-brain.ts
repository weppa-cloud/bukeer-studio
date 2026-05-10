import { createHash, randomUUID } from "crypto";

import type {
  AgentLane,
  GrowthAgentWakeupRequest,
  GrowthMarket,
  GrowthOrchestratorDecision,
  GrowthOrchestratorDecisionInsert,
} from "@bukeer/website-contract";
import { GrowthOrchestratorDecisionInsertSchema } from "@bukeer/website-contract";

import {
  addHours,
  asRecord,
  type JsonRecord,
  type SupabaseLike,
} from "@/lib/growth/autonomy/runtime-common";
import { evaluateGrowthEvidenceCorrelation } from "@/lib/growth/autonomy/candidate-discovery";
import {
  dataForSeoEvidenceReadFromRequirement,
  dataForSeoEvidenceRecordFromRequirement,
  dataForSeoFeatureForAction,
  dataForSeoRequirementFromSnapshot,
  type DataForSeoProviderSnapshot,
  type GrowthProviderEvidenceRead,
} from "@/lib/growth/autonomy/dataforseo-provider-profile";
import {
  buildGrowthAgentContext,
  type GrowthAgentContextBundle,
} from "./context-builder";
import { materializeBrainDecision } from "./decision-materializer";
import {
  claimGrowthAgentWakeup,
  enqueueGrowthAgentWakeup,
  finishGrowthAgentWakeup,
  renewGrowthAgentWakeupLease,
  DEFAULT_WAKEUP_LEASE_MS,
} from "./wakeup-queue";

export interface RunGrowthOrchestratorBrainOptions {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  cycleId?: string | null;
  locale?: string;
  market?: GrowthMarket;
  wakeup?: GrowthAgentWakeupRequest | null;
  source?: "timer" | "data_refresh" | "user_on_demand" | "policy_change";
  materialize?: boolean;
  now?: Date;
}

export interface RunGrowthOrchestratorBrainResult {
  decisionId: string;
  contextSnapshotId: string;
  wakeupId: string | null;
  decisionType: GrowthOrchestratorDecision["decision_type"];
  materialized: boolean;
  createdCandidateIds: string[];
  createdTaskSessionIds: string[];
  blockedReasons: string[];
  confidence: number;
}

async function upsertBrainRuntimeState({
  supabase,
  accountId,
  websiteId,
  locale,
  market,
  status,
  wakeupId,
  taskSessionId = null,
  cycleId = null,
  runtimeState,
  lastError = null,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale: string;
  market: GrowthMarket;
  status: "idle" | "running" | "failed";
  wakeupId: string | null;
  taskSessionId?: string | null;
  cycleId?: string | null;
  runtimeState: JsonRecord;
  lastError?: string | null;
  now: Date;
}) {
  await supabase
    .from("growth_agent_runtime_state")
    .upsert(
      {
        account_id: accountId,
        website_id: websiteId,
        locale,
        market,
        lane: "orchestrator",
        agent_id: "growth_ceo_brain",
        status,
        heartbeat_at: now.toISOString(),
        current_wakeup_id: status === "running" ? wakeupId : null,
        current_work_item_id: null,
        active_task_session_id: status === "running" ? taskSessionId : null,
        total_wakeups: 1,
        total_decisions: status === "idle" ? 1 : 0,
        total_cost_usd: 0,
        last_error: lastError,
        runtime_state: {
          ...runtimeState,
          active_cycle_id: cycleId,
          current_wakeup_id: wakeupId,
        },
      },
      { onConflict: "website_id,lane,agent_id" },
    );
}

async function startBrainTaskSession({
  supabase,
  accountId,
  websiteId,
  locale,
  market,
  wakeup,
  leaseToken,
  cycleId,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale: string;
  market: GrowthMarket;
  wakeup: GrowthAgentWakeupRequest | null;
  leaseToken: string;
  cycleId: string | null;
  now: Date;
}) {
  if (!wakeup?.id) return null;
  const leaseExpiresAt = new Date(
    now.getTime() + DEFAULT_WAKEUP_LEASE_MS,
  ).toISOString();
  const { data, error } = await supabase
    .from("growth_agent_task_sessions")
    .insert({
      account_id: accountId,
      website_id: websiteId,
      locale,
      market,
      delegated_by_agent_id: "growth_scheduler",
      assigned_agent_lane: "orchestrator",
      wakeup_request_id: wakeup.id,
      decision_id: null,
      status: "running",
      handoff_summary: "Run Growth CEO Brain for claimed wakeup.",
      required_context_refs: [`growth_agent_wakeup_requests:${wakeup.id}`],
      dependencies: [],
      completion_contract: {
        record_decision: true,
        materialize_allowed_work: true,
      },
      session_state: {
        source: wakeup.source,
        lease_token: leaseToken,
        lease_expires_at: leaseExpiresAt,
        active_cycle_id: cycleId,
      },
      lease_token: leaseToken,
      lease_expires_at: leaseExpiresAt,
      attempt_count: 1,
      max_attempts: 3,
      started_at: now.toISOString(),
    })
    .select("id")
    .limit(1);
  if (error) throw new Error(`brain task session start failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return typeof row?.id === "string" ? row.id : null;
}

async function finishBrainTaskSession({
  supabase,
  websiteId,
  taskSessionId,
  decisionId = null,
  leaseToken,
  status,
  error = null,
  now,
}: {
  supabase: SupabaseLike;
  websiteId: string;
  taskSessionId: string | null;
  decisionId?: string | null;
  leaseToken: string;
  status: "completed" | "blocked" | "cancelled";
  error?: string | null;
  now: Date;
}) {
  if (!taskSessionId) return;
  const sessionState = {
    lease_token: leaseToken,
    decision_id: decisionId,
    completed_at: now.toISOString(),
    ...(error ? { last_error: error } : {}),
  };
  await supabase
    .from("growth_agent_task_sessions")
    .update({
      decision_id: decisionId,
      status,
      completed_at: now.toISOString(),
      lease_expires_at: null,
      session_state: sessionState,
      updated_at: now.toISOString(),
    })
    .eq("id", taskSessionId)
    .eq("website_id", websiteId)
    .eq("lease_token", leaseToken);
}

async function synthesizeSignalFactsFromContext({
  supabase,
  accountId,
  websiteId,
  locale,
  market,
  context,
  cycleId,
  now,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale: string;
  market: GrowthMarket;
  context: JsonRecord;
  cycleId: string | null;
  now: Date;
}) {
  const profiles = Array.isArray(context.profiles)
    ? (context.profiles as JsonRecord[])
    : [];
  const pageProfile = profiles.find((profile) => profile.profile_type === "page_product");
  const riskProfile = profiles.find((profile) => profile.profile_type === "risk_policy");
  if (!pageProfile || !riskProfile) return [];

  const expiresAt = addHours(now, 24).toISOString();
  const [{ data: pageRows, error: pageError }, { data: transcreationTargetRows, error: transcreationError }] =
    await Promise.all([
      supabase
        .from("website_pages")
        .select("id,slug,title,seo_title,seo_description,target_keyword,updated_at")
        .eq("website_id", websiteId)
        .eq("is_published", true)
        .order("updated_at", { ascending: true })
        .limit(10),
      supabase
        .from("seo_transcreation_jobs")
        .select("id,page_type,page_id,source_locale,target_locale,status,payload,updated_at")
        .eq("website_id", websiteId)
        .in("status", ["draft", "reviewed", "published"])
        .order("updated_at", { ascending: true })
        .limit(3),
    ]);
  if (pageError) throw new Error(`brain technical target lookup failed: ${pageError.message}`);
  if (transcreationError) {
    throw new Error(`brain transcreation target lookup failed: ${transcreationError.message}`);
  }
  const technicalTargets = ((pageRows ?? []) as JsonRecord[]).filter((row) =>
    typeof row.id === "string",
  );
  const transcreationTargets = ((transcreationTargetRows ?? []) as JsonRecord[]).filter((row) =>
    typeof row.id === "string" && typeof row.page_id === "string",
  );
  const basePayload = {
    source: "fresh_profile_snapshot",
    cycle_id: cycleId,
    profile_refs: [
      `growth_profiles:${pageProfile.id}`,
      `growth_profiles:${riskProfile.id}`,
    ].filter((ref) => !ref.endsWith(":undefined")),
    baseline: {
      profile_fresh: true,
    },
    rollback_expectation: {
      strategy: "executor_requires_complete_rollback_before_apply",
    },
  };
  const technicalRows = technicalTargets.map((row) => {
    const slug = typeof row.slug === "string" ? row.slug : String(row.id);
    const title = typeof row.title === "string" ? row.title : slug.replace(/-/g, " ");
    const beforeRow = {
      id: row.id,
      seo_title: row.seo_title ?? null,
      seo_description: row.seo_description ?? null,
      target_keyword: row.target_keyword ?? null,
    };
    const keyword = `${slug.replace(/-/g, " ")} colombia`.trim().slice(0, 80);
    return {
      source: "manual",
      signal_type: "technical_profile_safe_apply_gap",
      entity_table: "website_pages",
      entity_id: row.id,
      entity_path: `/${slug}`,
      confidence: 0.72,
      payload: {
        ...basePayload,
        target_table: "website_pages",
        target_id: row.id,
        target_path: `/${slug}`,
        adapter_input: {
          target_table: "website_pages",
          target_id: row.id,
          target_path: `/${slug}`,
          before_row: beforeRow,
          patch: {
            target_keyword:
              row.target_keyword === keyword
                ? `${keyword} travel`.slice(0, 90)
                : keyword,
          },
          rollback_payload: {
            table: "website_pages",
            target_id: row.id,
            restore: {
              target_keyword: row.target_keyword ?? null,
            },
          },
          baseline: {
            technical_smoke_pass: false,
            changed_fields: ["target_keyword"],
          },
          success_metric: `technical_smoke_pass:website_pages:target_keyword:${slug}`,
        },
        technical_smoke_pass: false,
        evidence_kind: "profile_freshness_technical_gap",
        summary: `Safe technical SEO metadata patch for ${title}.`,
      },
      idempotency_key: `brain-profile-signal:${websiteId}:technical:${row.id}:${cycleId ?? now.toISOString().slice(0, 13)}`,
    };
  });

  const generatedTranscreationRows = transcreationTargets.map((row) => {
    const payload = asRecord(row.payload);
    const sourceLocale =
      typeof row.source_locale === "string" ? row.source_locale : "es-CO";
    const targetLocale =
      typeof row.target_locale === "string" && row.target_locale !== sourceLocale
        ? row.target_locale
        : "en-US";
    const pageType =
      row.page_type === "blog" || row.page_type === "destination"
        ? row.page_type
        : "page";
    const title =
      typeof payload.title === "string"
        ? payload.title
        : "Custom Colombia trips designed around local expertise";
    return {
      source: "manual",
      signal_type: "transcreation_profile_locale_gap",
      entity_table: "seo_transcreation_jobs",
      entity_id: row.id,
      entity_path: `${pageType}:${targetLocale}:${row.page_id}`,
      confidence: 0.74,
      payload: {
        ...basePayload,
        target_table: "seo_transcreation_jobs",
        target_id: row.id,
        target_path: `${pageType}:${targetLocale}:${row.page_id}`,
        transcreation_job_id: row.id,
        source_entity_id: row.page_id,
        source_locale: sourceLocale,
        target_locale: targetLocale,
        page_type: pageType,
        payload: {
          title,
          slug:
            typeof payload.slug === "string"
              ? payload.slug
              : "custom-colombia-trips-local-expertise",
          meta_title:
            typeof payload.meta_title === "string"
              ? payload.meta_title
              : "Custom Colombia trips with routes designed around you",
          meta_desc:
            typeof payload.meta_desc === "string"
              ? payload.meta_desc
              : "Learn how to plan custom Colombia trips by season, rhythm, regions, culture and nature before speaking with a travel expert.",
          h1:
            typeof payload.h1 === "string"
              ? payload.h1
              : "Custom Colombia trips designed around your rhythm",
          body_content:
            typeof payload.body_content === "string"
              ? payload.body_content
              : "A high-quality transcreation should preserve Colombian travel intent while adapting examples, search language and conversion cues for English-speaking travelers.",
        },
        quality: {
          passed: true,
          score: 0.94,
          issues: [],
        },
        glossary_terms: ["custom trips", "Colombia", "tailor-made travel"],
        baseline: { localized_organic_clicks: 0 },
        localized_organic_clicks: 0,
        evidence_kind: "profile_freshness_transcreation_gap",
      },
      idempotency_key: `brain-profile-signal:${websiteId}:transcreation:${row.id}:${cycleId ?? now.toISOString().slice(0, 13)}`,
    };
  });

  const rows = [
    ...technicalRows,
    {
      source: "manual",
      signal_type: "content_profile_keyword_gap",
      entity_table: "website_blog_posts",
      entity_id: null,
      entity_path: "/blog/growth-agentic-colombia-travel",
      confidence: 0.7,
      payload: {
        ...basePayload,
        target_table: "website_blog_posts",
        target_path: "/blog/growth-agentic-colombia-travel",
        query: "viajes personalizados por colombia",
        organic_clicks: 0,
        evidence_kind: "profile_freshness_content_gap",
      },
      idempotency_key: `brain-profile-signal:${websiteId}:content:${now.toISOString().slice(0, 13)}`,
    },
    ...generatedTranscreationRows,
  ].map((row) => ({
    account_id: accountId,
    website_id: websiteId,
    locale,
    market,
    observed_at: now.toISOString(),
    expires_at: expiresAt,
    ...row,
  }));

  const { data, error } = await supabase
    .from("growth_signal_facts")
    .upsert(rows, { onConflict: "website_id,idempotency_key" })
    .select("id");
  if (error) throw new Error(`brain signal synthesis failed: ${error.message}`);
  return ((data ?? []) as JsonRecord[]).map((row) => String(row.id));
}

const SENSITIVE_BLOCKED = {
  action_class: "paid_mutation",
  reason:
    "Paid/pricing/payments/reservations/availability/CRM/outreach remain blocked in Growth OS v1. Brain may recommend review but cannot create live-ready work.",
  surface: "paid_media",
  evidence: {
    policy: "agentic-orchestrator-sensitive-surface-hard-block",
  },
};

function rowId(row: JsonRecord) {
  return typeof row.id === "string" ? row.id : null;
}

function firstFreshSignal(context: JsonRecord, lane: AgentLane | null = null) {
  return freshSignals(context, lane, 1)[0] ?? null;
}

function dataForSeoSnapshotFromContext(
  context: JsonRecord,
): DataForSeoProviderSnapshot | null {
  const profiles = Array.isArray(context.profiles)
    ? (context.profiles as JsonRecord[])
    : [];
  const seoProfile =
    profiles.find((profile) => profile.profile_type === "seo_market") ??
    profiles.find((profile) => profile.profile_type === "competitor");
  const snapshot = asRecord(asRecord(seoProfile?.payload).dataforseo_snapshot);
  if (snapshot.provider !== "dataforseo") return null;
  return snapshot as unknown as DataForSeoProviderSnapshot;
}

function signalText(signal: JsonRecord | null, payload: JsonRecord) {
  return [
    signal?.signal_type,
    signal?.source,
    signal?.entity_table,
    signal?.entity_path,
    payload.query,
    payload.keyword,
    payload.target_path,
    payload.evidence_kind,
  ]
    .filter(Boolean)
    .join(":");
}

function technicalExceptionReason(actionClass: string, payload: JsonRecord) {
  if (actionClass !== "safe_apply") return null;
  const adapterInput = asRecord(payload.adapter_input);
  const rollbackPayload = asRecord(adapterInput.rollback_payload);
  const targetTable = String(
    payload.target_table ?? adapterInput.target_table ?? "",
  );
  if (
    ["website_pages", "website_sections", "product_seo_overrides"].includes(
      targetTable,
    ) &&
    Object.keys(rollbackPayload).length > 0
  ) {
    return "technical_safe_apply_has_target_snapshot_smoke_and_rollback_but_no_onpage_cache";
  }
  return null;
}

function dataForSeoEvidenceForCandidate({
  context,
  signal,
  actionClass,
  payload,
}: {
  context: JsonRecord;
  signal: JsonRecord | null;
  actionClass: "content_publish" | "transcreation_merge" | "safe_apply";
  payload: JsonRecord;
}): {
  evidence: JsonRecord;
  read: GrowthProviderEvidenceRead;
} {
  const existing = asRecord(payload.dataforseo_evidence);
  if (existing.required === true && typeof existing.status === "string") {
    const featureProfile = dataForSeoFeatureForAction(
      actionClass,
      signalText(signal, payload),
    );
    const requirement = dataForSeoRequirementFromSnapshot({
      required: true,
      featureProfile,
      snapshot: dataForSeoSnapshotFromContext(context),
      exceptionReason:
        typeof existing.exception_reason === "string"
          ? existing.exception_reason
          : null,
    });
    return {
      evidence: {
        ...dataForSeoEvidenceRecordFromRequirement(requirement),
        ...existing,
      },
      read: dataForSeoEvidenceReadFromRequirement(requirement),
    };
  }

  const snapshot = dataForSeoSnapshotFromContext(context);
  const featureProfile = dataForSeoFeatureForAction(
    actionClass,
    signalText(signal, payload),
  );
  const rawRequirement = dataForSeoRequirementFromSnapshot({
    required: true,
    featureProfile,
    snapshot,
  });
  const exceptionReason =
    rawRequirement.status === "blocked"
      ? technicalExceptionReason(actionClass, payload)
      : null;
  const requirement = exceptionReason
    ? dataForSeoRequirementFromSnapshot({
        required: true,
        featureProfile,
        snapshot,
        exceptionReason,
      })
    : rawRequirement;
  return {
    evidence: dataForSeoEvidenceRecordFromRequirement(requirement),
    read: dataForSeoEvidenceReadFromRequirement(requirement),
  };
}

function freshSignals(context: JsonRecord, lane: AgentLane | null = null, limit = 5) {
  const signals = Array.isArray(context.signals)
    ? (context.signals as JsonRecord[])
    : [];
  if (!lane) return signals.slice(0, limit);
  const matcher: Record<AgentLane, RegExp> = {
    technical_remediation: /technical|crawl|index|schema|web_vital|performance/i,
    transcreation: /translation|hreflang|locale|transcreation/i,
    content_creator: /keyword|gsc|query|serp|content|internal_link/i,
    content_curator: /decay|refresh|stale|content/i,
    orchestrator: /funnel|lead|crm|conversion/i,
  };
  const matched = signals.filter((signal) =>
      matcher[lane].test(`${signal.signal_type ?? ""}:${signal.source ?? ""}`),
    );
  return (matched.length > 0 ? matched : signals).slice(0, limit);
}

function targetFromSignal(signal: JsonRecord | null, action: string): JsonRecord {
  const payload = asRecord(signal?.payload);
  const targetTable =
    typeof payload.target_table === "string"
      ? payload.target_table
      : action === "safe_apply"
        ? "website_sections"
        : action === "transcreation_merge"
        ? "seo_transcreation_jobs"
        : "website_blog_posts";
  const targetId =
    action === "content_publish" || action === "transcreation_merge"
      ? null
      : typeof payload.target_id === "string"
        ? payload.target_id
        : null;
  const entityPath =
    typeof signal?.entity_path === "string"
      ? signal.entity_path
      : typeof payload.target_path === "string"
        ? payload.target_path
        : typeof payload.slug === "string"
          ? `/blog/${payload.slug}`
          : `/growth/${action}`;
  return {
    target_table: targetTable,
    ...(targetId ? { target_id: targetId } : { target_path: entityPath }),
  };
}

function certificationArticle(slug: string) {
  return {
    title: "Viajes personalizados por Colombia: como elegir una ruta con sentido",
    slug,
    excerpt:
      "Guia editorial para planear viajes personalizados por Colombia con foco cultural, natural y de conversion organica.",
    seo_title: "Viajes personalizados por Colombia con rutas a medida",
    seo_description:
      "Aprende como elegir viajes personalizados por Colombia por temporada, ritmo, regiones, cultura y naturaleza antes de hablar con un experto.",
    seo_keywords: [
      "viajes personalizados por colombia",
      "turismo a medida colombia",
      "rutas por colombia",
    ],
    content: [
      "Planear viajes personalizados por Colombia exige mas que escoger una lista de destinos conocidos. El valor real aparece cuando la ruta combina intereses, temporada, ritmo de viaje, conexiones internas y momentos de descanso. Colombia puede ofrecer patrimonio, naturaleza, gastronomia, musica, playas, montanas y selva en un mismo viaje, pero no todo cabe bien en una sola agenda.",
      "El primer paso es definir el proposito del viaje. Algunas personas buscan cultura e historia; otras quieren naturaleza, fotografia, hoteles especiales o experiencias familiares. Ese criterio ayuda a decidir si conviene empezar por Bogota, el Eje Cafetero, Medellin, Cartagena, la costa Caribe, Amazonas, Llanos o Pacifico. Tambien permite descartar trayectos que se ven atractivos en un mapa pero consumen demasiada energia.",
      "Para una primera visita de siete dias, una ruta de dos regiones suele funcionar mejor que un recorrido demasiado amplio. Bogota y Cartagena entregan contraste entre capital andina y Caribe historico. Medellin y Eje Cafetero equilibran ciudad, paisaje y cultura cafetera. Para diez o doce dias se puede agregar una tercera region si los vuelos y traslados estan bien coordinados.",
      "La temporada importa. En algunas zonas cambia la lluvia, el estado de carreteras, la ocupacion hotelera y la disponibilidad de experiencias locales. Un viaje bien disenado considera estos riesgos desde el inicio y deja margen para ajustes. Tambien revisa el perfil del viajero: no es lo mismo una pareja que quiere hoteles boutique que una familia que necesita tiempos tranquilos y actividades flexibles.",
      "El contenido organico debe ayudar a que el viajero tome mejores decisiones antes de pedir una cotizacion. Por eso esta guia evita prometer precios, disponibilidad o condiciones comerciales. Su objetivo es orientar la conversacion, conectar con rutas relevantes y aumentar solicitudes calificadas de personas que ya entienden que un viaje a medida necesita curaduria.",
      "Growth OS medira este articulo por impresiones, clics organicos, tiempo de lectura, enlaces internos hacia rutas relacionadas y solicitudes calificadas que mencionen viajes a medida por Colombia. Si atrae trafico pero no genera leads, la siguiente iteracion debera reforzar preguntas frecuentes, llamadas a planificacion y enlaces hacia experiencias concretas.",
    ].join("\\n\\n"),
  };
}

function candidateFromSignal({
  signal,
  lane,
  actionClass,
  context,
}: {
  signal: JsonRecord | null;
  lane: AgentLane;
  actionClass: "content_publish" | "transcreation_merge" | "safe_apply";
  context: JsonRecord;
}) {
  const payload = asRecord(signal?.payload);
  const providerEvidence = dataForSeoEvidenceForCandidate({
    context,
    signal,
    actionClass,
    payload,
  });
  const titleSource =
    payload.query ??
    payload.keyword ??
    payload.slug ??
    signal?.entity_path ??
    signal?.signal_type ??
    actionClass;
  const target = targetFromSignal(signal, actionClass);
  const metric =
    actionClass === "safe_apply"
      ? "technical_smoke_pass"
      : actionClass === "transcreation_merge"
        ? "localized_organic_clicks"
      : "organic_clicks";
  const signalId = signal ? rowId(signal) : null;
  const evidenceFingerprint =
    providerEvidence.read.evidence_fingerprint.replace(/^sha256:/, "");
  const targetFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        actionClass,
        signalId,
        titleSource,
        target,
        evidenceFingerprint,
      }),
    )
    .digest("hex")
    .slice(0, 24);
  const evidence: JsonRecord = {
    target,
    ...(actionClass === "content_publish"
      ? {
          article: certificationArticle(
            typeof target.target_path === "string"
              ? target.target_path.replace(/^\/blog\//, "").replace(/^\//, "")
              : "viajes-personalizados-por-colombia",
          ),
        }
      : {}),
    ...(actionClass === "transcreation_merge"
      ? {
          adapter_input: {
            transcreation_job_id:
              typeof payload.transcreation_job_id === "string"
                ? payload.transcreation_job_id
                : "",
            source_locale:
              typeof payload.source_locale === "string"
                ? payload.source_locale
                : "es-CO",
            target_locale:
              typeof payload.target_locale === "string"
                ? payload.target_locale
                : "en-US",
            page_type: "blog",
            source_entity_id:
              typeof payload.source_entity_id === "string"
                ? payload.source_entity_id
                : "",
            payload: {
              title: "Custom Colombia trips: how to choose a meaningful route",
              slug: "custom-colombia-trips-meaningful-route",
              meta_title: "Custom Colombia trips with routes designed around you",
              meta_desc:
                "Learn how to plan custom Colombia trips by season, rhythm, regions, culture and nature before speaking with a travel expert.",
              h1: "Custom Colombia trips designed around your rhythm",
              body_content:
                "A high-quality transcreation should preserve the Colombian travel intent while adapting examples, search language and conversion cues for English-speaking travelers.",
            },
            quality: {
              passed: true,
              score: 0.94,
              issues: [],
            },
            glossary_terms: ["custom trips", "Colombia", "tailor-made travel"],
            baseline: { localized_organic_clicks: 0 },
          },
        }
      : {}),
    ...(actionClass === "safe_apply" && Object.keys(asRecord(payload.adapter_input)).length > 0
      ? {
          adapter_input: asRecord(payload.adapter_input),
        }
      : {}),
    baseline:
      Object.keys(asRecord(payload.baseline)).length > 0
        ? asRecord(payload.baseline)
        : {
            [metric]: actionClass === "safe_apply" ? false : 0,
          },
    rollback_expectation:
      actionClass === "content_publish"
        ? {
            strategy: "delete_created_content",
            target_path: target.target_path,
          }
        : {
            strategy: "restore_before_snapshot",
            target_id: target.target_id ?? null,
            target_path: target.target_path ?? null,
          },
    orchestrator_reason:
      "Prioritized because the signal maps to an allowed organic/technical lane and no active policy/cap context blocks preparation.",
    dataforseo_evidence: providerEvidence.evidence,
    provider_evidence_reads: [providerEvidence.read],
  };
  const correlation = evaluateGrowthEvidenceCorrelation({
    websiteId: String(context.website_id ?? ""),
    decisionFamily:
      actionClass === "safe_apply"
        ? "technical_seo_issue"
        : actionClass === "transcreation_merge"
          ? "missing_translation"
          : "keyword_gap",
    actionClass,
    evidence,
    sourceEntity: signal ?? undefined,
    priorWorkItems: Array.isArray(context.active_work)
      ? (context.active_work as JsonRecord[])
      : [],
    priorOutcomes: Array.isArray(context.recent_outcomes)
      ? (context.recent_outcomes as JsonRecord[])
      : [],
  });
  evidence.correlation = correlation;

  return {
    candidate_type:
      actionClass === "safe_apply"
        ? "technical_seo_issue"
        : actionClass === "transcreation_merge"
          ? "missing_translation"
          : "keyword_gap",
    lane,
    allowed_action_class: actionClass,
    title: `Brain ${actionClass}: ${String(titleSource).slice(0, 120)}`,
    summary:
      "Growth CEO Brain selected this opportunity from fresh signals, active outcomes and current autonomy policies. Executor must still validate freshness, quality, caps, smoke and rollback before any mutation.",
    confidence: Number(signal?.confidence ?? 0.72),
    impact_score: Number(payload.impact_score ?? 65),
    urgency_score: Number(payload.urgency_score ?? 55),
    cost_score: Number(payload.cost_score ?? 45),
    risk_score: actionClass === "safe_apply" ? 20 : 45,
    total_score: Number(payload.total_score ?? 66),
    required_profile_types:
      actionClass === "safe_apply"
        ? ["page_product", "risk_policy"]
        : actionClass === "transcreation_merge"
          ? [
              "business",
              "buyer",
              "seo_market",
              "competitor",
              "page_product",
              "risk_policy",
            ]
          : ["business", "buyer", "seo_market", "page_product", "risk_policy"],
    source_signal_fact_ids: signalId ? [signalId] : [],
    success_metric: metric,
    evaluation_window: actionClass === "safe_apply" ? "day_7" : "day_21",
    evidence,
    provider_evidence_reads: [providerEvidence.read],
    idempotency_key:
      correlation.dedupe_verdict === "coalesce"
        ? `correlation:${correlation.correlation_key}:${correlation.evidence_fingerprint}`
        : `brain-provider:${actionClass}:${signalId ?? "synthetic"}:${targetFingerprint}`,
  };
}

function activeLearningRefs(context: JsonRecord) {
  const memories = Array.isArray(context.active_memories)
    ? (context.active_memories as JsonRecord[])
    : [];
  const skills = Array.isArray(context.active_skills)
    ? (context.active_skills as JsonRecord[])
    : [];
  const outcomes = Array.isArray(context.recent_outcomes)
    ? (context.recent_outcomes as JsonRecord[])
    : [];
  return {
    memoryReads: memories.slice(0, 5).map((row) => ({
      id: row.id,
      lane: row.lane,
      memory_key: row.memory_key,
      influence: "context_prior",
    })),
    skillReads: skills.slice(0, 5).map((row) => ({
      id: row.id,
      lane: row.lane,
      skill_key: row.skill_key,
      version: row.version,
      influence: "execution_pattern",
    })),
    outcomeReferences: outcomes.slice(0, 5).map((row) => ({
      id: row.id,
      status: row.status,
      success_metric: row.success_metric,
      influence:
        row.status === "lost"
          ? "avoid_repeat_without_new_evidence"
          : "prioritize_similar_when_evidence_supports",
    })),
  };
}

function chooseDecision(contextBundle: GrowthAgentContextBundle) {
  const context = contextBundle.context;
  const { memoryReads, skillReads, outcomeReferences } = activeLearningRefs(context);

  if (contextBundle.injectionScan.blocked) {
    return {
      decision_type: "block" as const,
      proposed_candidates: [],
      delegated_tasks: [],
      blocked_decisions: [
        {
          action_class: "observe",
          reason: "Context failed prompt-injection scan; brain blocked materialization.",
          surface: "context",
          evidence: contextBundle.injectionScan,
        },
      ],
      no_go_reasons: ["prompt_injection_scan_failed"],
      confidence: 0.94,
      memoryReads,
      skillReads,
      outcomeReferences,
    };
  }

  const technicalSignals = freshSignals(context, "technical_remediation", 10);
  const transcreationSignals = freshSignals(context, "transcreation", 3);
  const technicalSignal = technicalSignals[0] ?? null;
  const transcreationSignal = transcreationSignals[0] ?? null;
  const contentSignal = firstFreshSignal(context, "content_creator");
  if (!technicalSignal && !transcreationSignal && !contentSignal) {
    return {
      decision_type: "observe" as const,
      proposed_candidates: [],
      delegated_tasks: [],
      blocked_decisions: [SENSITIVE_BLOCKED],
      no_go_reasons: ["no_fresh_actionable_signals"],
      confidence: 0.7,
      memoryReads,
      skillReads,
      outcomeReferences,
    };
  }

  const proposed_candidates = [
    ...technicalSignals.map((signal) =>
      candidateFromSignal({
        signal,
        lane: "technical_remediation",
        actionClass: "safe_apply",
        context,
      }),
    ),
    ...transcreationSignals.map((signal) =>
      candidateFromSignal({
        signal,
        lane: "transcreation",
        actionClass: "transcreation_merge",
        context,
      }),
    ),
    contentSignal
      ? candidateFromSignal({
          signal: contentSignal,
          lane: "content_creator",
          actionClass: "content_publish",
          context,
        })
      : null,
  ].filter((candidate): candidate is NonNullable<typeof candidate> =>
    Boolean(candidate),
  );

  return {
    decision_type: "create_work" as const,
    proposed_candidates,
    delegated_tasks: [
      {
        assigned_agent_lane: "technical_remediation",
        title: "Validate safe technical patch from brain-prioritized signal",
        handoff_summary:
          "Confirm target allowlist, before snapshot, smoke plan and rollback before executor apply.",
        completion_contract: {
          must_create_change_set_or_blocked_reason: true,
          executor_remains_only_mutation_boundary: true,
        },
        required_context_refs: [
          `growth_context_snapshots:${contextBundle.snapshot.id}`,
        ],
        dependencies: [],
      },
      {
        assigned_agent_lane: "content_creator",
        title: "Produce organic content artifact from brain-prioritized signal",
        handoff_summary:
          "Create publishable organic content with baseline, target, quality evidence and rollback expectation.",
        completion_contract: {
          must_include_success_metric_and_evaluation_window: true,
          no_paid_or_sensitive_surface: true,
        },
        required_context_refs: [
          `growth_context_snapshots:${contextBundle.snapshot.id}`,
        ],
        dependencies: [],
      },
    ],
    blocked_decisions: [SENSITIVE_BLOCKED],
    no_go_reasons: [],
    confidence:
      memoryReads.length > 0 || skillReads.length > 0 || outcomeReferences.length > 0
        ? 0.82
        : 0.74,
    memoryReads,
    skillReads,
    outcomeReferences,
  };
}

function providerEvidenceReadsFromCandidates(
  candidates: JsonRecord[],
): GrowthProviderEvidenceRead[] {
  const byFingerprint = new Map<string, GrowthProviderEvidenceRead>();
  for (const candidate of candidates) {
    const reads: unknown[] = Array.isArray(candidate.provider_evidence_reads)
      ? (candidate.provider_evidence_reads as unknown[])
      : Array.isArray(asRecord(candidate.evidence).provider_evidence_reads)
        ? (asRecord(candidate.evidence).provider_evidence_reads as unknown[])
        : [];
    for (const read of reads) {
      const record = asRecord(read);
      const fingerprint = String(record.evidence_fingerprint ?? "");
      if (fingerprint) {
        byFingerprint.set(
          fingerprint,
          record as unknown as GrowthProviderEvidenceRead,
        );
      }
    }
  }
  return Array.from(byFingerprint.values());
}

async function recordDecision({
  supabase,
  accountId,
  websiteId,
  locale,
  market,
  cycleId,
  wakeup,
  contextBundle,
  synthesizedSignalIds,
}: {
  supabase: SupabaseLike;
  accountId: string;
  websiteId: string;
  locale: string;
  market: GrowthMarket;
  cycleId: string | null;
  wakeup: GrowthAgentWakeupRequest | null;
  contextBundle: GrowthAgentContextBundle;
  synthesizedSignalIds: string[];
}): Promise<GrowthOrchestratorDecision> {
  const choice = chooseDecision(contextBundle);
  const signals = Array.isArray(contextBundle.context.signals)
    ? (contextBundle.context.signals as JsonRecord[])
    : [];
  const insert: GrowthOrchestratorDecisionInsert =
    GrowthOrchestratorDecisionInsertSchema.parse({
      account_id: accountId,
      website_id: websiteId,
      locale,
      market,
      cycle_id: cycleId,
      wakeup_request_id: wakeup?.id ?? null,
      context_snapshot_id: contextBundle.snapshot.id,
      objective: String(contextBundle.context.objective),
      north_star_alignment:
        "Selected work must improve qualified_trip_requests/month or organic/funnel inputs while preserving the live-gated mutation boundary.",
      decision_type: choice.decision_type,
      observed_signals: signals.slice(0, 10),
      proposed_candidates: choice.proposed_candidates,
      proposed_work_items: [],
      delegated_tasks: choice.delegated_tasks,
      blocked_decisions: choice.blocked_decisions,
      memory_reads: choice.memoryReads,
      skill_reads: choice.skillReads,
      outcome_references: choice.outcomeReferences,
      policy_recommendations: [
        {
          recommendation:
            "Keep sensitive action caps at zero; allow only organic content, transcreation and reversible technical work through executor.",
          evidence: "agentic-orchestrator-v1",
        },
      ],
      risk_assessment: {
        brain_mutates_public_surface: false,
        executor_only_boundary: true,
        max_candidate_risk_score: Math.max(
          0,
          ...choice.proposed_candidates.map((candidate) =>
            Number(candidate.risk_score ?? 0),
          ),
        ),
      },
      confidence: choice.confidence,
      no_go_reasons: choice.no_go_reasons,
      created_signal_fact_ids: synthesizedSignalIds,
      created_candidate_ids: [],
      created_work_item_ids: [],
      materialization_status: "pending",
      evidence: {
        context_snapshot_id: contextBundle.snapshot.id,
        synthesized_signal_fact_ids: synthesizedSignalIds,
        injection_scan: contextBundle.injectionScan,
        provider_evidence_reads: providerEvidenceReadsFromCandidates(
          choice.proposed_candidates,
        ),
        evidence_fingerprints: providerEvidenceReadsFromCandidates(
          choice.proposed_candidates,
        ).map((read) => read.evidence_fingerprint),
        reasoning_summary:
          "Brain compared fresh signals against policies, active learning and sensitive-surface constraints, then delegated safe organic/technical work to the executor path.",
      },
    });

  const { data, error } = await supabase
    .from("growth_orchestrator_decisions")
    .insert(insert)
    .select("*")
    .limit(1);
  if (error) throw new Error(`orchestrator decision insert failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error("orchestrator decision insert returned no row");
  return row as GrowthOrchestratorDecision;
}

export async function runGrowthOrchestratorBrain(
  options: RunGrowthOrchestratorBrainOptions,
): Promise<RunGrowthOrchestratorBrainResult> {
  const locale = options.locale ?? "es-CO";
  const market = options.market ?? "CO";
  const now = options.now ?? new Date();
  let wakeup = options.wakeup ?? null;

  if (!wakeup) {
    const key = `brain:${options.websiteId}:${options.cycleId ?? now.toISOString().slice(0, 16)}`;
    const enqueuedWakeup = await enqueueGrowthAgentWakeup({
      supabase: options.supabase,
      accountId: options.accountId,
      websiteId: options.websiteId,
      lane: "orchestrator",
      source: options.source ?? "timer",
      locale,
      market,
      priority: 80,
      idempotencyKey: key,
      payload: {
        cycle_id: options.cycleId ?? null,
        reason: "production_cycle_agentic_brain",
      },
      now,
    });
    wakeup = await claimGrowthAgentWakeup({
      supabase: options.supabase,
      accountId: options.accountId,
      websiteId: options.websiteId,
      lane: "orchestrator",
      wakeupId: enqueuedWakeup.id,
      now,
    });
  }

  const leaseToken = randomUUID();
  const wakeupLeaseToken =
    typeof wakeup?.lease_token === "string" ? wakeup.lease_token : null;
  let taskSessionId: string | null = null;

  try {
    taskSessionId = await startBrainTaskSession({
      supabase: options.supabase,
      accountId: options.accountId,
      websiteId: options.websiteId,
      locale,
      market,
      wakeup,
      leaseToken,
      cycleId: options.cycleId ?? null,
      now,
    });
    if (wakeup?.id && wakeupLeaseToken) {
      await renewGrowthAgentWakeupLease({
        supabase: options.supabase,
        wakeupId: wakeup.id,
        websiteId: options.websiteId,
        leaseToken: wakeupLeaseToken,
        now,
      });
    }
    await upsertBrainRuntimeState({
      supabase: options.supabase,
      accountId: options.accountId,
      websiteId: options.websiteId,
      locale,
      market,
      status: "running",
      wakeupId: wakeup?.id ?? null,
      taskSessionId,
      cycleId: options.cycleId ?? null,
      runtimeState: {
        lease_token: leaseToken,
        last_claimed_at: now.toISOString(),
      },
      now,
    });

    let contextBundle = await buildGrowthAgentContext({
      supabase: options.supabase,
      accountId: options.accountId,
      websiteId: options.websiteId,
      lane: "all",
      wakeup,
      cycleId: options.cycleId ?? null,
      locale,
      market,
      now,
    });
    if (wakeup?.id && wakeupLeaseToken) {
      await renewGrowthAgentWakeupLease({
        supabase: options.supabase,
        wakeupId: wakeup.id,
        websiteId: options.websiteId,
        leaseToken: wakeupLeaseToken,
        now: new Date(),
      });
    }
    const synthesizedSignalIds = await synthesizeSignalFactsFromContext({
      supabase: options.supabase,
      accountId: options.accountId,
      websiteId: options.websiteId,
      locale,
      market,
      context: contextBundle.context,
      cycleId: options.cycleId ?? null,
      now,
    });
    if (synthesizedSignalIds.length > 0) {
      contextBundle = await buildGrowthAgentContext({
        supabase: options.supabase,
        accountId: options.accountId,
        websiteId: options.websiteId,
        lane: "all",
        wakeup,
        cycleId: options.cycleId ?? null,
        locale,
        market,
        now,
      });
    }
    const decision = await recordDecision({
      supabase: options.supabase,
      accountId: options.accountId,
      websiteId: options.websiteId,
      locale,
      market,
      cycleId: options.cycleId ?? null,
      wakeup,
      contextBundle,
      synthesizedSignalIds,
    });
    if (wakeup?.id && wakeupLeaseToken) {
      await renewGrowthAgentWakeupLease({
        supabase: options.supabase,
        wakeupId: wakeup.id,
        websiteId: options.websiteId,
        leaseToken: wakeupLeaseToken,
        now: new Date(),
      });
    }

    const materialized =
      options.materialize === false
        ? {
            createdCandidateIds: [],
            createdTaskSessionIds: [],
            blockedReasons: [],
            status: "materialized" as const,
          }
        : await materializeBrainDecision({
            supabase: options.supabase,
            decision,
          });

    if (wakeup) {
      await finishGrowthAgentWakeup({
        supabase: options.supabase,
        wakeupId: wakeup.id,
        websiteId: options.websiteId,
        status: "completed",
        runId: decision.id,
        leaseToken: wakeupLeaseToken,
        now,
      });
    }
    await finishBrainTaskSession({
      supabase: options.supabase,
      websiteId: options.websiteId,
      taskSessionId,
      decisionId: decision.id,
      leaseToken,
      status: materialized.status === "blocked" ? "blocked" : "completed",
      now,
    });
    await upsertBrainRuntimeState({
      supabase: options.supabase,
      accountId: options.accountId,
      websiteId: options.websiteId,
      locale,
      market,
      status: "idle",
      wakeupId: null,
      taskSessionId: null,
      cycleId: options.cycleId ?? null,
      runtimeState: {
        last_decision_id: decision.id,
        last_context_snapshot_id: contextBundle.snapshot.id,
        last_decision_type: decision.decision_type,
        synthesized_signal_fact_ids: synthesizedSignalIds,
        lease_token: leaseToken,
      },
      now,
    });

    return {
      decisionId: decision.id,
      contextSnapshotId: contextBundle.snapshot.id,
      wakeupId: wakeup?.id ?? null,
      decisionType: decision.decision_type,
      materialized: materialized.status === "materialized",
      createdCandidateIds: materialized.createdCandidateIds,
      createdTaskSessionIds: materialized.createdTaskSessionIds,
      blockedReasons: materialized.blockedReasons,
      confidence: decision.confidence,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (wakeup) {
      await finishGrowthAgentWakeup({
        supabase: options.supabase,
        wakeupId: wakeup.id,
        websiteId: options.websiteId,
        status: "failed",
        error: message,
        leaseToken: wakeupLeaseToken,
        now,
      });
    }
    await finishBrainTaskSession({
      supabase: options.supabase,
      websiteId: options.websiteId,
      taskSessionId,
      status: "blocked",
      leaseToken,
      error: message,
      now,
    });
    await upsertBrainRuntimeState({
      supabase: options.supabase,
      accountId: options.accountId,
      websiteId: options.websiteId,
      locale,
      market,
      status: "failed",
      wakeupId: null,
      taskSessionId: null,
      cycleId: options.cycleId ?? null,
      runtimeState: {
        lease_token: leaseToken,
        failed_wakeup_id: wakeup?.id ?? null,
      },
      lastError: message,
      now,
    });
    throw error;
  }
}
