#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const API_BASE = "https://api.dataforseo.com/v3";
const DEFAULT_WEBSITE_ID = "894545b7-73ca-4dae-b76a-da5b6a3f8441";
const DEFAULT_ACCOUNT_ID = "9fc24733-b127-4184-aa22-12f03b98927a";
const DEFAULT_PROMPT_SET = "docs/ops/growth-ai-search-prompts-v1.json";
const DEFAULT_OUT_DIR = `artifacts/seo/${todayIso()}-dataforseo-ai-visibility`;
const TARGET_DOMAIN = "colombiatours.travel";
const TARGET_BRAND = "ColombiaTours";

const args = parseArgs(process.argv.slice(2));
const apply = args.apply === "true";
const dryRun = !apply;
const websiteId = args.websiteId ?? DEFAULT_WEBSITE_ID;
const accountId = args.accountId ?? DEFAULT_ACCOUNT_ID;
const promptSetPath = args.promptSet ?? DEFAULT_PROMPT_SET;
const outDir = args.outDir ?? DEFAULT_OUT_DIR;
const maxPrompts = Number.parseInt(args.maxPrompts ?? "10", 10);
const runTag = args.runTag ?? `epic310-geo-ai-visibility-v1-${todayCompact()}`;
const profile = args.profile ?? "dfs_ai_geo_visibility_v1";
const platform = args.platform ?? "google_ai_mode";
const includeDomainMentions = args.includeDomainMentions !== "false";

const login = process.env.DATAFORSEO_LOGIN?.trim();
const password = process.env.DATAFORSEO_PASSWORD?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runIssues = ["#384", "#310"];
let sb;

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const promptSet = JSON.parse(await fs.readFile(promptSetPath, "utf8"));
  const prompts = promptSet.prompts.slice(0, maxPrompts);
  const startedAt = new Date().toISOString();

  const run = {
    account_id: accountId,
    website_id: websiteId,
    provider: "dataforseo",
    profile,
    run_tag: runTag,
    target_domain: promptSet.target_domain ?? TARGET_DOMAIN,
    target_brand: promptSet.target_brand ?? TARGET_BRAND,
    locale: "multi",
    market: "multi",
    platforms: [platform, ...(includeDomainMentions ? ["llm_mentions"] : [])],
    prompt_set_version: promptSet.version,
    status: dryRun ? "pending" : "running",
    started_at: startedAt,
    raw_cache_keys: [],
    cost_usd: 0,
    metadata: {
      epic: 310,
      owner_issue: "#384",
      epic_issue: "#310",
      linked_issues: runIssues,
      prompt_set_path: promptSetPath,
      max_prompts: maxPrompts,
      mode: dryRun ? "dry-run" : "apply",
    },
  };

  if (dryRun) {
    const summary = {
      mode: "dry-run",
      run_tag: runTag,
      profile,
      linked_issues: runIssues,
      status: "dry-run",
      prompt_set_version: promptSet.version,
      prompts: prompts.length,
      platform,
      include_domain_mentions: includeDomainMentions,
      endpoints: plannedEndpoints(prompts, includeDomainMentions),
      artifact_dir: outDir,
      operational_status: "WATCH",
      watch_reason:
        "Dry-run only; no DataForSEO paid calls or database writes were executed.",
    };
    await writeSummary(summary);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  requireApplyEnv();
  sb = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: insertedRun, error: runError } = await sb
    .from("seo_ai_visibility_runs")
    .upsert(run, { onConflict: "website_id,run_tag" })
    .select("id")
    .single();
  if (runError)
    throw new Error(
      `seo_ai_visibility_runs upsert failed: ${runError.message}`,
    );

  const runId = insertedRun.id;
  const facts = [];
  const rawCacheKeys = [];
  let totalCost = 0;
  const failures = [];

  for (const prompt of prompts) {
    const endpoint = "/v3/serp/google/ai_mode/live/advanced";
    const payload = [
      {
        keyword: prompt.prompt,
        location_code: prompt.location_code,
        language_code: prompt.language_code,
        device: "desktop",
        tag: `${runTag}|${prompt.prompt_id}`,
      },
    ];
    const cacheKey = `${runTag}|google_ai_mode|${prompt.prompt_id}`;
    try {
      const response = await dataForSeoPost(endpoint, payload);
      await writeArtifact(`${prompt.prompt_id}-google-ai-mode.json`, response);
      await persistCache(endpoint, cacheKey, response, "ai_visibility");
      await recordUsage(
        endpoint,
        response.tasks?.[0]?.cost ?? response.cost ?? 0,
        cacheKey,
        {
          run_tag: runTag,
          prompt_id: prompt.prompt_id,
          profile,
        },
      );
      rawCacheKeys.push(cacheKey);
      totalCost += Number(response.tasks?.[0]?.cost ?? response.cost ?? 0);
      facts.push(
        ...factsFromGoogleAiMode(
          runId,
          prompt,
          response,
          cacheKey,
          run.target_domain,
          run.target_brand,
        ),
      );
    } catch (error) {
      failures.push({
        endpoint,
        prompt_id: prompt.prompt_id,
        message: error.message,
      });
    }
  }

  if (includeDomainMentions) {
    for (const endpointType of ["top_pages", "top_domains"]) {
      const endpoint = `/v3/ai_optimization/llm_mentions/${endpointType}/live`;
      const payload = [
        {
          language_code: "en",
          location_code: 2840,
          platform: "google",
          target: [
            {
              keyword: run.target_domain,
              search_scope: ["answer"],
              match_type: "partial_match",
            },
          ],
          limit: 20,
          tag: `${runTag}|${endpointType}`,
        },
      ];
      const cacheKey = `${runTag}|llm_mentions|${endpointType}`;
      try {
        const response = await dataForSeoPost(endpoint, payload);
        await writeArtifact(`llm-mentions-${endpointType}.json`, response);
        await persistCache(endpoint, cacheKey, response, "ai_visibility");
        await recordUsage(
          endpoint,
          response.tasks?.[0]?.cost ?? response.cost ?? 0,
          cacheKey,
          {
            run_tag: runTag,
            endpoint_type: endpointType,
            profile,
          },
        );
        rawCacheKeys.push(cacheKey);
        totalCost += Number(response.tasks?.[0]?.cost ?? response.cost ?? 0);
        facts.push(
          ...factsFromLlmMentions(
            runId,
            endpointType,
            response,
            cacheKey,
            run.target_domain,
            run.target_brand,
          ),
        );
      } catch (error) {
        failures.push({
          endpoint,
          endpoint_type: endpointType,
          message: error.message,
        });
      }
    }
  }

  let uniqueFacts = uniqueBy(facts, (fact) => fact.fact_fingerprint);
  let persistedFacts = 0;
  let factsPersistenceFailed = false;
  if (uniqueFacts.length > 0) {
    for (const chunk of chunks(uniqueFacts, 100)) {
      try {
        const { error } = await sb
          .from("seo_ai_visibility_facts")
          .upsert(chunk, { onConflict: "run_id,fact_fingerprint" });
        if (error)
          throw new Error(
            `seo_ai_visibility_facts upsert failed: ${error.message}`,
          );
        persistedFacts += chunk.length;
      } catch (error) {
        failures.push({
          stage: "persist_facts",
          message: error.message,
          attempted_facts: chunk.length,
          persisted_facts_before_failure: persistedFacts,
        });
        factsPersistenceFailed = true;
        break;
      }
    }
  }

  const finishedAt = new Date().toISOString();
  if (factsPersistenceFailed) {
    uniqueFacts = uniqueFacts.slice(0, persistedFacts);
  }
  const partialDataExists = uniqueFacts.length > 0 || rawCacheKeys.length > 0;
  const status =
    failures.length === 0
      ? "complete"
      : partialDataExists
        ? "partial"
        : "failed";
  let operationalStatus = failures.length > 0 ? "WATCH" : "PASS";
  const { error: finishError } = await sb
    .from("seo_ai_visibility_runs")
    .update({
      status,
      finished_at: finishedAt,
      raw_cache_keys: rawCacheKeys,
      cost_usd: totalCost,
      metadata: {
        ...run.metadata,
        facts_count: uniqueFacts.length,
        persisted_facts_count: persistedFacts,
        operational_status: operationalStatus,
        failures,
      },
    })
    .eq("id", runId);
  if (finishError && !partialDataExists)
    throw new Error(
      `seo_ai_visibility_runs finish failed: ${finishError.message}`,
    );
  if (finishError) {
    failures.push({
      stage: "finish_run",
      message: `seo_ai_visibility_runs finish failed: ${finishError.message}`,
    });
    operationalStatus = "WATCH";
  }

  const summary = {
    mode: "apply",
    run_id: runId,
    run_tag: runTag,
    profile,
    linked_issues: runIssues,
    status,
    operational_status: operationalStatus,
    prompts: prompts.length,
    facts: uniqueFacts.length,
    persisted_facts: persistedFacts,
    raw_cache_keys: rawCacheKeys.length,
    cost_usd: totalCost,
    failures,
  };
  await writeSummary(summary);
  console.log(JSON.stringify(summary, null, 2));

  if (failures.length > 0 && !partialDataExists) {
    process.exitCode = 1;
  }
}

function factsFromGoogleAiMode(
  runId,
  prompt,
  response,
  cacheKey,
  targetDomain,
  targetBrand,
) {
  const task = response.tasks?.[0] ?? {};
  const result = task.result?.[0] ?? {};
  const text = JSON.stringify(result);
  const urls = extractUrls(text);
  const domains = uniqueBy(
    urls.map(domainFromUrl).filter(Boolean),
    (domain) => domain,
  );
  const ownedUrls = urls.filter((url) =>
    domainFromUrl(url)?.endsWith(targetDomain),
  );
  const mentioned = includesTarget(text, targetDomain, targetBrand);
  const cited = ownedUrls.length > 0;
  const competitorDomains = domains
    .filter(
      (domain) => !domain.endsWith(targetDomain) && !isNoiseDomain(domain),
    )
    .slice(0, 20);
  const excerpt = extractExcerpt(text, targetDomain, targetBrand);
  const observedAt =
    normalizeProviderDate(result.datetime) ?? new Date().toISOString();

  const sourceUrls = urls.length > 0 ? urls.slice(0, 25) : [null];
  return sourceUrls.map((sourceUrl, index) => {
    const sourceDomain = sourceUrl ? domainFromUrl(sourceUrl) : null;
    return baseFact({
      runId,
      prompt,
      provider: "dataforseo",
      platform: "google_ai_mode",
      modelName: null,
      endpointType: "google_ai_mode",
      targetDomain,
      targetBrand,
      sourceUrl,
      sourceDomain,
      ownedUrl:
        sourceUrl && domainFromUrl(sourceUrl)?.endsWith(targetDomain)
          ? sourceUrl
          : null,
      mentioned,
      cited:
        Boolean(
          sourceUrl && domainFromUrl(sourceUrl)?.endsWith(targetDomain),
        ) ||
        (index === 0 && cited),
      mentionsCount: mentioned ? 1 : 0,
      citationsCount: sourceUrl ? 1 : 0,
      aiSearchVolume: null,
      impressions: null,
      visibilityScore: scoreVisibility(
        mentioned,
        cited,
        competitorDomains.length,
      ),
      rankPosition: index + 1,
      answerExcerpt: excerpt,
      competitorDomains,
      evidence: {
        cache_key: cacheKey,
        task_id: task.id ?? null,
        check_url: result.check_url ?? null,
        provider_path: task.path ?? null,
      },
      observedAt,
    });
  });
}

function factsFromLlmMentions(
  runId,
  endpointType,
  response,
  cacheKey,
  targetDomain,
  targetBrand,
) {
  const task = response.tasks?.[0] ?? {};
  const result = task.result?.[0] ?? {};
  const items = Array.isArray(result.items) ? result.items : [];
  const observedAt = new Date().toISOString();
  return items.slice(0, 50).map((item, index) => {
    const key = typeof item.key === "string" ? item.key : null;
    const sourceDomain =
      endpointType === "top_domains" ? key : key ? domainFromUrl(key) : null;
    const metrics = flattenMetrics(item);
    const mentioned =
      metrics.mentions > 0 ||
      includesTarget(JSON.stringify(item), targetDomain, targetBrand);
    const cited = Boolean(
      key &&
      (key.includes(targetDomain) || sourceDomain?.endsWith(targetDomain)),
    );
    return baseFact({
      runId,
      prompt: {
        prompt_id: `domain_${endpointType}_${index + 1}`,
        prompt: targetDomain,
        intent: "mixed",
        keyword_cluster: "brand ai visibility",
        locale: "en-US",
        market: "US",
        location_code: 2840,
        language_code: "en",
      },
      provider: "dataforseo",
      platform: "llm_mentions_google",
      modelName: null,
      endpointType: `llm_mentions_${endpointType}`,
      targetDomain,
      targetBrand,
      sourceUrl: endpointType === "top_pages" ? key : null,
      sourceDomain,
      ownedUrl: cited && endpointType === "top_pages" ? key : null,
      mentioned,
      cited,
      mentionsCount: metrics.mentions,
      citationsCount: cited ? 1 : 0,
      aiSearchVolume: metrics.ai_search_volume,
      impressions: metrics.impressions,
      visibilityScore: scoreVisibility(mentioned, cited, 0),
      rankPosition: index + 1,
      answerExcerpt: null,
      competitorDomains:
        sourceDomain && !sourceDomain.endsWith(targetDomain)
          ? [sourceDomain]
          : [],
      evidence: {
        cache_key: cacheKey,
        task_id: task.id ?? null,
        item,
      },
      observedAt,
    });
  });
}

function baseFact(input) {
  const fingerprintSeed = [
    input.endpointType,
    input.platform,
    input.prompt.prompt_id,
    input.sourceUrl ?? input.sourceDomain ?? "no-source",
    input.ownedUrl ?? "no-owned-url",
  ].join("|");
  return {
    run_id: input.runId,
    account_id: accountId,
    website_id: websiteId,
    provider: input.provider,
    platform: input.platform,
    model_name: input.modelName,
    endpoint_type: input.endpointType,
    prompt_id: input.prompt.prompt_id,
    prompt: input.prompt.prompt,
    prompt_intent: input.prompt.intent,
    keyword_cluster: input.prompt.keyword_cluster,
    locale: input.prompt.locale,
    market: input.prompt.market,
    location_code: input.prompt.location_code,
    language_code: input.prompt.language_code,
    target_domain: input.targetDomain,
    target_brand: input.targetBrand,
    source_url: input.sourceUrl,
    source_domain: input.sourceDomain,
    owned_url: input.ownedUrl,
    mentioned: input.mentioned,
    cited: input.cited,
    mentions_count: input.mentionsCount,
    citations_count: input.citationsCount,
    ai_search_volume: input.aiSearchVolume,
    impressions: input.impressions,
    visibility_score: input.visibilityScore,
    rank_position: input.rankPosition,
    answer_excerpt: input.answerExcerpt,
    sentiment: "unknown",
    competitor_domains: input.competitorDomains,
    brand_entities: [input.targetBrand, input.targetDomain],
    evidence: input.evidence,
    fact_fingerprint: sha256(fingerprintSeed),
    observed_at: input.observedAt,
  };
}

async function persistCache(endpoint, cacheKey, payload, cacheNamespace) {
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
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

async function recordUsage(endpoint, cost, cacheKey, metadata) {
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

  const { error } = await sb.from("seo_provider_usage").upsert(
    {
      website_id: websiteId,
      provider: "dataforseo",
      endpoint,
      billing_month: billingMonth,
      request_count: Number(existing?.request_count ?? 0) + 1,
      total_cost_usd: Number(existing?.total_cost_usd ?? 0) + Number(cost ?? 0),
      metadata: {
        ...(existing?.metadata ?? {}),
        epic: 310,
        last_cache_key: cacheKey,
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

async function dataForSeoPost(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint.replace(/^\/v3/, "")}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok || json.status_code >= 30000 || json.tasks_error > 0) {
    throw new Error(
      `DataForSEO API error ${response.status}: ${JSON.stringify(json).slice(0, 2000)}`,
    );
  }
  return json;
}

async function writeArtifact(name, payload) {
  await fs.writeFile(
    path.join(outDir, name),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
}

async function writeSummary(summary) {
  await fs.writeFile(
    path.join(outDir, "ai-visibility-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, "ai-visibility-summary.md"),
    summaryMarkdown(summary),
  );
}

function plannedEndpoints(prompts, withMentions) {
  return [
    ...prompts.map((prompt) => ({
      endpoint: "/v3/serp/google/ai_mode/live/advanced",
      prompt_id: prompt.prompt_id,
    })),
    ...(withMentions
      ? [
          {
            endpoint: "/v3/ai_optimization/llm_mentions/top_pages/live",
            target: TARGET_DOMAIN,
          },
          {
            endpoint: "/v3/ai_optimization/llm_mentions/top_domains/live",
            target: TARGET_DOMAIN,
          },
        ]
      : []),
  ];
}

function extractUrls(value) {
  const urls = new Set();
  const pattern = /https?:\/\/[^\s"'<>),\\\]]+/g;
  const matches = String(value).match(pattern) ?? [];
  for (const match of matches) {
    urls.add(match.replace(/[).,;]+$/, ""));
  }
  return [...urls];
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    if (typeof url === "string" && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url))
      return url.replace(/^www\./, "").toLowerCase();
    return null;
  }
}

function includesTarget(text, targetDomain, targetBrand) {
  const lower = String(text).toLowerCase();
  return (
    lower.includes(targetDomain.toLowerCase()) ||
    lower.includes(targetBrand.toLowerCase())
  );
}

function extractExcerpt(text, targetDomain, targetBrand) {
  const lower = String(text).toLowerCase();
  const targets = [targetDomain.toLowerCase(), targetBrand.toLowerCase()];
  const index = targets
    .map((target) => lower.indexOf(target))
    .find((value) => value >= 0);
  if (index == null || index < 0) return null;
  return String(text).slice(
    Math.max(0, index - 180),
    Math.min(String(text).length, index + 320),
  );
}

function flattenMetrics(item) {
  const groups = ["platform", "location", "language", "sources_domain"];
  let mentions = Number(item.mentions ?? 0);
  let aiSearchVolume = Number(item.ai_search_volume ?? 0);
  let impressions = Number(item.impressions ?? 0);
  for (const group of groups) {
    for (const row of Array.isArray(item[group]) ? item[group] : []) {
      mentions += Number(row.mentions ?? 0);
      aiSearchVolume += Number(row.ai_search_volume ?? 0);
      impressions += Number(row.impressions ?? 0);
    }
  }
  return {
    mentions,
    ai_search_volume: aiSearchVolume || null,
    impressions: impressions || null,
  };
}

function scoreVisibility(mentioned, cited, competitorCount) {
  if (mentioned && cited) return 85;
  if (mentioned) return 55;
  if (competitorCount > 0) return 20;
  return 0;
}

function isNoiseDomain(domain) {
  return ["google.com", "gstatic.com", "dataforseo.com", "schema.org"].some(
    (noise) => domain.endsWith(noise),
  );
}

function normalizeProviderDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function uniqueBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function todayCompact() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function summaryMarkdown(summary) {
  return `# DataForSEO AI Visibility Pilot

| Field | Value |
|---|---|
| Mode | ${summary.mode} |
| Run id | ${summary.run_id ?? "n/a"} |
| Run tag | ${summary.run_tag} |
| Profile | ${summary.profile} |
| Linked issues | ${summary.linked_issues?.join(", ") ?? "n/a"} |
| Status | ${summary.status} |
| Operational status | ${summary.operational_status} |
| Prompts | ${summary.prompts} |
| Facts | ${summary.facts ?? "n/a"} |
| Persisted facts | ${summary.persisted_facts ?? "n/a"} |
| Raw cache keys | ${summary.raw_cache_keys ?? "n/a"} |
| Cost USD | ${summary.cost_usd ?? 0} |
| Artifact dir | ${summary.artifact_dir ?? "n/a"} |

## Failures

${summary.failures?.length ? summary.failures.map(formatFailure).join("\n") : "- none"}

${summary.watch_reason ? `## Watch Reason\n\n${summary.watch_reason}\n` : ""}
`;
}

function formatFailure(failure) {
  const location = failure.endpoint ?? failure.stage ?? "unknown";
  return `- ${location}: ${failure.message}`;
}

function requireApplyEnv() {
  const missing = [];
  if (!login) missing.push("DATAFORSEO_LOGIN");
  if (!password) missing.push("DATAFORSEO_PASSWORD");
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRole) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required apply environment variables: ${missing.join(", ")}`,
    );
  }
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
