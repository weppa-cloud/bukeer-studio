# Growth Worker Contract

**Status:** Implementation contract — Phase 0 immediate safety gates
**Owner:** Bukeer Studio Growth OS
**Enforced by:** context-builder.ts `blocked_action_classes`, `instructions` block, and Zod schemas in @bukeer/website-contract

## Purpose

This contract codifies the **non-negotiable rule set** that every Growth OS worker, agent, or Hermes profile must follow when executing tasks for Bukeer Studio. It exists to prevent architectural violations before they can cause production harm.

## Non-negotiable rules

### Rule 1: Workers never call provider APIs directly

All provider data (DataForSEO, Google Search Console, GA4, Microsoft Clarity, Meta Ads, Google Ads, or any paid/external provider) comes exclusively from the context packet.

- Workers must NOT instantiate provider SDKs.
- Workers must NOT construct provider API URLs.
- Workers must NOT accept provider credentials in their environment.
- Workers must NOT proxy provider data through intermediary services.

**Enforcement:** `call_provider_api_directly` is a hard-blocked action class in every context packet. The context builder always includes it in `blocked_action_classes`.

### Rule 2: Workers consume only the context packet

The `ContextPacket` (as defined by `@bukeer/website-contract`'s `ContextPacketSchema`) is the sole operational input to every worker. Workers must not:

- Perform their own research via external APIs.
- Fetch data from Supabase tables outside the packet's `source_refs`.
- Use cached data from previous runs unless it appears in the current `freshness_map`.
- Rely on agent memory as authoritative truth for provider-backed facts.

### Rule 3: Workers report data needs via outcome channels

If the context packet lacks data the worker needs:

1. Write a `DATA_NEED` record to `growth_work_item_outcomes` or the equivalent outcome channel.
2. Include: what fact is missing, the expected source/profile, and the freshness threshold.
3. Do NOT attempt to fetch the data yourself.

### Rule 1 or Rule 2.

### Rule 4: The context builder must load growth_profile_runs

Every context packet must include `growth_profile_runs` IDs in its `source_refs`. The context builder loads recent runs for the target account/website/locale/market so workers can verify:

- When each provider-backed fact was last refreshed.
- Which run ID produced each fact.
- Whether the run's `freshness_status` meets lane policy.

### Rule 5: Gates must block workers with provider access declared

The profile freshness gate (`profile-freshness-gate.ts`) must check whether the worker profile's Zod schema has `callProviderApiDirectly = false`. If any profile declares direct provider API access, the gate must return BLOCKED.

## Enforcement summary

| Enforcement point | What it checks | Where |
|---|---|---|
| Context builder (`blocked_action_classes`) | `call_provider_api_directly` is included | `lib/growth/agentic/context-builder.ts` |
| Context builder (`instructions`) | Worker is told not to call provider APIs | `lib/growth/agentic/context-builder.ts` |
| Profile freshness gate | Worker profile must not declare provider access provider APIs directly | `lib/growth/agentic/profile-freshness-gate.ts` |
| Zod contract schemas | `ContextPacket.blocked_actions` requires `call_provider_api_directly` | `@bukeer/website-contract` `ContextPacketSchema` |
| Worker contract (this doc) | Non-negotiable rules codified | `docs/ops/growth-worker-contract.md` |

## Version history

| Version | Date | Change |
|---|---|---|
| v1 | 2026-05-18 | Initial contract — Phase 0 safety gates |