import { getOrFetch } from "../cache.js";
import {
  assertBudgetAvailable,
  recordSpend,
  warningIfNearCap,
  readBudget,
} from "../budget.js";
import { dfsPost, unwrapTaskArray, type DfsEnvelope } from "../client.js";
import { CompetitorsDomainInputSchema } from "../schemas.js";

const OP = "dfs_competitors_domain";
const EST_COST = 0.5;
const TTL_DAYS = 30;

// Domain-analytics responses carry many nested metrics; passthrough to avoid
// discarding fields the caller may need (metrics, intersections, avg_position).
type RawCompetitor = Record<string, unknown>;

export interface CompetitorsDomainResponse {
  competitors: RawCompetitor[];
  _cached: boolean;
  _cost_usd: number;
  warning?: string;
}

export const competitorsDomainJsonSchema = {
  type: "object",
  properties: {
    target: { type: "string" },
    location_name: { type: "string" },
    language_name: { type: "string" },
    limit: { type: "number", minimum: 1, maximum: 1000, default: 20 },
    forceRefresh: { type: "boolean", default: false },
  },
  required: ["target", "location_name", "language_name"],
  additionalProperties: false,
} as const;

export async function runCompetitorsDomain(
  raw: unknown,
): Promise<CompetitorsDomainResponse> {
  const input = CompetitorsDomainInputSchema.parse(raw);
  const cacheKey = [
    "competitors_domain",
    input.target,
    input.location_name,
    input.language_name,
    input.limit,
  ].join("|");

  let actualCost = 0;

  const { data, cached } = await getOrFetch<RawCompetitor[]>(
    cacheKey,
    TTL_DAYS,
    async () => {
      await assertBudgetAvailable(EST_COST);
      const env = await dfsPost<DfsEnvelope<RawCompetitor>>(
        "/v3/domain_analytics/google/organic/competitors_domain/live",
        {
          target: input.target,
          location_name: input.location_name,
          language_name: input.language_name,
          limit: input.limit,
        },
      );
      const { result, cost } = unwrapTaskArray<RawCompetitor>(env, EST_COST);
      actualCost = cost;
      await recordSpend(OP, cost);
      return result;
    },
    input.forceRefresh,
  );

  const response: CompetitorsDomainResponse = {
    competitors: data ?? [],
    _cached: cached,
    _cost_usd: cached ? 0 : actualCost,
  };
  const b = await readBudget();
  const warn = warningIfNearCap(b);
  if (warn) response.warning = warn;
  return response;
}
