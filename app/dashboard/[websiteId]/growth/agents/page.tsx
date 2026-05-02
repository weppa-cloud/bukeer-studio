import type { AgentLane } from "@bukeer/website-contract";
import { getGrowthAgents } from "@/lib/growth/console/queries";

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
            {result.agents.map((agent) => (
              <article
                key={agent.agent_id}
                className="rounded-md border border-[var(--studio-border,theme(colors.zinc.200))] bg-[var(--studio-surface,theme(colors.white))] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
                      {LANE_LABELS[agent.lane]}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      {LANE_MISSIONS[agent.lane]}
                    </p>
                  </div>
                  <span
                    className={
                      agent.enabled
                        ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                        : "inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                    }
                  >
                    {agent.enabled ? "enabled" : "disabled"}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Mode
                    </dt>
                    <dd className="font-medium">
                      {MODE_LABELS[agent.mode] ?? agent.mode}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Agreement
                    </dt>
                    <dd className="font-medium">
                      {agent.agreement_threshold.toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Market
                    </dt>
                    <dd className="font-medium">{agent.market}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--studio-text-muted,theme(colors.zinc.500))]">
                      Locale
                    </dt>
                    <dd className="font-medium">{agent.locale}</dd>
                  </div>
                </dl>
                <p className="mt-3 rounded-md bg-[var(--studio-surface-muted,theme(colors.zinc.50))] p-2 text-xs text-[var(--studio-text-muted,theme(colors.zinc.600))]">
                  {LANE_SAFETY[agent.lane]}
                </p>
              </article>
            ))}
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
                    Enabled
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.agents.length === 0 ? (
                  <tr className="border-t border-[var(--studio-border,theme(colors.zinc.200))]">
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]"
                    >
                      No agents configured for this tenant yet.
                    </td>
                  </tr>
                ) : (
                  result.agents.map((agent) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
