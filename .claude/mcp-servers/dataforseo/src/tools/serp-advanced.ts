import { getOrFetch } from "../cache.js";
import {
  assertBudgetAvailable,
  recordSpend,
  warningIfNearCap,
} from "../budget.js";
import { dfsPost, unwrapTask, type DfsEnvelope } from "../client.js";
import { SerpAdvancedInputSchema } from "../schemas.js";

const OP = "dfs_serp_advanced";
const EST_COST = 0.3;
const TTL_DAYS = 30;

interface RawSerpResult {
  keyword?: string;
  total_count?: number;
  se_results_count?: number;
  items?: Array<{
    type?: string;
    rank_group?: number;
    rank_absolute?: number;
    domain?: string;
    title?: string;
    description?: string;
    url?: string;
  }>;
}

export interface SerpAdvancedResponse {
  keyword: string;
  total_results: number | null;
  top_n: Array<{
    url: string | null;
    title: string | null;
    description: string | null;
    rank_group: number | null;
    rank_absolute: number | null;
    domain: string | null;
  }>;
  _cached: boolean;
  _cost_usd: number;
  warning?: string;
}

export const serpAdvancedJsonSchema = {
  type: "object",
  properties: {
    keyword: { type: "string", minLength: 1 },
    locale: { type: "string", description: "e.g. es-CO" },
    country: { type: "string", description: "ISO country code, e.g. CO" },
    language_code: { type: "string", description: "e.g. es" },
    depth: { type: "number", default: 10, minimum: 1, maximum: 700 },
    device: { type: "string", enum: ["desktop", "mobile"], default: "desktop" },
    forceRefresh: { type: "boolean", default: false },
  },
  required: ["keyword", "locale", "country", "language_code"],
  additionalProperties: false,
} as const;

export async function runSerpAdvanced(
  raw: unknown,
): Promise<SerpAdvancedResponse> {
  const input = SerpAdvancedInputSchema.parse(raw);
  const cacheKey = [
    "serp_advanced",
    input.keyword,
    input.locale,
    input.country,
    input.language_code,
    input.depth,
    input.device,
  ].join("|");

  let actualCost = 0;

  const { data, cached } = await getOrFetch<RawSerpResult>(
    cacheKey,
    TTL_DAYS,
    async () => {
      await assertBudgetAvailable(EST_COST);
      const env = await dfsPost<DfsEnvelope<RawSerpResult>>(
        "/v3/serp/google/organic/live/advanced",
        {
          keyword: input.keyword,
          location_code: undefined,
          location_name: undefined,
          language_code: input.language_code,
          country: input.country,
          device: input.device,
          depth: input.depth,
          // DataForSEO accepts location_name or location_code; we pass country
          // via the `country` param for simplicity. For stricter geo targeting
          // callers should use a future location_code param (backlog).
        },
      );
      const { result, cost } = unwrapTask<RawSerpResult>(env, EST_COST);
      actualCost = cost;
      await recordSpend(OP, cost);
      return result ?? { keyword: input.keyword, items: [] };
    },
    input.forceRefresh,
  );

  const organic = (data.items ?? []).filter((i) => i.type === "organic");
  const top = organic.slice(0, input.depth).map((i) => ({
    url: i.url ?? null,
    title: i.title ?? null,
    description: i.description ?? null,
    rank_group: i.rank_group ?? null,
    rank_absolute: i.rank_absolute ?? null,
    domain: i.domain ?? null,
  }));

  const response: SerpAdvancedResponse = {
    keyword: data.keyword ?? input.keyword,
    total_results:
      typeof data.se_results_count === "number"
        ? data.se_results_count
        : typeof data.total_count === "number"
          ? data.total_count
          : null,
    top_n: top,
    _cached: cached,
    _cost_usd: cached ? 0 : actualCost,
  };

  // Attach warning if near cap
  const { readBudget } = await import("../budget.js");
  const b = await readBudget();
  const warn = warningIfNearCap(b);
  if (warn) response.warning = warn;

  return response;
}
