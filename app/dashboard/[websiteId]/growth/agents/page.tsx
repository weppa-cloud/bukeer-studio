import type { AgentLane } from '@bukeer/website-contract';
import { getGrowthAgents } from '@/lib/growth/console/queries';

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
  orchestrator: 'Orchestrator',
  technical_remediation: 'Technical Remediation',
  transcreation: 'Transcreation',
  content_creator: 'Content Creator',
  content_curator: 'Content Curator',
};

const MODE_LABELS: Record<string, string> = {
  observe_only: 'Observe',
  prepare_only: 'Prepare',
  auto_apply_safe: 'Auto-apply (safe)',
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
          {err instanceof Error ? err.message : 'Unknown error.'}
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-[var(--studio-text-strong,theme(colors.zinc.900))]">
          Agents
        </h2>
        <p className="text-sm text-[var(--studio-text-muted,theme(colors.zinc.500))]">
          Registry of agents pinned to this tenant. Read-only in MVP — toggle
          and configuration mutations land alongside the autonomy gate (#408).
        </p>
      </header>

      {result.missingTable ? (
        <div
          role="status"
          className="rounded-md border border-[var(--studio-warning,theme(colors.amber.300))] bg-[var(--studio-warning-surface,theme(colors.amber.50))] p-3 text-sm text-[var(--studio-warning,theme(colors.amber.800))]"
        >
          <p className="font-medium">growth_agent_definitions not provisioned.</p>
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
        <div className="overflow-x-auto rounded-md border border-[var(--studio-border,theme(colors.zinc.200))]">
          <table data-testid="growth-agents-table" className="w-full text-sm">
            <caption className="sr-only">
              Agent registry for the active website
            </caption>
            <thead className="bg-[var(--studio-surface-muted,theme(colors.zinc.50))] text-xs uppercase tracking-wide text-[var(--studio-text-muted,theme(colors.zinc.500))]">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">Name</th>
                <th scope="col" className="px-3 py-2 text-left">Lane</th>
                <th scope="col" className="px-3 py-2 text-left">Mode</th>
                <th scope="col" className="px-3 py-2 text-left">Model</th>
                <th scope="col" className="px-3 py-2 text-left">Prompt</th>
                <th scope="col" className="px-3 py-2 text-left">Workflow</th>
                <th scope="col" className="px-3 py-2 text-left">Agreement Threshold</th>
                <th scope="col" className="px-3 py-2 text-left">Enabled</th>
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
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {agent.name}
                    </th>
                    <td className="px-3 py-2">{LANE_LABELS[agent.lane]}</td>
                    <td className="px-3 py-2">
                      {MODE_LABELS[agent.mode] ?? agent.mode}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{agent.model}</td>
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
                            ? 'inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800'
                            : 'inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700'
                        }
                      >
                        {agent.enabled ? 'enabled' : 'disabled'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
