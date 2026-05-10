import type {
  AgentLane,
  GrowthAutonomyActionClass,
  GrowthMarket,
  GrowthRuntimeCycleStage,
} from "@bukeer/website-contract";

export type JsonRecord = Record<string, unknown>;

export interface SupabaseLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
}

export interface GrowthRuntimeScope {
  accountId: string;
  websiteId: string;
  locale: string;
  market: GrowthMarket;
}

export interface GrowthRuntimeStageResult {
  stage: GrowthRuntimeCycleStage;
  status: "completed" | "skipped" | "failed";
  counts?: Record<string, number>;
  ids?: Record<string, string[]>;
  details?: JsonRecord;
  error?: string;
}

export const GROWTH_RUNTIME_VERSION = "growth-runtime-v1";

export const RUNTIME_LANES: AgentLane[] = [
  "technical_remediation",
  "transcreation",
  "content_creator",
  "content_curator",
  "orchestrator",
];

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

export function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + hours);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function actionClassForLane(lane: AgentLane): GrowthAutonomyActionClass {
  if (lane === "technical_remediation") return "safe_apply";
  if (lane === "transcreation") return "transcreation_merge";
  if (lane === "content_creator" || lane === "content_curator") {
    return "content_publish";
  }
  return "research_packet";
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
