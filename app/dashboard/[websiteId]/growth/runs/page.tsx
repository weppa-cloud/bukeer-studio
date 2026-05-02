import Link from "next/link";
import { z } from "zod";
import {
  AgentLaneSchema,
  AgentRunStatusSchema,
  type AgentLane,
  type AgentRunStatus,
} from "@bukeer/website-contract";
import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
  StudioEmptyState,
} from "@/components/studio/ui/primitives";
import { requireGrowthRole } from "@/lib/growth/console/auth";
import {
  getAgentRuns,
  AGENT_LANE_OPTIONS,
  AGENT_RUN_STATUS_OPTIONS,
} from "@/lib/growth/console/queries-runs";

/**
 * Reviews & Agent Runs — list view (#407).
 *
 * Server Component. Tenant-guarded via SSR Supabase session → `account_id`
 * derived from the website row (ADR-009). Filters via URL search params.
 * Append-only: this page only reads `growth_agent_runs`; events live on the
 * detail page and are never UPDATE/DELETE-able from the UI.
 *
 * Roles: read access for `viewer`+. Approve/Reject (curator+) live on the
 * detail page.
 */

const SearchParamsSchema = z.object({
  status: AgentRunStatusSchema.optional(),
  lane: AgentLaneSchema.optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

interface PageProps {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const STATUS_TONE: Record<
  AgentRunStatus,
  "neutral" | "success" | "warning" | "danger" | "info"
> = {
  claimed: "info",
  running: "info",
  review_required: "warning",
  failed: "danger",
  completed: "success",
  stalled: "danger",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function buildHref(
  websiteId: string,
  params: {
    status?: AgentRunStatus;
    lane?: AgentLane;
    page?: number;
    pageSize?: number;
  },
): string {
  const usp = new URLSearchParams();
  if (params.status) usp.set("status", params.status);
  if (params.lane) usp.set("lane", params.lane);
  if (params.page && params.page > 1) usp.set("page", String(params.page));
  if (params.pageSize) usp.set("pageSize", String(params.pageSize));
  const qs = usp.toString();
  return `/dashboard/${websiteId}/growth/runs${qs ? `?${qs}` : ""}`;
}

export default async function GrowthRunsListPage({
  params,
  searchParams,
}: PageProps) {
  const { websiteId } = await params;
  const rawSearch = await searchParams;

  const filters = SearchParamsSchema.parse({
    status: rawSearch.status,
    lane: rawSearch.lane,
    page: rawSearch.page,
    pageSize: rawSearch.pageSize,
  });

  const auth = await requireGrowthRole(websiteId, "viewer");
  const accountId = auth.accountId;

  const result = await getAgentRuns(websiteId, {
    accountId,
    status: filters.status,
    lane: filters.lane,
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <StudioPage className="max-w-7xl">
      <StudioSectionHeader
        title="Reviews & Agent Runs"
        subtitle="Symphony Orchestrator — agent run ledger por tenant. Append-only."
        actions={
          <div className="flex items-center gap-2">
            <StudioBadge tone="info">Issue #407</StudioBadge>
          </div>
        }
      />

      {result.tablesMissing ? (
        <div
          className="studio-panel border border-[var(--studio-warning)]/40 text-[var(--studio-warning)] p-3 text-sm mt-4"
          role="status"
        >
          Las tablas <code>growth_agent_runs</code> /{" "}
          <code>growth_agent_run_events</code> aún no existen en este entorno.
          Cuando #404 (orchestrator runtime) las cree, este listado se hidrata
          automáticamente.
        </div>
      ) : null}

      {result.errored ? (
        <div
          className="studio-panel border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-3 text-sm mt-4"
          role="alert"
        >
          No pudimos cargar la lista de runs. Reintenta o revisa los logs.
        </div>
      ) : null}

      {/* Filter bar (URL-driven, GET form) */}
      <form
        method="GET"
        action={`/dashboard/${websiteId}/growth/runs`}
        className="flex flex-wrap items-end gap-3 mt-4 mb-4"
        aria-label="Filtrar runs"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--studio-text-muted)]">Status</span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="studio-input"
          >
            <option value="">Todos</option>
            {AGENT_RUN_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--studio-text-muted)]">Lane</span>
          <select
            name="lane"
            defaultValue={filters.lane ?? ""}
            className="studio-input"
          >
            <option value="">Todas</option>
            {AGENT_LANE_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[var(--studio-text-muted)]">Page size</span>
          <select
            name="pageSize"
            defaultValue={String(result.pageSize)}
            className="studio-input"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="studio-button studio-button--outline">
          Aplicar
        </button>
        {filters.status || filters.lane ? (
          <Link
            href={`/dashboard/${websiteId}/growth/runs`}
            className="text-xs underline text-[var(--studio-text-muted)]"
          >
            Limpiar
          </Link>
        ) : null}
      </form>

      {/* Status summary */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        {AGENT_RUN_STATUS_OPTIONS.map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <StudioBadge tone={STATUS_TONE[s]}>{s}</StudioBadge>
            <span className="text-[var(--studio-text-muted)]">
              {result.totalByStatus[s] ?? 0}
            </span>
          </span>
        ))}
      </div>

      {result.runs.length === 0 ? (
        <div data-testid="growth-runs-empty-state">
          <StudioEmptyState
            title="No runs yet for this tenant."
            description="Orchestrator will populate this list once #404 starts claiming work."
          />
        </div>
      ) : (
        <div className="studio-panel overflow-x-auto">
          <table data-testid="growth-runs-list" className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--studio-text-muted)] border-b border-[var(--studio-border)]">
                <th className="px-3 py-2 font-medium">Run</th>
                <th className="px-3 py-2 font-medium">Agent</th>
                <th className="px-3 py-2 font-medium">Lane</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Attempts</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Finished</th>
                <th className="px-3 py-2 font-medium">Artifact</th>
                <th className="px-3 py-2 font-medium">Agreement</th>
              </tr>
            </thead>
            <tbody>
              {result.runs.map(
                ({ run, agentName, hasArtifact, agreementState }) => (
                  <tr
                    key={run.run_id}
                    className="border-b border-[var(--studio-border)]/60 hover:bg-[var(--studio-surface-hover)]"
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link
                        href={`/dashboard/${websiteId}/growth/runs/${run.run_id}`}
                        className="underline text-[var(--studio-text)]"
                      >
                        {run.run_id.slice(-8)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {agentName ?? (
                        <span className="text-[var(--studio-text-muted)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">{run.lane}</td>
                    <td className="px-3 py-2">
                      <StudioBadge tone={STATUS_TONE[run.status]}>
                        {run.status}
                      </StudioBadge>
                    </td>
                    <td className="px-3 py-2 text-xs">{run.attempts}</td>
                    <td className="px-3 py-2 text-xs">
                      {fmtDate(run.started_at)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {fmtDate(run.finished_at)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {hasArtifact ? (
                        <span aria-label="has artifact">yes</span>
                      ) : (
                        <span className="text-[var(--studio-text-muted)]">
                          no
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">{agreementState}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {result.runs.length > 0 ? (
        <nav
          className="flex items-center justify-between mt-4 text-xs"
          aria-label="Paginación"
        >
          <span className="text-[var(--studio-text-muted)]">
            Página {result.page} de {totalPages} · {result.total} runs
          </span>
          <div className="flex items-center gap-2">
            {result.page > 1 ? (
              <Link
                href={buildHref(websiteId, {
                  status: filters.status,
                  lane: filters.lane,
                  page: result.page - 1,
                  pageSize: result.pageSize,
                })}
                className="studio-button studio-button--ghost"
              >
                ← Anterior
              </Link>
            ) : null}
            {result.page < totalPages ? (
              <Link
                href={buildHref(websiteId, {
                  status: filters.status,
                  lane: filters.lane,
                  page: result.page + 1,
                  pageSize: result.pageSize,
                })}
                className="studio-button studio-button--ghost"
              >
                Siguiente →
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </StudioPage>
  );
}
