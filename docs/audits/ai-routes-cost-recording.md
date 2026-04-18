# AI Routes Cost Recording Audit — Issue #195 (Phase D1)

**Date:** 2026-04-17
**Scope:** Every Next.js route handler in `bukeer-studio` that invokes an LLM via the Vercel AI SDK (`streamText` / `generateText` / `generateObject` / `streamObject`).
**Purpose:** Map current usage of `recordCost()` vs the LLM call graph, identify gaps, and prescribe a wire pattern for each handler.

## TL;DR

- **13 routes** invoke an LLM across `app/api/ai/**` and `app/api/seo/**`.
- **11 routes** already call `recordCost(auth.accountId, flatUsd)` with a **hardcoded flat cost** (not driven by token usage).
- **2 routes** make LLM calls without recording cost at all: `app/api/ai/public-chat/route.ts` and `app/api/seo/keywords/research/route.ts`.
- **1 route** exists for AI generation but is keyed differently and skips `recordCost`: `app/api/ai/generate-package-content/route.ts` (service-to-service, `package-ai:*` rate key).
- **1 streaming route** is wired via `onFinish` (studio-chat) — the blueprint pattern — but still records a **flat cost**, ignoring `usage`.
- **No `lib/ai/model-pricing.ts`** exists. All cost values are magic numbers hardcoded per route (`0.002`, `0.003`, `0.008`, `0.01`, `0.015`).
- `recordCost(key, costUsd)` current signature does not accept `model` / `usage`; upgrading to token-driven costs requires (a) a pricing table and (b) a richer signature.

## Inventory Table

| # | Route | Method | AI SDK call | Records cost | Identifier (rate-limit key) | Current cost | Suggested wire |
|---|---|---|---|---|---|---|---|
| 1 | `app/api/ai/studio-chat/route.ts` | POST | `streamText` (w/ tools) | YES — `onFinish` callback, flat `$0.01` | `auth.accountId` (`copilot` tier) | `$0.01` flat | **Keep `onFinish` — upgrade to usage-based**. Replace flat value with `calculateCost(DEFAULT_MODEL, usage)`. Wrap in `waitUntil()` when CF context is exposed. Blueprint for all streaming routes. |
| 2 | `app/api/ai/public-chat/route.ts` | POST | `streamText` (Anthropic `claude-haiku-4-5-20251001`) | **NO** | `ip:${ip}` (`public` tier) | $0 recorded | Add `onFinish: async ({ usage }) => await recordCost({ key: \`ip:${ip}\`, model: 'claude-haiku-4-5', usage })`. IP-keyed billing still honours the `public` daily cap. |
| 3 | `app/api/ai/editor/generate-section/route.ts` | POST | `generateObject` | YES — post-await, flat `$0.003` | `auth.accountId` (`editor`) | `$0.003` flat | Already `await` — swap to `await recordCost({ key, model: DEFAULT_MODEL, usage: result.usage })`. |
| 4 | `app/api/ai/editor/suggest-sections/route.ts` | POST | `generateObject` | YES — flat `$0.003` | `auth.accountId` (`editor`) | `$0.003` flat | Same pattern as #3. `result.usage` already in response body. |
| 5 | `app/api/ai/editor/improve-text/route.ts` | POST | `generateText` | YES — flat `$0.002` | `auth.accountId` (`editor`) | `$0.002` flat | Same pattern as #3. |
| 6 | `app/api/ai/editor/generate-blog/route.ts` | POST | `generateObject` (V1 + V2) | YES — flat `$0.015` (V2) / `$0.01` (V1) | `auth.accountId` (`editor`) | `$0.01`–`$0.015` | Same pattern as #3. Variance between V1/V2 disappears once token-based: output tokens drive the cost naturally. |
| 7 | `app/api/ai/editor/generate-cluster-plan/route.ts` | POST | `generateObject` | YES — flat `$0.015` | `auth.accountId` (`editor`) | `$0.015` flat | Same pattern as #3. |
| 8 | `app/api/ai/editor/copilot/route.ts` | POST | `generateObject` | YES — flat `$0.008` | `auth.accountId` (`copilot`) | `$0.008` flat | Same pattern as #3. |
| 9 | `app/api/ai/editor/generate-content-pipeline/route.ts` | POST | `generateObject` (x N) + internal `fetch` to #6/#5 | YES — single `recordCost(auth.accountId, totalCost)` at the end (`totalCost` is a hand-summed counter) | `auth.accountId` (`editor`) | sum of `$0.015` + `$0.01` + `$0.005` per stage | Keep the accumulator pattern but increment with `calculateCost(model, result.usage)` per stage. Internal `fetch` to `generate-blog` / `improve-text` already records cost of its own — avoid **double counting**: either drop the inner routes' cost or set a header (`x-internal-call`) to skip their `recordCost`. Recommend: change pipeline to call the LLM directly (skip internal HTTP) to get a single charge + lower latency. |
| 10 | `app/api/ai/editor/score-content/route.ts` | POST | **NONE** (algorithmic scorer) | N/A | — | $0 | No change. Not an LLM route. |
| 11 | `app/api/ai/seo/generate/route.ts` | POST | `generateText` | YES — flat `$0.003` | `auth.accountId` (`editor`) | `$0.003` flat | Same pattern as #3. `result.usage` available. |
| 12 | `app/api/ai/seo/generate-bulk/route.ts` | POST (SSE) | `generateText` (per item, inside loop) | YES — per-item flat `$0.003` | `auth.accountId` (`editor`) | `$0.003` × items | Same pattern as #3 but inside the loop. Emit per-item cost over the SSE channel (`type: 'item_complete'` already streams — append `cost` field). |
| 13 | `app/api/ai/generate-package-content/route.ts` | POST (edge runtime, service-auth via `x-studio-secret`) | `generateObject` (Anthropic `claude-haiku-4-5`) | **NO** | Rate key = `package-ai:${packageId}` (no account context) | $0 recorded | Add `await recordCost({ key: \`package-ai:${packageId}\`, model: 'claude-haiku-4-5', usage: result.usage })` after the `generateObject` call. Consider also writing `account_id` from the `package_kits` row to enable per-tenant cost reporting. |
| 14 | `app/api/seo/content-intelligence/transcreate/route.ts` | POST | **NONE** (the non-stream endpoint only coordinates DB; AI is generated client-side and POSTed back as `aiOutput`) | N/A | `auth.accountId` via `checkTranscreateRateLimit` (separate limiter) | — | No LLM call on server — no `recordCost` needed here. However, to attribute the AI cost that the **client** consumed, consider moving generation server-side OR adding a lightweight `recordCost` endpoint the client can post to with reported token usage (risk: spoofable). |
| 15 | `app/api/seo/content-intelligence/transcreate/stream/route.ts` | POST | `streamObject` | **NO** | `checkTranscreateRateLimit(websiteId, targetLocale)` | $0 recorded | Add `onFinish: async ({ usage }) => await recordCost({ key: \`website:${websiteId}\`, model: DEFAULT_MODEL, usage })`. Use `website_id` as key (no `auth.accountId` exposed by `requireWebsiteAccess` — see note below). Run in `waitUntil()` on CF. |
| 16 | `app/api/seo/keywords/research/route.ts` | POST | `generateText` | **NO** | `requireWebsiteAccess(websiteId)` only — no `checkRateLimit` call either | $0 recorded | Add `checkRateLimit(\`${access.accountId}:seo:keyword-research\`, 'editor')` + post-await `await recordCost({ key: \`${access.accountId}:seo:keyword-research\`, model: DEFAULT_MODEL, usage: aiResult.usage })`. Double gap: no rate limit + no cost. |

### Routes searched but found non-LLM (control group — no action needed)

`app/api/seo/content-intelligence/nlp-score/route.ts` (uses `buildNlpScore` math + SERP snapshot; no LLM).
`app/api/seo/analytics/serp-snapshot/route.ts` (calls DataForSEO/GSC, no LLM).
`app/api/blog/clusters/route.ts`, `app/api/blog/clusters/[id]/posts/route.ts` (pure CRUD).
All other `app/api/seo/**` routes (analytics, integrations, sync, etc.) — no LLM calls.

## Cost Attribution — Identifier Summary

| Identifier form | Routes | Notes |
|---|---|---|
| `auth.accountId` (string UUID) | #1, #3–#9, #11, #12 | Primary pattern. Matches `getEditorAuth` → `{ accountId, userId, token }`. Aligns with `ai_rate_limits.key` convention. |
| `ip:${ip}` | #2 | Public chat — unauthenticated visitor. |
| `package-ai:${packageId}` | #13 | Service-to-service call from the package generation job. Keyed by package, not account. Consider enriching with `account_id`. |
| `${access.accountId}:seo:<feature>` (namespaced) | existing rate-limited-only SEO routes; recommended for #15, #16 | Allows separating SEO AI spend from Editor AI spend in dashboards. `requireWebsiteAccess` already returns `{ accountId, userId }`. |
| `website:${websiteId}` or similar | candidate for #15 | If SEO transcreate should bill per website rather than per account. |

## Current `recordCost` Signature (and Proposed Upgrade)

**Current** (`lib/ai/rate-limit.ts:153`):
```ts
export async function recordCost(key: string, costUsd: number): Promise<void>
```

Pros: trivial; every call site writes a pre-computed USD amount.
Cons: flat per-route magic numbers; no model attribution; no audit trail for token usage; cannot detect prompt bloat.

**Proposed** (non-breaking, overload or new signature):
```ts
// Option A — overload
export async function recordCost(
  input:
    | { key: string; costUsd: number }
    | { key: string; model: string; usage: { inputTokens: number; outputTokens: number; totalTokens?: number } }
): Promise<void>

// Option B — helper + existing primitive
import { calculateCost } from '@/lib/ai/model-pricing';
await recordCost(key, calculateCost(model, usage));
```

**Recommendation: Option B** — keeps the DB-facing primitive simple, adds a pure pricing function that is trivially unit-tested.

## Missing: `lib/ai/model-pricing.ts`

No such file exists today. Propose:

```ts
// lib/ai/model-pricing.ts
// USD per 1K tokens, synced from OpenRouter + Anthropic public pricing (updated 2026-04).
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4-5': { input: 0.003, output: 0.015 },
  'anthropic/claude-haiku-4-5': { input: 0.0008, output: 0.004 },
  'claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004 },   // #2 public-chat
  'mistralai/mistral-large': { input: 0.002, output: 0.006 },       // DEFAULT_MODEL fallback
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

export function calculateCost(model: string, usage: TokenUsage | undefined): number {
  if (!usage) return 0;
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Unknown model — default to Mistral Large pricing to avoid under-billing.
    const fallback = MODEL_PRICING['mistralai/mistral-large'];
    return (usage.inputTokens * fallback.input + usage.outputTokens * fallback.output) / 1000;
  }
  return (usage.inputTokens * pricing.input + usage.outputTokens * pricing.output) / 1000;
}
```

Unit test target: each model maps to expected price; unknown-model fallback; `undefined` usage returns 0.

## Wire Patterns by Call Type

### A. Non-streaming (`generateText` / `generateObject`)

Applies to routes **#3, #4, #5, #6, #7, #8, #9 (inner stages), #11, #12, #13, #16**.

```ts
import { calculateCost } from '@/lib/ai/model-pricing';
import { DEFAULT_MODEL } from '@/lib/ai/llm-provider';

const result = await generateObject({ model: getEditorModel(), schema, prompt });
await recordCost(auth.accountId, calculateCost(DEFAULT_MODEL, result.usage));
```

### B. Streaming (`streamText` / `streamObject`)

Applies to routes **#1 (already wired), #2, #15**.

```ts
const result = streamText({
  model: getEditorModel(),
  // ...
  onFinish: async ({ usage }) => {
    await recordCost(key, calculateCost(DEFAULT_MODEL, usage));
  },
});
return result.toUIMessageStreamResponse();
```

**Cloudflare Worker caveat:** Next.js on OpenNext exposes `ctx.waitUntil` via the route context. Wrap the `onFinish` body in `waitUntil(promise)` when available so the Worker doesn't cancel the cost-record once the stream flushes. Currently `studio-chat` (#1) does **not** use `waitUntil` — stream closes first, `recordCost` is fire-and-forget and can be dropped on Worker abort. This is a **latent gap**, track under D1.

### C. Edge runtime + service auth (#13)

Use the same post-await pattern as (A). The rate-limit key stays `package-ai:${packageId}` but a parallel entry keyed by the package's account (`auth`less) would allow per-tenant billing dashboards:

```ts
const result = await generateObject({ model: getModel('anthropic/claude-haiku-4-5'), schema, prompt });
const usd = calculateCost('anthropic/claude-haiku-4-5', result.usage);
await recordCost(`package-ai:${packageId}`, usd);
// Optional: double-write to account-level bucket.
if (pkg.account_id) await recordCost(pkg.account_id, usd);
```

### D. SSE per-item loop (#12)

Cost must accrue **inside** the loop (already does, flat). Replace:

```ts
await recordCost(auth.accountId, 0.003);
totalCost += 0.003;
```

with:

```ts
const itemCost = calculateCost(DEFAULT_MODEL, aiResult.usage);
await recordCost(auth.accountId, itemCost);
totalCost += itemCost;
send({ type: 'item_complete', /* ..., */ cost: itemCost });
```

### E. Pipeline compound (#9)

Short-term: skip `recordCost` inside the internal `fetch` calls to `generate-blog` / `improve-text` (add `x-internal-call: 1` header, have those routes bypass cost when header is set). Long-term: refactor pipeline to call the LLM directly so each stage contributes one honest `recordCost` call and the `totalCost` counter disappears.

## Priority Order for D1 Implementation

1. **Ship `lib/ai/model-pricing.ts` + `calculateCost()`** with unit tests. No route changes yet.
2. **Route #2 (public-chat)** — highest risk: cost cap bypass on `public` tier today. Add `onFinish`.
3. **Route #16 (seo/keywords/research)** — missing both rate-limit and cost. Wire both.
4. **Route #15 (transcreate/stream)** — real token volume (full-content streams) and currently invisible.
5. **Route #13 (generate-package-content)** — service job, easy to miss in billing.
6. **Routes #3–#8, #11, #12** — swap flat numbers for `calculateCost(model, result.usage)`; each route is a 2-line change.
7. **Route #1 (studio-chat)** — upgrade flat `0.01` to usage-based; add `waitUntil` wrapper.
8. **Route #9 (pipeline)** — decide on double-counting strategy; larger refactor.
9. **Route #14 (transcreate non-stream)** — decide product: do we attribute client-side AI cost on the server?

## Open Questions (flagging for #195 D1 scope)

- Does the DB `ai_rate_limits` table need a `model` column added for model-level reporting, or is keeping `key` sufficient? (Current migration not in repo — need to check on Supabase directly.)
- For public-chat, is per-IP `recordCost` legally/privacy-ok, or should we aggregate to `ip:bucket:${yyyymmdd}` to avoid retention concerns?
- Pipeline (#9) internal-fetch double-counting — chose a short-term vs long-term fix?
- `transcreate` non-stream (#14) — is client-side generation going away once #15 is fully adopted? If yes, #14 becomes a no-op for cost.

## Files Referenced

- `lib/ai/rate-limit.ts` — rate limiter + `recordCost` (to upgrade).
- `lib/ai/llm-provider.ts` — `DEFAULT_MODEL`, `getEditorModel`, `getModel`.
- `app/api/ai/studio-chat/route.ts` — streaming blueprint (onFinish).
- Routes #1–#16 above.

## Doc owner

- Issue #195 (Cost Recording Phase D1)
- Related: ADR-006 (AI Streaming Architecture), SPEC_BLOG_GENERATOR_SEO_PIPELINE §3 D11, ADR-021 (Transcreation).
