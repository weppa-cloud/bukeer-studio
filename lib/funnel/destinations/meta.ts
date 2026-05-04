/**
 * lib/funnel/destinations/meta — F1 (#420) destination handler re-export.
 *
 * This module gives the Meta CAPI logic a stable home under the new
 * `lib/funnel/destinations/<platform>` namespace introduced by ADR-029 +
 * SPEC_FUNNEL_EVENTS_SOT.
 *
 * Decision (recorded in PR #420):
 *   - We RE-EXPORT from lib/meta/conversions-api rather than moving the
 *     file. Constraints: (a) F1 must NOT aggressively touch
 *     lib/meta/conversions-api.ts per kickoff instructions, (b) several
 *     existing routes + tests import from the old path, (c) the actual
 *     dispatcher logic that calls Meta lives inside the Edge Function
 *     (supabase/functions/dispatch-funnel-event/index.ts) — these helpers
 *     remain useful for the Studio Next.js path during the feature-flag
 *     transition (AC1.10).
 *
 * Once the feature flag `FUNNEL_EVENTS_DISPATCHER_V1` is permanently on,
 * the actual relocation can happen as a follow-up PR.
 */

export {
  // Core CAPI dispatch
  sendMetaConversionEvent,
  buildMetaCapiRequest,
  buildMetaCapiEvent,
  buildMetaUserData,
  sendMetaCapiRequest,
  // Config helpers
  resolveMetaCapiConfig,
  isMetaCapiConfigured,
  // Utilities
  buildMetaConversionTrace,
  redactMetaProviderResponse,
  sha256Hex,
  // Types
  type MetaActionSource,
  type MetaConversionStatus,
  type MetaCapiConfig,
  type MetaUserDataInput,
  type MetaConversionEventInput,
  type MetaConversionTrace,
  type MetaCapiEvent,
  type MetaCapiRequest,
  type MetaProviderResponse,
  type SendMetaConversionResult,
} from '@/lib/meta/conversions-api';
