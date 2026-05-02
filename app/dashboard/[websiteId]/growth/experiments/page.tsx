import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
  StudioEmptyState,
} from "@/components/studio/ui/primitives";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireGrowthRole } from "@/lib/growth/console/auth";

interface ExperimentsPageProps {
  params: Promise<{ websiteId: string }>;
}

interface ExperimentRow {
  id: string;
  experiment_key: string;
  name: string;
  hypothesis: string;
  baseline: string;
  owner_role: string;
  owner_issue: string;
  success_metric: string;
  guardrail_metric: string | null;
  start_date: string | null;
  evaluation_date: string | null;
  status: string;
  independence_key: string;
}

function statusTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" | "info" {
  if (["active", "won", "completed"].includes(status)) return "success";
  if (["approved", "paused", "inconclusive"].includes(status)) return "warning";
  if (["stopped", "lost"].includes(status)) return "danger";
  return "info";
}

function formatDate(value: string | null): string {
  if (!value) return "n/a";
  try {
    return new Date(value).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export default async function GrowthExperimentsPage({
  params,
}: ExperimentsPageProps) {
  const { websiteId } = await params;
  const ctx = await requireGrowthRole(websiteId, "viewer");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("growth_experiments")
    .select(
      "id, experiment_key, name, hypothesis, baseline, owner_role, owner_issue, success_metric, guardrail_metric, start_date, evaluation_date, status, independence_key",
    )
    .eq("account_id", ctx.accountId)
    .eq("website_id", ctx.websiteId)
    .order("evaluation_date", { ascending: true });

  const rows = (data ?? []) as ExperimentRow[];
  const activeCount = rows.filter((r) => r.status === "active").length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;
  const completedCount = rows.filter((r) =>
    ["completed", "won", "lost", "inconclusive"].includes(r.status),
  ).length;

  return (
    <StudioPage className="max-w-7xl">
      <StudioSectionHeader
        title="Experiments"
        subtitle="Council-approved measured readouts. Operational batches stay outside this cap."
        actions={<StudioBadge tone="info">Max 5 active</StudioBadge>}
      />

      {error ? (
        <div
          role="alert"
          className="studio-panel mt-4 border border-[var(--studio-danger)]/40 p-3 text-sm text-[var(--studio-danger)]"
        >
          No pudimos cargar growth_experiments. Si la tabla no existe en este
          entorno, la migracion #396/#403 debe estar aplicada.
        </div>
      ) : null}

      <section
        aria-labelledby="experiment-summary-heading"
        data-testid="growth-experiments-summary"
        className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"
      >
        <h2 id="experiment-summary-heading" className="sr-only">
          Experiment summary
        </h2>
        <article className="rounded-md border border-[var(--studio-border)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
            Active
          </div>
          <div className="mt-1 text-2xl font-semibold">{activeCount}</div>
          <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
            Council cap stays at 5 independent readouts.
          </p>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
            Approved / planned
          </div>
          <div className="mt-1 text-2xl font-semibold">{approvedCount}</div>
          <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
            Ready for start only when owner and baseline are valid.
          </p>
        </article>
        <article className="rounded-md border border-[var(--studio-border)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
            Completed
          </div>
          <div className="mt-1 text-2xl font-semibold">{completedCount}</div>
          <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
            Must produce learning before scaling or stopping.
          </p>
        </article>
      </section>

      {rows.length === 0 ? (
        <div className="mt-6" data-testid="growth-experiments-empty-state">
          <StudioEmptyState
            title="No experiments yet"
            description="Council can promote reviewed backlog items into growth_experiments once source row, baseline, owner, success metric and evaluation date exist."
          />
        </div>
      ) : (
        <div className="studio-panel mt-6 overflow-x-auto">
          <table
            data-testid="growth-experiments-table"
            className="w-full text-sm"
          >
            <thead>
              <tr className="border-b border-[var(--studio-border)] text-left text-[var(--studio-text-muted)]">
                <th className="px-3 py-2 font-medium">Experiment</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Success metric</th>
                <th className="px-3 py-2 font-medium">Evaluation</th>
                <th className="px-3 py-2 font-medium">Independence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--studio-border)]/60 align-top"
                >
                  <td className="px-3 py-2 max-w-[420px]">
                    <div className="font-medium">{row.name}</div>
                    <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
                      {row.hypothesis}
                    </p>
                    <p className="mt-1 text-xs">
                      <span className="text-[var(--studio-text-muted)]">
                        Baseline:
                      </span>{" "}
                      {row.baseline}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <StudioBadge tone={statusTone(row.status)}>
                      {row.status}
                    </StudioBadge>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div>{row.owner_role}</div>
                    <div className="text-[var(--studio-text-muted)]">
                      {row.owner_issue}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{row.success_metric}</td>
                  <td className="px-3 py-2 text-xs">
                    {formatDate(row.evaluation_date)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.independence_key}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StudioPage>
  );
}
