#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  DEFAULT_ACCOUNT_ID,
  DEFAULT_DOMAIN,
  DEFAULT_WEBSITE_ID,
  getProfile,
} from "./growth-provider-profile-registry.mjs";
import {
  dataForSeoAccessForEndpoint,
  isAccessRunnable,
} from "./dataforseo-feature-access.mjs";

dotenv.config({ path: ".env.local" });

const API_BASE = "https://api.dataforseo.com";
const DEFAULT_BRAND = "ColombiaTours";
const DEFAULT_LOCALE = "es-CO";
const DEFAULT_LANGUAGE_CODE = "es";
const DEFAULT_LOCATION_CODE = 2170; // Colombia
const CACHE_TTL_DAYS = 30;
const DEFAULT_OUT_DIR = `artifacts/seo/${todayIso()}-dataforseo-max-performance-profiles`;

const DEFAULT_PROFILE_IDS = [
  "dfs_labs_demand_cluster_v1",
  "dfs_labs_competitor_visibility_v1",
  "dfs_labs_gap_intersections_v1",
  "dfs_serp_priority_keywords_v1",
  "dfs_serp_local_pack_v1",
  "dfs_backlinks_authority_v1",
  "dfs_backlinks_competitor_gap_v1",
  "dfs_business_local_v1",
  "dfs_reviews_sentiment_v1",
  "dfs_content_brand_sentiment_v1",
  "dfs_domain_competitive_baseline_v1",
];

const COLOMBIA_TOURS_SEEDS = {
  keywords: [
    "viajes a colombia",
    "tours en colombia",
    "paquetes turisticos colombia",
    "tour eje cafetero",
    "tour cartagena",
    "tour medellin",
    "amazonas colombia tour",
    "ciudad perdida colombia",
  ],
  topics: [
    "ColombiaTours",
    "turismo en Colombia",
    "viajes organizados Colombia",
    "paquetes turisticos Colombia",
  ],
  competitors: [
    "impulse.travel",
    "colombia.travel",
    "tourguidescolombia.com",
    "gran-colombia-tours.com",
    "colombiatours.co",
  ],
  localQueries: [
    "agencia de viajes colombia tours",
    "tours colombia bogota",
    "agencia de viajes colombia",
  ],
  locations: [
    {
      name: "Colombia",
      location_code: DEFAULT_LOCATION_CODE,
      language_code: DEFAULT_LANGUAGE_CODE,
    },
    {
      name: "United States",
      location_code: 2840,
      language_code: "en",
    },
  ],
};

const PROFILE_ENDPOINTS = {
  dfs_labs_demand_cluster_v1: labsDemandEndpoints,
  dfs_labs_competitor_visibility_v1: labsCompetitorVisibilityEndpoints,
  dfs_labs_gap_intersections_v1: labsGapIntersectionEndpoints,
  dfs_serp_priority_keywords_v1: serpPriorityKeywordEndpoints,
  dfs_serp_local_pack_v1: serpLocalPackEndpoints,
  dfs_backlinks_authority_v1: backlinksAuthorityEndpoints,
  dfs_backlinks_competitor_gap_v1: backlinksCompetitorGapEndpoints,
  dfs_business_local_v1: businessLocalEndpoints,
  dfs_reviews_sentiment_v1: reviewsSentimentEndpoints,
  dfs_content_brand_sentiment_v1: contentBrandSentimentEndpoints,
  dfs_domain_competitive_baseline_v1: domainCompetitiveBaselineEndpoints,
};

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const domain = normalizeDomain(args.domain ?? DEFAULT_DOMAIN);
const brand = args.brand ?? DEFAULT_BRAND;
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const runTag = args.runTag ?? `dfs-max-performance-${todayCompact()}`;
const endpointLimit = parsePositiveInt(args.endpointLimit, 0);
const keywordLimit = parsePositiveInt(args.keywordLimit, 5);
const competitorLimit = parsePositiveInt(args.competitorLimit, 4);
const profileIds = parseList(args.profiles, DEFAULT_PROFILE_IDS);
const seed = buildSeed(args);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const requestedProfiles = profileIds.map((id) => {
    const registryProfile = getProfile(id);
    const buildEndpoints = PROFILE_ENDPOINTS[id];
    if (!registryProfile) {
      return {
        id,
        registryProfile: null,
        error: `Unknown registry profile: ${id}`,
      };
    }
    if (!buildEndpoints) {
      return {
        id,
        registryProfile,
        error: `No runner endpoint builder for profile: ${id}`,
      };
    }
    return {
      id,
      registryProfile,
      endpoints: maybeLimitEndpoints(
        buildEndpoints({ domain, brand, runTag, seed }),
        endpointLimit,
      ),
    };
  });

  const plan = {
    mode: apply ? "apply" : "dry-run",
    generated_at: new Date().toISOString(),
    run_tag: runTag,
    website_id: websiteId,
    account_id: accountId,
    domain,
    brand,
    seed,
    profiles: requestedProfiles.map(planProfile),
  };

  await writeJson("dataforseo-max-performance-plan.json", plan);
  await fs.writeFile(
    path.join(outDir, "dataforseo-max-performance-plan.md"),
    planMarkdown(plan),
  );

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          out_dir: outDir,
          profiles: plan.profiles.length,
          planned_calls: countPlannedCalls(plan),
          note: "No DataForSEO or Supabase calls were made. Pass --apply true to execute.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const { login, password } = requireDataForSeoCredentials();
  const sb = createSupabaseClient();
  const results = [];

  for (const profilePlan of requestedProfiles) {
    if (profilePlan.error) {
      results.push({
        profile_id: profilePlan.id,
        status: "skipped",
        error: profilePlan.error,
        calls: [],
      });
      continue;
    }
    const calls = [];
    for (const endpointPlan of profilePlan.endpoints) {
      const cacheKey = buildCacheKey(
        profilePlan.id,
        endpointPlan.slug,
        endpointPlan.body,
      );
      const startedAt = new Date().toISOString();
      const artifactName = safeFileName(
        `${profilePlan.id}-${endpointPlan.slug}.json`,
      );
      try {
        const raw = await dataForSeoPost(
          endpointPlan.endpoint,
          endpointPlan.body,
          { login, password },
        );
        const providerStatus = providerStatusFor(raw);
        const cost = responseCost(raw);
        await writeJson(artifactName, raw);
        await persistRaw(sb, {
          endpoint: endpointPlan.endpoint,
          cacheKey,
          payload: raw,
          cacheNamespace: profilePlan.registryProfile.family,
        });
        await recordUsage(sb, {
          endpoint: endpointPlan.endpoint,
          cacheKey,
          cost,
          metadata: {
            profile: profilePlan.id,
            family: profilePlan.registryProfile.family,
            run_tag: runTag,
            endpoint_slug: endpointPlan.slug,
            artifact: path.join(outDir, artifactName),
            provider_status: providerStatus,
          },
        });
        calls.push({
          slug: endpointPlan.slug,
          endpoint: endpointPlan.endpoint,
          cache_key: cacheKey,
          status: providerStatus === "ok" ? "complete" : "provider_error",
          cost_usd: cost,
          artifact: path.join(outDir, artifactName),
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          error: providerStatus === "ok" ? null : providerErrorMessage(raw),
        });
      } catch (error) {
        const failure = {
          slug: endpointPlan.slug,
          endpoint: endpointPlan.endpoint,
          cache_key: cacheKey,
          status: "failed",
          cost_usd: 0,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          error: error.message,
        };
        calls.push(failure);
        await writeJson(
          safeFileName(`${profilePlan.id}-${endpointPlan.slug}-error.json`),
          failure,
        );
      }
    }
    results.push({
      profile_id: profilePlan.id,
      family: profilePlan.registryProfile.family,
      status: profileStatus(calls),
      calls,
    });
  }

  const summary = {
    mode: "apply",
    generated_at: new Date().toISOString(),
    run_tag: runTag,
    out_dir: outDir,
    website_id: websiteId,
    account_id: accountId,
    domain,
    brand,
    profile_count: results.length,
    call_count: results.reduce(
      (sum, profileResult) => sum + profileResult.calls.length,
      0,
    ),
    complete_calls: results
      .flatMap((profileResult) => profileResult.calls)
      .filter((call) => call.status === "complete").length,
    provider_error_calls: results
      .flatMap((profileResult) => profileResult.calls)
      .filter((call) => call.status === "provider_error").length,
    failed_calls: results
      .flatMap((profileResult) => profileResult.calls)
      .filter((call) => call.status === "failed").length,
    cost_usd: roundMoney(
      results
        .flatMap((profileResult) => profileResult.calls)
        .reduce((sum, call) => sum + Number(call.cost_usd ?? 0), 0),
    ),
    results,
  };
  await writeJson("dataforseo-max-performance-summary.json", summary);
  await fs.writeFile(
    path.join(outDir, "dataforseo-max-performance-summary.md"),
    summaryMarkdown(summary),
  );
  console.log(JSON.stringify(summary, null, 2));
}

function labsDemandEndpoints({ runTag: tag, seed: seedInput }) {
  const keyword = seedInput.keywords[0];
  return [
    {
      slug: "labs-keyword-ideas-colombia",
      endpoint: "/v3/dataforseo_labs/google/keyword_ideas/live",
      body: [
        {
          keywords: seedInput.keywords.slice(0, keywordLimit),
          location_code: DEFAULT_LOCATION_CODE,
          language_code: DEFAULT_LANGUAGE_CODE,
          include_serp_info: true,
          limit: 100,
          tag: `${tag}|labs|keyword_ideas`,
        },
      ],
    },
    {
      slug: "labs-keyword-suggestions-primary",
      endpoint: "/v3/dataforseo_labs/google/keyword_suggestions/live",
      body: [
        {
          keyword,
          location_code: DEFAULT_LOCATION_CODE,
          language_code: DEFAULT_LANGUAGE_CODE,
          include_serp_info: true,
          limit: 100,
          tag: `${tag}|labs|keyword_suggestions`,
        },
      ],
    },
  ];
}

function labsCompetitorVisibilityEndpoints({
  domain: targetDomain,
  runTag: tag,
  seed: seedInput,
}) {
  return [
    {
      slug: "labs-ranked-keywords-domain",
      endpoint: "/v3/dataforseo_labs/google/ranked_keywords/live",
      body: [
        {
          target: targetDomain,
          location_code: DEFAULT_LOCATION_CODE,
          language_code: DEFAULT_LANGUAGE_CODE,
          limit: 100,
          tag: `${tag}|labs|ranked_keywords|${targetDomain}`,
        },
      ],
    },
    {
      slug: "labs-competitors-domain",
      endpoint: "/v3/dataforseo_labs/google/competitors_domain/live",
      body: [
        {
          target: targetDomain,
          location_code: DEFAULT_LOCATION_CODE,
          language_code: DEFAULT_LANGUAGE_CODE,
          limit: 50,
          tag: `${tag}|labs|competitors_domain|${targetDomain}`,
        },
      ],
    },
    ...seedInput.competitors.slice(0, competitorLimit).map((competitor) => ({
      slug: `labs-ranked-keywords-${competitor}`,
      endpoint: "/v3/dataforseo_labs/google/ranked_keywords/live",
      body: [
        {
          target: competitor,
          location_code: DEFAULT_LOCATION_CODE,
          language_code: DEFAULT_LANGUAGE_CODE,
          limit: 50,
          tag: `${tag}|labs|ranked_keywords|${competitor}`,
        },
      ],
    })),
  ];
}

function labsGapIntersectionEndpoints({
  domain: targetDomain,
  runTag: tag,
  seed: seedInput,
}) {
  return [
    {
      slug: "labs-domain-intersection",
      endpoint: "/v3/dataforseo_labs/google/domain_intersection/live",
      body: [
        {
          target1: targetDomain,
          target2: seedInput.competitors[0],
          location_code: DEFAULT_LOCATION_CODE,
          language_code: DEFAULT_LANGUAGE_CODE,
          limit: 100,
          tag: `${tag}|labs|domain_intersection`,
        },
      ],
    },
  ];
}

function serpPriorityKeywordEndpoints({ runTag: tag, seed: seedInput }) {
  return seedInput.keywords.slice(0, keywordLimit).map((keyword, index) => ({
    slug: `serp-organic-${index + 1}`,
    endpoint: "/v3/serp/google/organic/live/advanced",
    body: [
      {
        keyword,
        location_code: DEFAULT_LOCATION_CODE,
        language_code: DEFAULT_LANGUAGE_CODE,
        device: "desktop",
        depth: 20,
        tag: `${tag}|serp|organic|${index + 1}`,
      },
    ],
  }));
}

function serpLocalPackEndpoints({ runTag: tag, seed: seedInput }) {
  return seedInput.localQueries.slice(0, 3).map((keyword, index) => ({
    slug: `serp-maps-${index + 1}`,
    endpoint: "/v3/serp/google/maps/live/advanced",
    body: [
      {
        keyword,
        location_code: DEFAULT_LOCATION_CODE,
        language_code: DEFAULT_LANGUAGE_CODE,
        device: "desktop",
        depth: 20,
        tag: `${tag}|serp|maps|${index + 1}`,
      },
    ],
  }));
}

function backlinksAuthorityEndpoints({ domain: targetDomain, runTag: tag }) {
  return [
    {
      slug: "backlinks-summary-domain",
      endpoint: "/v3/backlinks/summary/live",
      body: [
        {
          target: targetDomain,
          include_subdomains: true,
          tag: `${tag}|backlinks|summary|${targetDomain}`,
        },
      ],
    },
    {
      slug: "backlinks-referring-domains",
      endpoint: "/v3/backlinks/referring_domains/live",
      body: [
        {
          target: targetDomain,
          include_subdomains: true,
          limit: 100,
          tag: `${tag}|backlinks|referring_domains|${targetDomain}`,
        },
      ],
    },
  ];
}

function backlinksCompetitorGapEndpoints({
  domain: targetDomain,
  runTag: tag,
  seed: seedInput,
}) {
  return seedInput.competitors.slice(0, competitorLimit).map((competitor) => ({
    slug: `backlinks-competitor-summary-${competitor}`,
    endpoint: "/v3/backlinks/summary/live",
    body: [
      {
        target: competitor,
        include_subdomains: true,
        tag: `${tag}|backlinks|summary|${competitor}|vs|${targetDomain}`,
      },
    ],
  }));
}

function businessLocalEndpoints({
  brand: targetBrand,
  runTag: tag,
  seed: seedInput,
}) {
  return seedInput.localQueries.slice(0, 3).map((keyword, index) => ({
    slug: `business-my-business-info-${index + 1}`,
    endpoint: "/v3/business_data/google/my_business_info/live",
    body: [
      {
        keyword,
        location_code: DEFAULT_LOCATION_CODE,
        language_code: DEFAULT_LANGUAGE_CODE,
        depth: 20,
        tag: `${tag}|business_data|my_business_info|${targetBrand}|${index + 1}`,
      },
    ],
  }));
}

function reviewsSentimentEndpoints({ runTag: tag }) {
  const cid = args.reviewCid ?? args.cid ?? null;
  if (!cid) {
    return [
      {
        slug: "reviews-google-skipped-missing-cid",
        endpoint: "/v3/business_data/google/reviews/live",
        body: [
          {
            cid: "REQUIRED_REVIEW_CID",
            language_code: DEFAULT_LANGUAGE_CODE,
            tag: `${tag}|business_data|reviews|missing_cid`,
          },
        ],
        dryRunOnlyReason:
          "Pass --reviewCid <google_cid> to execute Google reviews for ColombiaTours.",
      },
    ];
  }
  return [
    {
      slug: "reviews-google-cid",
      endpoint: "/v3/business_data/google/reviews/live",
      body: [
        {
          cid,
          language_code: DEFAULT_LANGUAGE_CODE,
          depth: 50,
          sort_by: "newest",
          tag: `${tag}|business_data|reviews|${cid}`,
        },
      ],
    },
  ];
}

function contentBrandSentimentEndpoints({
  brand: targetBrand,
  domain: targetDomain,
  runTag: tag,
  seed: seedInput,
}) {
  return [
    {
      slug: "content-analysis-brand-summary",
      endpoint: "/v3/content_analysis/summary/live",
      body: [
        {
          keyword: targetBrand,
          language_code: DEFAULT_LANGUAGE_CODE,
          tag: `${tag}|content_analysis|summary|brand`,
        },
      ],
    },
    {
      slug: "content-analysis-topic-search",
      endpoint: "/v3/content_analysis/search/live",
      body: [
        {
          keyword: seedInput.topics[1] ?? targetDomain,
          language_code: DEFAULT_LANGUAGE_CODE,
          limit: 50,
          tag: `${tag}|content_analysis|search|topic`,
        },
      ],
    },
  ];
}

function domainCompetitiveBaselineEndpoints({
  domain: targetDomain,
  runTag: tag,
  seed: seedInput,
}) {
  return [
    targetDomain,
    ...seedInput.competitors.slice(0, competitorLimit),
  ].flatMap((target) => [
    {
      slug: `domain-whois-${target}`,
      endpoint: "/v3/domain_analytics/whois/overview/live",
      body: [
        {
          target,
          tag: `${tag}|domain_analytics|whois|${target}`,
        },
      ],
    },
    {
      slug: `domain-technologies-${target}`,
      endpoint: "/v3/domain_analytics/technologies/domain_technologies/live",
      body: [
        {
          target,
          tag: `${tag}|domain_analytics|technologies|${target}`,
        },
      ],
    },
  ]);
}

function maybeLimitEndpoints(endpoints, limit) {
  const accessTagged = endpoints.map((endpointPlan) => {
    const endpointAccess = dataForSeoAccessForEndpoint(endpointPlan.endpoint);
    if (isAccessRunnable(endpointAccess)) {
      return {
        ...endpointPlan,
        access_status: endpointAccess.status,
        access_evidence: endpointAccess.evidence,
      };
    }
    return {
      ...endpointPlan,
      access_status: endpointAccess.status,
      access_evidence: endpointAccess.evidence,
      dryRunOnlyReason:
        endpointPlan.dryRunOnlyReason ??
        `DataForSEO feature access ${endpointAccess.status}: ${endpointAccess.evidence}`,
    };
  });
  const runnable = accessTagged.filter(
    (endpointPlan) => !endpointPlan.dryRunOnlyReason || !apply,
  );
  if (!limit) return runnable;
  return runnable.slice(0, limit);
}

async function dataForSeoPost(endpoint, body, credentials) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${credentials.login}:${credentials.password}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    return {
      status_code: response.status,
      status_message: `HTTP ${response.status}`,
      tasks_error: 1,
      endpoint,
      body,
      response: json,
    };
  }
  return json;
}

async function persistRaw(sb, { endpoint, cacheKey, payload, cacheNamespace }) {
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { error } = await sb.from("growth_dataforseo_cache").upsert(
    {
      account_id: accountId,
      website_id: websiteId,
      endpoint,
      cache_key: cacheKey,
      cache_tag: `growth:dataforseo:website:${websiteId}:${cacheNamespace}`,
      payload,
      fetched_at: now,
      expires_at: expiresAt,
    },
    { onConflict: "website_id,endpoint,cache_key" },
  );
  if (error)
    throw new Error(`growth_dataforseo_cache upsert failed: ${error.message}`);
}

async function recordUsage(sb, { endpoint, cacheKey, cost, metadata }) {
  const now = new Date().toISOString();
  const billingMonth = `${now.slice(0, 7)}-01`;
  const { data: existing, error: readError } = await sb
    .from("seo_provider_usage")
    .select("request_count,total_cost_usd,metadata,first_called_at")
    .eq("website_id", websiteId)
    .eq("provider", "dataforseo")
    .eq("endpoint", endpoint)
    .eq("billing_month", billingMonth)
    .maybeSingle();
  if (readError)
    throw new Error(`seo_provider_usage read failed: ${readError.message}`);

  const accountedCacheKeys = Array.isArray(
    existing?.metadata?.accounted_cache_keys,
  )
    ? existing.metadata.accounted_cache_keys
    : [];
  const alreadyAccounted = accountedCacheKeys.includes(cacheKey);

  const { error } = await sb.from("seo_provider_usage").upsert(
    {
      website_id: websiteId,
      provider: "dataforseo",
      endpoint,
      billing_month: billingMonth,
      request_count:
        Number(existing?.request_count ?? 0) + (alreadyAccounted ? 0 : 1),
      total_cost_usd: roundMoney(
        Number(existing?.total_cost_usd ?? 0) +
          (alreadyAccounted ? 0 : Number(cost ?? 0)),
      ),
      metadata: {
        ...(existing?.metadata ?? {}),
        epic: 310,
        run_tag: runTag,
        last_cache_key: cacheKey,
        last_artifact_dir: outDir,
        accounted_cache_keys: alreadyAccounted
          ? accountedCacheKeys
          : [...accountedCacheKeys, cacheKey].slice(-500),
        ...metadata,
      },
      first_called_at: existing?.first_called_at ?? now,
      last_called_at: now,
      updated_at: now,
    },
    { onConflict: "website_id,provider,endpoint,billing_month" },
  );
  if (error)
    throw new Error(`seo_provider_usage upsert failed: ${error.message}`);
}

function providerStatusFor(raw) {
  if (!raw || typeof raw !== "object") return "provider_error";
  if (Number(raw.status_code ?? 0) >= 30000) return "provider_error";
  if (Number(raw.tasks_error ?? 0) > 0) return "provider_error";
  const taskErrors = Array.isArray(raw.tasks)
    ? raw.tasks.filter((task) => Number(task?.status_code ?? 0) >= 30000)
    : [];
  return taskErrors.length > 0 ? "provider_error" : "ok";
}

function providerErrorMessage(raw) {
  if (!raw || typeof raw !== "object") return "Unknown provider error";
  const taskErrors = Array.isArray(raw.tasks)
    ? raw.tasks
        .filter((task) => Number(task?.status_code ?? 0) >= 30000)
        .map(
          (task) =>
            `${task.status_code}: ${task.status_message ?? "task error"}`,
        )
    : [];
  return (
    [
      raw.status_message
        ? `${raw.status_code ?? "status"}: ${raw.status_message}`
        : null,
      ...taskErrors,
    ]
      .filter(Boolean)
      .join("; ") || "Provider returned an error status"
  );
}

function responseCost(raw) {
  const rootCost = Number(raw?.cost ?? 0);
  const taskCost = Array.isArray(raw?.tasks)
    ? raw.tasks.reduce((sum, task) => sum + Number(task?.cost ?? 0), 0)
    : 0;
  return roundMoney(rootCost + taskCost);
}

function profileStatus(calls) {
  if (calls.length === 0) return "skipped";
  if (calls.every((call) => call.status === "complete")) return "complete";
  if (calls.some((call) => call.status === "complete")) return "partial";
  if (calls.every((call) => call.status === "provider_error"))
    return "provider_error";
  return "failed";
}

function buildSeed(parsedArgs) {
  return {
    keywords: parseList(parsedArgs.keywords, COLOMBIA_TOURS_SEEDS.keywords),
    topics: parseList(parsedArgs.topics, COLOMBIA_TOURS_SEEDS.topics),
    competitors: parseList(
      parsedArgs.competitors,
      COLOMBIA_TOURS_SEEDS.competitors,
    ).map(normalizeDomain),
    localQueries: parseList(
      parsedArgs.localQueries,
      COLOMBIA_TOURS_SEEDS.localQueries,
    ),
    locations: COLOMBIA_TOURS_SEEDS.locations,
    locale: DEFAULT_LOCALE,
    location_code: DEFAULT_LOCATION_CODE,
    language_code: DEFAULT_LANGUAGE_CODE,
  };
}

function planProfile(profilePlan) {
  if (profilePlan.error) {
    return {
      id: profilePlan.id,
      status: "skipped",
      error: profilePlan.error,
      endpoints: [],
    };
  }
  return {
    id: profilePlan.id,
    family: profilePlan.registryProfile.family,
    feature: profilePlan.registryProfile.feature,
    priority: profilePlan.registryProfile.priority,
    cadence: profilePlan.registryProfile.cadence,
    approval: profilePlan.registryProfile.approval,
    raw_cache: profilePlan.registryProfile.rawCache,
    usage_table: profilePlan.registryProfile.usageTable,
    endpoints: profilePlan.endpoints.map((endpointPlan) => ({
      slug: endpointPlan.slug,
      endpoint: endpointPlan.endpoint,
      access_status: endpointPlan.access_status ?? null,
      access_evidence: endpointPlan.access_evidence ?? null,
      body: endpointPlan.body,
      dry_run_only_reason: endpointPlan.dryRunOnlyReason ?? null,
    })),
  };
}

function countPlannedCalls(plan) {
  return plan.profiles.reduce(
    (sum, profileItem) => sum + profileItem.endpoints.length,
    0,
  );
}

function buildCacheKey(profileId, slug, body) {
  return `${runTag}|${profileId}|${slug}|${sha256(JSON.stringify(body)).slice(0, 16)}`;
}

function createSupabaseClient() {
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

function requireDataForSeoCredentials() {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password)
    throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");
  return { login, password };
}

async function writeJson(name, payload) {
  await fs.writeFile(
    path.join(outDir, name),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
}

function planMarkdown(plan) {
  const lines = [
    "# DataForSEO Max Performance Profiles Plan",
    "",
    `- Mode: ${plan.mode}`,
    `- Run tag: ${plan.run_tag}`,
    `- Website: ${plan.website_id}`,
    `- Domain: ${plan.domain}`,
    `- Brand: ${plan.brand}`,
    `- Planned calls: ${countPlannedCalls(plan)}`,
    "",
    "| Profile | Family | Calls | Approval |",
    "|---|---:|---:|---|",
  ];
  for (const profileItem of plan.profiles) {
    lines.push(
      `| ${profileItem.id} | ${profileItem.family ?? "n/a"} | ${profileItem.endpoints.length} | ${profileItem.approval ?? "n/a"} |`,
    );
  }
  lines.push("", "## Endpoints", "");
  for (const profileItem of plan.profiles) {
    lines.push(`### ${profileItem.id}`, "");
    if (profileItem.error) {
      lines.push(`- Skipped: ${profileItem.error}`, "");
      continue;
    }
    for (const endpointPlan of profileItem.endpoints) {
      lines.push(
        `- ${endpointPlan.slug}: \`${endpointPlan.endpoint}\` — access: ${endpointPlan.access_status ?? "n/a"}${endpointPlan.dry_run_only_reason ? ` (${endpointPlan.dry_run_only_reason})` : ""}`,
      );
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function summaryMarkdown(summary) {
  const lines = [
    "# DataForSEO Max Performance Profiles Summary",
    "",
    `- Run tag: ${summary.run_tag}`,
    `- Domain: ${summary.domain}`,
    `- Profiles: ${summary.profile_count}`,
    `- Calls: ${summary.call_count}`,
    `- Complete: ${summary.complete_calls}`,
    `- Provider errors: ${summary.provider_error_calls}`,
    `- Failed: ${summary.failed_calls}`,
    `- Cost USD: ${summary.cost_usd}`,
    "",
    "| Profile | Status | Calls |",
    "|---|---:|---:|",
  ];
  for (const result of summary.results) {
    lines.push(
      `| ${result.profile_id} | ${result.status} | ${result.calls.length} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    parsed[key] = next && !next.startsWith("--") ? next : "true";
    if (next && !next.startsWith("--")) i += 1;
  }
  return parsed;
}

function parseList(value, fallback) {
  if (!value) return [...fallback];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeDomain(value) {
  return String(value ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function safeFileName(value) {
  return String(value)
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function roundMoney(value) {
  return Math.round(Number(value ?? 0) * 1_000_000) / 1_000_000;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function todayCompact() {
  return todayIso().replace(/-/g, "");
}
