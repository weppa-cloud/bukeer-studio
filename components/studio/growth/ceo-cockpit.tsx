import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Lock,
  PauseCircle,
  Radar,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import {
  dryVerifyGrowthPublicationJobRollback,
  pauseAutonomyLane,
  rollbackGrowthPublicationJob,
  toggleGrowthKillSwitch,
  toggleGrowthAutonomyPolicy,
  togglePolicyDryRunOnly,
  updateAutonomyPolicyCaps,
} from "@/app/dashboard/[websiteId]/growth/overview/actions";
import type {
  AgentCompanyRow,
  AgentCompanyStatus,
  AutonomyFeedItem,
  GrowthCeoCockpit as GrowthCeoCockpitData,
  ImpactLedgerRow,
  NorthStarMetric,
  RiskBudgetRow,
  RollbackPublicationJobRow,
  RuntimeCycleHealth,
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
  locked: "border-zinc-300 bg-zinc-100 text-zinc-600",
  needs_backend: "border-amber-200 bg-amber-50 text-amber-800",
  dry_run: "border-blue-200 bg-blue-50 text-blue-800",
  fresh: "border-emerald-200 bg-emerald-50 text-emerald-800",
  stale: "border-red-200 bg-red-50 text-red-800",
  low_confidence: "border-amber-200 bg-amber-50 text-amber-800",
  ready_for_backlog: "border-emerald-200 bg-emerald-50 text-emerald-800",
  candidate: "border-zinc-200 bg-zinc-50 text-zinc-700",
  promoted: "border-blue-200 bg-blue-50 text-blue-800",
  rejected: "border-zinc-300 bg-zinc-100 text-zinc-600",
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

function JsonBlock({
  label,
  value,
  testId,
}: {
  label: string;
  value: Record<string, unknown>;
  testId: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
        {label}
      </p>
      <pre
        data-testid={testId}
        className="max-h-44 overflow-auto rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))] p-2 text-[11px] leading-relaxed text-[var(--studio-text,theme(colors.zinc.800))]"
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
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

function DisabledAction({
  label,
  icon,
}: {
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))] px-3 py-2 text-sm font-medium text-[var(--studio-text-muted,theme(colors.zinc.500))]"
    >
      {icon}
      {label}
      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

function ActionForm({
  action,
  label,
  icon,
  fields,
}: {
  action: (formData: FormData) => Promise<unknown>;
  label: string;
  icon: ReactNode;
  fields: Record<string, string>;
}) {
  return (
    <form action={action as (formData: FormData) => Promise<void>}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] px-3 py-2 text-sm font-medium text-[var(--studio-text,theme(colors.zinc.800))] hover:border-[var(--studio-border-strong,theme(colors.zinc.300))] hover:bg-[var(--studio-surface-hover,theme(colors.zinc.50))]"
      >
        {icon}
        {label}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </form>
  );
}

function CompactActionForm({
  action,
  label,
  fields,
  disabled = false,
  testId,
}: {
  action: (formData: FormData) => Promise<unknown>;
  label: string;
  fields: Record<string, string>;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <form action={action as (formData: FormData) => Promise<void>}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        disabled={disabled}
        data-testid={testId}
        className={
          disabled
            ? "rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 text-xs font-medium text-[var(--studio-text-muted,theme(colors.zinc.400))]"
            : "rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 text-xs font-medium text-[var(--studio-text,theme(colors.zinc.700))] hover:bg-[var(--studio-surface-hover,theme(colors.zinc.100))]"
        }
      >
        {label}
      </button>
    </form>
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

function RuntimeCyclePanel({ health }: { health: RuntimeCycleHealth }) {
  const active = health.activeCycle;
  const last = health.lastCycle;
  return (
    <section
      data-testid="growth-runtime-cycle-health"
      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <SectionTitle
          eyebrow="Runtime"
          title="Active cycle and scheduler health"
          detail="Cycle ledger status for the production loop: scheduler heartbeat, active cycle, last completed cycle and failure counters."
        />
        <div
          data-testid="growth-scheduler-health"
          className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))] p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Scheduler
            </span>
            <StatusPill value={health.schedulerStatus} />
          </div>
          <p className="mt-2 text-sm text-[var(--studio-text,theme(colors.zinc.800))]">
            {health.schedulerMessage}
          </p>
          <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            Last heartbeat {formatDate(health.lastHeartbeatAt)}
          </p>
          {health.missingTables.length > 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              Missing: {health.missingTables.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[{ label: "Active cycle", cycle: active }, { label: "Latest cycle", cycle: last }].map(
          ({ label, cycle }) => (
            <article
              key={label}
              data-testid={
                label === "Active cycle"
                  ? "growth-active-cycle"
                  : "growth-latest-cycle"
              }
              className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
                  {label}
                </h3>
                <StatusPill value={cycle?.status ?? "missing"} />
              </div>
              {cycle ? (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Key
                    </dt>
                    <dd className="break-words font-mono">{cycle.cycleKey}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Trigger
                    </dt>
                    <dd>{cycle.trigger}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Started
                    </dt>
                    <dd>{formatDate(cycle.startedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Finished
                    </dt>
                    <dd>{formatDate(cycle.finishedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Env
                    </dt>
                    <dd>{cycle.environment}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Git
                    </dt>
                    <dd className="font-mono">{cycle.gitSha?.slice(0, 8) ?? "n/a"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                  No cycle row is available yet.
                </p>
              )}
            </article>
          ),
        )}
      </div>
    </section>
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

function scoreStatus(score: number) {
  if (score >= 90) return "live";
  if (score >= 70) return "measuring";
  return "watch";
}

function HumanOperations({
  data,
  workboardHref,
  runsHref,
  dataHealthHref,
  agentsHref,
}: {
  data: GrowthCeoCockpitData;
  workboardHref: string;
  runsHref: string;
  dataHealthHref: string;
  agentsHref: string;
}) {
  const hasTables = data.riskBudget.missingTables.length === 0;
  const hasAgents = data.agentCompany.length > 0;
  const hasPolicies = data.riskBudget.policies.length > 0;
  const hasLedger = data.impactLedger.length > 0;
  const hasFeed = data.autonomyFeed.length > 0;
  const rollbackJobId =
    data.impactLedger.find((row) => row.publicationJobId)?.publicationJobId ??
    null;
  const hasBlocks =
    data.autonomyFeed.some((item) =>
      ["blocked", "review_needed", "rollback"].includes(item.kind),
    ) || data.riskBudget.blockedPaidMutations > 0;

  const checks = [
    { label: "Objetivo comercial visible", pass: true },
    { label: "Compania de agentes visible", pass: hasAgents },
    { label: "Contratos Supabase + RLS listos", pass: hasTables },
    { label: "Feed operativo observable", pass: hasFeed },
    { label: "Ledger de impacto con outcomes", pass: hasLedger },
    { label: "Policies de autonomia provisionadas", pass: hasPolicies },
  ];
  const score = Math.round(
    (checks.filter((check) => check.pass).length / checks.length) * 100,
  );

  const flows = [
    {
      title: "Priorizar trabajo",
      owner: "CEO / Growth lead",
      state: "live",
      href: workboardHref,
      action: null,
      cta: "Abrir Workboard",
      detail: "Backlog, work items, riesgo, next action y estado por lane.",
      icon: <ClipboardCheck className="h-4 w-4" aria-hidden="true" />,
    },
    {
      title: "Revisar propuestas",
      owner: "Curator / Technical owner",
      state: "live",
      href: runsHref,
      action: null,
      cta: "Abrir revisiones",
      detail: "Aprobar, rechazar o devolver change sets y aprendizajes.",
      icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
    },
    {
      title: "Auditar agentes",
      owner: "Operator",
      state: "live",
      href: agentsHref,
      action: null,
      cta: "Abrir Agents",
      detail: "Heartbeat, modo, confianza, costo y output por lane.",
      icon: <Bot className="h-4 w-4" aria-hidden="true" />,
    },
    {
      title: "Validar datos",
      owner: "Data owner",
      state: "live",
      href: dataHealthHref,
      action: null,
      cta: "Abrir Data Health",
      detail: "Calidad de señales, runtime, aprendizaje y atribucion.",
      icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
    },
    {
      title: "Pausar autonomia",
      owner: "Admin",
      state: hasPolicies ? "needs_backend" : "locked",
      href: null,
      action: hasPolicies ? "kill_switch" : null,
      cta: "Kill switch",
      detail: "Requiere server action admin-only sobre growth_autonomy_policies.",
      icon: <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />,
    },
    {
      title: "Rollback publicacion",
      owner: "Admin / Technical owner",
      state: rollbackJobId ? "needs_backend" : "locked",
      href: null,
      action: rollbackJobId ? "rollback" : null,
      cta: "Rollback",
      detail: "Requiere publication job con snapshot, smoke y rollback payload.",
      icon: <RefreshCcw className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  return (
    <section
      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))]"
      data-testid="growth-human-operations"
    >
      <div className="grid gap-4 border-b border-[var(--studio-border,theme(colors.zinc.200))] p-4 lg:grid-cols-[1fr_280px] lg:items-start">
        <SectionTitle
          eyebrow="Human Operating Console"
          title="Flujos humanos y readiness"
          detail="El humano controla priorizacion, aprobaciones, auditoria, data health y emergencia; la autonomia solo avanza cuando hay evidencia y policy."
        />
        <div className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              UI readiness
            </span>
            <StatusPill value={scoreStatus(score)} />
          </div>
          <p className="mt-2 text-3xl font-semibold text-[var(--studio-text,theme(colors.zinc.950))]">
            {score}/100
          </p>
          <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
            Base score calculado con contratos, agentes, feed, ledger y policies.
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3 md:grid-cols-2">
          {flows.map((flow) => (
            <article
              key={flow.title}
              className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-3"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))]">
                  {flow.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                      {flow.title}
                    </h3>
                    <StatusPill value={flow.state} />
                  </div>
                  <p className="mt-1 text-xs font-medium text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    {flow.owner}
                  </p>
                  <p className="mt-2 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                    {flow.detail}
                  </p>
                  <div className="mt-3">
                    {flow.href ? (
                      <ActionLink href={flow.href} label={flow.cta} icon={flow.icon} />
                    ) : flow.action === "kill_switch" ? (
                      <ActionForm
                        action={toggleGrowthKillSwitch}
                        label={
                          data.riskBudget.killSwitchActive
                            ? "Desactivar kill switch"
                            : "Activar kill switch"
                        }
                        icon={flow.icon}
                        fields={{
                          websiteId: data.websiteId,
                          nextEnabled: String(!data.riskBudget.killSwitchActive),
                        }}
                      />
                    ) : flow.action === "rollback" && rollbackJobId ? (
                      <ActionForm
                        action={rollbackGrowthPublicationJob}
                        label={flow.cta}
                        icon={flow.icon}
                        fields={{
                          websiteId: data.websiteId,
                          publicationJobId: rollbackJobId,
                        }}
                      />
                    ) : (
                      <DisabledAction label={flow.cta} icon={flow.icon} />
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))] p-3">
          <h3 className="text-sm font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
            Base evaluation
          </h3>
          <ul className="mt-3 space-y-2">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 text-sm">
                {check.pass ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" aria-hidden="true" />
                )}
                <span className="text-[var(--studio-text-muted,theme(colors.zinc.700))]">
                  {check.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-3 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
            {hasBlocks
              ? "Hay bloqueos o revisiones pendientes; operar desde Review Queue antes de activar mas autonomia."
              : "Sin bloqueos criticos visibles en el feed actual."}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ProfileFlow({ data }: { data: GrowthCeoCockpitData }) {
  const profileFlow = data.profileFlow;

  return (
    <section
      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))]"
      data-testid="growth-profile-flow"
    >
      <div className="grid gap-4 border-b border-[var(--studio-border,theme(colors.zinc.200))] p-4 lg:grid-cols-[1fr_420px] lg:items-start">
        <SectionTitle
          eyebrow="Data Flow"
          title="Profile Freshness + Opportunity Candidates"
          detail="El backlog nace de señales versionadas, perfiles frescos y candidatos con evidencia; el runtime no debe publicar si falta profile snapshot."
        />
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5 lg:grid-cols-5">
          <div className="border-l border-[var(--studio-border,theme(colors.zinc.200))] py-1 pl-3">
            <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Fresh
            </p>
            <p className="font-semibold">{profileFlow.freshProfiles}</p>
          </div>
          <div className="border-l border-[var(--studio-border,theme(colors.zinc.200))] py-1 pl-3">
            <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Stale
            </p>
            <p className="font-semibold">{profileFlow.staleProfiles}</p>
          </div>
          <div className="border-l border-[var(--studio-border,theme(colors.zinc.200))] py-1 pl-3">
            <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Low conf
            </p>
            <p className="font-semibold">{profileFlow.lowConfidenceProfiles}</p>
          </div>
          <div className="border-l border-[var(--studio-border,theme(colors.zinc.200))] py-1 pl-3">
            <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Ready
            </p>
            <p className="font-semibold">{profileFlow.readyCandidates}</p>
          </div>
          <div className="border-l border-[var(--studio-border,theme(colors.zinc.200))] py-1 pl-3">
            <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Blocked
            </p>
            <p className="font-semibold">{profileFlow.blockedCandidates}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
            Profiles
          </h3>
          {profileFlow.profiles.length === 0 ? (
            <p className="mt-3 rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))] p-3 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
              No hay perfiles versionados todavia. El freshness gate bloqueara
              promocion autonoma hasta que existan perfiles requeridos.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--studio-border,theme(colors.zinc.200))] text-sm">
                <thead className="text-left text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Perfil</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Conf</th>
                    <th className="px-3 py-2 font-medium">Vence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--studio-border,theme(colors.zinc.200))]">
                  {profileFlow.profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                          {profile.profileType.replaceAll("_", " ")}
                        </div>
                        <div className="text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                          {profile.subject} - {profile.ageHours}h
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill value={profile.status} />
                      </td>
                      <td className="px-3 py-2 text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                        {profile.confidence.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                        {formatDate(profile.validUntil)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
            Opportunity Candidates
          </h3>
          {profileFlow.candidates.length === 0 ? (
            <p className="mt-3 rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))] p-3 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
              No hay candidatos puntuados. El detector debe agrupar senales
              antes de crear backlog.
            </p>
          ) : (
            <ol className="mt-3 divide-y divide-[var(--studio-border,theme(colors.zinc.200))] rounded-md border border-[var(--studio-border,theme(colors.zinc.200))]">
              {profileFlow.candidates.map((candidate) => (
                <li key={candidate.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-panel,theme(colors.zinc.50))]">
                      <Radar className="h-4 w-4 text-zinc-700" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-[var(--studio-text,theme(colors.zinc.900))]">
                          {candidate.title}
                        </p>
                        <StatusPill value={candidate.status} />
                      </div>
                      <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        {candidate.candidateType.replaceAll("_", " ")} -{" "}
                        {laneLabel(candidate.lane)} - {candidate.actionClass} -
                        score {candidate.totalScore}
                      </p>
                      {candidate.successMetric ? (
                        <p className="mt-1 break-words text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                          {candidate.successMetric}
                        </p>
                      ) : null}
                      {candidate.blockingReason ? (
                        <p className="mt-1 break-words text-xs text-amber-700">
                          {candidate.blockingReason}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function AgenticControl({ data }: { data: GrowthCeoCockpitData }) {
  const control = data.agenticControl;
  return (
    <section
      data-testid="growth-agentic-control"
      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4"
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <SectionTitle
          eyebrow="Company Control"
          title="Brain, wakeups y delegacion"
          detail="El Growth CEO Brain razona y crea trabajo; el executor live-gated sigue siendo la unica frontera de mutacion productiva."
        />
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2">
            <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Decisions
            </p>
            <p className="font-semibold">{control.decisions.length}</p>
          </div>
          <div className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2">
            <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Wakeups
            </p>
            <p className="font-semibold">{control.wakeups.length}</p>
          </div>
          <div className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2">
            <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Tasks
            </p>
            <p className="font-semibold">{control.taskSessions.length}</p>
          </div>
          <div className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2">
            <p className="text-[11px] uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Sensitive
            </p>
            <p className="font-semibold">{control.blockedSensitiveDecisions}</p>
          </div>
        </div>
      </div>

      {control.missingTables.length > 0 ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          Missing agentic tables: {control.missingTables.join(", ")}.
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <h3 className="text-sm font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
            Recent brain decisions
          </h3>
          {control.decisions.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              No brain decisions recorded yet.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-[var(--studio-surface-muted,theme(colors.zinc.50))] text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  <tr>
                    <th className="px-3 py-2 text-left">Decision</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Learning</th>
                    <th className="px-3 py-2 text-left">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {control.decisions.slice(0, 6).map((decision) => (
                    <tr
                      key={decision.id}
                      className="border-t border-[var(--studio-border,theme(colors.zinc.200))]"
                    >
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <StatusPill value={decision.decisionType} />
                          <span className="max-w-[360px] truncate text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                            {decision.objective}
                          </span>
                          {decision.noGoReasons.length > 0 ? (
                            <span className="text-xs text-amber-700">
                              {decision.noGoReasons.join(", ")}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill value={decision.materializationStatus} />
                        <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                          conf {(decision.confidence * 100).toFixed(0)}%
                        </p>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <p>{decision.createdCandidates} candidates</p>
                        <p>{decision.delegatedTasks} tasks</p>
                        <p>{decision.blockedDecisions} blocked</p>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <p>{decision.memoryReads} memories</p>
                        <p>{decision.skillReads} skills</p>
                        <p>{decision.outcomeReferences} outcomes</p>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {decision.contextSnapshotId?.slice(0, 8) ?? "n/a"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
              Wakeup queue
            </h3>
            <div className="mt-2 space-y-2">
              {control.wakeups.slice(0, 5).map((wakeup) => (
                <div
                  key={wakeup.id}
                  className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{laneLabel(wakeup.lane)}</span>
                    <StatusPill value={wakeup.status} />
                  </div>
                  <p className="mt-1 text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    {wakeup.source} - priority {wakeup.priority} - coalesced{" "}
                    {wakeup.coalescedCount}
                  </p>
                </div>
              ))}
              {control.wakeups.length === 0 ? (
                <p className="text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  No queued wakeups.
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
              Delegated task sessions
            </h3>
            <div className="mt-2 space-y-2">
              {control.taskSessions.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {laneLabel(task.assignedLane)}
                    </span>
                    <StatusPill value={task.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    {task.handoffSummary}
                  </p>
                  <p className="mt-1 text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    deps {task.dependencies} - decision{" "}
                    {task.decisionId?.slice(0, 8) ?? "n/a"}
                  </p>
                </div>
              ))}
              {control.taskSessions.length === 0 ? (
                <p className="text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  No delegated task sessions.
                </p>
              ) : null}
            </div>
          </div>
        </div>
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
  const autoPublished = items.filter(
    (item) => item.kind === "auto_published",
  ).length;
  const autoApplied = items.filter((item) => item.kind === "auto_applied").length;
  const rolledBack = items.filter((item) => item.kind === "rollback").length;
  const blocked = items.filter((item) => item.kind === "blocked").length;

  return (
    <section
      data-testid="growth-autonomy-feed"
      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))]"
    >
      <div className="border-b border-[var(--studio-border,theme(colors.zinc.200))] p-4">
        <SectionTitle
          eyebrow="Autonomy Feed"
          title="Publicaciones, applies, bloqueos y rollback"
        />
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Auto-published
            </dt>
            <dd className="font-semibold">{autoPublished}</dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Auto-applied
            </dt>
            <dd className="font-semibold">{autoApplied}</dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Rolled back
            </dt>
            <dd className="font-semibold">{rolledBack}</dd>
          </div>
          <div>
            <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              Blocked
            </dt>
            <dd className="font-semibold">{blocked}</dd>
          </div>
        </dl>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
          No hay eventos autonomos recientes.
        </p>
      ) : (
        <ol className="divide-y divide-[var(--studio-border,theme(colors.zinc.200))]">
          {items.map((item) => (
            <li
              key={item.id}
              data-testid={`growth-autonomy-feed-item-${item.kind}`}
              className="flex gap-3 p-4"
            >
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
    <section
      data-testid="growth-impact-ledger"
      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))]"
    >
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

function RollbackJobs({
  websiteId,
  rows,
}: {
  websiteId: string;
  rows: RollbackPublicationJobRow[];
}) {
  return (
    <section
      data-testid="growth-rollback-detail"
      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))]"
    >
      <div className="border-b border-[var(--studio-border,theme(colors.zinc.200))] p-4">
        <SectionTitle
          eyebrow="Rollback"
          title="Publication job rollback detail"
          detail="Dry-verify checks the rollback payload without restoring data. Rollback restores the recorded payload for applied or smoke-checked jobs."
        />
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]">
          No rollbackable publication jobs are visible yet.
        </p>
      ) : (
        <div className="divide-y divide-[var(--studio-border,theme(colors.zinc.200))]">
          {rows.map((row) => (
            <article key={row.id} className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-sm font-semibold text-[var(--studio-text,theme(colors.zinc.900))]">
                      {row.affectedRoute}
                    </h3>
                    <StatusPill value={row.status} />
                    <StatusPill value={row.jobMode} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    {laneLabel(row.lane)} - {row.actionClass} -{" "}
                    {row.targetTable}
                    {row.targetId ? `:${row.targetId}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CompactActionForm
                    action={dryVerifyGrowthPublicationJobRollback}
                    label="Dry-verify"
                    fields={{
                      websiteId,
                      publicationJobId: row.id,
                    }}
                    testId="growth-rollback-dry-verify"
                  />
                  <CompactActionForm
                    action={rollbackGrowthPublicationJob}
                    label="Rollback"
                    fields={{
                      websiteId,
                      publicationJobId: row.id,
                    }}
                    disabled={!row.canRollback}
                    testId="growth-rollback-apply"
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <JsonBlock
                  label="Before snapshot"
                  value={row.beforeSnapshot}
                  testId="growth-rollback-before-snapshot"
                />
                <JsonBlock
                  label="After payload"
                  value={row.afterPayload}
                  testId="growth-rollback-after-payload"
                />
                <JsonBlock
                  label="Rollback payload"
                  value={row.rollbackPayload}
                  testId="growth-rollback-payload"
                />
                <JsonBlock
                  label="Smoke evidence"
                  value={row.smokeEvidence}
                  testId="growth-rollback-smoke-evidence"
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PolicyCapsForm({
  websiteId,
  row,
}: {
  websiteId: string;
  row: RiskBudgetRow;
}) {
  return (
    <form
      action={
        updateAutonomyPolicyCaps as unknown as (
          formData: FormData,
        ) => Promise<void>
      }
      className="grid min-w-[260px] grid-cols-3 gap-2"
    >
      <input type="hidden" name="websiteId" value={websiteId} />
      <input type="hidden" name="policyId" value={row.id} />
      <label className="text-[11px] font-medium text-[var(--studio-text-muted,theme(colors.zinc.500))]">
        Daily
        <input
          name="dailyCap"
          type="number"
          min={0}
          defaultValue={row.dailyCap}
          className="mt-1 w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 text-xs"
        />
      </label>
      <label className="text-[11px] font-medium text-[var(--studio-text-muted,theme(colors.zinc.500))]">
        Weekly
        <input
          name="weeklyCap"
          type="number"
          min={0}
          defaultValue={row.weeklyCap}
          className="mt-1 w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 text-xs"
        />
      </label>
      <label className="text-[11px] font-medium text-[var(--studio-text-muted,theme(colors.zinc.500))]">
        Risk
        <input
          name="maxRiskScore"
          type="number"
          min={0}
          max={100}
          defaultValue={row.maxRiskScore}
          className="mt-1 w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 text-xs"
        />
      </label>
      <button
        type="submit"
        data-testid="growth-policy-update-caps"
        className="col-span-3 rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 text-xs font-medium text-[var(--studio-text,theme(colors.zinc.700))] hover:bg-[var(--studio-surface-hover,theme(colors.zinc.100))]"
      >
        Update caps
      </button>
    </form>
  );
}

const RISK_BUDGET_EMPTY_LANES = [
  "Orchestrator",
  "Technical Remediation",
  "Transcreation",
  "Content Creator",
  "Content Curator",
];

function RiskBudget({
  websiteId,
  rows,
}: {
  websiteId: string;
  rows: RiskBudgetRow[];
}) {
  return (
    <div data-testid="growth-risk-budget-table" className="overflow-x-auto">
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
            <th scope="col" className="px-4 py-3 font-medium">
              Controls
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--studio-border,theme(colors.zinc.200))]">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-6 text-sm text-[var(--studio-text-muted,theme(colors.zinc.600))]"
                >
                No hay policies de autonomia provisionadas para este website.
                Lanes esperadas: {RISK_BUDGET_EMPTY_LANES.join(", ")}.
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
                  {row.pausedReason ? (
                    <p className="mt-1 text-xs text-amber-700">
                      {row.pausedReason}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-[var(--studio-text,theme(colors.zinc.800))]">
                  {row.dailyUsed} / {row.dailyCap}
                </td>
                <td className="px-4 py-3 text-[var(--studio-text,theme(colors.zinc.800))]">
                  {row.weeklyUsed} / {row.weeklyCap}
                </td>
                <td className="px-4 py-3 text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                  {row.maxRiskLevel} / {row.maxRiskScore}
                  <div className="mt-1 text-xs">
                    {row.requiredChecks.length} checks · {row.policyVersion}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex min-w-[320px] flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <CompactActionForm
                        action={toggleGrowthAutonomyPolicy}
                        label={row.enabled ? "Disable" : "Enable"}
                        fields={{
                          websiteId,
                          policyId: row.id,
                          enabled: String(!row.enabled),
                        }}
                        testId="growth-policy-toggle-enabled"
                      />
                      <CompactActionForm
                        action={togglePolicyDryRunOnly}
                        label={row.dryRunOnly ? "Set live" : "Set dry-run"}
                        fields={{
                          websiteId,
                          policyId: row.id,
                          dryRunOnly: String(!row.dryRunOnly),
                        }}
                        testId="growth-policy-toggle-dry-run"
                      />
                      <CompactActionForm
                        action={pauseAutonomyLane}
                        label="Pause lane"
                        fields={{
                          websiteId,
                          lane: row.lane,
                          reason: `Paused from CEO cockpit for ${row.actionClass}.`,
                        }}
                        testId="growth-policy-pause-lane"
                      />
                    </div>
                    <PolicyCapsForm websiteId={websiteId} row={row} />
                  </div>
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
                <h2 className="text-xl font-semibold text-[var(--studio-text,theme(colors.zinc.950))]">
                  Persigue {data.objective.northStar}
                </h2>
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
              label="Reviews"
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

      <RuntimeCyclePanel health={data.runtimeCycle} />

      <HumanOperations
        data={data}
        workboardHref={workboardHref}
        runsHref={runsHref}
        dataHealthHref={dataHealthHref}
        agentsHref={agentsHref}
      />

      <ProfileFlow data={data} />

      <AgenticControl data={data} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AgentCompanyTable rows={data.agentCompany} />
        </div>
        <AutonomyFeed items={data.autonomyFeed} />
      </div>

      <ImpactLedger rows={data.impactLedger} />

      <RollbackJobs websiteId={data.websiteId} rows={data.rollbackJobs} />

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
        <RiskBudget websiteId={data.websiteId} rows={data.riskBudget.policies} />
      </section>

      <p className="text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
        Generated {formatDate(data.generatedAt)} - role {data.role}
      </p>
    </div>
  );
}
