import Link from "next/link";
import type { AgentLane } from "@bukeer/website-contract";
import { CANONICAL_LANES, getGrowthAgents } from "@/lib/growth/console/queries";

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
  technical_remediation: "Auto-apply solo reversible y smoke-verificable.",
  transcreation: "Nunca publica ni expone hreflang sin Curator.",
  content_creator: "No puede aprobar su propio contenido.",
  content_curator: "Council aprueba experimentos activos.",
};

const MODE_LABELS: Record<string, string> = {
  observe_only: "Observe",
  prepare_only: "Prepare",
  auto_apply_safe: "Auto-apply (safe)",
};

type ToolPolicyState = "allowed" | "gated" | "blocked" | "future_safe_apply";

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
      orchestrator: "future_safe_apply",
      technical_remediation: "future_safe_apply",
      transcreation: "blocked",
      content_creator: "blocked",
      content_curator: "future_safe_apply",
    },
  },
  {
    actionClass: "content_publish",
    label: "Publish content",
    states: {
      orchestrator: "blocked",
      technical_remediation: "blocked",
      transcreation: "gated",
      content_creator: "gated",
      content_curator: "gated",
    },
  },
  {
    actionClass: "transcreation_merge",
    label: "Merge transcreation",
    states: {
      orchestrator: "blocked",
      technical_remediation: "blocked",
      transcreation: "gated",
      content_creator: "blocked",
      content_curator: "gated",
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
  gated: "Human",
  blocked: "Blocked",
  future_safe_apply: ">=0.90",
};

const POLICY_CLASSES: Record<ToolPolicyState, string> = {
  allowed: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  gated: "bg-amber-100 text-amber-800 border border-amber-200",
  blocked: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  future_safe_apply: "bg-sky-100 text-sky-800 border border-sky-200",
};

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
                  </dl>
                  <p className="mt-3 rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                    {LANE_SAFETY[lane]}
                  </p>
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
                <dt className="font-medium text-sky-800">&gt;=0.90</dt>
                <dd className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                  Future safe apply requires lane agreement and smoke pass.
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
