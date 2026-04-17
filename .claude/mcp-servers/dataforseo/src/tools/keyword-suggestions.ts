import { getOrFetch } from "../cache.js";
import {
  assertBudgetAvailable,
  recordSpend,
  warningIfNearCap,
  readBudget,
} from "../budget.js";
import { dfsPost, unwrapTaskArray, type DfsEnvelope } from "../client.js";
import { KeywordSuggestionsInputSchema } from "../schemas.js";

const OP = "dfs_keyword_suggestions";
const EST_COST = 0.05;
const TTL_DAYS = 14;

// DataForSEO `keywords_for_site` returns rich items; we passthrough the raw
// object because the shape is fluid and we don't want to strip fields that
// callers may need (e.g., keyword_info, keyword_properties, search_intent_info).
type RawSuggestion = Record<string, unknown>;

export interface KeywordSuggestionsResponse {
  suggestions: RawSuggestion[];
  _cached: boolean;
  _cost_usd: number;
  warning?: string;
}

export const keywordSuggestionsJsonSchema = {
  type: "object",
  properties: {
    target: {
      type: "string",
      description: "domain, e.g. colombiatours.travel",
    },
    location_name: { type: "string" },
    language_name: { type: "string" },
    limit: { type: "number", minimum: 1, maximum: 1000 },
    forceRefresh: { type: "boolean", default: false },
  },
  required: ["target", "location_name", "language_name"],
  additionalProperties: false,
} as const;

export async function runKeywordSuggestions(
  raw: unknown,
): Promise<KeywordSuggestionsResponse> {
  const input = KeywordSuggestionsInputSchema.parse(raw);
  const cacheKey = [
    "kw_suggestions",
    input.target,
    input.location_name,
    input.language_name,
    input.limit ?? "default",
  ].join("|");

  let actualCost = 0;

  const { data, cached } = await getOrFetch<RawSuggestion[]>(
    cacheKey,
    TTL_DAYS,
    async () => {
      await assertBudgetAvailable(EST_COST);
      const payload: Record<string, unknown> = {
        target: input.target,
        location_name: input.location_name,
        language_name: input.language_name,
      };
      if (typeof input.limit === "number") payload.limit = input.limit;
      const env = await dfsPost<DfsEnvelope<RawSuggestion>>(
        "/v3/keywords_data/google_ads/keywords_for_site/live",
        payload,
      );
      const { result, cost } = unwrapTaskArray<RawSuggestion>(env, EST_COST);
      actualCost = cost;
      await recordSpend(OP, cost);
      return result;
    },
    input.forceRefresh,
  );

  const response: KeywordSuggestionsResponse = {
    suggestions: data ?? [],
    _cached: cached,
    _cost_usd: cached ? 0 : actualCost,
  };
  const b = await readBudget();
  const warn = warningIfNearCap(b);
  if (warn) response.warning = warn;
  return response;
}
