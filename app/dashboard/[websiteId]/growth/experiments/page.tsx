import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
  StudioEmptyState,
} from "@/components/studio/ui/primitives";
import {
  getGrowthEffectivenessBenchmark,
  type GrowthEffectivenessBenchmark,
} from "@/lib/growth/effectiveness/service";
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

function pct(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function money(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
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

  const benchmark: GrowthEffectivenessBenchmark & { error?: string } =
    await getGrowthEffectivenessBenchmark({
    supabase,
    accountId: ctx.accountId,
    websiteId: ctx.websiteId,
  }).catch((benchmarkError) => ({
    experiments: [],
    observations: [],
    scorecards: {} as GrowthEffectivenessBenchmark["scorecards"],
    missingTables: [],
    error:
      benchmarkError instanceof Error
        ? benchmarkError.message
        : String(benchmarkError),
  }));

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

      {"error" in benchmark && benchmark.error ? (
        <div
          role="alert"
          className="studio-panel mt-4 border border-[var(--studio-danger)]/40 p-3 text-sm text-[var(--studio-danger)]"
        >
          No pudimos cargar el benchmark de efectividad: {benchmark.error}
        </div>
      ) : null}

      <section
        aria-labelledby="growth-effectiveness-heading"
        data-testid="growth-effectiveness-benchmark"
        className="studio-panel mt-4 p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2
              id="growth-effectiveness-heading"
              className="text-base font-semibold"
            >
              Effectiveness benchmark
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-[var(--studio-text-muted)]">
              Compara baseline humano Codex, Growth OS determinista y Hermes
              aislado usando el mismo executor live-gated. El objetivo es
              probar velocidad, calidad, seguridad, costo, aprendizaje e
              impacto real sin publicar fuera de los gates.
            </p>
          </div>
          <StudioBadge tone={benchmark.missingTables.length ? "warning" : "info"}>
            {benchmark.missingTables.length
              ? `Missing: ${benchmark.missingTables.join(", ")}`
              : "executor-only"}
          </StudioBadge>
        </div>

        {benchmark.experiments.length === 0 ? (
          <div className="mt-4">
            <StudioEmptyState
              title="No effectiveness benchmark yet"
              description="Crea un experimento con snapshot congelado para comparar baseline humano, runtime determinista y Hermes. Las observaciones deben enlazar artifact/candidate/work item/job/outcome."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {benchmark.experiments.map((experiment) => {
              const scorecard = benchmark.scorecards[experiment.id];
              const observations = benchmark.observations.filter(
                (row) => row.experiment_id === experiment.id,
              );

              return (
                <article
                  key={experiment.id}
                  className="rounded-md border border-[var(--studio-border)] p-4"
                  data-testid={`growth-effectiveness-experiment-${experiment.experiment_key}`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{experiment.title}</h3>
                        <StudioBadge tone={statusTone(experiment.status)}>
                          {experiment.status}
                        </StudioBadge>
                      </div>
                      <p className="mt-1 max-w-3xl text-sm text-[var(--studio-text-muted)]">
                        {experiment.objective}
                      </p>
                      <p className="mt-1 font-mono text-xs text-[var(--studio-text-muted)]">
                        {experiment.experiment_key}
                      </p>
                    </div>
                    <div className="text-left text-xs md:text-right">
                      <div>
                        Winner:{" "}
                        <span className="font-semibold">
                          {scorecard?.winner ?? "n/a"}
                        </span>
                      </div>
                      <div>
                        Hermes justified:{" "}
                        <span className="font-semibold">
                          {scorecard?.hermesJustified ? "yes" : "no"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--studio-border)] text-left text-[var(--studio-text-muted)]">
                          <th className="px-3 py-2 font-medium">Group</th>
                          <th className="px-3 py-2 font-medium">Accepted</th>
                          <th className="px-3 py-2 font-medium">Gate</th>
                          <th className="px-3 py-2 font-medium">Smoke</th>
                          <th className="px-3 py-2 font-medium">Noise</th>
                          <th className="px-3 py-2 font-medium">Safety</th>
                          <th className="px-3 py-2 font-medium">Cost/action</th>
                          <th className="px-3 py-2 font-medium">Learning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scorecard?.groups.map((group) => (
                          <tr
                            key={group.sourceGroup}
                            className="border-b border-[var(--studio-border)]/60"
                          >
                            <td className="px-3 py-2 font-mono text-xs">
                              {group.sourceGroup}
                            </td>
                            <td className="px-3 py-2">
                              {group.accepted}/{group.total}
                            </td>
                            <td className="px-3 py-2">
                              {pct(group.gatePassRate)}
                            </td>
                            <td className="px-3 py-2">
                              {pct(group.smokePassRate)}
                            </td>
                            <td className="px-3 py-2">
                              {pct(group.duplicateNoiseRate)}
                            </td>
                            <td className="px-3 py-2">
                              {group.safetyViolations}
                            </td>
                            <td className="px-3 py-2">
                              {money(group.costPerAccepted)}
                            </td>
                            <td className="px-3 py-2">
                              {group.learningCitationCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-3 text-xs text-[var(--studio-text-muted)]">
                    {scorecard?.summary ?? "Waiting for benchmark observations."}
                  </p>
                  <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
                    Observations: {observations.length}. Initial verdict:{" "}
                    {formatDate(experiment.initial_verdict_at)}. Final SEO
                    verdict: {formatDate(experiment.final_verdict_at)}.
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

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
