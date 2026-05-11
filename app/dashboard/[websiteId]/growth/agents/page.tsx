import Link from "next/link";
import type { AgentLane } from "@bukeer/website-contract";
import { CANONICAL_LANES, getGrowthAgents } from "@/lib/growth/console/queries";
import {
  materializeGrowthHermesArtifact,
  seedGrowthHermesAgentInstances,
  updateGrowthHermesAgentInstance,
  updateGrowthLearningArtifact,
} from "./actions";

/**
 * Growth OS Console — Agents tab (#405).
 *
 * Server Component. Read-only registry view: lists every
 * `growth_agent_definitions` row scoped to (account_id, website_id) and
 * surfaces the runtime knobs the orchestrator consults.
 *
 * Mutations (toggle enabled, swap mode, edit thresholds, bump versions)
 * land in a follow-up PR — the autonomy gate (#408) must ship first so the
 * UI cannot trigger an unsafe `auto_apply_safe` switch.
 *
 * Refs:
 *   - SPEC_GROWTH_OS_SYMPHONY_ORCHESTRATOR.md §"Bukeer Studio UI Scope"
 *   - SPEC_GROWTH_OS_AGENT_LANES.md (lane catalogue)
 */

interface AgentsPageProps {
  params: Promise<{ websiteId: string }>;
}

const LANE_LABELS: Record<AgentLane, string> = {
  orchestrator: "Orchestrator",
  technical_remediation: "Technical Remediation",
  transcreation: "Transcreation",
  content_creator: "Content Creator",
  content_curator: "Content Curator",
};

const LANE_MISSIONS: Record<AgentLane, string> = {
  orchestrator: "Router de bloqueos, SSOT y evidencia agregada.",
  technical_remediation: "Fixes tecnicos, sitemap, canonical, H1/meta y smoke.",
  transcreation: "Adaptacion por mercado/locale con quality gate humano.",
  content_creator: "Briefs y updates con SERP, baseline y ventaja competitiva.",
  content_curator: "Curaduria, Council packet y control de experimentos.",
};

const LANE_SAFETY: Record<AgentLane, string> = {
  orchestrator: "Nunca muta negocio directamente.",
  technical_remediation: "Live gated solo reversible y smoke-verificable.",
  transcreation: "Live gated solo con quality gate y rollback completo.",
  content_creator: "Live gated solo organico con caps, smoke y outcome.",
  content_curator: "Paid, experimentos y outreach siguen bloqueados.",
};

const MODE_LABELS: Record<string, string> = {
  observe_only: "Observe",
  prepare_only: "Prepare",
  auto_apply_safe: "Auto-apply (safe)",
};

type ToolPolicyState = "allowed" | "live_gated" | "gated" | "blocked";

interface ToolAction {
  actionClass: string;
  label: string;
  states: Record<AgentLane, ToolPolicyState>;
}

const TOOL_ACTIONS: ReadonlyArray<ToolAction> = [
  {
    actionClass: "observe",
    label: "Read source facts",
    states: {
      orchestrator: "allowed",
      technical_remediation: "allowed",
      transcreation: "allowed",
      content_creator: "allowed",
      content_curator: "allowed",
    },
  },
  {
    actionClass: "prepare",
    label: "Prepare artifacts",
    states: {
      orchestrator: "allowed",
      technical_remediation: "allowed",
      transcreation: "allowed",
      content_creator: "allowed",
      content_curator: "allowed",
    },
  },
  {
    actionClass: "safe_apply",
    label: "Apply reversible technical change",
    states: {
      orchestrator: "blocked",
      technical_remediation: "live_gated",
      transcreation: "blocked",
      content_creator: "blocked",
      content_curator: "blocked",
    },
  },
  {
    actionClass: "content_publish",
    label: "Publish content",
    states: {
      orchestrator: "blocked",
      technical_remediation: "blocked",
      transcreation: "blocked",
      content_creator: "live_gated",
      content_curator: "live_gated",
    },
  },
  {
    actionClass: "transcreation_merge",
    label: "Merge transcreation",
    states: {
      orchestrator: "blocked",
      technical_remediation: "blocked",
      transcreation: "live_gated",
      content_creator: "blocked",
      content_curator: "blocked",
    },
  },
  {
    actionClass: "paid_mutation",
    label: "Change paid campaigns",
    states: {
      orchestrator: "gated",
      technical_remediation: "gated",
      transcreation: "blocked",
      content_creator: "blocked",
      content_curator: "gated",
    },
  },
  {
    actionClass: "experiment_activation",
    label: "Activate experiment",
    states: {
      orchestrator: "gated",
      technical_remediation: "gated",
      transcreation: "blocked",
      content_creator: "blocked",
      content_curator: "gated",
    },
  },
  {
    actionClass: "outreach_send",
    label: "Send outreach",
    states: {
      orchestrator: "blocked",
      technical_remediation: "blocked",
      transcreation: "blocked",
      content_creator: "gated",
      content_curator: "gated",
    },
  },
];

const POLICY_LABELS: Record<ToolPolicyState, string> = {
  allowed: "Allowed",
  live_gated: "Live gated",
  gated: "Human",
  blocked: "Blocked",
};

const POLICY_CLASSES: Record<ToolPolicyState, string> = {
  allowed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  live_gated: "bg-sky-100 text-sky-800 border border-sky-200",
  gated: "bg-amber-100 text-amber-800 border border-amber-200",
  blocked: "bg-zinc-100 text-zinc-700 border border-zinc-200",
};

function LearningStatusBadge({ status }: { status: string }) {
  const active = status === "active";
  const rejected = status === "rejected" || status === "deprecated";
  return (
    <span
      className={
        active
          ? "inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
          : rejected
            ? "inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
            : "inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
      }
    >
      {status}
    </span>
  );
}

function LearningActionForm({
  websiteId,
  artifactId,
  kind,
  status,
  label,
  disabled = false,
  testId,
}: {
  websiteId: string;
  artifactId: string;
  kind: "skill" | "memory" | "replay";
  status: "active" | "rejected" | "deprecated";
  label: string;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <form
      action={
        updateGrowthLearningArtifact as unknown as (
          formData: FormData,
        ) => Promise<void>
      }
    >
      <input type="hidden" name="websiteId" value={websiteId} />
      <input type="hidden" name="artifactId" value={artifactId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="status" value={status} />
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

function HermesAgentInstances({
  websiteId,
  result,
}: {
  websiteId: string;
  result: Awaited<ReturnType<typeof getGrowthAgents>>;
}) {
  const hermes = result.hermes;
  return (
    <section
      aria-labelledby="hermes-agents-heading"
      data-testid="growth-hermes-agent-instances"
      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <header>
          <h3
            id="hermes-agents-heading"
            className="font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]"
          >
            Hermes Chief of Staff swarm
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            Tipos de agente fijos, instancias editables por tenant. Los limites
            de seguridad son inmutables: Hermes conversa, razona y produce
            artifacts; el executor Growth OS sigue siendo la unica frontera de
            mutacion productiva.
          </p>
        </header>
        <form
          action={
            seedGrowthHermesAgentInstances as unknown as (
              formData: FormData,
            ) => Promise<void>
          }
        >
          <input type="hidden" name="websiteId" value={websiteId} />
          <button
            type="submit"
            data-testid="growth-hermes-seed-instances"
            className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-3 py-2 text-sm font-medium text-[var(--studio-text,theme(colors.zinc.700))] hover:bg-[var(--studio-surface-hover,theme(colors.zinc.100))]"
          >
            Sync agent instances
          </button>
        </form>
      </div>

      {hermes.missingTables.length > 0 ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Missing Hermes tables: {hermes.missingTables.join(", ")}.
        </p>
      ) : null}

      <div
        className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4"
        data-testid="growth-hermes-sidecar-status"
      >
        <div className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-3">
          <div className="text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            Sidecar
          </div>
          <div className="mt-1 font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
            {hermes.sidecar.status}
          </div>
        </div>
        <div className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-3">
          <div className="text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            Sessions
          </div>
          <div className="mt-1 font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
            {hermes.sidecar.completedSessions} done ·{" "}
            {hermes.sidecar.runningSessions} running
          </div>
        </div>
        <div className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-3">
          <div className="text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            Last lane
          </div>
          <div className="mt-1 font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
            {hermes.sidecar.lastLane ?? "none"}
          </div>
        </div>
        <div className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-3">
          <div className="text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            Artifacts
          </div>
          <div className="mt-1 font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
            {hermes.sidecar.artifactCount}
          </div>
        </div>
      </div>

      {hermes.instances.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
          No Hermes agent instances yet. Run sync after applying #482 migration.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {hermes.instances.map((instance) => (
            <article
              key={instance.id}
              className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-[var(--studio-text-strong,theme(colors.zinc.900))]">
                    {instance.displayName}
                  </h4>
                  <p className="mt-0.5 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                    {instance.agentType} · {LANE_LABELS[instance.lane]}
                  </p>
                </div>
                <LearningStatusBadge status={instance.status} />
              </div>
              <form
                action={
                  updateGrowthHermesAgentInstance as unknown as (
                    formData: FormData,
                  ) => Promise<void>
                }
                className="mt-3 grid gap-2"
              >
                <input type="hidden" name="websiteId" value={websiteId} />
                <input type="hidden" name="instanceId" value={instance.id} />
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Status
                    </span>
                    <select
                      name="status"
                      defaultValue={instance.status}
                      className="w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-white px-2 py-1"
                    >
                      <option value="enabled">enabled</option>
                      <option value="paused">paused</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Provider
                    </span>
                    <input
                      name="modelProvider"
                      defaultValue={instance.modelProvider}
                      className="w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Model
                    </span>
                    <input
                      name="modelName"
                      defaultValue={instance.modelName}
                      className="w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1"
                    />
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-6">
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Daily
                    </span>
                    <input
                      name="dailyBudgetUsd"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={instance.dailyBudgetUsd}
                      className="w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Weekly
                    </span>
                    <input
                      name="weeklyBudgetUsd"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={instance.weeklyBudgetUsd}
                      className="w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Conc.
                    </span>
                    <input
                      name="concurrencyLimit"
                      type="number"
                      min="1"
                      max="20"
                      defaultValue={instance.concurrencyLimit}
                      className="w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Conf.
                    </span>
                    <input
                      name="confidenceThreshold"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      defaultValue={instance.confidenceThreshold}
                      className="w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Quality
                    </span>
                    <input
                      name="qualityThreshold"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      defaultValue={instance.qualityThreshold}
                      className="w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1"
                    />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Priority
                    </span>
                    <input
                      name="routingPriority"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={instance.routingPriority}
                      className="w-full rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1"
                    />
                  </label>
                </div>
                <p className="rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                  Safety: {instance.safetySummary}
                </p>
                <button
                  type="submit"
                  data-testid="growth-hermes-update-instance"
                  className="w-fit rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-3 py-1 text-xs font-medium hover:bg-[var(--studio-surface-hover,theme(colors.zinc.100))]"
                >
                  Save instance
                </button>
              </form>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
          Agent artifacts
        </h4>
        {hermes.artifacts.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
            No Hermes artifacts recorded yet.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[var(--studio-surface-muted,theme(colors.zinc.50))] text-xs uppercase text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                <tr>
                  <th className="px-3 py-2 text-left">Artifact</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Evidence</th>
                  <th className="px-3 py-2 text-left">Links</th>
                </tr>
              </thead>
              <tbody>
                {hermes.artifacts.slice(0, 8).map((artifact) => (
                  <tr key={artifact.id} className="border-t border-[var(--studio-border,theme(colors.zinc.200))]">
                    <td className="px-3 py-2">
                      <div className="font-medium">{artifact.artifactType}</div>
                      <div className="font-mono text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        {artifact.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <LearningStatusBadge status={artifact.status} />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {artifact.providerEvidenceReads} provider ·{" "}
                      {artifact.memoryReads} memory · {artifact.skillReads} skill
                      {artifact.validationErrors > 0
                        ? ` · ${artifact.validationErrors} errors`
                        : ""}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {artifact.createdWorkItemId
                        ? `work item ${artifact.createdWorkItemId.slice(0, 8)}`
                        : artifact.taskSessionId
                          ? `task ${artifact.taskSessionId.slice(0, 8)}`
                          : "not materialized"}
                      {artifact.status === "validated" ? (
                        <form
                          action={
                            materializeGrowthHermesArtifact as unknown as (
                              formData: FormData,
                            ) => Promise<void>
                          }
                          className="mt-2"
                        >
                          <input type="hidden" name="websiteId" value={websiteId} />
                          <input type="hidden" name="artifactId" value={artifact.id} />
                          <button
                            type="submit"
                            data-testid="growth-hermes-materialize-artifact"
                            className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 text-xs font-medium hover:bg-[var(--studio-surface-hover,theme(colors.zinc.100))]"
                          >
                            Materialize
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default async function GrowthAgentsPage({ params }: AgentsPageProps) {
  const { websiteId } = await params;

  let result: Awaited<ReturnType<typeof getGrowthAgents>>;
  try {
    result = await getGrowthAgents(websiteId);
  } catch (err) {
    return (
      <section
        role="alert"
        className="rounded-md border border-[var(--studio-danger,theme(colors.red.300))] bg-[var(--studio-danger-surface,theme(colors.red.50))] p-4 text-sm text-[var(--studio-danger,theme(colors.red.700))]"
      >
        <p className="font-medium">Could not load agents.</p>
        <p className="mt-1 text-xs">
          {err instanceof Error ? err.message : "Unknown error."}
        </p>
      </section>
    );
  }

  const agentsByLane = new Map<AgentLane, typeof result.agents>();
  for (const lane of CANONICAL_LANES) agentsByLane.set(lane, []);
  for (const agent of result.agents) {
    agentsByLane.set(agent.lane, [
      ...(agentsByLane.get(agent.lane) ?? []),
      agent,
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
          Agent Team
        </h2>
        <p className="text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
          Equipo Growth OS por lane. Cada agente prepara trabajo y deja
          evidencia; las decisiones sensibles siguen gated por Curator/Council.
        </p>
      </header>

      {result.missingTable ? (
        <div
          role="status"
          className="rounded-md border border-[var(--studio-warning,theme(colors.amber.300))] bg-[var(--studio-warning-surface,theme(colors.amber.50))] p-3 text-sm text-[var(--studio-warning,theme(colors.amber.800))]"
        >
          <p className="font-medium">
            growth_agent_definitions not provisioned.
          </p>
          <p className="mt-1 text-xs">
            The migration ships in bukeer-flutter (#403). Once applied, this
            table populates automatically and the registry hydrates.
          </p>
        </div>
      ) : result.errored ? (
        <div
          role="alert"
          className="rounded-md border border-[var(--studio-danger,theme(colors.red.300))] bg-[var(--studio-danger-surface,theme(colors.red.50))] p-3 text-sm text-[var(--studio-danger,theme(colors.red.700))]"
        >
          Failed to read agent registry. Check Supabase logs.
        </div>
      ) : (
        <>
          <section
            aria-labelledby="agent-team-heading"
            data-testid="growth-agent-team-cards"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            <h3 id="agent-team-heading" className="sr-only">
              Agent team cards
            </h3>
            {CANONICAL_LANES.map((lane) => {
              const laneAgents = agentsByLane.get(lane) ?? [];
              const agent = laneAgents[0] ?? null;
              const runtime = result.runtimeByLane[lane];
              const enabledCount = laneAgents.filter((a) => a.enabled).length;
              const locales = Array.from(
                new Set(laneAgents.map((a) => a.locale)),
              ).join(", ");
              const markets = Array.from(
                new Set(laneAgents.map((a) => a.market)),
              ).join(", ");

              return (
                <article
                  key={lane}
                  data-testid={`growth-agent-lane-card-${lane}`}
                  className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
                        {LANE_LABELS[lane]}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        {LANE_MISSIONS[lane]}
                      </p>
                    </div>
                    <span
                      className={
                        enabledCount > 0
                          ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                          : "inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                      }
                    >
                      {enabledCount > 0 ? "enabled" : "disabled"}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2">
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Model
                      </dt>
                      <dd className="font-mono font-medium">
                        {agent?.model ?? "not configured"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Mode
                      </dt>
                      <dd className="font-medium">
                        {agent ? (MODE_LABELS[agent.mode] ?? agent.mode) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Agreement
                      </dt>
                      <dd className="font-medium">
                        {agent ? agent.agreement_threshold.toFixed(2) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Markets
                      </dt>
                      <dd className="font-medium">{markets || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Locales
                      </dt>
                      <dd className="font-medium">{locales || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Workflow
                      </dt>
                      <dd className="font-mono font-medium">
                        {agent?.workflow_version ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Deployments
                      </dt>
                      <dd className="font-medium">{laneAgents.length}</dd>
                    </div>
                  </dl>
                  <dl className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2 text-xs">
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Runs
                      </dt>
                      <dd className="font-semibold">{runtime.runs}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Review
                      </dt>
                      <dd className="font-semibold">
                        {runtime.review_required}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Artifacts
                      </dt>
                      <dd className="font-semibold">
                        {runtime.metrics_complete}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Tools
                      </dt>
                      <dd className="font-semibold">
                        {runtime.tool_calls}
                        {runtime.blocked_tool_calls > 0
                          ? `/${runtime.blocked_tool_calls} blocked`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Replay
                      </dt>
                      <dd className="font-semibold">
                        {runtime.active_replay_cases} active ·{" "}
                        {runtime.replay_candidates} draft
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Learning
                      </dt>
                      <dd className="font-semibold">
                        {runtime.active_memories + runtime.draft_memories}/
                        {runtime.active_skills + runtime.draft_skills}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                        Cost
                      </dt>
                      <dd className="font-semibold">
                        ${runtime.cost_usd.toFixed(2)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                    {LANE_SAFETY[lane]}
                  </p>
                  {runtime.recommendations.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                      {runtime.recommendations.map((recommendation) => (
                        <li key={recommendation}>• {recommendation}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link
                      href={`/dashboard/${websiteId}/growth/runs?lane=${lane}`}
                      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 font-medium text-[var(--studio-text,theme(colors.zinc.700))] hover:bg-[var(--studio-surface-hover,theme(colors.zinc.100))]"
                    >
                      Runs
                    </Link>
                    <Link
                      href={`/dashboard/${websiteId}/growth/runs?lane=${lane}&status=review_required`}
                      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 font-medium text-[var(--studio-text,theme(colors.zinc.700))] hover:bg-[var(--studio-surface-hover,theme(colors.zinc.100))]"
                    >
                      Review
                    </Link>
                    <Link
                      href={`/dashboard/${websiteId}/growth/data-health`}
                      className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] px-2 py-1 font-medium text-[var(--studio-text,theme(colors.zinc.700))] hover:bg-[var(--studio-surface-hover,theme(colors.zinc.100))]"
                    >
                      Health
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>

          <HermesAgentInstances websiteId={websiteId} result={result} />

          <section
            aria-labelledby="agent-tools-heading"
            data-testid="growth-agent-tool-matrix"
            className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4"
          >
            <header>
              <h3
                id="agent-tools-heading"
                className="font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]"
              >
                Tool permissions by lane
              </h3>
              <p className="mt-1 text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                Policy view used by the runtime gateway. Human means the agent
                can prepare evidence, but the action remains approval-gated.
              </p>
            </header>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-[var(--studio-surface-muted,theme(colors.zinc.50))] text-xs uppercase tracking-wide text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left">
                      Action
                    </th>
                    <th scope="col" className="px-3 py-2 text-left">
                      Class
                    </th>
                    {Object.values(LANE_LABELS).map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-3 py-2 text-left"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TOOL_ACTIONS.map((action) => (
                    <tr
                      key={action.actionClass}
                      className="border-t border-[var(--studio-border,theme(colors.zinc.200))]"
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 text-left font-medium"
                      >
                        {action.label}
                      </th>
                      <td className="px-3 py-2 font-mono text-xs">
                        {action.actionClass}
                      </td>
                      {Object.keys(LANE_LABELS).map((lane) => {
                        const state = action.states[lane as AgentLane];
                        return (
                          <td key={lane} className="px-3 py-2">
                            <span
                              className={`inline-flex min-w-[72px] justify-center rounded-full px-2 py-0.5 text-xs font-medium ${POLICY_CLASSES[state]}`}
                            >
                              {POLICY_LABELS[state]}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
              <div>
                <dt className="font-medium text-emerald-800">Allowed</dt>
                <dd className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  Runtime may execute read/prepare work.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-sky-800">Live gated</dt>
                <dd className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  Policy, caps, freshness, smoke, rollback and outcome required.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-amber-800">Human</dt>
                <dd className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  Curator or Council approval required.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-700">Blocked</dt>
                <dd className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  Gateway records and denies the action.
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="agent-learning-heading"
            data-testid="growth-agent-learning-controls"
            className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4"
          >
            <header>
              <h3
                id="agent-learning-heading"
                className="font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]"
              >
                Learning controls
              </h3>
              <p className="mt-1 text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                Curators activate, reject or deprecate skills, memories and
                replay cases. Skills require lane replay agreement {">="} 0.90.
              </p>
            </header>
            {result.learning.missingTables.length > 0 ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Missing learning tables: {result.learning.missingTables.join(", ")}.
              </p>
            ) : null}
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
                  Skills
                </h4>
                <div className="mt-2 divide-y divide-[var(--studio-border,theme(colors.zinc.200))] rounded-md border border-[var(--studio-border,theme(colors.zinc.200))]">
                  {result.learning.skills.length === 0 ? (
                    <p className="p-3 text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      No skill candidates yet.
                    </p>
                  ) : (
                    result.learning.skills.map((skill) => (
                      <article
                        key={skill.id}
                        data-testid="growth-agent-skill-row"
                        className="p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {skill.title || skill.skillKey}
                            </p>
                            <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                              {LANE_LABELS[skill.lane]} · v{skill.version} ·
                              agreement{" "}
                              {skill.agreement == null
                                ? "n/a"
                                : skill.agreement.toFixed(2)}
                              {" "}({skill.agreementSampleSize})
                            </p>
                          </div>
                          <LearningStatusBadge status={skill.status} />
                        </div>
                        {skill.evidenceSummary ? (
                          <p className="mt-2 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                            {skill.evidenceSummary}
                          </p>
                        ) : null}
                        {skill.activationBlocked ? (
                          <p className="mt-2 text-xs text-amber-700">
                            Activation blocked until replay agreement reaches
                            0.90.
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <LearningActionForm
                            websiteId={websiteId}
                            artifactId={skill.id}
                            kind="skill"
                            status="active"
                            label="Activate"
                            disabled={
                              skill.status === "active" ||
                              skill.activationBlocked
                            }
                            testId={
                              skill.activationBlocked
                                ? "growth-agent-skill-activate-blocked"
                                : "growth-agent-skill-activate"
                            }
                          />
                          <LearningActionForm
                            websiteId={websiteId}
                            artifactId={skill.id}
                            kind="skill"
                            status="deprecated"
                            label="Deprecate"
                            disabled={skill.status === "deprecated"}
                            testId="growth-agent-skill-deprecate"
                          />
                          <LearningActionForm
                            websiteId={websiteId}
                            artifactId={skill.id}
                            kind="skill"
                            status="rejected"
                            label="Reject"
                            disabled={skill.status === "rejected"}
                            testId="growth-agent-skill-reject"
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
                  Memories
                </h4>
                <div className="mt-2 divide-y divide-[var(--studio-border,theme(colors.zinc.200))] rounded-md border border-[var(--studio-border,theme(colors.zinc.200))]">
                  {result.learning.memories.length === 0 ? (
                    <p className="p-3 text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      No memory candidates yet.
                    </p>
                  ) : (
                    result.learning.memories.map((memory) => (
                      <article
                        key={memory.id}
                        data-testid="growth-agent-memory-row"
                        className="p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {memory.memoryKey}
                            </p>
                            <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                              {LANE_LABELS[memory.lane]}
                            </p>
                          </div>
                          <LearningStatusBadge status={memory.status} />
                        </div>
                        <p className="mt-2 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                          {memory.contentSummary ??
                            memory.evidenceSummary ??
                            "No summary"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <LearningActionForm
                            websiteId={websiteId}
                            artifactId={memory.id}
                            kind="memory"
                            status="active"
                            label="Activate"
                            disabled={memory.status === "active"}
                            testId="growth-agent-memory-activate"
                          />
                          <LearningActionForm
                            websiteId={websiteId}
                            artifactId={memory.id}
                            kind="memory"
                            status="deprecated"
                            label="Deprecate"
                            disabled={memory.status === "deprecated"}
                            testId="growth-agent-memory-deprecate"
                          />
                          <LearningActionForm
                            websiteId={websiteId}
                            artifactId={memory.id}
                            kind="memory"
                            status="rejected"
                            label="Reject"
                            disabled={memory.status === "rejected"}
                            testId="growth-agent-memory-reject"
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
                  Replay
                </h4>
                <div className="mt-2 divide-y divide-[var(--studio-border,theme(colors.zinc.200))] rounded-md border border-[var(--studio-border,theme(colors.zinc.200))]">
                  {result.learning.replayCases.length === 0 ? (
                    <p className="p-3 text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      No replay cases yet.
                    </p>
                  ) : (
                    result.learning.replayCases.map((replay) => (
                      <article
                        key={replay.id}
                        data-testid="growth-agent-replay-row"
                        className="p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {replay.expectedDecision}
                            </p>
                            <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                              {LANE_LABELS[replay.lane]} ·{" "}
                              {replay.expectedAllowedAction ?? "no action"}
                            </p>
                          </div>
                          <LearningStatusBadge status={replay.status} />
                        </div>
                        {replay.rationale ? (
                          <p className="mt-2 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                            {replay.rationale}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <LearningActionForm
                            websiteId={websiteId}
                            artifactId={replay.id}
                            kind="replay"
                            status="active"
                            label="Activate"
                            disabled={replay.status === "active"}
                            testId="growth-agent-replay-activate"
                          />
                          <LearningActionForm
                            websiteId={websiteId}
                            artifactId={replay.id}
                            kind="replay"
                            status="deprecated"
                            label="Deprecate"
                            disabled={replay.status === "deprecated"}
                            testId="growth-agent-replay-deprecate"
                          />
                          <LearningActionForm
                            websiteId={websiteId}
                            artifactId={replay.id}
                            kind="replay"
                            status="rejected"
                            label="Reject"
                            disabled={replay.status === "rejected"}
                            testId="growth-agent-replay-reject"
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="overflow-x-auto rounded-md border border-[var(--studio-border,theme(colors.zinc.200))]">
            <table data-testid="growth-agents-table" className="w-full text-sm">
              <caption className="sr-only">
                Agent registry for the active website
              </caption>
              <thead className="bg-[var(--studio-surface-muted,theme(colors.zinc.50))] text-xs uppercase tracking-wide text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Lane
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Mode
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Model
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Prompt
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Workflow
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Agreement Threshold
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Runtime
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Enabled
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.agents.length === 0 ? (
                  <tr className="border-t border-[var(--studio-border,theme(colors.zinc.200))]">
                    <td
                      colSpan={9}
                      className="px-3 py-6 text-center text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]"
                    >
                      No agents configured for this tenant yet.
                    </td>
                  </tr>
                ) : (
                  result.agents.map((agent) => {
                    const runtime = result.runtimeByLane[agent.lane];

                    return (
                      <tr
                        key={agent.agent_id}
                        className="border-t border-[var(--studio-border,theme(colors.zinc.200))]"
                      >
                        <th
                          scope="row"
                          className="px-3 py-2 text-left font-medium"
                        >
                          {agent.name}
                        </th>
                        <td className="px-3 py-2">{LANE_LABELS[agent.lane]}</td>
                        <td className="px-3 py-2">
                          {MODE_LABELS[agent.mode] ?? agent.mode}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {agent.model}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {agent.prompt_version}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {agent.workflow_version}
                        </td>
                        <td className="px-3 py-2">
                          {agent.agreement_threshold.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {runtime.runs} runs · {runtime.metrics_complete}{" "}
                          artifacts · {runtime.active_replay_cases} active
                          replay · {runtime.blocked_tool_calls} blocked tools
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              agent.enabled
                                ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                                : "inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                            }
                          >
                            {agent.enabled ? "enabled" : "disabled"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
