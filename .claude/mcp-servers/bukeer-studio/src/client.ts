/**
 * Bukeer Studio HTTP client wrapper.
 *
 * Calls local Next.js dev server routes. The server's /api/seo/* routes use
 * `requireWebsiteAccess` which reads a Supabase auth cookie — there is no
 * service-role bypass. Documented in README.
 *
 * We forward `x-service-role-key` anyway so future cookie-less auth (e.g. an
 * internal header-auth bypass flag) can be wired without tool changes.
 */

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  // Some routes (score, striking-distance, health, integrations/status, sync)
  // return raw JSON without the ADR-012 envelope; we pass-through in that case.
  [key: string]: unknown;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  /** Optional Cookie header to pass an authenticated Supabase session. */
  cookie?: string;
}

export class BukeerHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function resolveBaseUrl(): string {
  return process.env.BUKEER_BASE_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = resolveBaseUrl();
  const url = new URL(path.startsWith('/') ? path : `/${path}`, base);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function bukeerRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, opts.query);
  const headers: Record<string, string> = {
    accept: 'application/json',
  };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const serviceKey = process.env.BUKEER_SERVICE_ROLE_KEY;
  if (serviceKey) headers['x-service-role-key'] = serviceKey;
  if (opts.cookie) headers['cookie'] = opts.cookie;
  const cookieEnv = process.env.BUKEER_SESSION_COOKIE;
  if (!opts.cookie && cookieEnv) headers['cookie'] = cookieEnv;

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let parsed: ApiEnvelope<T> | T | null = null;
  try {
    parsed = text.length > 0 ? (JSON.parse(text) as ApiEnvelope<T> | T) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const envelope = parsed as ApiEnvelope<T> | null;
    const code = envelope?.error?.code ?? `HTTP_${res.status}`;
    const message = envelope?.error?.message ?? `Request failed with status ${res.status}`;
    throw new BukeerHttpError(res.status, code, message, envelope?.error?.details ?? parsed);
  }

  // ADR-012 envelope: unwrap .data
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'success' in (parsed as object) &&
    (parsed as ApiEnvelope<T>).success === true &&
    'data' in (parsed as ApiEnvelope<T>)
  ) {
    return (parsed as ApiEnvelope<T>).data as T;
  }
  // Raw JSON pass-through
  return parsed as T;
}
