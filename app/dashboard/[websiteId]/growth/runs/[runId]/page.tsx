import { notFound } from "next/navigation";
import Link from "next/link";
import {
  type AgentRunStatus,
  type GrowthAgentRunEvent,
} from "@bukeer/website-contract";
import {
  StudioPage,
  StudioSectionHeader,
  StudioBadge,
} from "@/components/studio/ui/primitives";
import { getAgentRunDetail } from "@/lib/growth/console/queries-runs";
import { hasGrowthRole, requireGrowthRole } from "@/lib/growth/console/auth";
import { approveRun, rejectRun, downloadArtifactAction } from "./actions";

/**
 * Reviews & Agent Runs — detail view (#407).
 *
 * Tenant-guarded server component (ADR-009). Renders run header, append-only
 * timeline of events, evidence (collapsed JSON), and an artifact download
 * affordance via Server Action that returns a signed URL.
 *
 * Append-only: events are READ-ONLY here. There is no UI for editing or
 * deleting events.
 *
 * Artifact paths are NEVER raw-exposed. We display only the last 16 chars
 * of `artifact_path` plus a TODO note; the signed URL is derived
 * server-side and only returned through the action.
 *
 * Roles: Approve / Reject require `curator+`. The Server Actions also
 * re-check before mutating.
 */

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
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

interface PageProps {
  params: Promise<{ websiteId: string; runId: string }>;
}

function EvidenceBlock({
  evidence,
}: {
  evidence: Record<string, unknown> | null;
}) {
  if (!evidence || Object.keys(evidence).length === 0) {
    return (
      <p className="text-xs text-[var(--studio-text-muted)]">
        Sin evidencia registrada.
      </p>
    );
  }
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-[var(--studio-text-muted)]">
        Mostrar evidencia ({Object.keys(evidence).length} keys)
      </summary>
      <pre className="mt-2 p-3 rounded-md bg-[var(--studio-surface)] overflow-x-auto">
        {JSON.stringify(evidence, null, 2)}
      </pre>
    </details>
  );
}

function EventTimeline({ events }: { events: GrowthAgentRunEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-[var(--studio-text-muted)]">
        Sin eventos registrados.
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {events.map((ev) => (
        <li
          key={ev.event_id}
          data-testid={`growth-run-event-row-${ev.event_id}`}
          className="studio-panel border border-[var(--studio-border)] p-3"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[var(--studio-text-muted)]">
              {fmtDate(ev.occurred_at)}
            </span>
            <StudioBadge
              tone={
                ev.severity === "error"
                  ? "danger"
                  : ev.severity === "warn"
                    ? "warning"
                    : "neutral"
              }
            >
              {ev.event_type}
            </StudioBadge>
            {ev.severity !== "info" ? (
              <StudioBadge
                tone={ev.severity === "error" ? "danger" : "warning"}
              >
                {ev.severity}
              </StudioBadge>
            ) : null}
          </div>
          {ev.message ? <p className="text-sm mt-1">{ev.message}</p> : null}
          {ev.payload && Object.keys(ev.payload).length > 0 ? (
            <details className="mt-1 text-xs">
              <summary className="cursor-pointer text-[var(--studio-text-muted)]">
                payload ({Object.keys(ev.payload).length} keys)
              </summary>
              <pre className="mt-2 p-2 rounded bg-[var(--studio-surface)] overflow-x-auto">
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            </details>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default async function GrowthRunDetailPage({ params }: PageProps) {
  const { websiteId, runId } = await params;

  const auth = await requireGrowthRole(websiteId, "viewer");
  const accountId = auth.accountId;
  const { role } = auth;
  const canCurate = hasGrowthRole(role, "curator");

  const detail = await getAgentRunDetail(websiteId, runId, accountId);
  if (!detail) notFound();

  const {
    run,
    events,
    agentName,
    agreementForLane,
    hasArtifact,
    artifactPathTail,
    aiReview,
    metrics,
    toolCalls,
    replayCases,
    memories,
    skills,
  } = detail;

  const evidence =
    run.evidence &&
    typeof run.evidence === "object" &&
    !Array.isArray(run.evidence)
      ? (run.evidence as Record<string, unknown>)
      : {};
  const risks = aiReview?.risks.length
    ? aiReview.risks
    : Array.isArray(evidence.risks)
      ? evidence.risks.map((risk) => String(risk ?? "")).filter(Boolean)
      : [];
  const evidenceSummary =
    typeof evidence.evidence_summary === "string"
      ? evidence.evidence_summary
      : null;
  const nextAction =
    typeof evidence.next_action === "string" ? evidence.next_action : null;
  const memoryCandidateCount =
    typeof evidence.memory_candidates_count === "number"
      ? evidence.memory_candidates_count
      : memories.length;
  const skillCandidateCount =
    typeof evidence.skill_update_candidates_count === "number"
      ? evidence.skill_update_candidates_count
      : skills.length;

  return (
    <StudioPage className="max-w-5xl">
      <StudioSectionHeader
        title={`Agent work ${run.run_id.slice(-8)}`}
        subtitle={`Lane ${run.lane} · ${agentName ?? "agent: —"}`}
        actions={
          <div className="flex items-center gap-2">
            <StudioBadge tone={STATUS_TONE[run.status]}>
              {run.status}
            </StudioBadge>
            <Link
              href={`/dashboard/${websiteId}/growth/runs`}
              className="text-xs underline text-[var(--studio-text-muted)]"
            >
              ← Volver a Review Queue
            </Link>
          </div>
        }
      />

      {/* Header facts */}
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mt-4">
        <div>
          <dt className="text-[var(--studio-text-muted)]">claim_id</dt>
          <dd className="font-mono break-all">{run.claim_id}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">workspace</dt>
          <dd className="font-mono break-all">{run.workspace_path}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">attempts</dt>
          <dd>{run.attempts}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">started</dt>
          <dd>{fmtDate(run.started_at)}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">finished</dt>
          <dd>{fmtDate(run.finished_at)}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">heartbeat</dt>
          <dd>{fmtDate(run.heartbeat_at)}</dd>
        </div>
        <div>
          <dt className="text-[var(--studio-text-muted)]">
            agreement_threshold
          </dt>
          <dd>
            {agreementForLane != null ? agreementForLane.toFixed(2) : "—"}
          </dd>
        </div>
        {run.error_class ? (
          <div className="col-span-2 md:col-span-3">
            <dt className="text-[var(--studio-text-muted)]">error</dt>
            <dd className="text-[var(--studio-danger)]">
              <span className="font-mono">{run.error_class}</span>
              {run.error_message ? <> — {run.error_message}</> : null}
            </dd>
          </div>
        ) : null}
      </dl>

      {/* Approve / Reject */}
      <section aria-labelledby="run-review-heading" className="space-y-3 mt-6">
        <header>
          <h2
            id="run-review-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Decision requerida
          </h2>
          {!canCurate ? (
            <p className="text-xs text-[var(--studio-text-muted)]">
              Tu rol actual ({role}) no puede aprobar/rechazar trabajo de
              agentes. Se requiere <code>curator</code> o superior.
            </p>
          ) : null}
        </header>
        <div className="flex flex-wrap gap-2">
          <form action={approveRun}>
            <input type="hidden" name="websiteId" value={websiteId} />
            <input type="hidden" name="runId" value={run.run_id} />
            <button
              type="submit"
              disabled={!canCurate || run.status !== "review_required"}
              className="studio-button studio-button--primary disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                run.status !== "review_required"
                  ? "Solo trabajo en review_required puede aprobarse."
                  : undefined
              }
            >
              Approve
            </button>
          </form>
          <form action={rejectRun} className="flex items-end gap-2">
            <input type="hidden" name="websiteId" value={websiteId} />
            <input type="hidden" name="runId" value={run.run_id} />
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-[var(--studio-text-muted)]">
                Notas (opcional)
              </span>
              <input
                type="text"
                name="notes"
                maxLength={500}
                disabled={!canCurate || run.status !== "review_required"}
                className="studio-input"
              />
            </label>
            <button
              type="submit"
              disabled={!canCurate || run.status !== "review_required"}
              className="studio-button studio-button--danger disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reject
            </button>
          </form>
        </div>
      </section>

      <section
        aria-labelledby="run-runtime-heading"
        className="space-y-3 mt-6"
        data-testid="growth-run-runtime-panel"
      >
        <header>
          <h2
            id="run-runtime-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Runtime output
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            Lectura operable del artifact, reviews, métricas, tool gateway y
            replay. Nada de esto activa memoria, skills ni mutaciones de
            negocio.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Recommendation
            </div>
            <div className="mt-1 font-semibold">
              {aiReview?.recommendation ??
                (evidence.decision == null ? "—" : String(evidence.decision))}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              allowed_action:{" "}
              <span className="font-mono">
                {evidence.allowed_action == null
                  ? "—"
                  : String(evidence.allowed_action)}
              </span>
            </p>
          </article>
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Artifact health
            </div>
            <div className="mt-1 font-semibold">
              {metrics
                ? metrics.artifact_complete
                  ? "complete"
                  : "incomplete"
                : "unknown"}
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              exit_code:{" "}
              <span className="font-mono">{metrics?.exit_code ?? "—"}</span>
            </p>
          </article>
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <div className="text-xs uppercase tracking-wide text-[var(--studio-text-muted)]">
              Learning proposals
            </div>
            <div className="mt-1 font-semibold">
              {memoryCandidateCount} memory · {skillCandidateCount} skill
            </div>
            <p className="mt-1 text-xs text-[var(--studio-text-muted)]">
              Draft only. Curator approval required.
            </p>
          </article>
        </div>

        {evidenceSummary ? (
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <h3 className="text-sm font-semibold">Evidence summary</h3>
            <p className="mt-2 text-sm text-[var(--studio-text)]">
              {evidenceSummary}
            </p>
          </article>
        ) : null}

        {risks.length > 0 || nextAction ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <article className="studio-panel border border-[var(--studio-border)] p-3">
              <h3 className="text-sm font-semibold">Risks</h3>
              {risks.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {risks.map((risk, index) => (
                    <li key={`${risk}-${index}`}>{risk}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
                  Sin riesgos estructurados.
                </p>
              )}
            </article>
            <article className="studio-panel border border-[var(--studio-border)] p-3">
              <h3 className="text-sm font-semibold">Next action</h3>
              <p className="mt-2 text-sm text-[var(--studio-text-muted)]">
                {nextAction ?? "Sin siguiente acción estructurada."}
              </p>
            </article>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="run-ledger-heading" className="space-y-3 mt-6">
        <header>
          <h2
            id="run-ledger-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Tool gateway y replay
          </h2>
        </header>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <h3 className="text-sm font-semibold">
              Tool calls ({toolCalls.length})
            </h3>
            {toolCalls.length > 0 ? (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-[var(--studio-text-muted)]">
                    <tr>
                      <th className="py-1 pr-2">Tool</th>
                      <th className="py-1 pr-2">Policy</th>
                      <th className="py-1 pr-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolCalls.map((call, index) => (
                      <tr
                        key={`${call.tool}-${index}`}
                        className="border-t border-[var(--studio-border)]"
                      >
                        <td className="py-1 pr-2 font-mono">{call.tool}</td>
                        <td className="py-1 pr-2">{call.policy_verdict}</td>
                        <td className="py-1 pr-2">{call.result_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
                Sin tool ledger persistido.
              </p>
            )}
          </article>
          <article className="studio-panel border border-[var(--studio-border)] p-3">
            <h3 className="text-sm font-semibold">
              Replay cases ({replayCases.length})
            </h3>
            {replayCases.length > 0 ? (
              <ul className="mt-2 space-y-2 text-xs">
                {replayCases.map((replay, index) => (
                  <li
                    key={`${replay.expected_decision}-${index}`}
                    className="rounded-md bg-[var(--studio-surface)] p-2"
                  >
                    <div className="font-mono">{replay.status}</div>
                    <div>
                      expected: {replay.expected_decision} ·{" "}
                      {replay.expected_allowed_action ?? "—"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
                Sin replay case persistido.
              </p>
            )}
          </article>
        </div>
      </section>

      {/* Artifact (path obfuscated) */}
      <section
        aria-labelledby="run-artifact-heading"
        className="space-y-2 mt-6"
      >
        <header>
          <h2
            id="run-artifact-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Artifact
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            La ruta cruda nunca se expone. Mostramos los últimos 16 caracteres
            como hash visible; la URL firmada se calcula por server action.
          </p>
        </header>
        {hasArtifact ? (
          <div className="flex flex-wrap items-center gap-3">
            <code className="text-xs font-mono text-[var(--studio-text-muted)]">
              …{artifactPathTail}
            </code>
            <form action={downloadArtifactAction}>
              <input type="hidden" name="websiteId" value={websiteId} />
              <input type="hidden" name="runId" value={run.run_id} />
              <button
                type="submit"
                className="studio-button studio-button--outline"
              >
                Download artifact
              </button>
            </form>
            <span className="text-xs text-[var(--studio-text-muted)]">
              TODO(#404): some artifacts live in the orchestrator workspace (not
              Storage). Signed-URL transport for those is TBD.
            </span>
          </div>
        ) : (
          <p className="text-xs text-[var(--studio-text-muted)]">
            Este run no produjo artifact.
          </p>
        )}
      </section>

      {/* Evidence */}
      <section
        aria-labelledby="run-evidence-heading"
        className="space-y-2 mt-6"
      >
        <header>
          <h2
            id="run-evidence-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Evidencia explicable
          </h2>
        </header>
        <EvidenceBlock evidence={run.evidence} />
      </section>

      {/* Events timeline (append-only) */}
      <section
        aria-labelledby="run-events-heading"
        data-testid="growth-run-events-panel"
        className="space-y-2 mt-6"
      >
        <header>
          <h2
            id="run-events-heading"
            className="text-base font-semibold text-[var(--studio-text)]"
          >
            Timeline ({events.length})
          </h2>
          <p className="text-xs text-[var(--studio-text-muted)]">
            Append-only — los eventos no se pueden editar ni eliminar (RLS lo
            bloquea a nivel DB).
          </p>
        </header>
        <EventTimeline events={events} />
      </section>
    </StudioPage>
  );
}
