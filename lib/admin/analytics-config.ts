export type AnalyticsConfigRecord = Record<string, unknown>;

export type EditableAnalyticsKey =
  | "gtm_id"
  | "ga4_id"
  | "facebook_pixel_id"
  | "clarity_project_id";

export type AnalyticsTrackingPatch = Partial<
  Record<EditableAnalyticsKey, string | null | undefined>
>;

const EDITABLE_ANALYTICS_KEYS: EditableAnalyticsKey[] = [
  "gtm_id",
  "ga4_id",
  "facebook_pixel_id",
  "clarity_project_id",
];

export function readAnalyticsString(
  analytics: AnalyticsConfigRecord,
  key: string,
): string {
  const value = analytics[key];
  return typeof value === "string" ? value : "";
}

export function mergeAnalyticsConfig(
  current: AnalyticsConfigRecord | null | undefined,
  patch: AnalyticsTrackingPatch,
): AnalyticsConfigRecord {
  const next: AnalyticsConfigRecord = { ...(current ?? {}) };

  for (const key of EDITABLE_ANALYTICS_KEYS) {
    if (!(key in patch)) continue;

    const value = patch[key];
    const normalized = typeof value === "string" ? value.trim() : "";

    if (normalized) {
      next[key] = normalized;
    } else {
      delete next[key];
    }
  }

  return next;
}
