import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Gauge,
  PauseCircle,
  RefreshCcw,
  ShieldCheck,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import type {
  AgentCompanyRow,
  AgentCompanyStatus,
  AutonomyFeedItem,
  GrowthCeoCockpit as GrowthCeoCockpitData,
  ImpactLedgerRow,
  NorthStarMetric,
  RiskBudgetRow,
} from "@/lib/growth/console/queries-ceo-cockpit";

const LANE_LABELS: Record<string, string> = {
  orchestrator: "Orchestrator",
  technical_remediation: "Technical",
  transcreation: "Transcreation",
  content_creator: "Creator",
  content_curator: "Curator",
  unknown: "Unknown",
};

const STATUS_STYLES: Record<string, string> = {
  running: "border-sky-200 bg-sky-50 text-sky-800",
  idle: "border-zinc-200 bg-zinc-50 text-zinc-700",
  disabled: "border-zinc-300 bg-zinc-100 text-zinc-500",
  blocked: "border-red-200 bg-red-50 text-red-800",
  review_needed: "border-amber-200 bg-amber-50 text-amber-800",
  auto_published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  auto_applied: "border-teal-200 bg-teal-50 text-teal-800",
  rollback: "border-red-200 bg-red-50 text-red-800",
  measuring: "border-blue-200 bg-blue-50 text-blue-800",
  live: "border-emerald-200 bg-emerald-50 text-emerald-800",
  watch: "border-amber-200 bg-amber-50 text-amber-800",
  missing: "border-red-200 bg-red-50 text-red-800",
  scheduled: "border-zinc-200 bg-zinc-50 text-zinc-700",
  evaluated: "border-emerald-200 bg-emerald-50 text-emerald-800",
  paused: "border-amber-200 bg-amber-50 text-amber-800",
};

function formatDate(value: string | null | undefined): string {
  if (!value || value === "n/a") return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function laneLabel(lane: string): string {
  return LANE_LABELS[lane] ?? lane.replaceAll("_", " ");
}

function statusClass(status: string): string {
  return STATUS_STYLES[status] ?? "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${statusClass(value)}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <header className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
        {eyebrow}
      </span>
      <h2 className="text-base font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
        {title}
      </h2>
      {detail ? (
        <p className="max-w-3xl text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
          {detail}
        </p>
      ) : null}
    </header>
  );
}

function ActionLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="inline-flex items-center gap-2 rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] px-3 py-2 text-sm font-medium text-[var(--studio-text,theme(colors.zinc.800))] hover:border-[var(--studio-border-strong,theme(colors.zinc.300))] hover:bg-[var(--studio-surface-hover,theme(colors.zinc.50))]"
    >
      {icon}
      {label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

function MetricTile({ metric }: { metric: NorthStarMetric }) {
  return (
    <article className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            {metric.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--studio-text,theme(colors.zinc.950))]">
            {metric.value}
          </p>
        </div>
        <StatusPill value={metric.status} />
      </div>
      <p className="mt-3 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
        Target: {metric.target}
      </p>
      <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
        {metric.detail}
      </p>
    </article>
  );
}

function AgentStatusIcon({ status }: { status: AgentCompanyStatus }) {
  if (status === "running") {
    return <Activity className="h-4 w-4 text-sky-700" aria-hidden="true" />;
  }
  if (status === "blocked") {
    return <AlertTriangle className="h-4 w-4 text-red-700" aria-hidden="true" />;
  }
  if (status === "review_needed") {
    return <Gauge className="h-4 w-4 text-amber-700" aria-hidden="true" />;
  }
  if (status === "disabled") {
    return <PauseCircle className="h-4 w-4 text-zinc-500" aria-hidden="true" />;
  }
  return <Bot className="h-4 w-4 text-zinc-600" aria-hidden="true" />;
}

function AgentCompanyTable({ rows }: { rows: AgentCompanyRow[] }) {
  return (
    <section className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))]">
      <div className="border-b border-[var(--studio-border,theme(colors.zinc.200))] p-4">
        <SectionTitle
          eyebrow="Agent Company"
          title="Quien trabaja y que produce"
          detail="Cada lane muestra heartbeat, trabajo actual, costo, output, confianza y bloqueos."
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--studio-border,theme(colors.zinc.200))] text-sm">
          <thead className="bg-[var(--studio-panel,theme(colors.zinc.50))] text-left text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Agent
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Trabajo actual
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Heartbeat
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Output
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Riesgo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--studio-border,theme(colors.zinc.200))]">
            {rows.map((row) => (
              <tr key={row.lane}>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))]">
                      <AgentStatusIcon status={row.status} />
                    </span>
                    <div>
                      <div className="font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                        {row.name}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <StatusPill value={row.status} />
                        <StatusPill value={row.mode} />
                      </div>
                      <p className="mt-2 max-w-xs text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        {row.mission}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="max-w-sm px-4 py-3 align-top text-[var(--studio-text,theme(colors.zinc.800))]">
                  {row.currentWork}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                  {formatDate(row.heartbeatAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top">
                  <div className="font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                    {row.outputCount} outputs
                  </div>
                  <div className="text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    {formatMoney(row.costUsd)}
                    {row.confidence !== null
                      ? ` - conf ${row.confidence.toFixed(2)}`
                      : ""}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                  {row.blockedCount} blocked
                  <br />
                  {row.reviewNeededCount} review
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function feedIcon(item: AutonomyFeedItem) {
  if (item.kind === "rollback") {
    return <RefreshCcw className="h-4 w-4 text-red-700" aria-hidden="true" />;
  }
  if (item.kind === "blocked") {
    return <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />;
  }
  if (item.kind === "running") {
    return <Activity className="h-4 w-4 text-sky-700" aria-hidden="true" />;
  }
  return <Zap className="h-4 w-4 text-emerald-700" aria-hidden="true" />;
}

function AutonomyFeed({ items }: { items: AutonomyFeedItem[] }) {
  return (
    <section className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))]">
      <div className="border-b border-[var(--studio-border,theme(colors.zinc.200))] p-4">
        <SectionTitle
          eyebrow="Autonomy Feed"
          title="Publicaciones, applies, bloqueos y rollback"
        />
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
          No hay eventos autonomos recientes.
        </p>
      ) : (
        <ol className="divide-y divide-[var(--studio-border,theme(colors.zinc.200))]">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 p-4">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))]">
                {feedIcon(item)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                    {item.title}
                  </p>
                  <StatusPill value={item.kind} />
                  <span className="text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    {laneLabel(item.lane)} - {item.actionClass}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                  {item.detail}
                </p>
                <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  {formatDate(item.occurredAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ImpactLedger({ rows }: { rows: ImpactLedgerRow[] }) {
  return (
    <section className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))]">
      <div className="border-b border-[var(--studio-border,theme(colors.zinc.200))] p-4">
        <SectionTitle
          eyebrow="Impact Ledger"
          title="Work item -> publicacion -> metrica -> resultado"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--studio-border,theme(colors.zinc.200))] text-sm">
          <thead className="bg-[var(--studio-panel,theme(colors.zinc.50))] text-left text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Work item
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Target
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Metrica
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Resultado
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Evaluacion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--studio-border,theme(colors.zinc.200))]">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]"
                >
                  No hay outcomes enlazados todavia. Las publicaciones autonomas
                  deben crear uno antes de salir de v1.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-xs px-4 py-3 align-top font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                    {row.workItemTitle}
                  </td>
                  <td className="max-w-xs px-4 py-3 align-top text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                    {row.target}
                  </td>
                  <td className="px-4 py-3 align-top text-[var(--studio-text,theme(colors.zinc.800))]">
                    {row.metric}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                    <span className="font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                      {row.current}
                    </span>
                    <br />
                    Baseline {row.baseline}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <StatusPill value={row.status} />
                    <div className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      {formatDate(row.evaluationDate)}
                      <br />
                      {row.funnelAttributionStatus}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RiskBudget({ rows }: { rows: RiskBudgetRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--studio-border,theme(colors.zinc.200))] text-sm">
        <thead className="bg-[var(--studio-panel,theme(colors.zinc.50))] text-left text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Lane
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Accion
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Estado
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Daily
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Weekly
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Max risk
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--studio-border,theme(colors.zinc.200))]">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-6 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]"
              >
                No hay policies de autonomia provisionadas para este website.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                  {laneLabel(row.lane)}
                </td>
                <td className="px-4 py-3 text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                  {row.actionClass}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill value={row.killSwitchEnabled ? "blocked" : row.enabled ? "live" : "paused"} />
                    {row.dryRunOnly ? <StatusPill value="dry_run" /> : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--studio-text,theme(colors.zinc.800))]">
                  {row.dailyUsed} / {row.dailyCap}
                </td>
                <td className="px-4 py-3 text-[var(--studio-text,theme(colors.zinc.800))]">
                  {row.weeklyUsed} / {row.weeklyCap}
                </td>
                <td className="px-4 py-3 text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                  {row.maxRiskLevel}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function GrowthCeoCockpit({ data }: { data: GrowthCeoCockpitData }) {
  const workboardHref = `/dashboard/${data.websiteId}/growth/workboard`;
  const runsHref = `/dashboard/${data.websiteId}/growth/runs`;
  const dataHealthHref = `/dashboard/${data.websiteId}/growth/data-health`;
  const agentsHref = `/dashboard/${data.websiteId}/growth/agents`;

  return (
    <div className="flex flex-col gap-5" data-testid="growth-ceo-cockpit">
      {data.riskBudget.missingTables.length > 0 ? (
        <div
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Missing Growth tables: {data.riskBudget.missingTables.join(", ")}.
          The cockpit is rendering available signals only.
        </div>
      ) : null}

      <section className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 text-white">
                <Target className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  CEO Cockpit
                </p>
                <h1 className="text-xl font-semibold text-[var(--studio-text,theme(colors.zinc.950))]">
                  Growth OS persigue {data.objective.northStar}
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-4xl break-words text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
              {data.objective.scope}. Lagging outcome:{" "}
              <span className="break-words font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                {data.objective.laggingOutcome}
              </span>
              .
            </p>
            <p className="mt-2 max-w-4xl text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              {data.objective.autonomyRule}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionLink
              href={workboardHref}
              label="Workboard"
              icon={<Activity className="h-4 w-4" aria-hidden="true" />}
            />
            <ActionLink
              href={runsHref}
              label="Review Queue"
              icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            />
            <ActionLink
              href={dataHealthHref}
              label="Data Health"
              icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            />
            <ActionLink
              href={agentsHref}
              label="Agents"
              icon={<Bot className="h-4 w-4" aria-hidden="true" />}
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="north-star-heading"
        className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <h2 id="north-star-heading" className="sr-only">
          North Star metrics
        </h2>
        {data.northStar.map((metric) => (
          <MetricTile key={metric.key} metric={metric} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AgentCompanyTable rows={data.agentCompany} />
        </div>
        <AutonomyFeed items={data.autonomyFeed} />
      </div>

      <ImpactLedger rows={data.impactLedger} />

      <section className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))]">
        <div className="grid gap-4 border-b border-[var(--studio-border,theme(colors.zinc.200))] p-4 lg:grid-cols-2 lg:items-start">
          <SectionTitle
            eyebrow="Risk / Budget"
            title="Caps, smoke, rollback y kill switch"
            detail="Paid mutation queda bloqueado en v1; organic y technical solo avanzan si policy, caps, smoke, rollback y medicion estan presentes."
          />
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="border-l border-[var(--studio-border,theme(colors.zinc.200))] py-1 pl-3">
              <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                Kill switch
              </p>
              <p className="font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
                {data.riskBudget.killSwitchActive ? "On" : "Off"}
              </p>
            </div>
            <div className="border-l border-[var(--studio-border,theme(colors.zinc.200))] py-1 pl-3">
              <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                Policies
              </p>
              <p className="font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
                {data.riskBudget.enabledPolicies}
              </p>
            </div>
            <div className="border-l border-[var(--studio-border,theme(colors.zinc.200))] py-1 pl-3">
              <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                Smoke fail
              </p>
              <p className="font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
                {data.riskBudget.smokeFailures}
              </p>
            </div>
            <div className="border-l border-[var(--studio-border,theme(colors.zinc.200))] py-1 pl-3">
              <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                Paid blocked
              </p>
              <p className="font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
                {data.riskBudget.blockedPaidMutations}
              </p>
            </div>
          </div>
        </div>
        <RiskBudget rows={data.riskBudget.policies} />
      </section>

      <p className="text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
        Generated {formatDate(data.generatedAt)} - role {data.role}
      </p>
    </div>
  );
}
