#!/usr/bin/env node

export const DATAFORSEO_ACCESS_STATUSES = {
  enabled_confirmed:
    "Provider feature has successful recent evidence and can run under its profile approval rules.",
  partial_confirmed:
    "Provider family has at least one working endpoint, but some sub-features must be skipped or smoked separately.",
  blocked_no_subscription:
    "Provider returned subscription/access denial; do not call until account access is enabled.",
  watch_needs_smoke:
    "Feature is visible or specified, but needs a controlled smoke before scheduled use.",
  excluded_by_scope:
    "Feature exists, but is excluded from current Growth OS scope.",
};

export const DATAFORSEO_FEATURE_ACCESS = {
  onpage: access({
    status: "enabled_confirmed",
    evidence:
      "DataForSEO OnPage v1/v2/post-P1 crawls completed and normalized for EPIC #310.",
  }),
  serp: access({
    status: "enabled_confirmed",
    evidence:
      "2026-04-30 max-performance smoke completed SERP organic and maps calls.",
  }),
  keyword_data: access({
    status: "enabled_confirmed",
    evidence:
      "Keyword/Labs demand pulls have successful cache and session evidence.",
  }),
  labs: access({
    status: "enabled_confirmed",
    evidence:
      "2026-04-30 max-performance smoke completed Labs demand, competitors and intersections.",
  }),
  business_data: access({
    status: "partial_confirmed",
    evidence:
      "Business Data endpoint was reachable; latest smoke returned no search results, not subscription denial.",
    fallback:
      "Use local query variants and manual Google Business Profile identifiers before treating it as blocked.",
  }),
  reviews: access({
    status: "watch_needs_smoke",
    evidence:
      "Profile requires a verified Google CID/place identifier before paid reviews pulls.",
  }),
  backlinks: access({
    status: "blocked_no_subscription",
    evidence:
      "2026-04-30 provider error 40204: Access denied for /v3/backlinks/*.",
    subscriptionUrl: "https://app.dataforseo.com/backlinks-subscription",
    fallback:
      "Use Labs competitor visibility, Domain Analytics and manual authority baselines until Backlinks API is enabled.",
  }),
  ai_optimization_google_ai_mode: access({
    status: "enabled_confirmed",
    evidence:
      "2026-04-29 AI visibility pilot produced Google AI Mode raw cache and 213 facts.",
  }),
  ai_optimization_llm_mentions: access({
    status: "blocked_no_subscription",
    evidence:
      "2026-04-29 provider error 40204: Access denied for /v3/ai_optimization/llm_mentions/*.",
    fallback:
      "Run Google AI Mode samples and mark LLM Mentions as WATCH until API access is enabled.",
  }),
  content_analysis: access({
    status: "enabled_confirmed",
    evidence:
      "2026-04-30 max-performance smoke completed Content Analysis summary/search.",
  }),
  domain_analytics: access({
    status: "enabled_confirmed",
    evidence:
      "2026-04-30 max-performance smoke completed Domain Analytics whois/technologies.",
  }),
  merchant: access({
    status: "excluded_by_scope",
    evidence:
      "Travel agency Growth OS has no Merchant feed objective in EPIC #310.",
  }),
  app_data: access({
    status: "excluded_by_scope",
    evidence:
      "Travel agency Growth OS has no app-store visibility objective in EPIC #310.",
  }),
};

const PROFILE_ACCESS_KEYS = {
  dfs_onpage_full_comparable_v3: ["onpage"],
  dfs_onpage_rendered_sample_v1: ["onpage"],
  dfs_serp_priority_keywords_v1: ["serp"],
  dfs_serp_local_pack_v1: ["serp"],
  dfs_keyword_volume_trends_v1: ["keyword_data"],
  dfs_labs_demand_cluster_v1: ["labs"],
  dfs_labs_competitor_visibility_v1: ["labs"],
  dfs_labs_gap_intersections_v1: ["labs"],
  dfs_backlinks_authority_v1: ["backlinks"],
  dfs_backlinks_competitor_gap_v1: ["backlinks"],
  dfs_business_local_v1: ["business_data"],
  dfs_reviews_sentiment_v1: ["reviews"],
  dfs_ai_geo_visibility_v1: [
    "ai_optimization_google_ai_mode",
    "ai_optimization_llm_mentions",
  ],
  dfs_content_brand_sentiment_v1: ["content_analysis"],
  dfs_domain_competitive_baseline_v1: ["domain_analytics"],
  dfs_merchant_watch_v1: ["merchant"],
  dfs_app_data_watch_v1: ["app_data"],
};

export function dataForSeoAccessForProfile(profileOrId) {
  const profileId =
    typeof profileOrId === "string" ? profileOrId : profileOrId?.id;
  const keys = PROFILE_ACCESS_KEYS[profileId] ?? [
    typeof profileOrId === "string" ? profileOrId : profileOrId?.family,
  ];
  return rollupAccess(keys.filter(Boolean));
}

export function dataForSeoAccessForEndpoint(endpoint) {
  const value = String(endpoint ?? "");
  if (value.includes("/backlinks/")) return DATAFORSEO_FEATURE_ACCESS.backlinks;
  if (value.includes("/ai_optimization/llm_mentions/"))
    return DATAFORSEO_FEATURE_ACCESS.ai_optimization_llm_mentions;
  if (value.includes("/serp/google/ai_mode/"))
    return DATAFORSEO_FEATURE_ACCESS.ai_optimization_google_ai_mode;
  if (value.includes("/business_data/google/reviews/"))
    return DATAFORSEO_FEATURE_ACCESS.reviews;
  if (value.includes("/business_data/"))
    return DATAFORSEO_FEATURE_ACCESS.business_data;
  if (value.includes("/content_analysis/"))
    return DATAFORSEO_FEATURE_ACCESS.content_analysis;
  if (value.includes("/domain_analytics/"))
    return DATAFORSEO_FEATURE_ACCESS.domain_analytics;
  if (value.includes("/dataforseo_labs/"))
    return DATAFORSEO_FEATURE_ACCESS.labs;
  if (value.includes("/keywords_data/"))
    return DATAFORSEO_FEATURE_ACCESS.keyword_data;
  if (value.includes("/serp/")) return DATAFORSEO_FEATURE_ACCESS.serp;
  if (value.includes("/on_page/")) return DATAFORSEO_FEATURE_ACCESS.onpage;
  return access({
    status: "watch_needs_smoke",
    evidence: `No explicit access state registered for endpoint ${value}.`,
  });
}

export function isAccessRunnable(accessState) {
  return !["blocked_no_subscription", "excluded_by_scope"].includes(
    accessState?.status,
  );
}

export function accessDecision(accessState) {
  if (!accessState) {
    return {
      status: "WATCH",
      reason: "No provider feature access state registered.",
    };
  }
  if (accessState.status === "blocked_no_subscription") {
    return {
      status: "BLOCKED",
      reason: `DataForSEO feature access blocked: ${accessState.evidence}`,
    };
  }
  if (accessState.status === "excluded_by_scope") {
    return {
      status: "SKIP",
      reason: `DataForSEO feature excluded by scope: ${accessState.evidence}`,
    };
  }
  if (accessState.status === "watch_needs_smoke") {
    return {
      status: "WATCH",
      reason: `DataForSEO feature needs smoke: ${accessState.evidence}`,
    };
  }
  if (accessState.status === "partial_confirmed") {
    return {
      status: "WATCH",
      reason: `DataForSEO feature partially confirmed: ${accessState.evidence}`,
    };
  }
  return {
    status: "PASS",
    reason: `DataForSEO feature access confirmed: ${accessState.evidence}`,
  };
}

export function summarizeDataForSeoAccess() {
  return Object.entries(DATAFORSEO_FEATURE_ACCESS).map(([feature, state]) => ({
    feature,
    ...state,
    runnable: isAccessRunnable(state),
  }));
}

function rollupAccess(keys) {
  const states = keys
    .map((key) => DATAFORSEO_FEATURE_ACCESS[key])
    .filter(Boolean);
  if (states.length === 0) {
    return access({
      status: "watch_needs_smoke",
      evidence: `No access mapping for ${keys.join(", ") || "unknown feature"}.`,
    });
  }
  const blocked = states.find(
    (state) => state.status === "blocked_no_subscription",
  );
  const excluded = states.find((state) => state.status === "excluded_by_scope");
  const watch = states.find((state) => state.status === "watch_needs_smoke");
  const partial = states.find((state) => state.status === "partial_confirmed");
  if (blocked && states.length === 1) return blocked;
  if (blocked) {
    return access({
      status: "partial_confirmed",
      evidence: states.map((state) => state.evidence).join(" | "),
      fallback: blocked.fallback,
    });
  }
  if (excluded) return excluded;
  if (watch) return watch;
  if (partial) return partial;
  return access({
    status: "enabled_confirmed",
    evidence: states.map((state) => state.evidence).join(" | "),
  });
}

function access(input) {
  return {
    status: "watch_needs_smoke",
    evidence: "",
    fallback: "",
    subscriptionUrl: null,
    ...input,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        statuses: DATAFORSEO_ACCESS_STATUSES,
        features: summarizeDataForSeoAccess(),
      },
      null,
      2,
    ),
  );
}
