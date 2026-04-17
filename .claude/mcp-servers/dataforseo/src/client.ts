/**
 * Minimal DataForSEO HTTP client.
 * - Basic auth via Authorization header
 * - Timeout via AbortController
 * - Retry with exponential backoff on 5xx / network errors
 * - All logs go to stderr (stdout is reserved for MCP stdio transport)
 */

const DEFAULT_BASE_URL = "https://api.dataforseo.com";
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_RETRIES = 2;

export interface DfsClientOptions {
  timeoutMs?: number;
  retries?: number;
}

export class DfsApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error(
      "DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set in the environment",
    );
  }
  const b64 = Buffer.from(`${login}:${password}`).toString("base64");
  return `Basic ${b64}`;
}

function getBaseUrl(): string {
  return process.env.DATAFORSEO_BASE_URL || DEFAULT_BASE_URL;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * POST a DataForSEO endpoint. The body is wrapped in the required
 * `[ { ... } ]` task-array shape.
 *
 * Returns the parsed JSON response.
 */
export async function dfsPost<TResponse = unknown>(
  path: string,
  taskPayload: Record<string, unknown>,
  opts: DfsClientOptions = {},
): Promise<TResponse> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.retries ?? DEFAULT_RETRIES;
  const url = `${getBaseUrl().replace(/\/$/, "")}${path}`;
  const body = JSON.stringify([taskPayload]);

  let attempt = 0;
  let lastErr: unknown;

  while (attempt <= maxRetries) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body,
        signal: ac.signal,
      });
      clearTimeout(timer);

      // 5xx → retry
      if (res.status >= 500 && attempt < maxRetries) {
        attempt += 1;
        await sleep(250 * 2 ** attempt);
        continue;
      }

      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }

      if (!res.ok) {
        throw new DfsApiError(
          res.status,
          `DataForSEO ${path} → HTTP ${res.status}`,
          parsed,
        );
      }
      return parsed as TResponse;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // Abort or network error → retry
      if (
        err instanceof DfsApiError &&
        err.status < 500 // non-5xx API error → don't retry
      ) {
        throw err;
      }
      if (attempt >= maxRetries) break;
      attempt += 1;
      await sleep(250 * 2 ** attempt);
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`DataForSEO request failed for ${path}`);
}

/**
 * DataForSEO envelope shape: `{ tasks: [{ status_code, status_message, cost, result: [...] }] }`.
 * Extracts the first task's result and its reported `cost`.
 */
export interface DfsEnvelope<T> {
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    cost?: number;
    result?: T[] | null;
  }>;
  cost?: number;
}

export interface UnwrappedTask<T> {
  result: T | null;
  cost: number;
}

export function unwrapTask<T>(
  env: DfsEnvelope<T>,
  fallbackCost: number,
): UnwrappedTask<T> {
  const task = env.tasks?.[0];
  const resultArr = task?.result ?? null;
  const result = Array.isArray(resultArr) && resultArr.length > 0 ? resultArr[0] : null;
  const cost =
    typeof task?.cost === "number" && task.cost > 0
      ? task.cost
      : typeof env.cost === "number" && env.cost > 0
        ? env.cost
        : fallbackCost;
  // Surface upstream errors even when HTTP status was 200 (DataForSEO pattern)
  if (typeof task?.status_code === "number" && task.status_code >= 40000) {
    throw new DfsApiError(
      task.status_code,
      `DataForSEO task failed: ${task.status_message ?? "unknown"}`,
      task,
    );
  }
  return { result, cost };
}

/**
 * Same as unwrapTask but returns the entire `result` array (not just the first
 * element). Used by batch tools like keyword_volume.
 */
export function unwrapTaskArray<T>(
  env: DfsEnvelope<T>,
  fallbackCost: number,
): { result: T[]; cost: number } {
  const task = env.tasks?.[0];
  const result = Array.isArray(task?.result) ? task!.result! : [];
  const cost =
    typeof task?.cost === "number" && task.cost > 0
      ? task.cost
      : typeof env.cost === "number" && env.cost > 0
        ? env.cost
        : fallbackCost;
  if (typeof task?.status_code === "number" && task.status_code >= 40000) {
    throw new DfsApiError(
      task.status_code,
      `DataForSEO task failed: ${task.status_message ?? "unknown"}`,
      task,
    );
  }
  return { result, cost };
}
