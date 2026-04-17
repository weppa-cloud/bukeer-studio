import { z } from "zod";

// -- Shared --------------------------------------------------------------

export const DeviceSchema = z.enum(["desktop", "mobile"]);
export type Device = z.infer<typeof DeviceSchema>;

// -- dfs_serp_advanced ---------------------------------------------------

export const SerpAdvancedInputSchema = z.object({
  keyword: z.string().min(1),
  locale: z.string().min(2).describe("e.g. es-CO"),
  country: z.string().min(2).describe("ISO country, e.g. CO"),
  language_code: z.string().min(2).describe("e.g. es"),
  depth: z.number().int().positive().max(700).optional().default(10),
  device: DeviceSchema.optional().default("desktop"),
  forceRefresh: z.boolean().optional().default(false),
});
export type SerpAdvancedInput = z.infer<typeof SerpAdvancedInputSchema>;

export const SerpAdvancedOutputSchema = z.object({
  keyword: z.string(),
  total_results: z.number().nullable().optional(),
  top_n: z.array(
    z.object({
      url: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      rank_group: z.number().nullable().optional(),
      rank_absolute: z.number().nullable().optional(),
      domain: z.string().nullable().optional(),
    }),
  ),
  _cached: z.boolean(),
  _cost_usd: z.number(),
  warning: z.string().optional(),
});

// -- dfs_keyword_volume --------------------------------------------------

export const KeywordVolumeInputSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(1000),
  location_name: z.string().min(1).describe("e.g. Colombia"),
  language_name: z.string().min(1).describe("e.g. Spanish"),
  forceRefresh: z.boolean().optional().default(false),
});
export type KeywordVolumeInput = z.infer<typeof KeywordVolumeInputSchema>;

// -- dfs_keyword_suggestions ---------------------------------------------

export const KeywordSuggestionsInputSchema = z.object({
  target: z.string().min(1).describe("domain, e.g. colombiatours.travel"),
  location_name: z.string().min(1),
  language_name: z.string().min(1),
  limit: z.number().int().positive().max(1000).optional(),
  forceRefresh: z.boolean().optional().default(false),
});
export type KeywordSuggestionsInput = z.infer<typeof KeywordSuggestionsInputSchema>;

// -- dfs_competitors_domain ---------------------------------------------

export const CompetitorsDomainInputSchema = z.object({
  target: z.string().min(1),
  location_name: z.string().min(1),
  language_name: z.string().min(1),
  limit: z.number().int().positive().max(1000).optional().default(20),
  forceRefresh: z.boolean().optional().default(false),
});
export type CompetitorsDomainInput = z.infer<typeof CompetitorsDomainInputSchema>;

// -- dfs_budget_status ---------------------------------------------------

export const BudgetStatusInputSchema = z.object({}).strict();
export type BudgetStatusInput = z.infer<typeof BudgetStatusInputSchema>;

// -- Helper: convert Zod schema to JSON schema (used for tool registration)
// The MCP SDK accepts a JSON-Schema-shaped object for `inputSchema`. We provide
// a minimal hand-written shape per tool to keep the dependency surface small.
