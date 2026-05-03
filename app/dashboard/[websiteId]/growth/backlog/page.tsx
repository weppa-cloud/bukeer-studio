import { redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import { AgentLaneSchema, type AgentLane } from "@bukeer/website-contract";
import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
  StudioEmptyState,
} from "@/components/studio/ui/primitives";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  getBacklogByLane,
  getContentTasksByLane,
  BACKLOG_STATUS_BUCKETS,
  type BacklogQueryResult,
  type BacklogRow,
  type BacklogStatusBucket,
} from "@/lib/growth/console/queries-backlog";

/**
 * Growth Console — Opportunities (SPEC #403, Issue #406).
 *
 * Server Component (ADR-001). Read-only view of `growth_backlog_items` and
 * `growth_content_tasks`, grouped by canonical agent lane (5 lanes, see
 * SPEC_GROWTH_OS_AGENT_LANES.md V1).
 *
 * Tenant guard:
 *   - Resolves `account_id` from the website row (RLS filters by user) and
 *     passes both `account_id` and `website_id` to every helper. Helpers
 *     re-assert tenant scope on each returned row.
 *
 * No mutations: Council promotion, approve/reject and blocked/watch toggles
 * land in a follow-up issue. Per SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md
 * §"Bukeer Studio UI Scope", this MVP is read-only.
 */

const LANES: ReadonlyArray<AgentLane> = [
  "orchestrator",
  "technical_remediation",
  "transcreation",
  "content_creator",
  "content_curator",
];

const LANE_LABELS: Record<AgentLane, string> = {
  orchestrator: "Orquestador",
  technical_remediation: "Corrección técnica",
  transcreation: "Transcreación",
  content_creator: "Creación de contenido",
  content_curator: "Curaduría",
};

const LANE_HELP: Record<AgentLane, string> = {
  orchestrator: "Ordena prioridades y decide qué debe revisar cada agente.",
  technical_remediation:
    "Detecta ajustes técnicos SEO/CRO antes de tocar el sitio.",
  transcreation:
    "Prepara adaptación por idioma o mercado sin publicar automáticamente.",
  content_creator:
    "Convierte demanda SEO en briefs, mejoras o borradores revisables.",
  content_curator:
    "Valida evidencia, riesgos y si una propuesta puede pasar a Council.",
};

const STATUS_LABELS: Record<string, string> = {
  blocked: "Bloqueada",
  rejected: "Rechazada",
  watch: "En observación",
  queued: "En cola",
  ready_for_brief: "Lista para brief",
  ready_for_council: "Lista para Council",
  brief_in_progress: "Brief en progreso",
  approved_for_execution: "Aprobada para ejecutar",
  in_progress: "En progreso",
  done: "Completada",
  shipped: "Entregada",
  evaluated: "Evaluada",
  applied: "Aplicada",
  ready_for_seo_qa: "Lista para QA SEO",
};

const WORK_TYPE_LABELS: Record<string, string> = {
  technical_remediation: "Ajuste técnico",
  transcreation: "Transcreación",
  translate: "Traducción",
  locale_content: "Contenido por mercado",
  seo_demand: "Demanda SEO",
  growth_opportunity: "Oportunidad de growth",
  content_opportunity: "Oportunidad de contenido",
  serp_competitor_opportunity: "Brecha vs competencia",
  content_update: "Actualización de contenido",
  seo_content: "Contenido SEO",
  cro_activation: "Activación CRO",
  experiment_readiness: "Preparación de experimento",
  refresh: "Refresco de contenido",
  create_or_expand: "Crear o expandir",
  cro_support: "Soporte CRO",
  locale_quality_or_translation: "Calidad de idioma",
};

const SearchParamsSchema = z.object({
  lane: AgentLaneSchema.optional(),
  status: z.enum(BACKLOG_STATUS_BUCKETS).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  pageSize: z.coerce.number().int().min(5).max(100).optional(),
});

interface BacklogPageProps {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function buildHref(
  websiteId: string,
  current: {
    lane?: AgentLane;
    status?: BacklogStatusBucket;
    page?: number;
    pageSize?: number;
  },
  override: Partial<{
    lane?: AgentLane | null;
    status?: BacklogStatusBucket | null;
    page?: number;
    pageSize?: number;
  }>,
): string {
  const params = new URLSearchParams();
  const lane = "lane" in override ? override.lane : current.lane;
  const status = "status" in override ? override.status : current.status;
  const page = "page" in override ? override.page : current.page;
  const pageSize =
    "pageSize" in override ? override.pageSize : current.pageSize;
  if (lane) params.set("lane", lane);
  if (status) params.set("status", status);
  if (page && page > 1) params.set("page", String(page));
  if (pageSize && pageSize !== 25) params.set("pageSize", String(pageSize));
  const qs = params.toString();
  return `/dashboard/${websiteId}/growth/backlog${qs ? `?${qs}` : ""}`;
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <StudioBadge tone="neutral">—</StudioBadge>;
  let tone: "neutral" | "info" | "success" | "warning" | "danger" = "neutral";
  if (status === "blocked" || status === "rejected") tone = "danger";
  else if (status === "watch") tone = "warning";
  else if (status === "done" || status === "shipped" || status === "evaluated")
    tone = "success";
  else if (status.startsWith("ready")) tone = "info";
  else if (status.includes("progress") || status === "approved_for_execution")
    tone = "info";
  return (
    <StudioBadge tone={tone}>{STATUS_LABELS[status] ?? status}</StudioBadge>
  );
}

function ReviewPill({ value }: { value: string | null }) {
  if (!value)
    return <span className="text-xs text-[var(--studio-text-muted)]">—</span>;
  let tone: "neutral" | "info" | "success" | "warning" | "danger" = "neutral";
  if (/approve|pass|success/i.test(value)) tone = "success";
  else if (/reject|fail|block/i.test(value)) tone = "danger";
  else if (/watch|pending|review/i.test(value)) tone = "warning";
  return <StudioBadge tone={tone}>{value}</StudioBadge>;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function humanizeToken(value: string | null | undefined): string {
  if (!value) return "—";
  return WORK_TYPE_LABELS[value] ?? value.replace(/_/g, " ");
}

function displayTitle(row: BacklogRow): string {
  const raw = row.title?.trim();
  if (!raw) return "Tarea sin título";
  const withoutPrefix = raw.replace(/^[A-Z][A-Za-z ]+:\s*/i, "").trim();
  if (row.page_url && withoutPrefix.includes(row.page_url)) {
    const path = row.page_url
      .replace(/^https?:\/\/(www\.)?/i, "")
      .replace(/^colombiatours\.travel\/?/i, "")
      .replace(/^en\.colombiatours\.travel\/?/i, "en/");
    return path || row.page_url;
  }
  return withoutPrefix.length > 150
    ? `${withoutPrefix.slice(0, 147)}...`
    : withoutPrefix;
}

function pageKind(url: string | null): string {
  if (!url) return "Referencia";
  const parsed = url.toLowerCase();
  if (parsed.includes("/blog/")) return "Blog / artículo";
  if (parsed.includes("/l/")) return "Landing";
  if (parsed.includes("/en.")) return "Página en inglés";
  return "Página";
}

function marketingNextAction(value: string | null): string {
  if (!value) {
    return "Revisar evidencia, decidir prioridad y enviar a ejecución solo si el impacto es claro.";
  }
  const lower = value.toLowerCase();
  if (lower.includes("ga4 event/page drop-off")) {
    return "Hay visitas o eventos, pero no conversiones registradas. Marketing debe revisar si el CTA, formulario o medición están impidiendo que el tráfico se convierta en lead.";
  }
  if (lower.includes("review joint fact")) {
    return "Revisar si la evidencia combinada de búsqueda/analytics justifica convertir esta oportunidad en brief o experimento.";
  }
  if (lower.includes("review ctr/demand opportunity")) {
    return "Revisar si conviene mejorar título, descripción, snippet o enlaces internos para capturar mejor la demanda de búsqueda.";
  }
  if (lower.includes("run en/locale quality gate")) {
    return "Validar calidad de idioma, intención de mercado y SEO antes de publicar o conectar esta versión en inglés.";
  }
  if (lower.includes("prepare studio content update draft")) {
    return "Preparar un borrador de mejora de contenido en Studio y después validar SEO, canonical y CTA antes de aprobar.";
  }
  return value;
}

interface ExecutionCoverageRun {
  run_id: string;
  status: string;
  source_table: string | null;
  source_id: string | null;
  updated_at: string | null;
}

type ExecutionCoverage = Record<
  AgentLane,
  {
    total: number;
    distinctSources: number;
    reviewRequired: number;
    samples: ExecutionCoverageRun[];
  }
>;

function emptyExecutionCoverage(): ExecutionCoverage {
  return LANES.reduce(
    (acc, lane) => ({
      ...acc,
      [lane]: {
        total: 0,
        distinctSources: 0,
        reviewRequired: 0,
        samples: [],
      },
    }),
    {} as ExecutionCoverage,
  );
}

function buildExecutionCoverage(
  rows: Array<Record<string, unknown>>,
): ExecutionCoverage {
  const coverage = emptyExecutionCoverage();
  const sourcesByLane = new Map<AgentLane, Set<string>>();
  for (const lane of LANES) sourcesByLane.set(lane, new Set());

  for (const row of rows) {
    const parsedLane = AgentLaneSchema.safeParse(row.lane);
    if (!parsedLane.success) continue;
    const lane = parsedLane.data;
    const status = String(row.status ?? "");
    const sourceKey = `${row.source_table ?? "unknown"}:${row.source_id ?? row.run_id}`;
    coverage[lane].total += 1;
    if (status === "review_required") coverage[lane].reviewRequired += 1;
    sourcesByLane.get(lane)?.add(sourceKey);
    if (
      coverage[lane].samples.length < 2 &&
      !coverage[lane].samples.some(
        (sample) => sample.source_id === row.source_id,
      )
    ) {
      coverage[lane].samples.push({
        run_id: String(row.run_id),
        status,
        source_table: (row.source_table as string | null | undefined) ?? null,
        source_id: (row.source_id as string | null | undefined) ?? null,
        updated_at: (row.updated_at as string | null | undefined) ?? null,
      });
    }
  }

  for (const lane of LANES) {
    coverage[lane].distinctSources = sourcesByLane.get(lane)?.size ?? 0;
  }

  return coverage;
}

function ExecutionCoveragePanel({
  websiteId,
  coverage,
}: {
  websiteId: string;
  coverage: ExecutionCoverage;
}) {
  return (
    <section className="mt-4 rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--studio-text)]">
            Ejecución real por agente
          </h2>
          <p className="text-sm text-[var(--studio-text-muted)]">
            Para la prueba beta, cada lane debe tener al menos dos tareas
            ejecutadas y trazables antes de pedir aprobación humana.
          </p>
        </div>
        <Link
          href={`/dashboard/${websiteId}/growth/runs`}
          className="studio-button studio-button--outline"
        >
          Ver Review Queue
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-5">
        {LANES.map((lane) => {
          const item = coverage[lane];
          const ready = item.distinctSources >= 2;
          return (
            <article
              key={lane}
              className="rounded-md border border-[var(--studio-border)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{LANE_LABELS[lane]}</h3>
                <StudioBadge tone={ready ? "success" : "warning"}>
                  {ready ? "2+ listas" : "Falta"}
                </StudioBadge>
              </div>
              <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
                {item.distinctSources} tareas distintas · {item.reviewRequired}{" "}
                en revisión
              </p>
              <div className="mt-2 space-y-1">
                {item.samples.length > 0 ? (
                  item.samples.map((sample) => (
                    <Link
                      key={sample.run_id}
                      href={`/dashboard/${websiteId}/growth/runs/${sample.run_id}`}
                      className="block rounded border border-[var(--studio-border)] px-2 py-1 text-xs hover:border-[var(--studio-text)]"
                    >
                      Resultado {sample.run_id.slice(-8)} ·{" "}
                      {STATUS_LABELS[sample.status] ?? sample.status}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-[var(--studio-text-muted)]">
                    Sin runs todavía
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BacklogCards({
  rows,
  websiteId,
}: {
  rows: BacklogRow[];
  websiteId: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--studio-text-muted)] px-1 py-3">
        No hay tareas en este lane con los filtros actuales.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={row.status} />
                {row.council_ready ? (
                  <StudioBadge tone="info">Lista para Council</StudioBadge>
                ) : null}
                <span className="text-xs text-[var(--studio-text-muted)]">
                  {humanizeToken(row.work_type)}
                </span>
              </div>
              <h4 className="mt-2 text-base font-semibold text-[var(--studio-text)]">
                {displayTitle(row)}
              </h4>
              <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
                Equipo responsable: {row.lane ? LANE_LABELS[row.lane] : "—"} ·
                Fuente:{" "}
                {row.source_table === "growth_content_tasks"
                  ? "Tarea de contenido"
                  : "Backlog Growth"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {row.page_url ? (
                <a
                  href={row.page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="studio-button studio-button--outline"
                >
                  Ver {pageKind(row.page_url)}
                </a>
              ) : null}
              {row.latest_run_id ? (
                <Link
                  href={`/dashboard/${websiteId}/growth/runs/${row.latest_run_id}`}
                  className="studio-button studio-button--primary"
                >
                  Revisar resultado
                </Link>
              ) : (
                <span className="rounded border border-[var(--studio-border)] px-3 py-2 text-xs text-[var(--studio-text-muted)]">
                  Sin ejecución todavía
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3">
              <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
                Qué debe revisar marketing
              </div>
              <p className="mt-1 text-sm">
                {marketingNextAction(row.next_action)}
              </p>
            </div>
            <div className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3">
              <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
                Riesgo o bloqueo
              </div>
              <p className="mt-1 text-sm">
                {row.blocked_reason ??
                  "Sin bloqueo explícito. Validar que no publique ni cambie campañas sin aprobación."}
              </p>
            </div>
            <div className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-3">
              <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
                Resultado del agente
              </div>
              {row.latest_run_id ? (
                <p className="mt-1 text-sm">
                  Última ejecución:{" "}
                  <span className="font-medium">
                    {STATUS_LABELS[row.latest_run_status ?? ""] ??
                      row.latest_run_status}
                  </span>
                  <br />
                  <span className="text-xs text-[var(--studio-text-muted)]">
                    {fmtDate(row.latest_run_updated_at)}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-[var(--studio-text-muted)]">
                  Aún no hay artifact ni revisión para esta tarea.
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-[var(--studio-text-muted)]">AI review</span>
            <ReviewPill value={row.ai_review_state} />
            <span className="text-[var(--studio-text-muted)]">
              Revisión humana
            </span>
            <ReviewPill value={row.human_review_state} />
            <span className="font-mono text-[var(--studio-text-muted)]">
              {row.id.slice(0, 8)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

interface LaneSectionProps {
  lane: AgentLane;
  websiteId: string;
  result: BacklogQueryResult;
  current: {
    lane?: AgentLane;
    status?: BacklogStatusBucket;
    page?: number;
    pageSize?: number;
  };
  selectedLane?: AgentLane;
}

function LaneSection({
  lane,
  websiteId,
  result,
  current,
  selectedLane,
}: LaneSectionProps) {
  // When a lane filter is active, only render that lane's section.
  if (selectedLane && selectedLane !== lane) return null;

  // For each lane section we render the rows whose lane === lane (or where
  // a lane filter scoped the entire result already).
  const rowsForLane = selectedLane
    ? result.items
    : result.items.filter((r) => r.lane === lane);

  const laneTotal = result.totalByLane[lane] ?? 0;
  const isPaginated = Boolean(selectedLane && selectedLane === lane);
  const totalPages = isPaginated
    ? Math.max(1, Math.ceil(result.total / result.pageSize))
    : 1;
  const currentPage = isPaginated ? result.page : 1;

  return (
    <section
      key={lane}
      aria-labelledby={`lane-${lane}-heading`}
      className="space-y-3 mt-6"
    >
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3
            id={`lane-${lane}-heading`}
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            {LANE_LABELS[lane]}
          </h3>
          <p className="text-xs text-[var(--studio-text-muted)]">
            {laneTotal} total · mostrando {rowsForLane.length}.{" "}
            {LANE_HELP[lane]}
          </p>
        </div>
        {!selectedLane ? (
          <Link
            href={buildHref(websiteId, current, { lane, page: 1 })}
            className="text-xs underline text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
          >
            Ver solo este lane →
          </Link>
        ) : (
          <Link
            href={buildHref(websiteId, current, { lane: null, page: 1 })}
            className="text-xs underline text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
          >
            Limpiar filtro
          </Link>
        )}
      </header>

      <BacklogCards rows={rowsForLane} websiteId={websiteId} />

      {isPaginated && totalPages > 1 ? (
        <nav
          aria-label={`Pagination for ${LANE_LABELS[lane]}`}
          className="flex items-center justify-between text-xs text-[var(--studio-text-muted)] mt-2"
        >
          <span>
            Página {currentPage} de {totalPages} · {result.total} tareas
          </span>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={buildHref(websiteId, current, { page: currentPage - 1 })}
                className="underline hover:text-[var(--studio-text)]"
              >
                ← Anterior
              </Link>
            ) : (
              <span className="opacity-50">← Anterior</span>
            )}
            {currentPage < totalPages ? (
              <Link
                href={buildHref(websiteId, current, { page: currentPage + 1 })}
                className="underline hover:text-[var(--studio-text)]"
              >
                Siguiente →
              </Link>
            ) : (
              <span className="opacity-50">Siguiente →</span>
            )}
          </div>
        </nav>
      ) : null}
    </section>
  );
}

function FilterBar({
  websiteId,
  current,
}: {
  websiteId: string;
  current: {
    lane?: AgentLane;
    status?: BacklogStatusBucket;
    page?: number;
    pageSize?: number;
  };
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
          Equipo:
        </span>
        <Link
          href={buildHref(websiteId, current, { lane: null, page: 1 })}
          className={`text-xs px-2 py-1 rounded border ${
            !current.lane
              ? "bg-[var(--studio-text)] text-[var(--studio-bg)] border-transparent"
              : "border-[var(--studio-border)] hover:border-[var(--studio-text)]"
          }`}
        >
          todos
        </Link>
        {LANES.map((lane) => (
          <Link
            key={lane}
            href={buildHref(websiteId, current, { lane, page: 1 })}
            className={`text-xs px-2 py-1 rounded border ${
              current.lane === lane
                ? "bg-[var(--studio-text)] text-[var(--studio-bg)] border-transparent"
                : "border-[var(--studio-border)] hover:border-[var(--studio-text)]"
            }`}
          >
            {LANE_LABELS[lane]}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
          Estado:
        </span>
        <Link
          href={buildHref(websiteId, current, { status: null, page: 1 })}
          className={`text-xs px-2 py-1 rounded border ${
            !current.status
              ? "bg-[var(--studio-text)] text-[var(--studio-bg)] border-transparent"
              : "border-[var(--studio-border)] hover:border-[var(--studio-text)]"
          }`}
        >
          todos
        </Link>
        {BACKLOG_STATUS_BUCKETS.map((bucket) => (
          <Link
            key={bucket}
            href={buildHref(websiteId, current, { status: bucket, page: 1 })}
            className={`text-xs px-2 py-1 rounded border ${
              current.status === bucket
                ? "bg-[var(--studio-text)] text-[var(--studio-bg)] border-transparent"
                : "border-[var(--studio-border)] hover:border-[var(--studio-text)]"
            }`}
          >
            {bucket}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function BacklogByLanePage({
  params,
  searchParams,
}: BacklogPageProps) {
  const { websiteId } = await params;
  const rawSearch = await searchParams;

  // Parse with safeParse so a stray param doesn't crash the page.
  const parsed = SearchParamsSchema.safeParse({
    lane: rawSearch.lane,
    status: rawSearch.status,
    page: rawSearch.page,
    pageSize: rawSearch.pageSize,
  });
  const filters = parsed.success ? parsed.data : {};
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const lane = filters.lane;
  const statusBucket = filters.status;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Tenant guard — resolve account_id from the website row (RLS scoped to the
  // user). If the user can't see this website, RLS returns no row and we
  // redirect to the dashboard root instead of leaking existence.
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id, account_id")
    .eq("id", websiteId)
    .single();

  if (websiteError || !website) {
    redirect("/dashboard");
  }

  const accountId = website.account_id as string;
  if (!accountId) {
    // Defensive — every website row must carry account_id (ADR-009).
    redirect("/dashboard");
  }

  // Two parallel reads, each tenant-scoped.
  const [backlog, contentTasks, executionRows] = await Promise.all([
    getBacklogByLane(supabase, websiteId, {
      accountId,
      lane,
      statusBucket,
      page,
      pageSize,
    }),
    getContentTasksByLane(supabase, websiteId, {
      accountId,
      lane,
      statusBucket,
      page,
      pageSize,
    }),
    supabase
      .from("growth_agent_runs")
      .select("run_id, lane, status, source_table, source_id, updated_at")
      .eq("website_id", websiteId)
      .eq("account_id", accountId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(100),
  ]);
  const executionCoverage = buildExecutionCoverage(
    executionRows.data
      ? (executionRows.data as Array<Record<string, unknown>>)
      : [],
  );

  const current = { lane, status: statusBucket, page, pageSize };

  const totalAcross =
    backlog.total + contentTasks.total + 0; /* experiments TBD */

  const bothMissing = backlog.tableMissing && contentTasks.tableMissing;
  const anyError = backlog.errored || contentTasks.errored;

  return (
    <StudioPage className="max-w-7xl">
      <StudioSectionHeader
        title="Tareas de Growth"
        subtitle="Trabajo priorizado para marketing: evidencia, responsable, resultado del agente y siguiente paso."
        actions={
          <div className="flex items-center gap-2">
            <StudioBadge tone="info">SPEC #403 · Issue #406</StudioBadge>
          </div>
        }
      />

      {/*
        Mutations land in a follow-up — Council promotion is read-only here per SPEC.
        See SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Bukeer Studio UI Scope".
      */}
      <p className="text-xs text-[var(--studio-text-muted)] mt-1">
        Vista de operación. Cada tarea muestra su referencia, estado y último
        resultado del agente; publicar, unir transcreación, activar experimentos
        o tocar pauta sigue bloqueado por aprobación humana.
      </p>

      {anyError ? (
        <div
          className="studio-panel border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-3 text-sm mt-4"
          role="alert"
        >
          We could not load some backlog rows. Reload the page; if the problem
          persists, check the Studio server logs.
        </div>
      ) : null}

      <FilterBar websiteId={websiteId} current={current} />

      <ExecutionCoveragePanel
        websiteId={websiteId}
        coverage={executionCoverage}
      />

      {bothMissing || totalAcross === 0 ? (
        <div data-testid="growth-backlog-empty-state" className="mt-6">
          <StudioEmptyState
            title="Aún no hay tareas"
            description="Corre el generador de backlog (#397) o el Council packet (#399) para poblar oportunidades. La vista sigue estable aunque las tablas estén vacías."
          />
        </div>
      ) : null}

      {!bothMissing && totalAcross > 0 ? (
        <div data-testid="growth-backlog-table">
          <section
            aria-labelledby="backlog-items-heading"
            className="space-y-2 mt-6"
          >
            <header className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2
                  id="backlog-items-heading"
                  className="text-lg font-semibold text-[var(--studio-text)]"
                >
                  Backlog priorizado
                </h2>
                <p className="text-xs text-[var(--studio-text-muted)]">
                  Fuente operativa: <code>growth_backlog_items</code> ·{" "}
                  {backlog.total} tareas coinciden
                </p>
              </div>
            </header>

            {backlog.tableMissing ? (
              <p className="text-xs text-[var(--studio-text-muted)]">
                <code>growth_backlog_items</code> not present yet — the
                migration lands with #395 / #397.
              </p>
            ) : (
              LANES.map((laneId) => (
                <LaneSection
                  key={laneId}
                  lane={laneId}
                  websiteId={websiteId}
                  result={backlog}
                  current={current}
                  selectedLane={lane}
                />
              ))
            )}
          </section>

          <section
            aria-labelledby="content-tasks-heading"
            className="space-y-2 mt-10"
          >
            <header>
              <h2
                id="content-tasks-heading"
                className="text-lg font-semibold text-[var(--studio-text)]"
              >
                Tareas de contenido
              </h2>
              <p className="text-xs text-[var(--studio-text-muted)]">
                Fuente: <code>growth_content_tasks</code> · {contentTasks.total}{" "}
                tareas coinciden
              </p>
            </header>

            {contentTasks.tableMissing ? (
              <p className="text-xs text-[var(--studio-text-muted)]">
                <code>growth_content_tasks</code> not present yet — the
                migration lands with #396.
              </p>
            ) : (
              LANES.map((laneId) => (
                <LaneSection
                  key={laneId}
                  lane={laneId}
                  websiteId={websiteId}
                  result={contentTasks}
                  current={current}
                  selectedLane={lane}
                />
              ))
            )}
          </section>
        </div>
      ) : null}
    </StudioPage>
  );
}
