import { getOrFetch } from "../cache.js";
import {
  assertBudgetAvailable,
  recordSpend,
  warningIfNearCap,
  readBudget,
} from "../budget.js";
import { dfsPost, unwrapTaskArray, type DfsEnvelope } from "../client.js";
import { KeywordVolumeInputSchema } from "../schemas.js";

const OP = "dfs_keyword_volume";
const EST_COST = 0.05;
const TTL_DAYS = 30;

interface RawVolumeItem {
  keyword?: string;
  search_volume?: number | null;
  cpc?: number | null;
  competition?: number | null;
  monthly_searches?: Array<{
    year?: number;
    month?: number;
    search_volume?: number;
  }>;
}

export interface KeywordVolumeResponse {
  items: Array<{
    keyword: string;
    search_volume: number | null;
    cpc: number | null;
    competition: number | null;
    monthly_searches: Array<{
      year: number | null;
      month: number | null;
      search_volume: number | null;
    }>;
  }>;
  _cached: boolean;
  _cost_usd: number;
  warning?: string;
}

export const keywordVolumeJsonSchema = {
  type: "object",
  properties: {
    keywords: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
      maxItems: 1000,
    },
    location_name: { type: "string", description: "e.g. Colombia" },
    language_name: { type: "string", description: "e.g. Spanish" },
    forceRefresh: { type: "boolean", default: false },
  },
  required: ["keywords", "location_name", "language_name"],
  additionalProperties: false,
} as const;

export async function runKeywordVolume(
  raw: unknown,
): Promise<KeywordVolumeResponse> {
  const input = KeywordVolumeInputSchema.parse(raw);
  const sortedKeywords = [...input.keywords].sort();
  const cacheKey = [
    "kw_volume",
    input.location_name,
    input.language_name,
    sortedKeywords.join(","),
  ].join("|");

  let actualCost = 0;

  const { data, cached } = await getOrFetch<RawVolumeItem[]>(
    cacheKey,
    TTL_DAYS,
    async () => {
      await assertBudgetAvailable(EST_COST);
      const env = await dfsPost<DfsEnvelope<RawVolumeItem>>(
        "/v3/keywords_data/google_ads/search_volume/live",
        {
          keywords: input.keywords,
          location_name: input.location_name,
          language_name: input.language_name,
        },
      );
      const { result, cost } = unwrapTaskArray<RawVolumeItem>(env, EST_COST);
      actualCost = cost;
      await recordSpend(OP, cost);
      return result;
    },
    input.forceRefresh,
  );

  const items = (data ?? []).map((i) => ({
    keyword: i.keyword ?? "",
    search_volume: i.search_volume ?? null,
    cpc: i.cpc ?? null,
    competition: i.competition ?? null,
    monthly_searches: (i.monthly_searches ?? []).map((m) => ({
      year: m.year ?? null,
      month: m.month ?? null,
      search_volume: m.search_volume ?? null,
    })),
  }));

  const response: KeywordVolumeResponse = {
    items,
    _cached: cached,
    _cost_usd: cached ? 0 : actualCost,
  };
  const b = await readBudget();
  const warn = warningIfNearCap(b);
  if (warn) response.warning = warn;
  return response;
}
